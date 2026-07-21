import boa

from tests.helpers import ZERO_ADDRESS, at, deploy, events


def test_deploys_ready_v2_escrow(
    vesting_factory,
    owner,
    recipient,
    vault,
    asset_token,
    amount,
    duration,
    start_time,
    cliff_duration,
    open_claim,
):
    vault.mint(owner, amount, sender=owner)
    vault.approve(vesting_factory, amount, sender=owner)

    escrow_address = vesting_factory.deploy_vesting_contract(
        vault,
        recipient,
        amount,
        duration,
        start_time,
        cliff_duration,
        open_claim,
        0,
        owner,
        True,
        sender=owner,
    )
    escrow = at("VestingEscrowSimpleV2", escrow_address)
    created = events(vesting_factory, "VestingEscrowCreated", include_child_logs=False)
    configured = events(vesting_factory, "VestingEscrowV2Configured", include_child_logs=False)

    assert len(created) == 1
    assert created[0].funder == owner
    assert created[0].token == vault.address
    assert created[0].recipient == recipient
    assert created[0].escrow == escrow.address
    assert created[0].amount == amount
    assert created[0].vesting_start == start_time
    assert created[0].vesting_duration == duration
    assert created[0].cliff_length == cliff_duration
    assert created[0].open_claim == open_claim
    assert len(configured) == 1
    assert configured[0].escrow == escrow.address
    assert configured[0].asset == asset_token.address
    assert configured[0].yield_recipient == owner
    assert configured[0].principal == amount
    assert escrow.state() == 2
    assert escrow.token() == vault.address
    assert escrow.asset() == asset_token.address
    assert escrow.owner() == owner
    assert escrow.yield_recipient() == owner
    assert escrow.total_locked() == amount
    assert escrow.total_principal() == amount
    assert vault.balanceOf(escrow) == amount


def test_legacy_default_does_not_emit_v2_event(
    vesting_factory,
    owner,
    recipient,
    token,
    amount,
    duration,
    start_time,
):
    token.mint(owner, amount, sender=owner)
    token.approve(vesting_factory, amount, sender=owner)

    vesting_factory.deploy_vesting_contract(
        token,
        recipient,
        amount,
        duration,
        start_time,
        sender=owner,
    )

    assert events(vesting_factory, "VestingEscrowV2Configured", include_child_logs=False) == []


def test_plain_erc20_cannot_use_v2_mode(
    vesting_factory,
    owner,
    recipient,
    token,
    amount,
    duration,
    start_time,
):
    token.mint(owner, amount, sender=owner)
    token.approve(vesting_factory, amount, sender=owner)
    length = vesting_factory.escrows_length()

    with boa.reverts():
        vesting_factory.deploy_vesting_contract(
            token,
            recipient,
            amount,
            duration,
            start_time,
            0,
            True,
            0,
            owner,
            True,
            sender=owner,
        )

    assert vesting_factory.escrows_length() == length
    assert token.balanceOf(owner) == amount


def test_v2_mode_rejects_zero_yield_owner(
    vesting_factory,
    owner,
    recipient,
    vault,
    amount,
    duration,
    start_time,
):
    vault.mint(owner, amount, sender=owner)
    vault.approve(vesting_factory, amount, sender=owner)
    length = vesting_factory.escrows_length()

    with boa.reverts(dev="invalid yield owner"):
        vesting_factory.deploy_vesting_contract(
            vault,
            recipient,
            amount,
            duration,
            start_time,
            0,
            True,
            0,
            ZERO_ADDRESS,
            True,
            sender=owner,
        )

    assert vesting_factory.escrows_length() == length
    assert vault.balanceOf(owner) == amount


def test_v2_mode_requires_exact_share_funding(
    vesting_factory,
    owner,
    recipient,
    vault,
    amount,
    duration,
    start_time,
):
    vault.set_transfer_fee_bps(100, sender=owner)
    vault.mint(owner, amount, sender=owner)
    vault.approve(vesting_factory, amount, sender=owner)
    length = vesting_factory.escrows_length()

    with boa.reverts(dev="incorrect funding"):
        vesting_factory.deploy_vesting_contract(
            vault,
            recipient,
            amount,
            duration,
            start_time,
            0,
            True,
            0,
            owner,
            True,
            sender=owner,
        )

    assert vesting_factory.escrows_length() == length
    assert vault.balanceOf(owner) == amount


def test_v2_mode_rejects_zero_initial_principal(
    vesting_factory,
    owner,
    recipient,
    asset_token,
    duration,
    start_time,
):
    vault = deploy("test/MockERC4626", asset_token, sender=owner)
    vault.set_assets_per_share(1, sender=owner)
    vault.mint(owner, 1, sender=owner)
    vault.approve(vesting_factory, 1, sender=owner)

    with boa.reverts(dev="zero principal"):
        vesting_factory.deploy_vesting_contract(
            vault,
            recipient,
            1,
            duration,
            start_time,
            0,
            True,
            0,
            owner,
            True,
            sender=owner,
        )


def test_implementation_cannot_be_initialized(
    vesting_v2_target,
    owner,
    recipient,
    vault,
    amount,
    duration,
    start_time,
):
    with boa.reverts(dev="can only initialize once"):
        vesting_v2_target.initialize(
            owner,
            vault,
            recipient,
            amount,
            start_time,
            start_time + duration,
            0,
            True,
            sender=owner,
        )

    with boa.reverts(dev="not factory"):
        vesting_v2_target.finalize_funding(sender=owner)
