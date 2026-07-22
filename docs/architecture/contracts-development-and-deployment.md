# Contract Development and Factory Rollout

## Current state

The monorepo contains the app, indexer, and a source import of
`yearn/yearn-vesting-escrow` v0.3.0. Local unreleased work replaces the two-path
prototype with one Vyper 0.4.3 implementation and one factory target:

```text
VestingEscrowFactory
    -> ERC-1167 proxy of VestingEscrowSimple
        -> standard ERC-20 mode, or
        -> ERC-4626 share mode when yield_to_owner is true
```

The public lifecycle is the same in both modes. Only valuation and the
principal/yield split are conditional. This deliberately changes the future
factory and escrow ABIs; deployed version 1 contracts remain immutable and are
handled as historical integrations.

Local validation covers compilation, 52 Titanoboa functional tests, five
integration/property tests, frontend receipt decoding, and indexer event decoding.
Independent security review and a production deployment manifest are still
required before mainnet release.

## Invariants

1. A proxy is funded before its single initialization call.
2. The implementation itself cannot be initialized.
3. Recipient and yield destinations are fixed at creation.
4. Standard mode never calls ERC-4626 methods.
5. Yield mode transfers shares only; it never deposits or redeems assets.
6. Rounding stays in the outstanding principal reserve, including when direct
   transfers make the live token balance larger than the initial amount.
7. State changes precede callback-capable token transfers.
8. Existing factories and escrows are never modified or migrated.

## Development gates

From `packages/contracts/` run:

```sh
.venv/bin/python scripts/compile.py
.venv/bin/pytest tests/functional/ --gas-profile
.venv/bin/pytest tests/integration/
MAINNET_RPC=https://... MAINNET_BLOCK=... .venv/bin/python scripts/fork_smoke.py
```

Before freezing a release, review:

- ABI, selectors, topics, storage layout, runtime size, and gas profile;
- start, cliff, end, revoke, and disown boundaries;
- partial-claim and rounding behavior across gains and losses;
- non-returning, fee-charging, and callback-capable tokens;
- initialization, minimal-proxy, donation, and maximum-value behavior;
- frontend and indexer compatibility tests.

Any change to asset flow, authorization, accounting, initialization, or proxy
behavior requires independent security review.

## Deployment tooling

`packages/contracts/scripts/deploy.py` is a development deployer. It deploys:

```text
VestingEscrowSimple()
VestingEscrowFactory(target, vyper_donate)
```

It checks the chain ID when requested, reads the signer key from an environment
variable, verifies constructor getters, and checks both contracts report
`version() == 2`.

Before production, extend or replace it with a reviewed script that records:

- chain ID, deployer, nonce, balances, and transaction hashes;
- source commit, Vyper version, EVM target, and bytecode hashes;
- target, factory, and donation-recipient addresses;
- deployment blocks and constructor arguments;
- explorer verification results.

Dry-run the exact signer flow on a pinned mainnet fork and Sepolia.

## Mainnet rollout

1. Freeze and tag the reviewed commit.
2. Deploy and verify `VestingEscrowSimple`.
3. Deploy and verify `VestingEscrowFactory(target, vyper_donate)`.
4. Read back `TARGET`, `VYPER`, both version values, and code hashes.
5. Create a low-value standard ERC-20 escrow and complete a claim lifecycle.
6. Create a low-value ERC-4626 escrow; check principal, yield, claim, and revoke behavior.
7. Publish the deployment manifest and review evidence.
8. Add the factory to `config/deployments.json` without activating it.
9. Verify indexing and frontend reads, then switch `activeFactory`.

The frontend configuration change is separate from contract deployment so the
write target can be rolled back without hiding any already-created escrows.

## Outstanding release decisions

- mainnet signer and approval process;
- final `vyper_donate` address and donation policy;
- independent reviewers and audit scope;
- source verification and manifest publication location;
- canonical process for future upstream syncs.
