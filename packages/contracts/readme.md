# Yearn Vesting Escrow Contracts

This package is a source import of `yearn/yearn-vesting-escrow` v0.3.0 with
local, unreleased changes. Read [`UPSTREAM.md`](UPSTREAM.md) for exact
provenance and
[`../../docs/architecture/contracts-development-and-deployment.md`](../../docs/architecture/contracts-development-and-deployment.md)
for the rollout gates.

## Contracts

- `VestingEscrowSimple.vy` is the frozen legacy implementation. It remains on
  Vyper 0.3.10 and compiles through VVM.
- `VestingEscrowSimpleV2.vy` vests ERC-4626 principal while funding and paying
  in vault shares. Yield shares go to the original owner.
- `VestingEscrowFactory.vy` routes deployments to the legacy or version 2
  implementation and preserves the legacy creation event.

The factory, version 2 implementation, and mocks compile with Vyper 0.4.3 for
Prague. The version 2 factory has not been deployed or audited.

## Development

From the repository root:

```sh
./packages/contracts/setup-python.sh
cd packages/contracts
.venv/bin/python scripts/compile.py
.venv/bin/pytest tests/functional/ --gas-profile
.venv/bin/pytest tests/integration/
MAINNET_RPC=https://... MAINNET_BLOCK=... .venv/bin/python scripts/fork_smoke.py
```

After changing `requirements.in`, regenerate the lock with:

```sh
./update-lock.sh
```

## Development deployment

Local deployment requires no key:

```sh
.venv/bin/python scripts/deploy.py
```

A network deployment reads its key from an environment variable and can enforce
the expected chain ID:

```sh
RPC_URL=https://... DEPLOYER_PRIVATE_KEY=... \
  .venv/bin/python scripts/deploy.py --expected-chain-id 11155111
```

This script is for development validation only. It does not yet produce the
full manifest or explorer verification required by the production rollout
plan.

## Deployed legacy contracts

- Factory: `0x200C92Dd85730872Ab6A1e7d5E40A067066257cF`
- Implementation: `0x9692F652A3048eb7F5074e12B907F20d33F37a01`
- Audit: [MixBytes, 2023-10-13](https://github.com/yearn/yearn-security/tree/master/audits/20231013_Mixbytes_yearn_vesting_escrow)
