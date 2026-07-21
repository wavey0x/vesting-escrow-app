import ape
from ape.utils import ZERO_ADDRESS


def test_deploys_ready_v2_escrow(
    project,
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

    receipt = vesting_factory.deploy_vesting_contract(
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
    escrow = project.VestingEscrowSimpleV2.at(receipt.return_value)
    created = vesting_factory.VestingEscrowCreated.from_receipt(receipt)
    configured = vesting_factory.VestingEscrowV2Configured.from_receipt(receipt)

    assert len(created) == 1
    assert created[0] == vesting_factory.VestingEscrowCreated(
        owner,
        vault,
        recipient,
        escrow,
        amount,
        start_time,
        duration,
        cliff_duration,
        open_claim,
    )
    assert len(configured) == 1
    assert configured[0] == vesting_factory.VestingEscrowV2Configured(
        escrow,
        asset_token,
        owner,
        amount,
    )
    assert escrow.state() == 2
    assert escrow.token() == vault
    assert escrow.asset() == asset_token
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

    receipt = vesting_factory.deploy_vesting_contract(
        token,
        recipient,
        amount,
        duration,
        start_time,
        sender=owner,
    )

    assert vesting_factory.VestingEscrowV2Configured.from_receipt(receipt) == []


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

    with ape.reverts():
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

    with ape.reverts(dev_message="dev: invalid yield owner"):
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

    with ape.reverts(dev_message="dev: incorrect funding"):
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
    project,
    vesting_factory,
    owner,
    recipient,
    asset_token,
    duration,
    start_time,
):
    vault = owner.deploy(project.MockERC4626, asset_token)
    vault.set_assets_per_share(1, sender=owner)
    vault.mint(owner, 1, sender=owner)
    vault.approve(vesting_factory, 1, sender=owner)

    with ape.reverts(dev_message="dev: zero principal"):
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
    with ape.reverts(dev_message="dev: can only initialize once"):
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

    with ape.reverts(dev_message="dev: not factory"):
        vesting_v2_target.finalize_funding(sender=owner)
