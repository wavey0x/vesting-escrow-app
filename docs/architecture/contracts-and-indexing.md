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

`config/deployments.json` is the shared runtime registry. The frontend resolves
its create target from `activeFactory`, and the indexer scans every listed
factory from its recorded deployment block. A factory's `version` is the
highest escrow version it can create; historical factories remain version 1.

## VestingEscrowFactory

The deployed factories listed above create `VestingEscrowSimple` minimal
proxies. The local unreleased factory has two immutable implementation targets:
`TARGET` for the legacy behavior and `TARGET_V2` for vault-share vesting.

Editable contract sources, tests, and Titanoboa deployment tooling are vendored at
`packages/contracts/` from the upstream v0.3.0 release. See
`packages/contracts/UPSTREAM.md` for provenance and
`docs/architecture/contracts-development-and-deployment.md` for the change and
redeployment plan.

The local unreleased source includes the compatible Curve fork's escrow
registry, zero default donation, revoke ordering, and dust-solvency assertion.
It preserves the legacy escrow ABI and `VestingEscrowCreated` event. The new
factory constructor is
`VestingEscrowFactory(target, target_v2, vyper_donate)`, and its final
`yield_to_owner` argument defaults to `false`, preserving the existing
nine-argument deployment selector.

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
| `yield_to_owner` | `bool` | Use ERC-4626 share mode and fix the original owner as yield recipient; defaults to `false` |

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

### `VestingEscrowV2Configured`

ERC-4626 mode emits the unchanged creation event plus a companion event:

```text
VestingEscrowV2Configured(address,address,address,uint256)
```

Topic hash:

```text
0x02ebd48c325e09c1ea4ee84303b2ba00c3f4b185a35571527133ac72f2d37723
```

Its fields are `escrow`, underlying `asset`, fixed `yield_recipient`, and the
initial `principal` snapshot in underlying asset units.

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

## VestingEscrowSimpleV2

Funding and payouts are vault shares. At factory finalization, the escrow
records their initial principal using `convertToAssets`. Later gains are paid
to the original owner as shares; vault losses are borne proportionally by the
recipient and owner principal. The contract never redeems shares or transfers
the underlying asset.

The vault-share balance is split at each claim, yield claim, or revocation:

```text
B = current vault shares
V = vault.convertToAssets(B)
R = remaining principal in asset units

if V <= R:
    principal shares = B
    yield shares = 0
else:
    yield shares = floor(B * (V - R) / V)
    principal shares = B - yield shares
```

Principal shares are paid pro rata against vested or revoked principal. All
rounding favors the principal pool, and a positive-yield transfer must leave
enough shares for `convertToAssets(remaining shares) >= remaining principal`.
The vault token itself cannot be removed through `collect_dust`.

Additional state and actions are:

- `asset()`, `yield_recipient()`, `total_principal()`, and `principal_claimed()`
- `vested_principal()` and `claimable_principal()` in underlying asset units
- `unclaimed()`, `locked()`, claims, yield claims, and revoke payouts in shares
- permissionless `claim_yield()` to the fixed yield recipient

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

The ABI JSON files are indexer assets. The frontend's typed ABI fragments live
in `src/lib/contracts.ts`. Both versions are already represented, but the
registry keeps the deployed version 1 factory as the create target until a
reviewed version 2 factory address and deployment block are available. The
indexer marks a new escrow as version 2 only when it sees the matching
`VestingEscrowV2Configured` event; creation events without that companion stay
version 1.

Contract compilation is checked by `packages/contracts/scripts/compile.py`.
The legacy implementation is compiled with Vyper 0.3.10 through VVM; the
factory, V2 implementation, and mocks are pinned to Vyper 0.4.3 and Prague. If
a contract change affects an ABI, regenerate the consumer ABIs from a reviewed
build instead of allowing the frontend, indexer, and Vyper source to drift
independently.

## Index Outputs

Generated files:

- `public/data/escrows.json`
- `public/data/tokens.json`

The indexer stores:

- indexed escrow creation events
- an explicit version for newly discovered escrows
- version 2 asset, yield recipient, and principal fields from the companion event
- last indexed block per factory
- token metadata and preferred logo URL

The create flow also stores a confirmed escrow in a seven-day local pending
cache. This closes the gap between transaction confirmation and the scheduled
public index refresh. Indexed data takes precedence as soon as the address
appears in `public/data/escrows.json`.

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
- commits any updated index or token metadata files back to the repo

`.github/workflows/app-test.yml` runs frontend lint/tests/build and the pure
indexer integration tests for application changes.
