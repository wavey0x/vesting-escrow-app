#!/usr/bin/env python3
"""Run a local Titanoboa deployment and create representative legacy escrows."""

from pathlib import Path

import boa

from deploy_empty import VYPER_DONATE, deploy_contracts


CONTRACTS = Path(__file__).resolve().parents[1] / "contracts"
YEAR = int(365.25 * 24 * 60 * 60)
NUMBER_OF_VESTS = 10


def main():
    owner = boa.env.generate_address("owner")
    boa.env.set_balance(owner, 10**24)
    recipients = [boa.env.generate_address(f"recipient-{index}") for index in range(NUMBER_OF_VESTS)]

    target, target_v2, factory = deploy_contracts(owner, VYPER_DONATE)
    token = boa.load(CONTRACTS / "test" / "MockToken.vy", sender=owner)

    amounts = [2**index * 10**18 for index in range(NUMBER_OF_VESTS)]
    support_vyper = 100
    total = sum(amounts)
    donation = total * support_vyper // 10_000
    token.mint(owner, total + donation, sender=owner)
    token.approve(factory, total + donation, sender=owner)

    start_time = boa.env.evm.patch.timestamp + 24 * 60 * 60
    for recipient, amount in zip(recipients, amounts):
        escrow = factory.deploy_vesting_contract(
            token,
            recipient,
            amount,
            3 * YEAR,
            start_time,
            YEAR // 3,
            True,
            support_vyper,
            sender=owner,
        )
        assert token.balanceOf(escrow) == amount

    assert factory.escrows_length() == NUMBER_OF_VESTS
    print(f"legacy target: {target.address}")
    print(f"v2 target:     {target_v2.address}")
    print(f"factory:       {factory.address}")
    print(f"escrows:       {factory.escrows_length()}")


if __name__ == "__main__":
    main()
