# Vesting Escrow

Monorepo for the [vesting escrow app](https://vest.wavey.info/), its Ethereum
event indexer, and the Vyper contracts used to deploy vesting escrows.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/` | Vite/React frontend |
| `scripts/indexer/` | Mainnet factory event indexer |
| `packages/contracts/` | Vyper contracts, Ape project, deployment scripts, and tests |
| `docs/` | Product, design, architecture, and rollout documentation |

The contract package was imported from
[`yearn/yearn-vesting-escrow`](https://github.com/yearn/yearn-vesting-escrow)
v0.3.0. Its exact provenance and update procedure are recorded in
`packages/contracts/UPSTREAM.md`.

## Frontend

```sh
npm install
npm run dev
npm run build
npm run lint
```

## Indexer

```sh
./scripts/indexer/setup-python.sh
MAINNET_RPC=https://... .venv/bin/python scripts/indexer/index_escrows.py
```

`public/data/*.json` is generated output. Always refresh it with the indexer;
do not edit it by hand.

## Contracts

The package retains Vyper 0.3.10 and uses a locked Ape 0.8/Foundry toolchain. Its
local contract changes reproduce the hardened Curve fork currently indexed by
the app while retaining the v0.3 consumer interface.

```sh
./packages/contracts/setup-python.sh
cd packages/contracts
.venv/bin/ape compile --size
.venv/bin/ape test tests/functional/ --gas --coverage
.venv/bin/ape test tests/integration/ -s
```

Read the
[contract change and factory rollout plan](docs/architecture/contracts-development-and-deployment.md)
before preparing a deployment.
