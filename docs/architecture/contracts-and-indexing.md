# Contracts and Indexing

This document captures the onchain contracts, indexer inputs, and app-side status logic used by the vesting escrow app.

## Chain and Factories

- Chain: Ethereum mainnet (`chainId = 1`)
- Active factory used by the create flow:
  - `0x200C92Dd85730872Ab6A1e7d5E40A067066257cF`
  - Deploy block: `18,291,969`
- Compatible Curve factory indexed by the app:
  - `0xcf61782465Ff973638143d6492B51A85986aB347`
  - Deploy block: `19,739,664`

The frontend uses the active factory constant in `src/lib/constants.ts`. The indexer scans both factory deployments.

## VestingEscrowFactory

The factory deploys `VestingEscrowSimple` instances using minimal proxies.

Editable contract sources, tests, and Ape deployment tooling are vendored at
`packages/contracts/` from the upstream v0.3.0 release. See
`packages/contracts/UPSTREAM.md` for provenance and
`docs/architecture/contracts-development-and-deployment.md` for the change and
redeployment plan.

The local unreleased source includes the compatible Curve fork's escrow
registry, zero default donation, revoke ordering, and dust-solvency assertion.
The escrow ABI and `VestingEscrowCreated` event are unchanged; the factory ABI
only adds `escrows(uint256)` and `escrows_length()` getters.

### `deploy_vesting_contract`

| Parameter | Type | Meaning |
| --- | --- | --- |
| `token` | `address` | ERC20 token being vested |
| `recipient` | `address` | Escrow beneficiary |
| `amount` | `uint256` | Total amount locked |
| `vesting_duration` | `uint256` | Vesting duration in seconds |
| `vesting_start` | `uint256` | Start timestamp |
| `cliff_length` | `uint256` | Cliff duration in seconds |
| `open_claim` | `bool` | Whether third parties can trigger claims |
| `support_vyper` | `uint256` | Optional donation in basis points |
| `owner` | `address` | Address allowed to revoke/disown |

### `VestingEscrowCreated`

Event signature:

```text
VestingEscrowCreated(address,address,address,address,uint256,uint256,uint256,uint256,bool)
```

Topic hash:

```text
0x99fd02dbc65944923f77d3e5d3e77e8c4c1b4026201be5445a8e827183e993e2
```

Indexed event fields:

- `funder`
- `token`
- `recipient`

Non-indexed event fields:

- `escrow`
- `amount`
- `vesting_start`
- `vesting_duration`
- `cliff_length`
- `open_claim`

## VestingEscrowSimple

Key state surfaced by the app:

| Field | Meaning |
| --- | --- |
| `recipient` | Beneficiary |
| `token` | ERC20 token |
| `start_time` | Vesting start timestamp |
| `end_time` | Vesting end timestamp |
| `cliff_length` | Cliff duration |
| `total_locked` | Initial locked amount |
| `total_claimed` | Claimed amount |
| `disabled_at` | Revocation time, or `end_time` if active |
| `open_claim` | Third-party claim toggle |
| `owner` | Revocation authority |

Core functions surfaced by the app:

- `unclaimed()`
- `locked()`
- `claim(beneficiary, amount)`
- `set_open_claim(bool)`
- `revoke(ts, beneficiary)`
- `disown()`

## Status Logic

`src/lib/escrow.ts` resolves status in this order:

1. `revoked`: `disabled_at < end_time`
2. `completed`: `unclaimed === 0 && locked === 0`
3. `cliff`: current time is before `start_time + cliff_length`
4. `claimable`: `locked === 0 && unclaimed > 0`
5. `vesting`: default active state

When live data is unavailable, the app falls back to time-based inference from indexed fields.

## Indexer Layout

All Python indexer assets now live under `scripts/indexer/`:

- `scripts/indexer/index_escrows.py`
- `scripts/indexer/requirements.txt`
- `scripts/indexer/setup-python.sh`
- `scripts/indexer/abi/VestingEscrowFactory.json`
- `scripts/indexer/abi/VestingEscrowSimple.json`

The ABI JSON files are indexer assets. The frontend uses inline ABI fragments for the contract calls it needs.

The contract package's compiler artifacts under `packages/contracts/.build/`
are generated and ignored. If a contract change affects an ABI, regenerate the
consumer ABIs from a reviewed build instead of allowing the frontend, indexer,
and Vyper source to drift independently.

## Index Outputs

Generated files:

- `public/data/escrows.json`
- `public/data/tokens.json`

The indexer stores:

- indexed escrow creation events
- last indexed block per factory
- token metadata and preferred logo URL

## Runtime Data Sources

- Token logos: SmolDapp first, then Trust Wallet, Uniswap, and `stamp.fyi`
- Token prices: DeFiLlama Coins API
- Live escrow reads: on-demand RPC calls from the frontend

## Automation

`.github/workflows/index-escrows.yml`:

- runs daily at `00:00 UTC`
- supports manual dispatch
- creates a Python virtualenv
- refreshes `public/data/*.json`
- commits updated index files back to the repo
