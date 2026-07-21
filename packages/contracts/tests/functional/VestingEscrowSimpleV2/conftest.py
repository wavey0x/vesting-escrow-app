import pytest


@pytest.fixture(scope="module")
def asset_token(project, owner):
    return owner.deploy(project.MockToken)


@pytest.fixture(scope="module")
def vault(project, owner, asset_token):
    return owner.deploy(project.MockERC4626, asset_token)


@pytest.fixture
def vesting_v2(
    project,
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
    return project.VestingEscrowSimpleV2.at(receipt.return_value)
