# Contracts and Indexing

This document captures the onchain contracts, indexer inputs, and app-side status logic used by the vesting escrow app.

## Chain and Factories

- Chain: Ethereum mainnet (`chainId = 1`)
- Active Yearn v0.4.0 factory used by the create flow:
  - `0xFbd94e2D6942D5b4Ed0C5C9C43bded77a8f20215`
  - Deploy block: `25,602,335`
- Historical Yearn v0.3.0 factory indexed by the app:
  - `0x200C92Dd85730872Ab6A1e7d5E40A067066257cF`
  - Deploy block: `18,291,969`
- Compatible LlamaPay v2 factory indexed by the app:
  - `0xcf61782465Ff973638143d6492B51A85986aB347`
  - Deploy block: `19,739,664`

`config/deployments.json` is the shared source of truth for the active frontend
factory and every indexer read source. Historical factories remain read-only
integration targets.

## v0.4.0 VestingEscrowFactory

The active factory deploys dedicated standard-token and ERC-4626 minimal
proxies. Its frozen source, deployment manifest, and API documentation live in
[`yearn/yearn-vesting-escrow` v0.4.0](https://github.com/yearn/yearn-vesting-escrow/tree/v0.4.0).

The legacy-compatible contract package under `packages/contracts/` remains a
separate v0.3 development line. It is not the source for the active factory.

### Standard `deploy_vesting_contract`

| Parameter | Type | Meaning |
| --- | --- | --- |
| `token` | `address` | ERC20 token being vested |
| `recipient` | `address` | Escrow beneficiary |
| `amount` | `uint256` | Total amount locked |
| `vesting_duration` | `uint256` | Vesting duration in seconds |
| `vesting_start` | `uint256` | Start timestamp |
| `cliff_length` | `uint256` | Cliff duration in seconds |
| `permissionless_claims` | `bool` | Whether third parties can claim to the recipient |
| `revoker` | `address` | Address allowed to revoke or renounce authority |

### ERC-4626 `deploy_erc4626_vesting`

This path accepts an exact `principal_assets` amount, checks the execution-time
rounded-up share quote against `max_funded_shares`, and records a fixed
`yield_recipient`. The UI obtains the cap from
`preview_erc4626_funding(vault, principal_assets)` and approves the factory for
vault shares.

The indexer decodes both `TokenVestingEscrowCreated` and
`ERC4626VestingEscrowCreated`. ERC-4626 records store the underlying
`asset_token` as `token`, retain `vault` separately, and keep amounts
denominated in principal assets.

## Versioned escrow APIs

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
| `owner` / `revoker` | Version-specific revocation authority |

Legacy actions remain `claim`, `revoke`, and `disown`. v0.4 standard escrows use
`claim`, `revoke(receiver)`, and `renounce_revocation`; v0.4 ERC-4626 escrows
use `claim_principal`, `claim_yield`, `revoke(receiver)`, and
`renounce_revocation`.

Live-read plans are selected from indexed `version` and `kind`. Historical
records without those fields are inferred from their factory address.

## Status Logic

`src/lib/escrow.ts` resolves status in this order:

1. `revoked`: legacy `disabled_at < end_time`, or v0.4 `disabled_at != 0`
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
- `scripts/indexer/abi/VestingEscrowFactoryV04.json`
- `scripts/indexer/abi/VestingEscrowSimple.json`

The ABI JSON files are indexer assets. Frontend ABI fragments and version-aware
read plans live in `src/lib/contracts.ts`.

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
