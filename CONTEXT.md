# Vesting Escrow Contracts - Technical Context

## Overview

This system consists of two Vyper smart contracts implementing a token vesting solution:
1. **VestingEscrowFactory** - Deploys and initializes individual vesting escrows
2. **VestingEscrowSimple** - Holds and releases tokens according to a vesting schedule

## Contract Architecture

### Factory Pattern
The factory uses a **minimal proxy pattern** (EIP-1167 clones) to deploy gas-efficient escrow instances. Each escrow is a lightweight proxy that delegates to a single implementation contract (`TARGET`).

```
VestingEscrowFactory
    ├── TARGET (implementation address)
    └── VYPER (donation address - vyperlang.eth)
           │
           ├── deploy_vesting_contract() ──► creates minimal proxy
           │                                      │
           │                                      ▼
           │                              VestingEscrowSimple (proxy)
           │                                      │
           └──────────────────────────────────────┘
```

---

## VestingEscrowFactory

**Address**: `0x200C92Dd85730872Ab6A1e7d5E40A067066257cF`

### Immutable State
| Variable | Type | Description |
|----------|------|-------------|
| `TARGET` | address | Implementation contract for proxies |
| `VYPER` | address | Donation recipient (vyperlang.eth) |

### Function: `deploy_vesting_contract`

Creates a new vesting escrow for a recipient.

#### Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `token` | ERC20 | required | Token being vested |
| `recipient` | address | required | Who receives the vested tokens |
| `amount` | uint256 | required | Total tokens to vest |
| `vesting_duration` | uint256 | required | Duration in seconds |
| `vesting_start` | uint256 | `block.timestamp` | When vesting begins |
| `cliff_length` | uint256 | `0` | Cliff period in seconds |
| `open_claim` | bool | `True` | Allow anyone to trigger claims |
| `support_vyper` | uint256 | `100` | Donation in bps (100 = 1%) |
| `owner` | address | `msg.sender` | Escrow owner (can revoke) |

#### Validations
- `cliff_length <= vesting_duration`
- `vesting_start + vesting_duration > block.timestamp` (must vest in future)
- `vesting_duration > 0`
- `recipient` cannot be: factory, zero address, token address, or owner

#### Token Approval Required
Caller must approve: `amount + (amount * support_vyper / 10_000)`

Example: To vest 1000 tokens with 1% Vyper donation, approve 1010 tokens.

#### Event Emitted
```vyper
event VestingEscrowCreated:
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

**This event is critical for indexing** - it's the only way to discover deployed escrows.

---

## VestingEscrowSimple

Individual escrow contract holding tokens for one recipient.

### State Variables
| Variable | Type | Description |
|----------|------|-------------|
| `recipient` | address | Token recipient |
| `token` | ERC20 | Token being vested |
| `start_time` | uint256 | Vesting start timestamp |
| `end_time` | uint256 | Vesting end timestamp |
| `cliff_length` | uint256 | Cliff duration in seconds |
| `total_locked` | uint256 | Total tokens locked at creation |
| `total_claimed` | uint256 | Tokens claimed so far |
| `disabled_at` | uint256 | Revocation timestamp (or end_time if active) |
| `open_claim` | bool | Allow third-party claims |
| `initialized` | bool | Prevents re-initialization |
| `owner` | address | Can revoke (zero if disowned/revoked) |

### Vesting Formula

**Linear vesting with optional cliff:**

```
if time < start_time + cliff_length:
    vested = 0
else:
    vested = min(total_locked * (time - start_time) / (end_time - start_time), total_locked)
```

**Visual Timeline:**
```
|----cliff----|------------------linear vesting------------------|
^             ^                                                  ^
start_time    cliff_end                                      end_time
              (first tokens vest)                         (fully vested)
```

### Key Functions

#### View Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `unclaimed()` | uint256 | Vested but not yet claimed tokens |
| `locked()` | uint256 | Tokens still locked (not yet vested) |

Both respect `disabled_at` if escrow was revoked.

#### Recipient Functions

| Function | Description | Access |
|----------|-------------|--------|
| `claim(beneficiary, amount)` | Claim vested tokens | Recipient, or anyone if `open_claim` and beneficiary == recipient |
| `set_open_claim(bool)` | Toggle open claim | Recipient only |
| `collect_dust(token, beneficiary)` | Collect extra/dust tokens | Same as claim |

#### Owner Functions

| Function | Description | Effect |
|----------|-------------|--------|
| `revoke(ts, beneficiary)` | Clawback unvested tokens | Sets `disabled_at`, transfers locked tokens to beneficiary, sets owner to zero |
| `disown()` | Renounce ownership | Sets owner to zero (cannot revoke after) |

### Events

```vyper
event Claim:
    recipient: indexed(address)
    claimed: uint256

event Revoked:
    recipient: address
    owner: address
    rugged: uint256    # amount clawed back
    ts: uint256        # revocation timestamp

event Disowned:
    owner: address

event SetOpenClaim:
    state: bool
```

---

## Roles & Permissions Summary

### Funder (deployer)
- Calls factory to create escrow
- Provides tokens
- Becomes owner by default

### Owner
- Can revoke (clawback unvested tokens)
- Can disown (give up control permanently)
- Cannot claim or access vested tokens

### Recipient
- Can claim vested tokens
- Can toggle `open_claim`
- Can collect dust tokens
- Cannot be owner (enforced by factory)

---

## Important Behaviors

### Open Claim
When `open_claim = True`:
- Anyone can call `claim(recipient, amount)` to send tokens to recipient
- Useful for gas-less claiming, bots, or third-party UX

When `open_claim = False`:
- Only recipient can call `claim()`

### Revocation
- Owner can revoke at any future timestamp up to `end_time`
- Revocation is one-time (owner is set to zero after)
- Vested tokens remain claimable by recipient
- Only unvested tokens are clawed back

### Disowning
- Owner permanently gives up control
- Escrow becomes irrevocable
- Tokens will vest according to schedule

---

## Indexing Strategy

### Event-Based Indexing
The only on-chain record of escrows is the `VestingEscrowCreated` event.

**Data available from event:**
- Escrow address
- Funder (who created it)
- Token
- Recipient
- Amount
- Vesting start
- Vesting duration
- Cliff length
- Open claim setting

**Data requiring contract calls:**
- `unclaimed()` - current claimable amount
- `locked()` - current locked amount
- `total_claimed` - tokens claimed so far
- `disabled_at` - revocation status
- `owner` - current owner (zero if revoked/disowned)
- Token balance (actual tokens in escrow)

### Query Patterns

**Find all escrows for a recipient:**
```
Filter VestingEscrowCreated events where recipient == userAddress
```

**Find all escrows created by a funder:**
```
Filter VestingEscrowCreated events where funder == userAddress
```

**Find all escrows for a token:**
```
Filter VestingEscrowCreated events where token == tokenAddress
```

---

## Chain Deployment

Currently known deployment:
- Factory: `0x200C92Dd85730872Ab6A1e7d5E40A067066257cF`
- Chain: **Ethereum Mainnet** (chainId: 1)

---

## Security Considerations

1. **Recipient cannot be owner** - Factory enforces this to prevent self-rugging
2. **One-time initialization** - Escrow cannot be re-initialized
3. **Revocation is permanent** - Owner loses control after revoke
4. **Cliff respects revocation** - If revoked before cliff ends, recipient gets nothing
5. **Dust collection** - Extra tokens sent to escrow can be recovered
