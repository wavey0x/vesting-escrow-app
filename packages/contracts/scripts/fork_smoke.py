#!/usr/bin/env python3
"""Exercise vault-share vesting against a pinned Ethereum fork."""

import os
from pathlib import Path
import warnings

import boa


CONTRACTS = Path(__file__).resolve().parents[1] / "contracts"


def main():
    rpc_url = os.environ.get("MAINNET_RPC")
    if rpc_url is None:
        raise SystemExit("MAINNET_RPC must be set")

    block_identifier = os.environ.get("MAINNET_BLOCK", "safe")
    if block_identifier.isdigit():
        block_identifier = int(block_identifier)
    boa.fork(rpc_url, block_identifier=block_identifier)

    warnings.filterwarnings(
        "ignore",
        message="casted bytecode does not match compiled bytecode*",
        category=UserWarning,
    )

    owner = boa.env.generate_address("fork-owner")
    recipient = boa.env.generate_address("fork-recipient")
    asset = boa.load(CONTRACTS / "test" / "MockToken.vy", sender=owner)
    vault = boa.load(CONTRACTS / "test" / "MockERC4626.vy", asset, sender=owner)
    target = boa.load(CONTRACTS / "VestingEscrowSimple.vy", sender=owner)
    factory = boa.load(
        CONTRACTS / "VestingEscrowFactory.vy",
        target,
        owner,
        sender=owner,
    )

    amount = 100 * 10**18
    start_time = boa.env.evm.patch.timestamp + 60
    vault.mint(owner, amount, sender=owner)
    vault.approve(factory, amount, sender=owner)
    escrow_address = factory.deploy_vesting_contract(
        vault,
        recipient,
        amount,
        1_000,
        start_time,
        0,
        True,
        0,
        owner,
        True,
        sender=owner,
    )
    escrow = boa.load_partial(CONTRACTS / "VestingEscrowSimple.vy").at(escrow_address)

    vault.set_assets_per_share(12 * 10**17, sender=owner)
    boa.env.time_travel(seconds=560)
    assert escrow.claim(sender=recipient) > 0
    assert vault.balanceOf(owner) > 0
    assert vault.convertToAssets(vault.balanceOf(escrow)) >= amount - escrow.principal_claimed()
    print(f"mainnet fork lifecycle passed at block {boa.env.evm.patch.block_number}")


if __name__ == "__main__":
    main()
