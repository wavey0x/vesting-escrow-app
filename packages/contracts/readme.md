# Yearn Vesting Escrow Contracts

This package is a source import of `yearn/yearn-vesting-escrow` v0.3.0 with
local, unreleased changes. Read [`UPSTREAM.md`](UPSTREAM.md) for exact
provenance and
[`../../docs/architecture/contracts-development-and-deployment.md`](../../docs/architecture/contracts-development-and-deployment.md)
for the rollout gates.

## Contracts

- `VestingEscrowSimple.vy` is the sole implementation. It supports standard
  ERC-20 vesting and optional ERC-4626 share accounting.
- `VestingEscrowFactory.vy` funds and initializes minimal proxies of that one
  implementation.

All contracts compile with Vyper 0.4.3 for Prague. The current factory and
implementation report `version() == 2`; they have not been deployed or audited.

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

The fork smoke defaults to sUSDS and a funded holder at block `25,587,000`.
Override `ERC4626_VAULT`, `ERC4626_HOLDER`, and `ERC4626_AMOUNT` together to
exercise another standards-compliant vault at a matching pinned block.

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
