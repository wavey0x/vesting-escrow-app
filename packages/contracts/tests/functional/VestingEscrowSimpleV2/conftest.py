import pytest

from tests.helpers import at, deploy


@pytest.fixture(scope="module")
def asset_token(owner):
    return deploy("test/MockToken", sender=owner)


@pytest.fixture(scope="module")
def vault(owner, asset_token):
    return deploy("test/MockERC4626", asset_token, sender=owner)


@pytest.fixture
def vesting_v2(
    owner,
    recipient,
    vesting_factory,
    vault,
    amount,
    duration,
    start_time,
    cliff_duration,
    open_claim,
):
    vault.mint(owner, amount, sender=owner)
    vault.approve(vesting_factory, amount, sender=owner)
    escrow = vesting_factory.deploy_vesting_contract(
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
    return at("VestingEscrowSimpleV2", escrow)
