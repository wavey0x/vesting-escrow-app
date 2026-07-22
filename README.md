# Vesting Escrow

Monorepo for the [vesting escrow app](https://vest.wavey.info/), its Ethereum
event indexer, and the Vyper contracts used to deploy vesting escrows.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/` | Vite/React frontend |
| `scripts/indexer/` | Mainnet factory event indexer |
| `packages/contracts/` | Vyper contracts, Titanoboa deployment scripts, and tests |
| `config/deployments.json` | Shared frontend/indexer factory registry |
| `docs/` | Product, design, architecture, and rollout documentation |

The contract package was imported from
[`yearn/yearn-vesting-escrow`](https://github.com/yearn/yearn-vesting-escrow)
v0.3.0. Its exact provenance and update procedure are recorded in
`packages/contracts/UPSTREAM.md`.

## Frontend

```sh
npm install
npm run dev
npm run test
npm run build
npm run lint
```

## Indexer

```sh
./scripts/indexer/setup-python.sh
MAINNET_RPC=https://... .venv/bin/python scripts/indexer/index_escrows.py
.venv/bin/python -m unittest discover -s scripts/indexer/tests -v
```

`public/data/*.json` is generated output. Always refresh it with the indexer;
do not edit it by hand.

## Contracts

The package uses Titanoboa 0.2.8 and Vyper 0.4.3 with an explicit Prague target.
One `VestingEscrowSimple` implementation supports standard ERC-20 vesting and
optional ERC-4626 share accounting.

```sh
./packages/contracts/setup-python.sh
cd packages/contracts
.venv/bin/python scripts/compile.py
.venv/bin/pytest tests/functional/ --gas-profile
.venv/bin/pytest tests/integration/
```

Read the
[contract change and factory rollout plan](docs/architecture/contracts-development-and-deployment.md)
before preparing a deployment.
