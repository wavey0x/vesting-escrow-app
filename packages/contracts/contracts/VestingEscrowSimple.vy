#pragma version 0.4.3
#pragma evm-version prague

"""
@title Simple Vesting Escrow
@author Curve Finance, Yearn Finance
@license MIT
@notice Vests ERC-20 tokens or the principal value of ERC-4626 shares
"""

from ethereum.ercs import IERC20


interface ERC4626:
    def asset() -> address: view
    def convertToAssets(shares: uint256) -> uint256: view
    def convertToShares(assets: uint256) -> uint256: view
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


MAX_AMOUNT: constant(uint256) = 2**128 - 1
MAX_DURATION: constant(uint256) = 2**64 - 1

recipient: public(address)
token: public(ERC4626)
start_time: public(uint256)
end_time: public(uint256)
cliff_length: public(uint256)
total_locked: public(uint256)
total_claimed: public(uint256)
total_principal: public(uint256)
principal_claimed: public(uint256)
disabled_at: public(uint256)
open_claim: public(bool)
initialized: public(bool)
owner: public(address)
yield_recipient: public(address)
yield_to_owner: public(bool)


@deploy
def __init__():
    # Prevent initialization of the implementation itself.
    self.initialized = True


@external
@pure
def version() -> uint256:
    return 2


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
    yield_to_owner: bool,
) -> (address, uint256):
    """
    @notice Initialize a funded minimal proxy
    @return The accounting asset and initial principal
    """
    assert not self.initialized  # dev: can only initialize once
    self.initialized = True

    assert amount > 0  # dev: amount must be > 0
    assert amount <= MAX_AMOUNT  # dev: amount too large
    assert owner != empty(address)  # dev: invalid owner
    assert recipient not in [empty(address), self, token.address, owner]  # dev: invalid recipient
    assert end_time > block.timestamp and end_time > start_time  # dev: invalid vesting period
    duration: uint256 = end_time - start_time
    assert duration <= MAX_DURATION  # dev: duration too long
    assert cliff_length <= duration  # dev: invalid cliff
    assert staticcall token.balanceOf(self) >= amount  # dev: escrow not funded

    asset: address = token.address
    principal: uint256 = amount
    yield_recipient: address = empty(address)
    if yield_to_owner:
        asset = staticcall token.asset()
        assert asset != empty(address)  # dev: invalid asset
        principal = staticcall token.convertToAssets(amount)
        assert principal > 0  # dev: zero principal
        assert principal <= MAX_AMOUNT  # dev: principal too large
        yield_recipient = owner

    self.owner = owner
    self.token = token
    self.recipient = recipient
    self.start_time = start_time
    self.end_time = end_time
    self.cliff_length = cliff_length
    self.total_locked = amount
    self.total_principal = principal
    self.disabled_at = end_time
    self.open_claim = open_claim
    self.yield_recipient = yield_recipient
    self.yield_to_owner = yield_to_owner

    return asset, principal


@internal
@view
def _total_vested_at(time: uint256) -> uint256:
    start: uint256 = self.start_time
    if time < start + self.cliff_length:
        return 0
    if time >= self.end_time:
        return self.total_principal
    return self.total_principal * (time - start) // (self.end_time - start)


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
    balance: uint256 = staticcall self.token.balanceOf(self)
    if not self.yield_to_owner:
        return balance, 0
    if remaining == 0:
        return 0, balance

    value: uint256 = staticcall self.token.convertToAssets(balance)
    if value <= remaining:
        return balance, 0

    principal_shares: uint256 = staticcall self.token.convertToShares(remaining)
    if staticcall self.token.convertToAssets(principal_shares) < remaining:
        principal_shares += 1
    return principal_shares, balance - principal_shares


@internal
@pure
def _payout_shares(
    principal_shares: uint256,
    remaining_before: uint256,
    remaining_after: uint256,
) -> uint256:
    if remaining_after == 0:
        return principal_shares

    whole: uint256 = principal_shares // remaining_before
    remainder: uint256 = principal_shares % remaining_before
    scaled_remainder: uint256 = remainder * remaining_after
    reserve: uint256 = whole * remaining_after + scaled_remainder // remaining_before
    if scaled_remainder % remaining_before > 0:
        reserve += 1
    return principal_shares - reserve


@internal
@view
def _unclaimed_shares(time: uint256) -> uint256:
    remaining: uint256 = self._remaining_principal()
    claimable: uint256 = self._claimable_principal(time)
    if claimable == 0:
        return 0

    principal_shares: uint256 = 0
    ignored_yield: uint256 = 0
    principal_shares, ignored_yield = self._split(remaining)
    return self._payout_shares(principal_shares, remaining, remaining - claimable)


@external
@view
def asset() -> address:
    if self.yield_to_owner:
        return staticcall self.token.asset()
    return self.token.address


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
    if remaining == 0:
        return 0

    principal_shares: uint256 = 0
    ignored_yield: uint256 = 0
    principal_shares, ignored_yield = self._split(remaining)
    return principal_shares - self._unclaimed_shares(min(block.timestamp, self.disabled_at))


@external
@view
def claimable_yield() -> uint256:
    if not self.yield_to_owner:
        return 0
    ignored_principal: uint256 = 0
    yield_shares: uint256 = 0
    ignored_principal, yield_shares = self._split(self._remaining_principal())
    return yield_shares


@external
@nonreentrant
def claim() -> uint256:
    """Claim all currently vested principal to the fixed recipient."""
    assert self.initialized  # dev: not initialized
    recipient: address = self.recipient
    assert msg.sender == recipient or self.open_claim  # dev: not authorized

    remaining: uint256 = self._remaining_principal()
    claimable: uint256 = self._claimable_principal(min(block.timestamp, self.disabled_at))
    assert claimable > 0  # dev: nothing to claim

    principal_shares: uint256 = 0
    yield_shares: uint256 = 0
    principal_shares, yield_shares = self._split(remaining)
    claim_shares: uint256 = self._payout_shares(principal_shares, remaining, remaining - claimable)
    assert claim_shares > 0  # dev: nothing to claim

    self.principal_claimed += claimable
    self.total_claimed += claim_shares

    assert extcall self.token.transfer(recipient, claim_shares, default_return_value=True)
    if yield_shares > 0:
        assert extcall self.token.transfer(self.yield_recipient, yield_shares, default_return_value=True)

    log Claim(recipient=recipient, claimed=claim_shares)
    if yield_shares > 0:
        log YieldClaim(recipient=self.yield_recipient, claimed=yield_shares)
    return claim_shares


@external
@nonreentrant
def claim_yield() -> uint256:
    """Send current yield to the fixed original owner."""
    assert self.initialized and self.yield_to_owner  # dev: yield disabled

    remaining: uint256 = self._remaining_principal()
    ignored_principal: uint256 = 0
    yield_shares: uint256 = 0
    ignored_principal, yield_shares = self._split(remaining)

    if yield_shares > 0:
        assert extcall self.token.transfer(self.yield_recipient, yield_shares, default_return_value=True)
        log YieldClaim(recipient=self.yield_recipient, claimed=yield_shares)
    return yield_shares


@external
@nonreentrant
def revoke():
    """Stop vesting now and return unvested principal and current yield to the owner."""
    owner: address = self.owner
    assert msg.sender == owner  # dev: not owner
    assert block.timestamp < self.end_time  # dev: vesting complete

    remaining: uint256 = self.total_principal - self.principal_claimed
    recipient_remaining: uint256 = self._total_vested_at(block.timestamp) - self.principal_claimed
    principal_shares: uint256 = 0
    yield_shares: uint256 = 0
    principal_shares, yield_shares = self._split(remaining)
    clawback_shares: uint256 = self._payout_shares(principal_shares, remaining, recipient_remaining)

    self.disabled_at = block.timestamp
    self.owner = empty(address)

    owner_shares: uint256 = clawback_shares + yield_shares
    if owner_shares > 0:
        assert extcall self.token.transfer(owner, owner_shares, default_return_value=True)
    if yield_shares > 0:
        log YieldClaim(recipient=self.yield_recipient, claimed=yield_shares)

    log Disowned(owner=owner)
    log Revoked(recipient=self.recipient, owner=owner, rugged=clawback_shares, ts=block.timestamp)


@external
def disown():
    owner: address = self.owner
    assert msg.sender == owner  # dev: not owner
    self.owner = empty(address)
    log Disowned(owner=owner)


@external
def set_open_claim(open_claim: bool):
    assert msg.sender == self.recipient  # dev: not recipient
    self.open_claim = open_claim
    log SetOpenClaim(state=open_claim)


@external
@nonreentrant
def recover(token: IERC20):
    """Send an unrelated token balance to the fixed recipient."""
    assert token.address != self.token.address  # dev: protected token
    amount: uint256 = staticcall token.balanceOf(self)
    if amount > 0:
        assert extcall token.transfer(self.recipient, amount, default_return_value=True)
