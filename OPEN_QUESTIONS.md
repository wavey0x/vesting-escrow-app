# Open Questions — All Resolved

All blocking and important questions have been resolved. This document is retained for reference.

**Status:** ✅ Ready for implementation

---

## ✅ All Items Resolved

### Blocking Items

| # | Question | Resolution |
|---|----------|------------|
| 1 | Factory deploy block | `18,291,969` |
| 2 | Event signature hash | `0x0c5f79741d96aa7b5dfc20a68dc1960f65de16e6ca5181528ca0de65ce3ad74e` |
| 3 | Frontend framework | Vite + React |
| 4 | Deployment platform | Vercel |
| 5 | Static data serving | Same repo (`/data/*.json`) |
| 6 | Indexer technology | Python 3.12 + web3.py |

### Important Items

| # | Question | Resolution |
|---|----------|------------|
| 7 | Chain | Ethereum Mainnet only (chainId: 1) |
| 8 | Mobile | Mobile-first responsive design |
| 9 | Address format | `0x1234...abcd` (4+4) + copy button |
| 10 | Date/time format | Local timezone, human readable (`Jan 15, 2024`) |
| 11 | Duration input | Preset buttons + custom (number + unit dropdown) |
| 12 | Transaction flow | Inline states, no modals. Status replaces button. |
| 13 | Search scope | Escrow address only (v1). Smart lookup with live fallback. |
| 14 | Wallet support | Injected + WalletConnect v2 |
| 15 | Refresh strategy | Manual + window focus (> 30s), no auto-polling |
| 16 | Numeric display | Locale-aware via `Intl.NumberFormat` |

### Minor Items

| # | Question | Resolution |
|---|----------|------------|
| 17 | ENS resolution | Defer to v1.1 |
| 18 | Collect dust | Defer to v1.1 |
| 19 | Open claim toggle | Include in v1 (simple toggle for recipients) |
| 20 | Block explorer | Etherscan |
| 21 | Error messages | Specific, actionable messages |

---

## Summary of Key Decisions

### Technical Stack
- **Frontend:** Vite + React + TailwindCSS + wagmi/viem
- **Indexer:** Python 3.12 + web3.py, GitHub Actions daily cron
- **Deployment:** Vercel with history API routing
- **Data:** Static JSON committed to repo

### UX Principles
- **Minimalist:** No modals, inline transaction states, subtle refresh
- **Responsive:** Mobile-first, touch-friendly
- **Locale-aware:** Numbers formatted per user's region
- **Smart lookup:** Falls back to live RPC for new escrows

### Deferred to v1.1
- ENS name resolution
- Collect dust functionality
- Search by recipient/funder address
- Coinbase Wallet / Safe multisig support

---

## Ready for Implementation ✅

All questions resolved. Proceed with development.

See:
- `REQUIREMENTS.md` — Full specification
- `STYLEGUIDE.md` — Visual design system
- `CONTEXT.md` — Contract documentation
