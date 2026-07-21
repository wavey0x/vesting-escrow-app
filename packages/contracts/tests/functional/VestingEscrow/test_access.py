import boa

from tests.helpers import ZERO_ADDRESS, events


def test_disown(vesting, owner):
    vesting.disown(sender=owner)
    disowned = events(vesting, "Disowned")[0]

    assert disowned.owner == owner
    assert vesting.owner() == ZERO_ADDRESS


def test_disown_not_owner(vesting, recipient):
    with boa.reverts():
        vesting.disown(sender=recipient)


def test_set_open_claim(vesting, recipient):
    vesting.set_open_claim(False, sender=recipient)
    open_claim = events(vesting, "SetOpenClaim")[0]
    assert not vesting.open_claim()
    assert not open_claim.state

    # test state doesn't change after similar change
    vesting.set_open_claim(False, sender=recipient)
    open_claim = events(vesting, "SetOpenClaim")[0]
    assert not vesting.open_claim()
    assert not open_claim.state


def test_set_open_claim_not_recipient(vesting, owner):
    with boa.reverts():
        vesting.set_open_claim(False, sender=owner)
