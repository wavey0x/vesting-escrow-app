import boa

from tests.helpers import ZERO_ADDRESS, at, deploy, events


def test_approve_fail(
    vesting_factory,
    owner,
    recipient,
    token,
    amount,
    start_time,
    duration,
    cliff_duration,
    open_claim,
    support_vyper,
):
    with boa.reverts():  # no error message, depends on token
        vesting_factory.deploy_vesting_contract(
            token,
            recipient,
            amount,
            duration,
            start_time,
            cliff_duration,
            open_claim,
            support_vyper,
            owner,
            sender=owner,
        )

    assert vesting_factory.escrows_length() == 0


def test_target_is_set(vesting_factory, vesting_target):
    assert vesting_factory.TARGET() == vesting_target.address


def test_v2_target_is_set(vesting_factory, vesting_v2_target):
    assert vesting_factory.TARGET_V2() == vesting_v2_target.address


def test_vyper_is_set(vesting_factory, vyper_donation):
    assert vesting_factory.VYPER() == vyper_donation


def test_deploy(
    vesting_factory,
    owner,
    recipient,
    token,
    amount,
    support_amount,
    start_time,
    duration,
    cliff_duration,
    open_claim,
    support_vyper,
):
    token.mint(owner, amount + support_amount, sender=owner)
    token.approve(vesting_factory, amount + support_amount, sender=owner)
    vesting_escrow_address = vesting_factory.deploy_vesting_contract(
        token,
        recipient,
        amount,
        duration,
        start_time,
        cliff_duration,
        open_claim,
        support_vyper,
        owner,
        sender=owner,
    )

    vesting_escrows = events(vesting_factory, "VestingEscrowCreated", include_child_logs=False)

    assert len(vesting_escrows) == 1
    assert vesting_escrows[0].funder == owner
    assert vesting_escrows[0].token == token.address
    assert vesting_escrows[0].recipient == recipient
    assert vesting_escrows[0].escrow == vesting_escrow_address
    assert vesting_escrows[0].amount == amount
    assert vesting_escrows[0].vesting_start == start_time
    assert vesting_escrows[0].vesting_duration == duration
    assert vesting_escrows[0].cliff_length == cliff_duration
    assert vesting_escrows[0].open_claim == open_claim
    assert vesting_factory.escrows_length() == 1
    assert vesting_factory.escrows(0) == vesting_escrow_address


def test_records_escrows_in_deployment_order(
    vesting_factory,
    owner,
    recipient,
    token,
    amount,
    support_amount,
    start_time,
    duration,
    cliff_duration,
    open_claim,
    support_vyper,
):
    total_amount = 2 * (amount + support_amount)
    token.mint(owner, total_amount, sender=owner)
    token.approve(vesting_factory, total_amount, sender=owner)

    deployed = []
    for _ in range(2):
        escrow = vesting_factory.deploy_vesting_contract(
            token,
            recipient,
            amount,
            duration,
            start_time,
            cliff_duration,
            open_claim,
            support_vyper,
            owner,
            sender=owner,
        )
        deployed.append(escrow)

    assert vesting_factory.escrows_length() == 2
    assert [vesting_factory.escrows(i) for i in range(2)] == deployed


def test_default_vyper_donation_is_zero(
    vesting_factory,
    vyper_donation,
    owner,
    recipient,
    token,
    amount,
    start_time,
    duration,
    cliff_duration,
    open_claim,
):
    donation_balance = token.balanceOf(vyper_donation)
    token.mint(owner, amount, sender=owner)
    token.approve(vesting_factory, amount, sender=owner)

    escrow = vesting_factory.deploy_vesting_contract(
        token,
        recipient,
        amount,
        duration,
        start_time,
        cliff_duration,
        open_claim,
        sender=owner,
    )
    vesting_escrow = at("VestingEscrowSimple", escrow)

    assert token.balanceOf(vyper_donation) == donation_balance
    assert token.balanceOf(vesting_escrow) == amount
    assert vesting_escrow.owner() == owner


def test_init_variables(
    vesting_factory,
    owner,
    recipient,
    token,
    amount,
    support_amount,
    start_time,
    duration,
    cliff_duration,
    open_claim,
    support_vyper,
):
    token.mint(owner, amount + support_amount, sender=owner)
    token.approve(vesting_factory, amount + support_amount, sender=owner)
    escrow = vesting_factory.deploy_vesting_contract(
        token,
        recipient,
        amount,
        duration,
        start_time,
        cliff_duration,
        open_claim,
        support_vyper,
        sender=owner,
    )

    vesting_escrow = at("VestingEscrowSimple", escrow)

    assert vesting_escrow.token() == token.address
    assert vesting_escrow.owner() == owner
    assert vesting_escrow.recipient() == recipient
    assert vesting_escrow.start_time() == start_time
    assert vesting_escrow.end_time() == start_time + duration
    assert vesting_escrow.total_locked() == amount
    assert vesting_escrow.open_claim()


def test_transfer_events(
    vesting_factory,
    vyper_donation,
    owner,
    recipient,
    token,
    amount,
    support_amount,
    start_time,
    duration,
    cliff_duration,
    open_claim,
    support_vyper,
):
    token.mint(owner, amount + support_amount, sender=owner)
    token.approve(vesting_factory, amount + support_amount, sender=owner)
    vesting_escrow = vesting_factory.deploy_vesting_contract(
        token,
        recipient,
        amount,
        duration,
        start_time,
        cliff_duration,
        open_claim,
        support_vyper,
        sender=owner,
    )
    transfers = events(vesting_factory, "Transfer")

    assert len(transfers) == 2
    assert (transfers[0].sender, transfers[0].receiver, transfers[0].value) == (
        owner,
        vesting_escrow,
        amount,
    )
    assert (transfers[1].sender, transfers[1].receiver, transfers[1].value) == (
        owner,
        vyper_donation,
        support_amount,
    )


def test_vesting_duration(
    vesting_factory,
    owner,
    recipient,
    token,
    amount,
    support_amount,
    start_time,
    cliff_duration,
    open_claim,
    support_vyper,
):
    token.mint(owner, amount + support_amount, sender=owner)
    token.approve(vesting_factory, amount + support_amount, sender=owner)
    with boa.reverts(dev="incorrect vesting cliff"):
        vesting_factory.deploy_vesting_contract(
            token,
            recipient,
            amount,
            0,
            start_time,
            cliff_duration,
            open_claim,
            support_vyper,
            sender=owner,
        )


def test_wrong_recipient(
    vesting_factory,
    owner,
    token,
    amount,
    support_amount,
    start_time,
    duration,
    cliff_duration,
    open_claim,
    support_vyper,
):
    token.mint(owner, amount + support_amount, sender=owner)
    token.approve(vesting_factory, amount + support_amount, sender=owner)

    for wrong_recipient in [vesting_factory, ZERO_ADDRESS, token, owner]:
        with boa.reverts(dev="wrong recipient"):
            vesting_factory.deploy_vesting_contract(
                token,
                wrong_recipient,
                amount,
                duration,
                start_time,
                cliff_duration,
                open_claim,
                support_vyper,
                sender=owner,
            )


def test_use_transfer(
    chain,
    vesting_factory,
    owner,
    recipient,
    token,
    amount,
    support_amount,
    start_time,
    duration,
    cliff_duration,
    open_claim,
    support_vyper,
):
    token.mint(owner, amount + support_amount, sender=owner)
    token.approve(vesting_factory, amount + support_amount, sender=owner)
    chain.pending_timestamp += start_time + duration

    with boa.reverts(dev="just use a transfer, dummy"):
        vesting_factory.deploy_vesting_contract(
            token,
            recipient,
            amount,
            duration,
            start_time,
            cliff_duration,
            open_claim,
            support_vyper,
            sender=owner,
        )


def test_vyper_donation(
    vesting_target,
    vesting_v2_target,
    owner,
    recipient,
    token,
    amount,
    support_amount,
    start_time,
    duration,
    cliff_duration,
    open_claim,
    support_vyper,
):
    vyper_donation = ZERO_ADDRESS
    vesting_factory = deploy(
        "VestingEscrowFactory",
        vesting_target,
        vesting_v2_target,
        vyper_donation,
        sender=owner,
    )

    token.mint(owner, amount + support_amount, sender=owner)
    token.approve(vesting_factory, amount + support_amount, sender=owner)
    with boa.reverts(dev="lost donation"):
        vesting_factory.deploy_vesting_contract(
            token,
            recipient,
            amount,
            duration,
            start_time,
            cliff_duration,
            open_claim,
            support_vyper,
            sender=owner,
        )


def test_vyper_donation_empty(
    vesting_target,
    vesting_v2_target,
    owner,
    recipient,
    token,
    amount,
    start_time,
    duration,
    cliff_duration,
    open_claim,
):
    vyper_donation = ZERO_ADDRESS
    support_vyper = 0

    vesting_factory = deploy(
        "VestingEscrowFactory",
        vesting_target,
        vesting_v2_target,
        vyper_donation,
        sender=owner,
    )

    token.mint(owner, amount, sender=owner)
    token.approve(vesting_factory, amount, sender=owner)
    vesting_factory.deploy_vesting_contract(
        token,
        recipient,
        amount,
        duration,
        start_time,
        cliff_duration,
        open_claim,
        support_vyper,
        sender=owner,
    )
