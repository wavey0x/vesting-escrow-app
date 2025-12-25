# Vesting Escrow - Development Context

## Contracts

### VestingEscrowFactory
**Address**: `0x200C92Dd85730872Ab6A1e7d5E40A067066257cF`
**Chain**: Ethereum Mainnet (chainId: 1)

Deploys individual vesting escrows using EIP-1167 minimal proxies.

#### deploy_vesting_contract Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `token` | ERC20 | required | Token being vested |
| `recipient` | address | required | Who receives tokens |
| `amount` | uint256 | required | Total tokens to vest |
| `vesting_duration` | uint256 | required | Duration in seconds |
| `vesting_start` | uint256 | `block.timestamp` | When vesting begins |
| `cliff_length` | uint256 | `0` | Cliff period in seconds |
| `open_claim` | bool | `True` | Allow anyone to trigger claims |
| `support_vyper` | uint256 | `100` | Donation in bps (100 = 1%) |
| `owner` | address | `msg.sender` | Escrow owner (can revoke) |

#### VestingEscrowCreated Event
```
funder: indexed(address)      # msg.sender
token: indexed(ERC20)         # token address
recipient: indexed(address)   # recipient
escrow: address               # deployed escrow address
amount: uint256               # vested amount
vesting_start: uint256        # start timestamp
vesting_duration: uint256     # duration in seconds
cliff_length: uint256         # cliff in seconds
open_claim: bool              # open claim setting
```

### VestingEscrowSimple

Individual escrow contract. Linear vesting with optional cliff.

#### Key State
| Variable | Description |
|----------|-------------|
| `recipient` | Token recipient |
| `token` | Token being vested |
| `start_time` | Vesting start timestamp |
| `end_time` | Vesting end timestamp |
| `cliff_length` | Cliff duration in seconds |
| `total_locked` | Total tokens locked at creation |
| `total_claimed` | Tokens claimed so far |
| `disabled_at` | Revocation timestamp (or end_time if active) |
| `open_claim` | Allow third-party claims |
| `owner` | Can revoke (zero if disowned/revoked) |

#### Vesting Formula
```
if time < start_time + cliff_length:
    vested = 0
else:
    vested = total_locked * (time - start_time) / (end_time - start_time)
```

#### Functions
| Function | Access | Description |
|----------|--------|-------------|
| `unclaimed()` | view | Vested but unclaimed tokens |
| `locked()` | view | Tokens still vesting |
| `claim(beneficiary, amount)` | recipient/open | Claim vested tokens |
| `set_open_claim(bool)` | recipient | Toggle open claim |
| `revoke(ts, beneficiary)` | owner | Clawback unvested tokens |
| `disown()` | owner | Permanently give up control |

---

## Indexing

The app uses static JSON data updated daily via GitHub Actions.

**Event Signature** (keccak256):
```
VestingEscrowCreated(address,address,address,address,uint256,uint256,uint256,uint256,bool)
0x99fd02dbc65944923f77d3e5d3e77e8c4c1b4026201be5445a8e827183e993e2
```

**Factory Deploy Block**: 18,291,969

---

## Status Logic

Status is determined in `src/lib/escrow.ts:getEscrowStatus()`:

1. **revoked** - `disabled_at < end_time`
2. **completed** - `unclaimed === 0 && locked === 0`
3. **cliff** - `now < start_time + cliff_length`
4. **claimable** - `locked === 0 && unclaimed > 0`
5. **vesting** - default (active vesting)

---

## Token Data

**Logos**: SmolDapp CDN with fallbacks to Trust Wallet, Uniswap, stamp.fyi
```
https://assets.smold.app/api/token/1/{address}/logo-128.png
```

**Prices**: DeFiLlama Coins API, 1-hour cache
```
https://coins.llama.fi/prices/current/ethereum:{address}
```
