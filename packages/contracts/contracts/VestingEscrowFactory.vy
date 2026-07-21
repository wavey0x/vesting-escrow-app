# @version 0.3.10

"""
@title Vesting Escrow Factory
@author Curve Finance, Yearn Finance
@license MIT
@notice Stores and distributes ERC20 tokens by deploying vesting escrow contracts
"""

from vyper.interfaces import ERC20


interface VestingEscrowSimple:
    def initialize(
        owner: address,
        token: ERC20,
        recipient: address,
        amount: uint256,
        start_time: uint256,
        end_time: uint256,
        cliff_length: uint256,
        open_claim: bool,
    ) -> bool: nonpayable


interface VestingEscrowSimpleV2:
    def initialize(
        owner: address,
        token: ERC20,
        recipient: address,
        amount: uint256,
        start_time: uint256,
        end_time: uint256,
        cliff_length: uint256,
        open_claim: bool,
    ) -> bool: nonpayable
    def finalize_funding() -> uint256: nonpayable
    def asset() -> address: view


event VestingEscrowCreated:
    funder: indexed(address)
    token: indexed(ERC20)
    recipient: indexed(address)
    escrow: address
    amount: uint256
    vesting_start: uint256
    vesting_duration: uint256
    cliff_length: uint256
    open_claim: bool


event VestingEscrowV2Configured:
    escrow: indexed(address)
    asset: indexed(address)
    yield_recipient: indexed(address)
    principal: uint256


TARGET: public(immutable(address))
TARGET_V2: public(immutable(address))
VYPER: public(immutable(address))
escrows_length: public(uint256)
escrows: public(address[1000000000000])


@external
def __init__(target: address, target_v2: address, vyper_donate: address):
    """
    @notice Contract constructor
    @dev Prior to deployment you must deploy one copy of `VestingEscrowSimple` which
         is used as a library for vesting contracts deployed by this factory
    @param target `VestingEscrowSimple` contract address
    @param target_v2 `VestingEscrowSimpleV2` contract address
    @param vyper_donate Vyper Safe address for donations (vyperlang.eth on mainnet)
    """
    TARGET = target
    TARGET_V2 = target_v2
    VYPER = vyper_donate


@external
def deploy_vesting_contract(
    token: ERC20,
    recipient: address,
    amount: uint256,
    vesting_duration: uint256,
    vesting_start: uint256 = block.timestamp,
    cliff_length: uint256 = 0,
    open_claim: bool = True,
    support_vyper: uint256 = 0,
    owner: address = msg.sender,
    yield_to_owner: bool = False,
) -> address:
    """
    @notice Deploy a new vesting contract
    @dev Prior to deployment you must approve `amount` + `amount` * `support_vyper` / 10_000
         tokens
    @param token ERC20 token being distributed
    @param recipient Address to vest tokens for
    @param amount Amount of tokens being vested for `recipient`
    @param vesting_duration Time period (in seconds) over which tokens are released
    @param vesting_start Epoch time when tokens begin to vest
    @param open_claim Switch if anyone can claim for `recipient`
    @param support_vyper Donation percentage in bps, 0% by default
    @param owner Vesting contract owner
    @param yield_to_owner Treat `token` as ERC-4626 shares and send yield to the original owner
    """
    assert cliff_length <= vesting_duration  # dev: incorrect vesting cliff
    assert vesting_start + vesting_duration > block.timestamp  # dev: just use a transfer, dummy
    assert vesting_duration > 0  # dev: duration must be > 0
    assert recipient not in [self, empty(address), token.address, owner]  # dev: wrong recipient

    target: address = TARGET
    if yield_to_owner:
        target = TARGET_V2
    escrow: address = create_minimal_proxy_to(target)

    if yield_to_owner:
        VestingEscrowSimpleV2(escrow).initialize(
            owner,
            token,
            recipient,
            amount,
            vesting_start,
            vesting_start + vesting_duration,
            cliff_length,
            open_claim,
        )
    else:
        VestingEscrowSimple(escrow).initialize(
            owner,
            token,
            recipient,
            amount,
            vesting_start,
            vesting_start + vesting_duration,
            cliff_length,
            open_claim,
        )
    # skip transferFrom and approve and send directly to escrow
    assert token.transferFrom(msg.sender, escrow, amount, default_return_value=True)  # dev: funding failed

    if yield_to_owner:
        principal: uint256 = VestingEscrowSimpleV2(escrow).finalize_funding()
        log VestingEscrowV2Configured(
            escrow,
            VestingEscrowSimpleV2(escrow).asset(),
            owner,
            principal,
        )

    if support_vyper > 0:
        assert VYPER != empty(address)  # dev: lost donation
        assert token.transferFrom(
            msg.sender,
            VYPER,
            amount * support_vyper / 10_000,
            default_return_value=True
        )  # dev: donation failed

    self.escrows[self.escrows_length] = escrow
    self.escrows_length += 1
    log VestingEscrowCreated(
        msg.sender,
        token,
        recipient,
        escrow,
        amount,
        vesting_start,
        vesting_duration,
        cliff_length,
        open_claim,
    )
    return escrow
