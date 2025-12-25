# Vesting Escrow Web App

A web application for viewing and managing Yearn/Curve vesting escrows.

**Factory Contract**: `0x200C92Dd85730872Ab6A1e7d5E40A067066257cF`
**Chain**: Ethereum Mainnet (chainId: 1)

---

## Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Manage | Home page - search, starred, and my escrows |
| `/create` | Create | Create new vesting escrow |
| `/vest/:address` | EscrowDetail | View/manage specific escrow |

---

## Manage Page (`/`)

The main entry point with tabbed navigation.

### Tabs

| Tab | Description |
|-----|-------------|
| **Search** | Search by escrow or recipient address |
| **Starred** | User's starred escrows (localStorage) |
| **My Escrows** | Escrows where connected wallet is recipient or funder |
| **All** | Admin-only tab (enabled via `localStorage.admin = 'true'`) |

### Features
- **Hide completed toggle**: Filters out fully vested escrows
- **URL-synced search**: Search query persists in URL (`?q=0x...`)
- **Escrow cards**: Show status, progress, claimable amounts

---

## Escrow Detail Page (`/vest/:address`)

Full detail view for a single escrow.

### Displayed Information
- Token info (symbol, name, logo)
- Recipient and owner addresses
- Vesting timeline with progress bar
- Amount breakdown (claimed, claimable, locked)
- USD values (via DeFiLlama)

### Actions

| Action | Condition | Description |
|--------|-----------|-------------|
| **Claim** | Recipient or open_claim enabled | Claim vested tokens |
| **Revoke** | Owner, before end_time | Clawback unvested tokens |
| **Disown** | Owner | Permanently give up revoke ability |

---

## Escrow Status

| Status | Label | Condition |
|--------|-------|-----------|
| `cliff` | Pre Cliff | Before cliff period ends |
| `vesting` | In Progress | Active vesting, tokens still locked |
| `claimable` | Claimable | Fully vested, unclaimed tokens remain |
| `completed` | Completed | All tokens claimed |
| `revoked` | Revoked | Owner terminated early |

---

## Create Page (`/create`)

Form to deploy a new vesting escrow via the factory contract.

### Required Fields
| Field | Description |
|-------|-------------|
| Token | ERC20 token address |
| Recipient | Who receives vested tokens |
| Amount | Total tokens to vest |
| Vesting Duration | How long vesting lasts |

### Optional Fields
| Field | Default | Description |
|-------|---------|-------------|
| Vesting Start | now | When vesting begins |
| Cliff Length | 0 | Lock period before vesting starts |
| Open Claim | true | Allow anyone to trigger claims |
| Vyper Donation | 1% | Donation to Vyper in bps |
| Owner | msg.sender | Who can revoke |

---

## Data Architecture

### Static Index (GitHub Actions)
- **Schedule**: Daily at midnight UTC
- **Output**: `public/data/escrows.json`, `public/data/tokens.json`
- **Method**: Incremental indexing from `lastBlock`

### Live Data (RPC)
Fetched on-demand per escrow:
- `unclaimed()` - claimable tokens
- `locked()` - still vesting
- `total_claimed` - already claimed
- `owner` - current owner
- `disabled_at` - revocation timestamp

### Token Prices
- **Source**: DeFiLlama Coins API
- **Cache**: 1 hour in localStorage

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Framework | Vite + React |
| Wallet | wagmi + viem |
| Styling | TailwindCSS |
| Routing | React Router v6 |
| Data | React Query |
| Indexer | Python 3.12 + web3.py |
| Hosting | Vercel |

---

## Project Structure

```
vyper-vesting-escrow-app/
├── abi/                    # Contract ABIs
├── public/data/            # Indexed escrow data
├── scripts/                # Python indexer
├── src/
│   ├── components/         # React components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilities, types, constants
│   └── pages/              # Route pages
└── .github/workflows/      # GitHub Actions
```

---

## localStorage Keys

| Key | Purpose |
|-----|---------|
| `starredEscrows` | Array of starred escrow addresses |
| `escrowNames` | Custom names for escrows |
| `theme` | `light` or `dark` |
| `admin` | Set to `'true'` to enable All tab |
| `price_cache` | Cached token prices |
