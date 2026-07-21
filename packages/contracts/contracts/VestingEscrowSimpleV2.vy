# @version 0.3.10

"""
@title Vesting Escrow Simple V2
@author Yearn Finance
@license MIT
@notice Vests the principal value of ERC-4626 shares and sends yield to the original owner
"""

from vyper.interfaces import ERC20


interface ERC4626:
    def asset() -> address: view
    def convertToAssets(shares: uint256) -> uint256: view
    def balanceOf(account: address) -> uint256: view
    def transfer(receiver: address, shares: uint256) -> bool: nonpayable


event Claim:
    recipient: indexed(address)
    claimed: uint256


event YieldClaim:
    recipient: indexed(address)
    claimed: uint256


event Revoked:
    recipient: address
    owner: address
    rugged: uint256
    ts: uint256


event Disowned:
    owner: address


event SetOpenClaim:
    state: bool


UINT_MAX: constant(uint256) = max_value(uint256)
UNFUNDED: constant(uint8) = 1
READY: constant(uint8) = 2


recipient: public(address)
token: public(ERC4626)
asset: public(address)
start_time: public(uint256)
end_time: public(uint256)
cliff_length: public(uint256)
total_locked: public(uint256)
total_claimed: public(uint256)
total_principal: public(uint256)
principal_claimed: public(uint256)
disabled_at: public(uint256)
open_claim: public(bool)
owner: public(address)
yield_recipient: public(address)
state: public(uint8)
factory: address


@external
def __init__():
    # Ensure the implementation contract cannot be initialized.
    self.state = READY


@external
def initialize(
    owner: address,
    token: ERC4626,
    recipient: address,
    amount: uint256,
    start_time: uint256,
    end_time: uint256,
    cliff_length: uint256,
    open_claim: bool,
) -> bool:
    """
    @notice Configure a new minimal proxy before the factory funds it
    @dev `finalize_funding` must be called by the factory in the same transaction
    """
    assert self.state == 0  # dev: can only initialize once

    asset: address = token.asset()
    assert asset != empty(address)  # dev: invalid asset
    assert owner not in [empty(address), self, token.address, asset, msg.sender]  # dev: invalid yield owner

    self.state = UNFUNDED
    self.factory = msg.sender
    self.token = token
    self.asset = asset
    self.owner = owner
    self.yield_recipient = owner
    self.recipient = recipient
    self.start_time = start_time
    self.end_time = end_time
    self.cliff_length = cliff_length
    self.total_locked = amount
    self.disabled_at = end_time
    self.open_claim = open_claim

    return True


@external
def finalize_funding() -> uint256:
    """
    @notice Verify exact share funding and snapshot its principal value
    @return Initial principal in underlying asset units
    """
    assert self.state == UNFUNDED and msg.sender == self.factory  # dev: not factory

    balance: uint256 = self.token.balanceOf(self)
    assert balance == self.total_locked  # dev: incorrect funding

    principal: uint256 = self.token.convertToAssets(balance)
    assert principal > 0  # dev: zero principal

    self.total_principal = principal
    self.factory = empty(address)
    self.state = READY
    return principal


@internal
@pure
def _mul_div_down(x: uint256, y: uint256, denominator: uint256) -> uint256:
    """
    @dev Full-precision floor(x * y / denominator), adapted from OpenZeppelin Math.mulDiv
    """
    assert denominator > 0  # dev: division by zero

    product_low: uint256 = unsafe_mul(x, y)
    mm: uint256 = uint256_mulmod(x, y, UINT_MAX)
    product_high: uint256 = unsafe_sub(unsafe_sub(mm, product_low), convert(mm < product_low, uint256))

    if product_high == 0:
        return product_low / denominator

    assert denominator > product_high  # dev: mulDiv overflow

    remainder: uint256 = uint256_mulmod(x, y, denominator)
    product_high = unsafe_sub(product_high, convert(remainder > product_low, uint256))
    product_low = unsafe_sub(product_low, remainder)

    twos: uint256 = denominator & unsafe_sub(0, denominator)
    denominator = denominator / twos
    product_low = product_low / twos
    twos = unsafe_add(unsafe_div(unsafe_sub(0, twos), twos), 1)
    product_low = product_low | unsafe_mul(product_high, twos)

    inverse: uint256 = unsafe_mul(3, denominator) ^ 2
    inverse = unsafe_mul(inverse, unsafe_sub(2, unsafe_mul(denominator, inverse)))
    inverse = unsafe_mul(inverse, unsafe_sub(2, unsafe_mul(denominator, inverse)))
    inverse = unsafe_mul(inverse, unsafe_sub(2, unsafe_mul(denominator, inverse)))
    inverse = unsafe_mul(inverse, unsafe_sub(2, unsafe_mul(denominator, inverse)))
    inverse = unsafe_mul(inverse, unsafe_sub(2, unsafe_mul(denominator, inverse)))
    inverse = unsafe_mul(inverse, unsafe_sub(2, unsafe_mul(denominator, inverse)))

    return unsafe_mul(product_low, inverse)


@internal
@view
def _total_vested_at(time: uint256) -> uint256:
    start: uint256 = self.start_time
    if time < start + self.cliff_length:
        return 0
    if time >= self.end_time:
        return self.total_principal

    return self._mul_div_down(
        self.total_principal,
        time - start,
        self.end_time - start,
    )


@internal
@view
def _remaining_principal() -> uint256:
    return self._total_vested_at(self.disabled_at) - self.principal_claimed


@internal
@view
def _claimable_principal(time: uint256) -> uint256:
    return self._total_vested_at(time) - self.principal_claimed


@internal
@view
def _split(remaining: uint256) -> (uint256, uint256):
    balance: uint256 = self.token.balanceOf(self)
    if remaining == 0:
        return 0, balance

    value: uint256 = self.token.convertToAssets(balance)
    if value <= remaining:
        return balance, 0

    yield_shares: uint256 = self._mul_div_down(balance, value - remaining, value)
    return balance - yield_shares, yield_shares


@internal
@pure
def _pro_rata(shares: uint256, part: uint256, whole: uint256) -> uint256:
    if part == whole:
        return shares
    if part == 0:
        return 0
    return self._mul_div_down(shares, part, whole)


@internal
@view
def _unclaimed_shares(time: uint256) -> uint256:
    remaining: uint256 = self._remaining_principal()
    claimable: uint256 = self._claimable_principal(time)
    principal_shares: uint256 = 0
    ignored_yield: uint256 = 0
    principal_shares, ignored_yield = self._split(remaining)
    return self._pro_rata(principal_shares, claimable, remaining)


@internal
@view
def _assert_solvent(remaining: uint256):
    assert self.token.convertToAssets(self.token.balanceOf(self)) >= remaining  # dev: principal insolvent


@external
@view
def vested_principal() -> uint256:
    return self._total_vested_at(min(block.timestamp, self.disabled_at))


@external
@view
def claimable_principal() -> uint256:
    return self._claimable_principal(min(block.timestamp, self.disabled_at))


@external
@view
def unclaimed() -> uint256:
    return self._unclaimed_shares(min(block.timestamp, self.disabled_at))


@external
@view
def locked() -> uint256:
    remaining: uint256 = self._remaining_principal()
    principal_shares: uint256 = 0
    ignored_yield: uint256 = 0
    principal_shares, ignored_yield = self._split(remaining)
    return principal_shares - self._unclaimed_shares(min(block.timestamp, self.disabled_at))


@external
@view
def claimable_yield() -> uint256:
    ignored_principal: uint256 = 0
    yield_shares: uint256 = 0
    ignored_principal, yield_shares = self._split(self._remaining_principal())
    return yield_shares


@external
@nonreentrant("lock")
def claim(beneficiary: address = msg.sender) -> uint256:
    """
    @notice Claim all currently vested principal as vault shares
    """
    assert self.state == READY  # dev: not funded
    recipient: address = self.recipient
    assert msg.sender == recipient or self.open_claim and recipient == beneficiary  # dev: not authorized

    claim_period_end: uint256 = min(block.timestamp, self.disabled_at)
    remaining: uint256 = self._remaining_principal()
    claimable: uint256 = self._claimable_principal(claim_period_end)
    principal_shares: uint256 = 0
    yield_shares: uint256 = 0
    principal_shares, yield_shares = self._split(remaining)
    claim_shares: uint256 = self._pro_rata(principal_shares, claimable, remaining)

    self.principal_claimed += claimable
    self.total_claimed += claim_shares

    if claim_shares > 0:
        assert self.token.transfer(beneficiary, claim_shares, default_return_value=True)
    if yield_shares > 0:
        assert self.token.transfer(self.yield_recipient, yield_shares, default_return_value=True)
        self._assert_solvent(remaining - claimable)

    log Claim(beneficiary, claim_shares)
    if yield_shares > 0:
        log YieldClaim(self.yield_recipient, yield_shares)
    return claim_shares


@external
@nonreentrant("lock")
def claim_yield() -> uint256:
    """
    @notice Send all current yield to the fixed yield recipient
    @dev Permissionless because the destination cannot be changed by the caller
    """
    assert self.state == READY  # dev: not funded
    remaining: uint256 = self._remaining_principal()
    ignored_principal: uint256 = 0
    yield_shares: uint256 = 0
    ignored_principal, yield_shares = self._split(remaining)

    if yield_shares > 0:
        assert self.token.transfer(self.yield_recipient, yield_shares, default_return_value=True)
        self._assert_solvent(remaining)
        log YieldClaim(self.yield_recipient, yield_shares)
    return yield_shares


@external
@nonreentrant("lock")
def revoke(ts: uint256 = block.timestamp, beneficiary: address = msg.sender):
    owner: address = self.owner
    assert self.state == READY  # dev: not funded
    assert msg.sender == owner  # dev: not owner
    assert ts >= block.timestamp and ts < self.end_time  # dev: no back to the future

    remaining: uint256 = self.total_principal - self.principal_claimed
    recipient_remaining: uint256 = self._total_vested_at(ts) - self.principal_claimed
    unvested: uint256 = remaining - recipient_remaining
    principal_shares: uint256 = 0
    yield_shares: uint256 = 0
    principal_shares, yield_shares = self._split(remaining)
    clawback_shares: uint256 = self._pro_rata(principal_shares, unvested, remaining)

    self.disabled_at = ts
    self.owner = empty(address)

    if clawback_shares > 0:
        assert self.token.transfer(beneficiary, clawback_shares, default_return_value=True)
    if yield_shares > 0:
        assert self.token.transfer(self.yield_recipient, yield_shares, default_return_value=True)
        self._assert_solvent(recipient_remaining)

    log Disowned(owner)
    log Revoked(self.recipient, owner, clawback_shares, ts)


@external
def disown():
    assert self.state == READY  # dev: not funded
    owner: address = self.owner
    assert msg.sender == owner  # dev: not owner
    self.owner = empty(address)
    log Disowned(owner)


@external
def set_open_claim(open_claim: bool):
    assert self.state == READY  # dev: not funded
    assert msg.sender == self.recipient  # dev: not recipient
    self.open_claim = open_claim
    log SetOpenClaim(open_claim)


@external
@nonreentrant("lock")
def collect_dust(token: ERC20, beneficiary: address = msg.sender):
    assert self.state == READY  # dev: not funded
    assert token.address != self.token.address  # dev: use claim_yield
    recipient: address = self.recipient
    assert msg.sender == recipient or self.open_claim and recipient == beneficiary  # dev: not authorized

    amount: uint256 = token.balanceOf(self)
    assert token.transfer(beneficiary, amount, default_return_value=True)
