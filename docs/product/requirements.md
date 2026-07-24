# Product Requirements

This app lets users inspect, track, and create Yearn and LlamaPay vesting
escrows on Ethereum mainnet.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Main manage experience |
| `/create` | Deploy a new vesting escrow |
| `/vest/:address` | View and manage a specific escrow |

## Manage Experience

### Tabs

| Tab | Notes |
| --- | --- |
| `Search` | Search by escrow address or recipient address, with optional funder matching |
| `Starred` | Escrows saved locally by the user |
| `My Escrows` | Escrows tied to the connected wallet |
| `All` | Admin-only tab enabled with `localStorage.admin = 'true'` |

### Behavior

- If the URL contains `?q=...`, the page opens on `Search`.
- Without a query, the initial tab prefers `Starred`, then `My Escrows`, then `Search`.
- Exact escrow address queries redirect to `/vest/:address`.
- Recipient address queries render a result list on the page.
- `includeFunders` defaults to `false` and is URL-backed with `?includeFunders=true` when enabled.
- `hideCompleted` defaults to `true` and is URL-backed with `?hideCompleted=false` when disabled.
- Status filters can narrow the visible list by `cliff`, `vesting`, `claimable`, `completed`, or `revoked`.
- Escrows are sorted with active escrows first, then by newest `vestingStart`.

## Escrow Detail

### Display

- Merge indexed escrow metadata with live RPC reads.
- Show token metadata, status, vesting progress, amounts, and timeline details.
- Show estimated USD values when token pricing is available.
- Allow a local custom name per escrow.
- Support starring and manual refresh from the detail view.

### Actions

| Action | Condition |
| --- | --- |
| `Claim` | User is recipient or `open_claim` is enabled and claimable amount is non-zero |
| `Revoke` | User is the current owner/revoker, escrow has locked principal, and vesting has not ended |
| `Disown` / `Renounce Revocation` | User has the current legacy owner or v0.4 revoker authority |
| `Claim Yield` | A v0.4 ERC-4626 escrow has claimable yield shares |

## Create Flow

### Inputs

- Escrow type: standard ERC-20 or ERC-4626
- Token or vault address
- Recipient address
- Token amount or asset-denominated ERC-4626 principal
- ERC-4626 yield recipient
- Vesting duration
- Optional cliff
- Start now or explicit start date
- `open claim` toggle

### Behavior

- Wallet connection is required.
- The page reads token/vault metadata, balance, and allowance.
- ERC-4626 funding uses the factory's rounded-up share quote for the requested
  asset-denominated principal.
- ERC20 or vault-share approval happens before deployment when allowance is insufficient.
- The revoker is the connected wallet; there is no separate revoker input in the current UI.
- The app decodes the versioned creation event from the receipt and routes to the new escrow.

## Data Model

### Static Data

- `public/data/escrows.json`: indexed escrow records
- `public/data/tokens.json`: token metadata and cached logo URLs

### Live Data

The detail and list views read live escrow state on demand:

- `unclaimed()`
- `locked()`
- `total_claimed`
- `total_locked`
- `owner` or `revoker`
- `disabled_at`
- `end_time`
- `start_time`
- `cliff_length`
- `open_claim` or `permissionless_claims`
- ERC-4626 principal, yield-share, vault, and yield-recipient state

### External Data

- Token logos: SmolDapp with Trust Wallet, Uniswap, and `stamp.fyi` fallbacks
- Token prices: DeFiLlama Coins API
- Price freshness: React Query `staleTime` of 1 hour

## Persistence

### localStorage keys

| Key | Purpose |
| --- | --- |
| `vesting-escrow-starred` | Starred escrow addresses |
| `vesting-escrow-names` | User-defined escrow names |
| `vesting-escrow-theme` | Light or dark theme |
| `admin` | Enables the `All` tab when set to `'true'` |

## Stack

- Vite
- React 18
- React Router
- wagmi + viem
- React Query
- Tailwind CSS
- Python 3.12 + web3.py for indexing
- Vercel hosting
