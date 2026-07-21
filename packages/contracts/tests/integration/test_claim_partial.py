from hypothesis import given, settings, strategies as st


@settings(deadline=None)
@given(sleep_time=st.integers(min_value=1, max_value=100000))
def test_claim_partial_copy(
    chain,
    vesting,
    recipient,
    token,
    amount,
    start_time,
    sleep_time,
    end_time,
    cliff_duration,
):
    chain.pending_timestamp += sleep_time

    vesting.claim(sender=recipient)
    if chain.pending_timestamp - start_time > cliff_duration:
        expected_amount = amount * (chain.pending_timestamp - start_time) // (end_time - start_time)
    else:
        expected_amount = 0

    assert token.balanceOf(recipient) == expected_amount
