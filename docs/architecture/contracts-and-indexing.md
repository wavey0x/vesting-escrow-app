# Contracts and Indexing

This document is the integration contract between the Vyper package, indexer,
and frontend.

## Deployments

Ethereum mainnet is the only supported chain. `config/deployments.json` is the
shared registry: the frontend writes through `activeFactory`, while the indexer
reads every listed factory from its deployment block.

The two deployed factories are historical version 1 contracts:

| Factory | Deploy block | Role |
| --- | ---: | --- |
| `0x200C92Dd85730872Ab6A1e7d5E40A067066257cF` | 18,291,969 | Current create target |
| `0xcf61782465Ff973638143d6492B51A85986aB347` | 19,739,664 | Indexed Curve-compatible factory |

The version 2 source is unreleased. Existing escrows remain attached to their
original immutable implementation and are never upgraded.

## Current factory

`packages/contracts/contracts/VestingEscrowFactory.vy` has one immutable
`TARGET`. Each deployment is atomic:

1. create an ERC-1167 proxy;
2. transfer the exact escrow amount directly into it;
3. initialize it once;
4. transfer any optional Vyper donation;
5. emit one complete creation event.

The constructor is:

```text
VestingEscrowFactory(target, vyper_donate)
```

The creation call is:

```text
deploy_vesting_contract(
    token,
    recipient,
    amount,
    vesting_duration,
    vesting_start,
    cliff_length,
    open_claim,
    support_vyper,
    owner,
    yield_to_owner,
)
```

`support_vyper` is expressed in basis points and cannot exceed 10,000. The
frontend currently offers either zero or 100 basis points.

### Creation event

Version 2 emits one self-contained event. `funder`, `token`, and `recipient`
are indexed.

```text
VestingEscrowCreated(
    funder,
    token,
    recipient,
    owner,
    escrow,
    amount,
    vesting_start,
    vesting_duration,
    cliff_length,
    open_claim,
    yield_to_owner,
    asset,
    principal,
)
```

Historical factories retain their shorter version 1 event. Consumers select
the event ABI from the factory version in `config/deployments.json`; there is no
event join or runtime ABI guessing.

## VestingEscrowSimple

`packages/contracts/contracts/VestingEscrowSimple.vy` is the sole current
implementation. `version()` returns `2`. The implementation instance is locked
in its constructor; only funded proxies can be initialized.

The mode flag changes accounting, not the lifecycle API:

| `yield_to_owner` | Token meaning | Principal | Yield recipient |
| --- | --- | --- | --- |
| `false` | Standard ERC-20 | `amount` token units | None |
| `true` | ERC-4626 shares | `convertToAssets(amount)` asset units | Original owner |

Amounts and initial principal are limited to `uint128`; duration is limited to
`uint64`. Live token balances may be larger because direct ERC-20 transfers
cannot be rejected, so balance-dependent accounting does not rely on the
initial amount bound.

Both modes use the same fixed destinations and actions:

```text
claim()          -> all currently vested principal to recipient
claim_yield()    -> current yield shares to original owner
revoke()         -> unvested principal and current yield to owner
disown()         -> permanently remove revoke authority
set_open_claim() -> recipient controls third-party claim triggering
recover(token)   -> unrelated tokens to recipient
```

Funding and payouts always use `token`. In yield mode that token is the vault
wrapper; the escrow never deposits, withdraws, or redeems underlying assets.

### Share accounting

Let `B` be the escrow's current share balance, `V = convertToAssets(B)`, and `R`
the remaining principal in asset units. When there is yield, the vault performs
the asset-to-share conversion and the escrow rounds the principal reserve up by
at most one share.

```text
if V <= R:
    principal_shares = B
    yield_shares = 0
else:
    principal_shares = convertToShares(R)
    if convertToAssets(principal_shares) < R:
        principal_shares += 1
    yield_shares = B - principal_shares
```

For a principal transition from `R` to `R2`, the escrow keeps the rounded-up
reserve and pays the remainder:

```text
whole, remainder = divmod(principal_shares, R)
reserve = whole * R2 + ceil(remainder * R2 / R)
payout = principal_shares - reserve
```

This makes repeated claims equivalent to one claim up to unavoidable share
rounding and keeps rounding inside the principal reserve. The remainder is
strictly smaller than the `uint128` principal, so the only explicit
multiplication is bounded even when direct transfers make the live share
balance much larger. Vault losses are borne proportionally by outstanding
principal; gains above principal go to the original owner.

## Frontend compatibility

The frontend uses the factory version for writes and event decoding:

- version 1: historical factory/event ABI and `claim(recipient, amount)`;
- version 2: current factory/event ABI and fixed-destination `claim()`;
- yield controls are shown only when `yield_to_owner` is enabled.

Confirmed creations are retained in a seven-day local cache until the public
index catches up.

## Indexer

Indexer assets live in `scripts/indexer/`:

```text
abi/VestingEscrowFactoryLegacy.json  historical event
abi/VestingEscrowFactory.json        current event
index_escrows.py                     scanner and generator
```

Each indexed record carries its factory address and explicit version. Current
records also include `yieldToOwner`, `asset`, `yieldRecipient`, and `principal`
directly from the creation event.

`public/data/escrows.json` and `public/data/tokens.json` are generated files.
Only `scripts/indexer/index_escrows.py` may update them.

## Activation

After a reviewed mainnet deployment:

1. add the factory and exact deployment block to `config/deployments.json`;
2. run and review a low-value standard-token canary;
3. run and review a low-value ERC-4626 canary;
4. set the new address as `activeFactory`;
5. run the indexer and review the generated data diff.

Rollback changes only `activeFactory` back to the last known-good factory.
Already-created escrows and their historical factory stay indexed.
