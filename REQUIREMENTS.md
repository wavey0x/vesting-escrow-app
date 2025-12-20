# Vesting Escrow Web App - Requirements

## Project Overview

A web application for deploying and managing Yearn/Curve vesting escrows.

**Factory Contract**: `0x200C92Dd85730872Ab6A1e7d5E40A067066257cF`

**Chain**: Ethereum Mainnet only (chainId: 1)

---

## Application Routes

### Route Structure

| Route | Purpose |
|-------|---------|
| `/` | Home — entry point with navigation to create/manage |
| `/create` | Create new vesting escrow |
| `/manage` | Manage existing escrows (list + detail views) |
| `/manage/:address` | View/manage specific escrow by address |

---

### Home Page (`/`)

A minimal landing page with just two actions. No feature lists, no marketing copy, no redundant navigation.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Vesting Escrow                       [Connect Wallet]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    VESTING ESCROW                       │
│                                                         │
│   Deploy and manage token vesting escrows on Ethereum.  │
│                                                         │
│              [ Create ]    [ View ]                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Principles:**
- **No feature showcases** — users know why they're here
- **No quick actions panels** — the nav already provides this
- **No redundant elements** — if it's in the header nav, don't repeat it
- **Two buttons only** — Create and View, identical styling
- Brief single-sentence description, nothing more

---

### Create Page (`/create`)

Full escrow creation form. See [Deploy New Escrows](#1-deploy-new-escrows) for details.

**Page structure:**
- Back link to home
- Form with all escrow parameters
- Token approval step
- Transaction confirmation
- Success state with link to `/manage/:newEscrowAddress`

---

### Manage Page (`/manage`)

Lists escrows relevant to the user with filtering capabilities.

**Views:**

1. **My Escrows** (default when wallet connected)
   - Tabs: "As Recipient" | "As Funder/Owner"
   - List of escrow cards with summary info
   - Click card → `/manage/:address`

2. **Recently Viewed**
   - Shows escrows the user has previously visited
   - Persisted in localStorage
   - Available even without wallet connection
   - Useful for tracking escrows user doesn't own

3. **Search Results**
   - When navigated via search
   - Shows matching escrow(s)

**Page structure:**
```
┌─────────────────────────────────────────────────────────┐
│  ← Back                                 [Connect Wallet]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MANAGE ESCROWS                                         │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 🔍  Search by address...                          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  AS RECIPIENT      AS FUNDER       RECENTLY VIEWED      │
│  ────────────      ─────────       ────────────────     │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ESCROW 0x1234...abcd                             │  │
│  │  Token: YFI  Amount: 1,000.00                     │  │
│  │  ████████████░░░░░░░░  45% vested                 │  │
│  │  Claimable: 450.00 YFI                            │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ESCROW 0x5678...efgh                             │  │
│  │  Token: DAI  Amount: 50,000.00                    │  │
│  │  ░░░░░░░░░░░░░░░░░░░░  Cliff active (45 days)     │  │
│  │  Claimable: 0.00 DAI                              │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Escrow Detail Page (`/manage/:address`)

Full detail view for a single escrow. See [Manage Existing Escrows](#2-manage-existing-escrows) for details.

**Page structure:**
- Back link to `/manage`
- Full escrow details and visualizations
- Action buttons based on user role (recipient/owner/other)

---

## Core Features

### 1. Deploy New Escrows

Users can create new vesting escrows through the factory contract.

#### Required Inputs
| Field | Type | Validation | UI Component |
|-------|------|------------|--------------|
| Token Address | address | Valid ERC20 | Address input + token picker |
| Recipient | address | Not zero, not token, not owner | Address input |
| Amount | uint256 | > 0, sufficient balance | Number input with token decimals |
| Vesting Duration | uint256 | > 0 seconds | Duration picker (days/months/years) |

#### Optional Inputs
| Field | Type | Default | UI Component |
|-------|------|---------|--------------|
| Vesting Start | uint256 | now | Date/time picker |
| Cliff Length | uint256 | 0 | Duration picker |
| Open Claim | bool | true | Toggle/checkbox |
| Vyper Donation | uint256 (bps) | 100 (1%) | Slider or dropdown |
| Owner | address | connected wallet | Address input |

#### Flow
1. User connects wallet
2. User fills in escrow parameters
3. App calculates required approval: `amount + (amount × donation_bps / 10000)`
4. User approves tokens (if needed)
5. User confirms transaction
6. App displays new escrow address on success

#### Validations (client-side)
- [ ] Token balance >= required amount
- [ ] Token allowance check
- [ ] cliff_length <= vesting_duration
- [ ] vesting_start + vesting_duration > now
- [ ] recipient != zero, token, owner, factory

---

### 2. Manage Existing Escrows

#### 2.1 View Escrow Details

**Always visible:**
- Token info (symbol, name, address)
- Recipient address
- Total locked amount
- Vesting timeline (start, end, cliff)
- Current status indicators

**Live data (from contract calls):**
| Data | Source | Update Frequency |
|------|--------|------------------|
| Unclaimed (claimable now) | `unclaimed()` | On load + refresh |
| Locked (still vesting) | `locked()` | On load + refresh |
| Total claimed | `total_claimed` | On load + refresh |
| Owner | `owner` | On load |
| Revocation status | `disabled_at` vs `end_time` | On load |
| Token balance | `token.balanceOf(escrow)` | On load + refresh |

#### 2.2 Visualizations

**Progress Bar / Chart showing:**
```
|████████████░░░░░░░░░░░░░░░░░░|
 ^ claimed    ^ claimable  ^ locked

Legend:
- Claimed: total_claimed
- Claimable: unclaimed()
- Locked: locked()
```

**Timeline Visualization:**
```
|----[CLIFF]----[==VESTING==]-----|
^               ^                 ^
start           cliff_end         end
                now↓
```

**Key Metrics Display:**
- Percentage vested
- Percentage claimed
- Time until cliff ends (if applicable)
- Time until fully vested
- Tokens per day/week vesting rate

#### 2.3 Recipient Actions

| Action | Function | Conditions |
|--------|----------|------------|
| Claim Tokens | `claim(beneficiary, amount)` | unclaimed > 0 |
| Claim All | `claim(recipient, max_uint256)` | unclaimed > 0 |
| Toggle Open Claim | `set_open_claim(bool)` | msg.sender == recipient |
| Collect Dust | `collect_dust(token, beneficiary)` | Extra tokens present |

#### 2.4 Owner Actions

| Action | Function | Conditions |
|--------|----------|------------|
| Revoke | `revoke(ts, beneficiary)` | owner != zero, ts >= now, ts < end_time |
| Disown | `disown()` | owner != zero |

**Revoke UI:**
- Datetime picker for revocation timestamp
- Beneficiary address input (default: owner)
- Preview: tokens that will be clawed back
- Strong warning about permanence

---

### 3. Escrow Discovery

Users need to find escrows relevant to them.

#### 3.1 By Connected Wallet
- "My Vests" - escrows where user is recipient
- "Created by Me" - escrows where user is funder/owner

#### 3.2 Search/Filter
- By recipient address
- By funder address
- By token address
- By escrow address (direct lookup)

---

## Indexing Solution

### Requirements
- [ ] No persistent backend required
- [ ] GitHub Actions-based daily indexing
- [ ] Static JSON data file served from repo
- [ ] **Incremental indexing** — never rescan already-indexed blocks
- [ ] Chunked scanning for large block ranges (100k blocks per chunk)

### RPC Configuration

**Environment variable:** `MAINNET_RPC`

```bash
# .env (local development)
MAINNET_RPC=https://guest:guest@eth.wavey.info

# GitHub Secrets
# Add MAINNET_RPC secret with the archive RPC URL
```

**Requirements:**
- Must be an **archive node** (for historical event queries)
- Must support `eth_getLogs` with large block ranges

### Architecture

```
GitHub Actions (daily cron @ midnight UTC)
    │
    ├── 1. Load existing data/escrows.json
    │      └── Extract lastBlock (or use FACTORY_DEPLOY_BLOCK if first run)
    │
    ├── 2. Get current block from RPC
    │
    ├── 3. Calculate block range to scan
    │      └── startBlock = lastBlock + 1
    │      └── endBlock = currentBlock
    │
    ├── 4. If range > 100k blocks, chunk into 100k segments
    │      └── Process each chunk sequentially
    │
    ├── 5. For each chunk: fetch VestingEscrowCreated events
    │      └── eth_getLogs(factory, eventSignature, fromBlock, toBlock)
    │
    ├── 6. Parse events, append new escrows to array
    │      └── Deduplicate by escrow address
    │
    ├── 7. Fetch token metadata for any NEW tokens
    │      └── Update tokens.json
    │
    ├── 8. Update lastBlock and lastIndexed timestamp
    │
    └── 9. Commit updated JSON files to repo
          └── data/escrows.json, data/tokens.json

Frontend
    │
    ├── Load escrows.json + tokens.json on init
    │   └── Filter by recipient/funder as needed
    │
    └── Call contract for live data
        └── unclaimed(), locked(), owner, etc.
```

### Incremental Indexing Logic

**Critical: Avoid full rescans by persisting `lastBlock`**

```
┌─────────────────────────────────────────────────────────────┐
│                     INDEXING FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Read escrows.json                                       │
│     ├── File exists? → startBlock = lastBlock + 1           │
│     └── File missing? → startBlock = FACTORY_DEPLOY_BLOCK   │
│                                                             │
│  2. Get currentBlock from RPC                               │
│                                                             │
│  3. If startBlock >= currentBlock                           │
│     └── Nothing to do, exit                                 │
│                                                             │
│  4. Calculate chunks:                                       │
│     └── totalBlocks = currentBlock - startBlock             │
│     └── numChunks = ceil(totalBlocks / 100,000)             │
│                                                             │
│  5. For each chunk [i = 0 to numChunks-1]:                  │
│     ├── chunkStart = startBlock + (i * 100,000)             │
│     ├── chunkEnd = min(chunkStart + 99,999, currentBlock)   │
│     ├── Fetch logs for [chunkStart, chunkEnd]               │
│     ├── Parse VestingEscrowCreated events                   │
│     └── Append to escrows array                             │
│                                                             │
│  6. Update lastBlock = currentBlock                         │
│                                                             │
│  7. Save escrows.json                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Constants

```python
# Factory deployment block (Ethereum Mainnet)
FACTORY_DEPLOY_BLOCK = 18_291_969

FACTORY_ADDRESS = "0x200C92Dd85730872Ab6A1e7d5E40A067066257cF"
CHUNK_SIZE = 100_000
CHAIN_ID = 1

# VestingEscrowCreated event signature
# keccak256("VestingEscrowCreated(address,address,address,address,uint256,uint256,uint256,uint256,bool)")
EVENT_SIGNATURE = "0x99fd02dbc65944923f77d3e5d3e77e8c4c1b4026201be5445a8e827183e993e2"
```

### Event Parsing

**VestingEscrowCreated event:**
```solidity
event VestingEscrowCreated(
    address indexed funder,      // topic[1]
    ERC20 indexed token,         // topic[2]
    address indexed recipient,   // topic[3]
    address escrow,              // data[0]
    uint256 amount,              // data[1]
    uint256 vesting_start,       // data[2]
    uint256 vesting_duration,    // data[3]
    uint256 cliff_length,        // data[4]
    bool open_claim              // data[5]
);
```

**Parsing logic (web3.py):**
```python
from web3 import Web3
from eth_abi import decode

def parse_event(log: dict) -> dict:
    """Parse a VestingEscrowCreated event log."""
    # Decode indexed parameters from topics
    funder = Web3.to_checksum_address("0x" + log["topics"][1].hex()[-40:])
    token = Web3.to_checksum_address("0x" + log["topics"][2].hex()[-40:])
    recipient = Web3.to_checksum_address("0x" + log["topics"][3].hex()[-40:])

    # Decode non-indexed parameters from data
    data = bytes.fromhex(log["data"].hex()[2:])
    decoded = decode(
        ["address", "uint256", "uint256", "uint256", "uint256", "bool"],
        data
    )

    return {
        "address": Web3.to_checksum_address(decoded[0]),
        "funder": funder,
        "token": token,
        "recipient": recipient,
        "amount": str(decoded[1]),
        "vestingStart": decoded[2],
        "vestingDuration": decoded[3],
        "cliffLength": decoded[4],
        "openClaim": decoded[5],
        "blockNumber": log["blockNumber"],
        "txHash": log["transactionHash"].hex(),
    }
```

### Indexed Data Schema (escrows.json)

```json
{
  "lastIndexed": "2024-01-15T00:00:00Z",
  "lastBlock": 19234567,
  "chainId": 1,
  "factory": "0x200C92Dd85730872Ab6A1e7d5E40A067066257cF",
  "factoryDeployBlock": 18291969,
  "escrows": [
    {
      "address": "0x...",
      "funder": "0x...",
      "recipient": "0x...",
      "token": "0x...",
      "amount": "1000000000000000000000",
      "vestingStart": 1700000000,
      "vestingDuration": 31536000,
      "cliffLength": 2592000,
      "openClaim": true,
      "blockNumber": 18500000,
      "txHash": "0x..."
    }
  ]
}
```

**Key fields for incremental indexing:**
| Field | Purpose |
|-------|---------|
| `lastBlock` | Last fully scanned block — next run starts at `lastBlock + 1` |
| `lastIndexed` | ISO timestamp of last successful index run |
| `factoryDeployBlock` | Starting point for first-ever scan |

### ABI Directory Structure

Contract ABIs are fetched from verified Etherscan sources and stored locally.

```
abi/
├── VestingEscrowFactory.json    # Factory contract ABI
└── VestingEscrowSimple.json     # Escrow implementation ABI
```

**Fetching ABIs from Etherscan:**
```python
import requests
import json

ETHERSCAN_API = "https://api.etherscan.io/api"

def fetch_abi(address: str, api_key: str) -> dict:
    """Fetch verified contract ABI from Etherscan."""
    response = requests.get(ETHERSCAN_API, params={
        "module": "contract",
        "action": "getabi",
        "address": address,
        "apikey": api_key,
    })
    data = response.json()
    if data["status"] != "1":
        raise Exception(f"Failed to fetch ABI: {data['message']}")
    return json.loads(data["result"])
```

**Note:** ABIs should be committed to the repo after initial fetch. The indexer loads them from disk, not Etherscan, during normal operation.

### GitHub Action Workflow

```yaml
name: Index Escrows

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:      # Manual trigger

jobs:
  index:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run indexer
        run: python scripts/index_escrows.py
        env:
          MAINNET_RPC: ${{ secrets.MAINNET_RPC }}

      - name: Commit updated index
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: update escrow index [skip ci]"
          file_pattern: "data/escrows.json data/tokens.json"
          commit_author: "GitHub Actions <actions@github.com>"
```

### Python Dependencies (requirements.txt)

```
web3>=6.0.0
eth-abi>=4.0.0
requests>=2.28.0
```

### Error Handling & Resilience

**RPC failures:**
- Retry each chunk up to 3 times with exponential backoff
- If chunk fails after retries, stop and save progress up to last successful chunk
- `lastBlock` only updated after successful chunk processing

**Deduplication:**
- Before appending new escrows, check if address already exists
- Use Map/Set keyed by escrow address for O(1) lookup

**Partial progress:**
- If indexer crashes mid-run, next run resumes from `lastBlock + 1`
- No data loss — already-indexed escrows are preserved

### First Run vs Subsequent Runs

| Scenario | Behavior |
|----------|----------|
| **First run** (no escrows.json) | Start from `FACTORY_DEPLOY_BLOCK`, scan in 100k chunks to current block |
| **Subsequent run** | Start from `lastBlock + 1`, usually only ~7k blocks (1 day) |
| **Manual trigger** | Same as subsequent run — continues from last position |
| **Nothing new** | If no new blocks since last run, exits cleanly with no commit |

### Performance Estimates

| Scenario | Blocks to scan | Chunks | Estimated time |
|----------|----------------|--------|----------------|
| First run (from block 18M to 19.5M) | 1,500,000 | 15 | 2-5 minutes |
| Daily run | ~7,200 | 1 | 5-10 seconds |
| Weekly catchup | ~50,400 | 1 | 10-20 seconds |

---

## Token Metadata

### Token Logos

Token logos are sourced from the **SmolDapp tokenAssets** repository.

**CDN Endpoint:**
```
https://assets.smold.app/api/token/{chainId}/{tokenAddress}/{fileName}
```

**For Ethereum Mainnet (chainId: 1):**
```
https://assets.smold.app/api/token/1/{tokenAddress}/logo-128.png
https://assets.smold.app/api/token/1/{tokenAddress}/logo-32.png
https://assets.smold.app/api/token/1/{tokenAddress}/logo.svg
```

**Important:**
- Token addresses must be **lowercase** for EVM chains
- Use PNG format (smaller, faster loading)
- Available sizes: `logo-32.png` (32×32), `logo-128.png` (128×128)
- SVG also available as `logo.svg`

**Example (YFI token):**
```
https://assets.smold.app/api/token/1/0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e/logo-128.png
```

**Fallback handling:**
- If logo not found (404), display a generic token placeholder
- Placeholder: monochrome circle with first 2 characters of token symbol
- Consider caching logo availability in escrows.json during indexing

### Token Decimals & Symbol

Token decimals and symbols must be fetched from the ERC20 contract.

**Required ERC20 calls:**
| Method | Returns | Purpose |
|--------|---------|---------|
| `symbol()` | string | Token ticker (e.g., "YFI", "DAI") |
| `name()` | string | Full token name |
| `decimals()` | uint8 | Decimal places (usually 18) |

**Caching strategy:**

Option A: **Index-time caching** (recommended)
- During GitHub Action indexing, fetch token metadata for all unique tokens
- Store in `tokens.json` alongside `escrows.json`
- Frontend reads cached data, no RPC calls needed for display

Option B: **Runtime fetching**
- Frontend fetches token metadata on demand via RPC
- Cache in localStorage after first fetch
- More RPC calls but always fresh

**Indexed Token Schema (tokens.json):**
```json
{
  "lastUpdated": "2024-01-15T00:00:00Z",
  "tokens": {
    "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e": {
      "symbol": "YFI",
      "name": "yearn.finance",
      "decimals": 18,
      "logoAvailable": true
    },
    "0x6b175474e89094c44da98b954eedeac495271d0f": {
      "symbol": "DAI",
      "name": "Dai Stablecoin",
      "decimals": 18,
      "logoAvailable": true
    }
  }
}
```

### Display Formatting

**Token amounts:**
- Always display with proper decimal formatting
- Use locale-aware number formatting (e.g., `1,234,567.89`)
- Show full precision for small amounts, truncate large amounts
- Always show token symbol after amount

**Examples:**
```
1,000.00 YFI
50,000.000000 USDC  (6 decimals)
0.00000001 WBTC     (8 decimals)
```

---

## Token Prices

### Data Source: DeFiLlama Coins API

Token prices are fetched from the free DeFiLlama Coins API.

**Endpoint:**
```
https://coins.llama.fi/prices/current/{coins}
```

**Token format:**
```
ethereum:{tokenAddress}
```

**Single token example:**
```
https://coins.llama.fi/prices/current/ethereum:0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e
```

**Batch request (multiple tokens, comma-separated):**
```
https://coins.llama.fi/prices/current/ethereum:0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e,ethereum:0x6b175474e89094c44da98b954eedeac495271d0f
```

**Response format:**
```json
{
  "coins": {
    "ethereum:0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e": {
      "decimals": 18,
      "symbol": "YFI",
      "price": 8456.23,
      "timestamp": 1705312800,
      "confidence": 0.99
    }
  }
}
```

### Caching Strategy

Implement smart price caching to minimize API calls:

**Cache rules:**
- Cache duration: **1 hour** (3600 seconds)
- Storage: localStorage
- Key format: `price:{tokenAddress}`
- Store both price and fetch timestamp

**Cache schema:**
```json
{
  "price_cache": {
    "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e": {
      "price": 8456.23,
      "confidence": 0.99,
      "fetchedAt": 1705312800
    }
  }
}
```

**Cache logic:**
```
1. On price request:
   - Check localStorage for cached price
   - If cached AND (now - fetchedAt) < 3600 seconds:
     → Return cached price
   - Else:
     → Fetch from DeFiLlama API
     → Update cache with new price + timestamp
     → Return fresh price

2. Batch optimization:
   - Collect all tokens needing prices
   - Filter out tokens with valid cache
   - Batch fetch remaining tokens in single API call
   - Update cache for all fetched tokens
```

**Error handling:**
- If API fails, show cached price (even if stale) with "stale" indicator
- If no cache and API fails, show "—" or "Price unavailable"
- Never block UI on price fetch failures

### USD Value Display

Show USD values alongside token amounts:

**Format:**
```
TOTAL VALUE         $42,500.00
                    ──────────
CLAIMABLE           1,500.00 YFI     $12,684.35
LOCKED              3,500.00 YFI     $29,596.81
```

**Rules:**
- USD values in muted/secondary text
- Right-aligned with token amounts
- Show inline spinner while fetching price (see STYLEGUIDE.md)
- 2 decimal places for USD

---

## Recently Viewed (localStorage)

Track escrows the user has visited for easy access.

### Storage Schema

**localStorage key:** `recentlyViewed`

```json
{
  "recentlyViewed": [
    {
      "address": "0x1234...abcd",
      "visitedAt": 1705312800,
      "token": "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e",
      "recipient": "0x..."
    }
  ]
}
```

### Behavior

**On escrow detail page visit (`/manage/:address`):**
1. Add/update escrow in recentlyViewed array
2. Move to front if already exists (most recent first)
3. Update `visitedAt` timestamp
4. Limit array to **20 items** (remove oldest)

**Display:**
- Show in "Recently Viewed" tab on `/manage` page
- Available without wallet connection
- Show basic info: escrow address, token, recipient
- Sorted by `visitedAt` descending (most recent first)

**Clear option:**
- Provide "Clear history" action in UI
- Removes all entries from localStorage

---

## Technical Stack

### Frontend
- **Framework:** Vite + React (lightweight SPA, no SSR needed)
- **Wallet:** wagmi + viem
- **UI:** TailwindCSS (styled per STYLEGUIDE.md)
- **Routing:** React Router v6
- **State:** React Query (for data fetching) + Zustand or Context (for UI state)

### Indexer (Backend)
- **Runtime:** Python 3.12
- **Web3:** web3.py + eth-abi
- **Output:** Static JSON files (`data/escrows.json`, `data/tokens.json`)
- **Scheduling:** GitHub Actions (daily cron)

### Deployment
- **Platform:** Vercel
- **Routing:** History API (Vercel handles SPA fallback)
- **Static Data:** Served from same repo (`/data/*.json`)

### Project Structure

```
vyper-vesting-escrow-app/
├── abi/                        # Contract ABIs (from Etherscan)
│   ├── VestingEscrowFactory.json
│   └── VestingEscrowSimple.json
├── data/                       # Indexed data (updated by GitHub Action)
│   ├── escrows.json
│   └── tokens.json
├── scripts/                    # Python indexer
│   └── index_escrows.py
├── src/                        # React frontend
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── utils/
│   └── main.tsx
├── .github/
│   └── workflows/
│       └── index-escrows.yml
├── requirements.txt            # Python dependencies
├── package.json                # Frontend dependencies
└── vite.config.ts
```

---

## UI/UX Standards

### Responsive Design

**Mobile-first approach** — UI must work cleanly on all screen sizes.

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, stacked elements |
| Tablet | 640px – 1024px | Compact single column |
| Desktop | > 1024px | Full layout per wireframes |

**Mobile considerations:**
- Touch-friendly tap targets (min 44px)
- Horizontal scroll for progress bars/timelines only if necessary
- Collapsible sections for dense data
- Bottom-aligned action buttons
- Full-width inputs and buttons

### Address Display

**Format:** `0x1234...abcd` (4 chars head + 4 chars tail)

**Components:**
```
┌────────────────────────────────────┐
│ 0x1234...abcd  [📋]               │
└────────────────────────────────────┘
```

- Always show copy button (clipboard icon)
- Full address on hover (tooltip)
- Click copy button → "Copied!" feedback
- Monospace font for addresses

### Date & Time Display

**Format:** Human-readable with local timezone

| Context | Format | Example |
|---------|--------|---------|
| Full date | `MMM D, YYYY` | `Jan 15, 2024` |
| With time | `MMM D, YYYY h:mm A` | `Jan 15, 2024 3:30 PM` |
| Relative (< 7 days) | `X days ago` / `in X days` | `in 3 days` |
| Duration remaining | `X days, Y hours` | `45 days, 12 hours` |

**Timezone:**
- Display in user's local timezone
- Show `(UTC+X)` indicator on hover for clarity

### Duration Input

For vesting duration and cliff length inputs:

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  VESTING DURATION                                       │
│                                                         │
│  [ 6 months ] [ 1 year ] [ 2 years ] [ 4 years ]       │
│                                                         │
│  — or custom —                                          │
│                                                         │
│  [ 365 ] [ days ▼ ]                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Preset buttons:** Common durations (highlighted when selected)
**Custom input:** Number field + unit dropdown (days / months / years)
**Conversion:** Display equivalent in seconds below input

### Escrow Status States

| State | Condition | Badge/Indicator |
|-------|-----------|-----------------|
| `CLIFF` | `now < start + cliff_length` | "Cliff: 45d remaining" |
| `VESTING` | Cliff passed, `locked() > 0` | "Vesting: 45% complete" |
| `CLAIMABLE` | `unclaimed() > 0`, fully vested | "Fully vested" |
| `COMPLETED` | `unclaimed() == 0` and fully vested | "Completed" (muted) |
| `REVOKED` | `disabled_at < end_time` | "Revoked" |
| `DISOWNED` | `owner == 0x0` and not revoked | "Irrevocable" |

### Empty States

| Context | Message |
|---------|---------|
| No escrows for wallet | "No vesting escrows found for this wallet." |
| No recently viewed | "No recently viewed escrows. Search for an escrow or connect your wallet." |
| Search no results | "No escrow found at this address." |
| Newly created escrow | "This escrow was created recently and may not be in our index yet." + direct lookup option |

### Confirmation Dialogs

Required for irreversible actions:

| Action | Requires Confirmation | Dialog Message |
|--------|----------------------|----------------|
| Claim | No | — |
| Revoke | **Yes** | "This will permanently revoke the escrow and return X locked tokens to you. This cannot be undone." |
| Disown | **Yes** | "This will permanently give up your ability to revoke this escrow. The tokens will vest according to the original schedule." |

### Numeric Display

**Locale-aware formatting** — Use `Intl.NumberFormat` for all numbers.

| Type | Precision | US Example | EU Example |
|------|-----------|------------|------------|
| Token amounts | Up to 6 decimals, trim trailing zeros | `1,234.5678` | `1.234,5678` |
| USD values | Always 2 decimals | `$1,234.56` | `$1.234,56` |
| Percentages | 1 decimal | `42.5%` | `42,5%` |
| Large numbers | Locale separators | `1,500,000.00` | `1.500.000,00` |

**Implementation:**
```typescript
// Token amount formatting
const formatTokenAmount = (value: bigint, decimals: number): string => {
  const num = Number(value) / 10 ** decimals;
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(num);
};

// USD formatting
const formatUSD = (value: number): string => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

// Percentage formatting
const formatPercent = (value: number): string => {
  return new Intl.NumberFormat(undefined, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};
```

### Transaction UI Flow

Inline transaction states — no modals, no popups. Status replaces the action button.

**Flow:**
```
┌─────────────────────────────────────────────────────────┐
│  Initial State                                          │
│  [ Claim 1,500.00 YFI ]                                │
├─────────────────────────────────────────────────────────┤
│  Pending (wallet)                                       │
│  Confirm in wallet...                                   │
├─────────────────────────────────────────────────────────┤
│  Pending (chain)                                        │
│  Transaction pending... 0x1234...abcd ↗                 │
├─────────────────────────────────────────────────────────┤
│  Success                                                │
│  ✓ Claimed 1,500.00 YFI                                │
│  (auto-dismiss after 5s, refresh data)                 │
├─────────────────────────────────────────────────────────┤
│  Failure                                                │
│  Transaction failed: User rejected                      │
│  [ Try Again ]                                          │
└─────────────────────────────────────────────────────────┘
```

**Styling:**
- Pending states: muted text, inline spinner
- Success: primary text, checkmark (text, not icon)
- Failure: primary text, error message
- Etherscan link: underlined, opens in new tab
- No toast notifications — status is shown in place

### Data Refresh Strategy

**Minimal, unobtrusive refresh:**

| Trigger | Behavior |
|---------|----------|
| Page load | Fetch all data |
| Window focus | Refresh if > 30 seconds since last fetch |
| Manual button | Subtle refresh icon in header, click to refresh |
| After transaction | Automatic refresh on success |

**No auto-polling** — reduces visual noise and RPC load.

**Refresh icon:**
```
┌─────────────────────────────────────────────────────────┐
│  ESCROW 0x1234...abcd                     ↻  Updated 2m│
└─────────────────────────────────────────────────────────┘
```
- Show "Updated Xm ago" in muted text
- Click ↻ to refresh
- While refreshing: spinner replaces ↻

### Wallet Connection

**Supported wallets (v1):**
- Injected providers (MetaMask, Rabby, etc.)
- WalletConnect v2

**Connection UI:**
```
┌─────────────────────────────────────────────────────────┐
│  [ Connect Wallet ]                                     │
├─────────────────────────────────────────────────────────┤
│  After connection:                                      │
│  0x1234...abcd  [ Disconnect ]                         │
└─────────────────────────────────────────────────────────┘
```

- Simple button, no wallet selection modal for injected
- WalletConnect shows QR code in minimal dialog
- Connected state: truncated address + disconnect link

### Search Behavior

**v1 scope:** Escrow address lookup only

**Flow:**
```
┌───────────────────────────────────────────────────────┐
│ 🔍  Enter escrow address...                           │
└───────────────────────────────────────────────────────┘
        ↓ (on submit)
┌───────────────────────────────────────────────────────┐
│ If valid: Navigate to /manage/:address                │
│ If invalid format: "Please enter a valid address"     │
│ If not found: Show escrow anyway (live lookup)        │
└───────────────────────────────────────────────────────┘
```

**Smart lookup:**
- First check indexed data (escrows.json)
- If not in index, attempt live contract read
- Show "Not in index — fetching live data..." message
- Allows viewing newly created escrows before next index run

---

## User Stories

### As a Funder
- [ ] I can create a new vesting escrow for a recipient
- [ ] I can set custom vesting parameters (duration, cliff, start)
- [ ] I can choose whether to donate to Vyper
- [ ] I can view all escrows I've created
- [ ] I can revoke an escrow I own (clawback unvested tokens)
- [ ] I can disown an escrow (make it irrevocable)

### As a Recipient
- [ ] I can connect my wallet and see all my vesting schedules
- [ ] I can see how much is claimable right now
- [ ] I can see how much is still locked
- [ ] I can claim my vested tokens
- [ ] I can toggle open_claim setting
- [ ] I can see a visual timeline of my vesting schedule
- [ ] I can see if my escrow has been revoked

### As Any User
- [ ] I can look up any escrow by address
- [ ] I can search for escrows by recipient/funder
- [ ] I can view detailed escrow information
- [ ] I can claim on behalf of recipient (if open_claim)

---

## Open Questions

1. ~~**Chain Support**: Which chain(s)?~~ → **Resolved: Ethereum Mainnet only**
2. ~~**RPC Provider**: Which provider for indexing?~~ → **Resolved: User-provided archive node via `MAINNET_RPC`**
3. ~~**Historical Data**: Index from factory deployment or specific block?~~ → **Resolved: Start from block 18,291,969 (factory deploy)**
4. ~~**Token Metadata**: Fetch at index time or runtime?~~ → **Resolved: Index-time caching**
5. **Notifications**: Any need for email/push when tokens become claimable? → Defer to v2
6. ~~**Mobile**: Mobile-responsive or mobile app needed?~~ → **Resolved: Mobile-responsive web app required**
7. ~~**Framework**: Next.js or Vite + React?~~ → **Resolved: Vite + React**
8. ~~**Deployment**: Vercel or GitHub Pages?~~ → **Resolved: Vercel**

---

## Non-Functional Requirements

- [ ] No backend servers (serverless/static only)
- [ ] Works with standard Web3 wallets (MetaMask, WalletConnect, etc.)
- [ ] Responsive design (desktop + mobile)
- [ ] Clear error messages for failed transactions
- [ ] Loading states for async operations
- [ ] Transaction status tracking

---

## Future Considerations

- Multi-chain support (if factory deployed on multiple chains)
- CSV export of vesting data
- Bulk escrow creation
- Integration with other Yearn products
- ENS resolution for addresses
