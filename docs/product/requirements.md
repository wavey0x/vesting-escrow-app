# Product Requirements

This app lets users inspect, track, and create Yearn/Curve vesting escrows on Ethereum mainnet.

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
| `Revoke` | User is current owner, escrow has locked tokens, and vesting has not ended |
| `Disown` | User is current owner and owner is not the zero address |

## Create Flow

### Inputs

- Token address
- Recipient address
- Amount
- Vesting duration
- Optional cliff
- Start now or explicit start date
- `open claim` toggle
- `support Vyper` toggle

### Behavior

- Wallet connection is required.
- The page reads token symbol, decimals, balance, and allowance.
- ERC20 approval happens before deployment when allowance is insufficient.
- The owner is the connected wallet; there is no separate owner input in the current UI.
- The app parses the `VestingEscrowCreated` event from the receipt and routes to the new escrow.

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
- `owner`
- `disabled_at`
- `end_time`
- `start_time`
- `cliff_length`
- `open_claim`

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
