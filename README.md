# Vesting Escrow

Monorepo for the [vesting escrow app](https://vest.wavey.info/), its Ethereum
event indexer, and a historical Vyper contract development package.

The app creates standard ERC-20 and ERC-4626 escrows through the released
[`yearn/yearn-vesting-escrow` v0.4.0 factory](https://github.com/yearn/yearn-vesting-escrow/tree/v0.4.0)
at `0xFbd94e2D6942D5b4Ed0C5C9C43bded77a8f20215`. It continues to index
the Yearn v0.3.0 and LlamaPay v2 factories so existing escrow links and searches
remain available.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/` | Vite/React frontend |
| `scripts/indexer/` | Mainnet factory event indexer |
| `config/deployments.json` | Shared frontend/indexer factory configuration |
| `packages/contracts/` | Historical v0.3-compatible Vyper development package |
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
do not edit it by hand. Factory addresses, deployment blocks, versions, and
event formats are defined once in `config/deployments.json`.

## Contracts

The package retains Vyper 0.3.10 and uses a locked Ape 0.8/Foundry toolchain.
Its local contract changes reproduce the hardened LlamaPay v2 deployment
currently indexed by the app while retaining the v0.3 consumer interface. It is
not the source of the active v0.4.0 frontend deployment target.

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
