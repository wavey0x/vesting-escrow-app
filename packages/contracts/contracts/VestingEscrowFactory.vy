#pragma version 0.4.3
#pragma evm-version prague

"""
@title Vesting Escrow Factory
@author Curve Finance, Yearn Finance
@license MIT
@notice Deploys immutable minimal-proxy vesting escrows
"""

from ethereum.ercs import IERC20


interface VestingEscrowSimple:
    def initialize(
        owner: address,
        token: IERC20,
        recipient: address,
        amount: uint256,
        start_time: uint256,
        end_time: uint256,
        cliff_length: uint256,
        open_claim: bool,
        yield_to_owner: bool,
    ) -> (address, uint256): nonpayable


event VestingEscrowCreated:
    funder: indexed(address)
    token: indexed(IERC20)
    recipient: indexed(address)
    owner: address
    escrow: address
    amount: uint256
    vesting_start: uint256
    vesting_duration: uint256
    cliff_length: uint256
    open_claim: bool
    yield_to_owner: bool
    asset: address
    principal: uint256


BPS: constant(uint256) = 10_000

TARGET: public(immutable(address))
VYPER: public(immutable(address))


@deploy
def __init__(target: address, vyper_donate: address):
    assert target != empty(address)  # dev: invalid target
    TARGET = target
    VYPER = vyper_donate


@external
@pure
def version() -> uint256:
    return 2


@external
@nonreentrant
def deploy_vesting_contract(
    token: IERC20,
    recipient: address,
    amount: uint256,
    vesting_duration: uint256,
    vesting_start: uint256,
    cliff_length: uint256,
    open_claim: bool,
    support_vyper: uint256,
    owner: address,
    yield_to_owner: bool,
) -> address:
    """Deploy, fund, and initialize one vesting escrow."""
    assert support_vyper <= BPS  # dev: donation exceeds 100%

    escrow: address = create_minimal_proxy_to(TARGET)
    assert extcall token.transferFrom(msg.sender, escrow, amount, default_return_value=True)  # dev: funding failed

    asset: address = empty(address)
    principal: uint256 = 0
    asset, principal = extcall VestingEscrowSimple(escrow).initialize(
        owner,
        token,
        recipient,
        amount,
        vesting_start,
        vesting_start + vesting_duration,
        cliff_length,
        open_claim,
        yield_to_owner,
    )

    if support_vyper > 0:
        assert VYPER != empty(address)  # dev: invalid donation recipient
        donation: uint256 = (
            amount // BPS * support_vyper
            + (amount % BPS) * support_vyper // BPS
        )
        if donation > 0:
            assert extcall token.transferFrom(
                msg.sender,
                VYPER,
                donation,
                default_return_value=True,
            )  # dev: donation failed

    log VestingEscrowCreated(
        funder=msg.sender,
        token=token,
        recipient=recipient,
        owner=owner,
        escrow=escrow,
        amount=amount,
        vesting_start=vesting_start,
        vesting_duration=vesting_duration,
        cliff_length=cliff_length,
        open_claim=open_claim,
        yield_to_owner=yield_to_owner,
        asset=asset,
        principal=principal,
    )
    return escrow
