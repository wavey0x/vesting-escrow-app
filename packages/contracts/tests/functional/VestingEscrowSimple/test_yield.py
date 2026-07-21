import boa

from tests.helpers import ZERO_ADDRESS, at, deploy


SCALE = 10**18


def split(balance, value, remaining):
    if remaining == 0:
        return 0, balance
    if value <= remaining:
        return balance, 0
    yield_shares = balance * (value - remaining) // value
    return balance - yield_shares, yield_shares


def payout(principal_shares, remaining_before, remaining_after):
    if remaining_after == 0:
        return principal_shares
    numerator = principal_shares * remaining_after
    reserve = numerator // remaining_before
    if numerator % remaining_before:
        reserve += 1
    return principal_shares - reserve


def test_flat_rate_claims_shares(
    chain,
    yield_vesting,
    recipient,
    owner,
    vault,
    amount,
    start_time,
    end_time,
):
    midpoint = start_time + (end_time - start_time) // 2
    chain.pending_timestamp = midpoint
    vested = amount * (midpoint - start_time) // (end_time - start_time)

    assert yield_vesting.claim(sender=recipient) == vested
    assert vault.balanceOf(recipient) == vested
    assert vault.balanceOf(owner) == 0
    assert yield_vesting.principal_claimed() == vested

    chain.pending_timestamp = end_time
    yield_vesting.claim(sender=recipient)

    assert vault.balanceOf(recipient) == amount
    assert vault.balanceOf(yield_vesting) == 0


def test_gain_is_paid_to_owner_and_reserve_is_preserved(
    chain,
    yield_vesting,
    recipient,
    owner,
    vault,
    amount,
    start_time,
    end_time,
):
    vault.set_assets_per_share(12 * SCALE // 10, sender=owner)
    midpoint = start_time + (end_time - start_time) // 2
    chain.pending_timestamp = midpoint
    vested = amount * (midpoint - start_time) // (end_time - start_time)
    balance = vault.balanceOf(yield_vesting)
    principal_pool, yield_shares = split(balance, vault.convertToAssets(balance), amount)
    expected_claim = payout(principal_pool, amount, amount - vested)

    assert yield_vesting.claim(sender=recipient) == expected_claim
    assert vault.balanceOf(recipient) == expected_claim
    assert vault.balanceOf(owner) == yield_shares
    assert vault.balanceOf(yield_vesting) == balance - expected_claim - yield_shares
    assert vault.convertToAssets(vault.balanceOf(yield_vesting)) >= amount - vested

    chain.pending_timestamp = end_time
    yield_vesting.claim(sender=recipient)
    assert vault.balanceOf(yield_vesting) == 0
    assert vault.balanceOf(recipient) + vault.balanceOf(owner) == amount


def test_claim_yield_without_claiming_principal(
    yield_vesting,
    owner,
    recipient,
    vault,
    amount,
):
    vault.set_assets_per_share(125 * SCALE // 100, sender=owner)
    expected = amount * (125 - 100) // 125

    assert yield_vesting.claimable_yield() == expected
    assert yield_vesting.claim_yield(sender=recipient) == expected
    assert vault.balanceOf(owner) == expected
    assert vault.balanceOf(yield_vesting) == amount - expected
    assert yield_vesting.principal_claimed() == 0
    assert vault.convertToAssets(vault.balanceOf(yield_vesting)) >= amount


def test_loss_is_shared_proportionally(
    chain,
    yield_vesting,
    recipient,
    owner,
    vault,
    amount,
    start_time,
    end_time,
):
    vault.set_assets_per_share(8 * SCALE // 10, sender=owner)
    midpoint = start_time + (end_time - start_time) // 2
    chain.pending_timestamp = midpoint
    vested = amount * (midpoint - start_time) // (end_time - start_time)
    expected = payout(amount, amount, amount - vested)

    assert yield_vesting.claim(sender=recipient) == expected
    assert vault.balanceOf(recipient) == expected
    assert vault.balanceOf(owner) == 0

    chain.pending_timestamp = end_time
    yield_vesting.claim(sender=recipient)
    assert vault.balanceOf(recipient) == amount
    assert vault.balanceOf(yield_vesting) == 0


def test_donated_shares_are_yield(
    yield_vesting,
    owner,
    recipient,
    vault,
    amount,
):
    donation = amount // 4
    vault.mint(recipient, donation, sender=owner)
    vault.transfer(yield_vesting, donation, sender=recipient)

    assert yield_vesting.claim_yield(sender=recipient) == donation
    assert vault.balanceOf(owner) == donation
    assert vault.balanceOf(yield_vesting) == amount


def test_revoke_combines_clawback_and_yield_for_owner(
    chain,
    yield_vesting,
    owner,
    recipient,
    vault,
    amount,
    start_time,
    end_time,
):
    vault.set_assets_per_share(12 * SCALE // 10, sender=owner)
    midpoint = start_time + (end_time - start_time) // 2
    chain.pending_timestamp = midpoint
    recipient_principal = amount * (midpoint - start_time) // (end_time - start_time)
    principal_pool, yield_shares = split(amount, vault.convertToAssets(amount), amount)
    clawback = payout(principal_pool, amount, recipient_principal)

    yield_vesting.revoke(sender=owner)

    assert vault.balanceOf(owner) == yield_shares + clawback
    assert vault.convertToAssets(vault.balanceOf(yield_vesting)) >= recipient_principal
    assert yield_vesting.owner() == ZERO_ADDRESS

    yield_vesting.claim(sender=recipient)
    assert vault.balanceOf(yield_vesting) == 0
    assert vault.balanceOf(recipient) + vault.balanceOf(owner) == amount


def test_revoke_shares_loss(
    chain,
    yield_vesting,
    owner,
    recipient,
    vault,
    amount,
    start_time,
    end_time,
):
    vault.set_assets_per_share(8 * SCALE // 10, sender=owner)
    midpoint = start_time + (end_time - start_time) // 2
    chain.pending_timestamp = midpoint
    recipient_principal = amount * (midpoint - start_time) // (end_time - start_time)
    expected_owner = payout(amount, amount, recipient_principal)

    yield_vesting.revoke(sender=owner)
    assert vault.balanceOf(owner) == expected_owner

    yield_vesting.claim(sender=recipient)
    assert vault.balanceOf(recipient) == amount - expected_owner
    assert vault.balanceOf(yield_vesting) == 0


def test_disown_does_not_change_yield_recipient(
    yield_vesting,
    owner,
    recipient,
    vault,
    amount,
):
    yield_vesting.disown(sender=owner)
    vault.set_assets_per_share(125 * SCALE // 100, sender=owner)

    yield_vesting.claim_yield(sender=recipient)

    assert yield_vesting.owner() == ZERO_ADDRESS
    assert yield_vesting.yield_recipient() == owner
    assert vault.balanceOf(owner) == amount * (125 - 100) // 125


def test_share_transfer_cannot_reenter_accounting(
    yield_vesting,
    owner,
    recipient,
    vault,
):
    vault.set_assets_per_share(125 * SCALE // 100, sender=owner)
    vault.set_reentry_target(yield_vesting, sender=owner)

    yield_vesting.claim_yield(sender=recipient)

    assert not vault.reentry_succeeded()


def test_recover_cannot_remove_vault_shares(yield_vesting, owner, vault):
    with boa.reverts(dev="protected token"):
        yield_vesting.recover(vault, sender=owner)


def test_closed_claim_only_allows_recipient(
    chain,
    yield_vesting,
    owner,
    recipient,
    start_time,
    end_time,
):
    yield_vesting.set_open_claim(False, sender=recipient)
    chain.pending_timestamp = start_time + (end_time - start_time) // 2

    with boa.reverts(dev="not authorized"):
        yield_vesting.claim(sender=owner)


def test_vesting_at_amount_limit(
    chain,
    vesting_factory,
    owner,
    recipient,
    asset_token,
):
    maximum = 2**128 - 1
    duration = 100
    start = chain.pending_timestamp + 10
    vault = deploy("test/MockERC4626", asset_token, sender=owner)
    vault.mint(owner, maximum, sender=owner)
    vault.approve(vesting_factory, maximum, sender=owner)
    escrow_address = vesting_factory.deploy_vesting_contract(
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
    escrow = at("VestingEscrowSimple", escrow_address)
    chain.pending_timestamp = start + duration // 2
    expected = maximum * (chain.pending_timestamp - start) // duration

    assert escrow.claim(sender=recipient) == expected
    assert vault.balanceOf(recipient) == expected
    assert vault.balanceOf(escrow) == maximum - expected


def test_repeated_claims_keep_rounding_in_the_reserve(
    chain,
    yield_vesting,
    recipient,
    owner,
    vault,
    amount,
    start_time,
    end_time,
):
    vault.set_assets_per_share(13 * SCALE // 10, sender=owner)
    step = (end_time - start_time) // 4

    for index in range(1, 4):
        chain.pending_timestamp = start_time + step * index
        yield_vesting.claim(sender=recipient)
        remaining = yield_vesting.total_principal() - yield_vesting.principal_claimed()
        assert vault.convertToAssets(vault.balanceOf(yield_vesting)) >= remaining

    chain.pending_timestamp = end_time
    yield_vesting.claim(sender=recipient)
    assert vault.balanceOf(yield_vesting) == 0
