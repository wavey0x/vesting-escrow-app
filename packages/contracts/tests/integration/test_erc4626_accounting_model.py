from hypothesis import given, settings, strategies as st


SCALE = 10**18


def split(balance, value, remaining):
    if remaining == 0:
        return 0, balance
    if value <= remaining:
        return balance, 0
    yield_shares = balance * (value - remaining) // value
    return balance - yield_shares, yield_shares


def mul_div_up(x, y, denominator):
    return (x * y + denominator - 1) // denominator


def payout(principal_shares, remaining_before, remaining_after):
    if remaining_after == 0:
        return principal_shares
    return principal_shares - mul_div_up(
        principal_shares,
        remaining_after,
        remaining_before,
    )


@settings(deadline=None, max_examples=1_000)
@given(
    principal=st.integers(min_value=1, max_value=2**256 - 1),
    balance=st.integers(min_value=1, max_value=2**256 - 1),
    claim_bps=st.integers(min_value=0, max_value=10_000),
    value=st.integers(min_value=1, max_value=2**256 - 1),
)
def test_split_conserves_shares_and_rounds_toward_principal(
    principal,
    balance,
    claim_bps,
    value,
):
    claimable = principal * claim_bps // 10_000
    principal_pool, yield_shares = split(balance, value, principal)
    claim_shares = payout(principal_pool, principal, principal - claimable)
    remaining_shares = balance - yield_shares - claim_shares

    assert yield_shares + claim_shares + remaining_shares == balance
    assert min(yield_shares, claim_shares, remaining_shares) >= 0

    if value > principal:
        # For a proportional ERC-4626 conversion, floor rounding leaves at least
        # the unclaimed principal after yield and vested shares are removed.
        assert remaining_shares * value // balance >= principal - claimable


@settings(deadline=None, max_examples=500)
@given(
    principal=st.integers(min_value=1, max_value=10**36),
    actions=st.lists(
        st.tuples(
            st.integers(min_value=SCALE // 4, max_value=4 * SCALE),
            st.integers(min_value=0, max_value=10_000),
            st.integers(min_value=0, max_value=10**24),
        ),
        min_size=1,
        max_size=20,
    ),
)
def test_lifecycle_conserves_every_share_and_drains_at_completion(principal, actions):
    balance = principal
    remaining = principal
    distributed = 0
    total_shares = principal

    for assets_per_share, claim_bps, donation in actions:
        balance += donation
        total_shares += donation
        claimable = remaining * claim_bps // 10_000
        value = balance * assets_per_share // SCALE
        principal_pool, yield_shares = split(balance, value, remaining)
        claim_shares = payout(principal_pool, remaining, remaining - claimable)
        balance -= yield_shares + claim_shares
        remaining -= claimable
        distributed += yield_shares + claim_shares

        assert balance + distributed == total_shares
        if value > remaining + claimable:
            assert balance * assets_per_share // SCALE >= remaining

    assets_per_share = actions[-1][0]
    value = balance * assets_per_share // SCALE
    principal_pool, yield_shares = split(balance, value, remaining)
    claim_shares = principal_pool
    distributed += yield_shares + claim_shares
    balance -= yield_shares + claim_shares

    assert balance == 0
    assert distributed == total_shares
