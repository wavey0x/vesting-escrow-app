import ape
from ape.utils import ZERO_ADDRESS


SCALE = 10**18


def split(balance, value, remaining):
    if remaining == 0:
        return 0, balance
    if value <= remaining:
        return balance, 0
    yield_shares = balance * (value - remaining) // value
    return balance - yield_shares, yield_shares


def test_flat_rate_claims_shares(
    chain,
    vesting_v2,
    recipient,
    owner,
    vault,
    amount,
    start_time,
    end_time,
):
    chain.pending_timestamp = start_time + (end_time - start_time) // 2
    tx = vesting_v2.claim(sender=recipient)
    vested = amount * (tx.timestamp - start_time) // (end_time - start_time)

    assert vault.balanceOf(recipient) == vested
    assert vault.balanceOf(owner) == 0
    assert vesting_v2.principal_claimed() == vested

    chain.pending_timestamp = end_time
    vesting_v2.claim(sender=recipient)

    assert vault.balanceOf(recipient) == amount
    assert vault.balanceOf(vesting_v2) == 0


def test_gain_is_paid_to_owner_while_principal_vests(
    chain,
    vesting_v2,
    recipient,
    owner,
    vault,
    amount,
    start_time,
    end_time,
):
    vault.set_assets_per_share(12 * SCALE // 10, sender=owner)
    chain.pending_timestamp = start_time + (end_time - start_time) // 2

    balance = vault.balanceOf(vesting_v2)
    value = vault.convertToAssets(balance)
    principal_pool, yield_shares = split(balance, value, amount)
    tx = vesting_v2.claim(sender=recipient)
    vested = amount * (tx.timestamp - start_time) // (end_time - start_time)
    expected_claim = principal_pool * vested // amount

    assert vault.balanceOf(recipient) == expected_claim
    assert vault.balanceOf(owner) == yield_shares
    assert vault.balanceOf(vesting_v2) + expected_claim + yield_shares == amount
    assert vault.convertToAssets(vault.balanceOf(vesting_v2)) >= amount - vested

    chain.pending_timestamp = end_time
    vesting_v2.claim(sender=recipient)

    assert vault.balanceOf(vesting_v2) == 0
    assert vault.balanceOf(recipient) + vault.balanceOf(owner) == amount


def test_claim_yield_without_claiming_principal(
    vesting_v2,
    owner,
    recipient,
    vault,
    amount,
):
    vault.set_assets_per_share(125 * SCALE // 100, sender=owner)
    expected_yield = amount * (125 - 100) // 125

    assert vesting_v2.claim_yield(sender=recipient).return_value == expected_yield
    assert vault.balanceOf(owner) == expected_yield
    assert vault.balanceOf(vesting_v2) == amount - expected_yield
    assert vesting_v2.principal_claimed() == 0
    assert vault.convertToAssets(vault.balanceOf(vesting_v2)) >= amount


def test_loss_is_shared_by_recipient(
    chain,
    vesting_v2,
    recipient,
    owner,
    vault,
    amount,
    start_time,
    end_time,
):
    vault.set_assets_per_share(8 * SCALE // 10, sender=owner)
    chain.pending_timestamp = start_time + (end_time - start_time) // 2
    tx = vesting_v2.claim(sender=recipient)
    vested = amount * (tx.timestamp - start_time) // (end_time - start_time)

    assert vault.balanceOf(recipient) == amount * vested // amount
    assert vault.balanceOf(owner) == 0

    chain.pending_timestamp = end_time
    vesting_v2.claim(sender=recipient)

    assert vault.balanceOf(recipient) == amount
    assert vault.balanceOf(vesting_v2) == 0


def test_donated_shares_are_yield(
    vesting_v2,
    owner,
    recipient,
    vault,
    amount,
):
    donation = amount // 4
    vault.mint(recipient, donation, sender=owner)
    vault.transfer(vesting_v2, donation, sender=recipient)

    vesting_v2.claim_yield(sender=recipient)

    assert vault.balanceOf(owner) == donation
    assert vault.balanceOf(vesting_v2) == amount


def test_revoke_splits_gain_and_preserves_recipient_principal(
    chain,
    vesting_v2,
    owner,
    recipient,
    vault,
    amount,
    start_time,
    end_time,
):
    vault.set_assets_per_share(12 * SCALE // 10, sender=owner)
    ts = start_time + (end_time - start_time) // 2
    recipient_principal = amount * (ts - start_time) // (end_time - start_time)
    principal_pool, yield_shares = split(amount, vault.convertToAssets(amount), amount)
    clawback = principal_pool * (amount - recipient_principal) // amount

    vesting_v2.revoke(ts, sender=owner)

    assert vault.balanceOf(owner) == yield_shares + clawback
    assert vault.convertToAssets(vault.balanceOf(vesting_v2)) >= recipient_principal
    assert vesting_v2.owner() == ZERO_ADDRESS

    chain.pending_timestamp = ts
    vesting_v2.claim(sender=recipient)

    assert vault.balanceOf(vesting_v2) == 0
    assert vault.balanceOf(recipient) + vault.balanceOf(owner) == amount


def test_revoke_shares_loss(
    chain,
    vesting_v2,
    owner,
    recipient,
    vault,
    amount,
    start_time,
    end_time,
):
    vault.set_assets_per_share(8 * SCALE // 10, sender=owner)
    ts = start_time + (end_time - start_time) // 2
    recipient_principal = amount * (ts - start_time) // (end_time - start_time)

    vesting_v2.revoke(ts, sender=owner)
    assert vault.balanceOf(owner) == amount - recipient_principal

    chain.pending_timestamp = ts
    vesting_v2.claim(sender=recipient)

    assert vault.balanceOf(recipient) == recipient_principal
    assert vault.balanceOf(vesting_v2) == 0


def test_revoke_beneficiary_does_not_redirect_yield(
    vesting_v2,
    owner,
    recipient,
    cold_storage,
    vault,
    amount,
    start_time,
    end_time,
):
    vault.set_assets_per_share(125 * SCALE // 100, sender=owner)
    ts = start_time + (end_time - start_time) // 2
    vested = amount * (ts - start_time) // (end_time - start_time)
    principal_pool, yield_shares = split(amount, vault.convertToAssets(amount), amount)
    clawback = principal_pool * (amount - vested) // amount

    vesting_v2.revoke(ts, cold_storage, sender=owner)

    assert vault.balanceOf(owner) == yield_shares
    assert vault.balanceOf(cold_storage) == clawback


def test_disown_does_not_change_yield_recipient(
    vesting_v2,
    owner,
    recipient,
    vault,
    amount,
):
    vesting_v2.disown(sender=owner)
    vault.set_assets_per_share(125 * SCALE // 100, sender=owner)

    vesting_v2.claim_yield(sender=recipient)

    assert vesting_v2.owner() == ZERO_ADDRESS
    assert vesting_v2.yield_recipient() == owner
    assert vault.balanceOf(owner) == amount * (125 - 100) // 125


def test_share_transfer_cannot_reenter_accounting(
    vesting_v2,
    owner,
    recipient,
    vault,
):
    vault.set_assets_per_share(125 * SCALE // 100, sender=owner)
    vault.set_reentry_target(vesting_v2, sender=owner)

    vesting_v2.claim_yield(sender=recipient)

    assert not vault.reentry_succeeded()


def test_collect_dust_cannot_remove_vault_shares(
    vesting_v2,
    owner,
    recipient,
    vault,
    asset_token,
):
    with ape.reverts(dev_message="dev: use claim_yield"):
        vesting_v2.collect_dust(vault, sender=recipient)

    dust = 123
    asset_token.mint(vesting_v2, dust, sender=owner)
    vesting_v2.collect_dust(asset_token, sender=recipient)

    assert asset_token.balanceOf(recipient) == dust


def test_open_claim_controls_third_party_claims(
    vesting_v2,
    owner,
    recipient,
):
    vesting_v2.set_open_claim(False, sender=recipient)

    with ape.reverts(dev_message="dev: not authorized"):
        vesting_v2.claim(recipient, sender=owner)


def test_full_precision_vesting_at_uint256_limit(
    chain,
    project,
    vesting_factory,
    owner,
    recipient,
    asset_token,
):
    maximum = 2**256 - 1
    duration = 100
    start = chain.pending_timestamp + 10
    vault = owner.deploy(project.MockERC4626, asset_token)
    vault.mint(owner, maximum, sender=owner)
    vault.approve(vesting_factory, maximum, sender=owner)
    receipt = vesting_factory.deploy_vesting_contract(
        vault,
        recipient,
        maximum,
        duration,
        start,
        0,
        True,
        0,
        owner,
        True,
        sender=owner,
    )
    escrow = project.VestingEscrowSimpleV2.at(receipt.return_value)
    chain.pending_timestamp = start + duration // 2

    tx = escrow.claim(sender=recipient)
    expected = maximum * (tx.timestamp - start) // duration

    assert vault.balanceOf(recipient) == expected
    assert vault.balanceOf(escrow) == maximum - expected
