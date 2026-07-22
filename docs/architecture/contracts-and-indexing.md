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
5. append it to the on-chain escrow registry;
6. emit the compatible creation event and additive configuration event.

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

### Creation events

Version 2 preserves the original creation event exactly. `funder`, `token`, and
`recipient` are indexed, so existing event consumers keep the same topic and
decoding schema.

```text
VestingEscrowCreated(
    funder,
    token,
    recipient,
    escrow,
    amount,
    vesting_start,
    vesting_duration,
    cliff_length,
    open_claim,
)
```

An additive event supplies version 2 metadata without changing the historical
event topic:

```text
VestingEscrowConfigured(
    escrow,
    owner,
    asset,
    yield_to_owner,
    principal,
)
```

Version 2 consumers join these logs by escrow address and transaction hash.
Historical factories emit only `VestingEscrowCreated`.

## VestingEscrowSimple

`packages/contracts/contracts/VestingEscrowSimple.vy` is the sole current
implementation. `version()` returns `2`. The implementation instance is locked
in its constructor; only funded proxies can be initialized.

The mode flag changes accounting, not the lifecycle API:

| `yield_to_owner` | Token meaning | Principal | Yield recipient |
| --- | --- | --- | --- |
| `false` | Standard ERC-20 | `amount` token units | None |
| `true` | ERC-4626 shares | `convertToAssets(amount)` asset units | Original owner |

`yield_to_owner()` is derived from the nonzero fixed `yield_recipient`, keeping
the mode and its payout destination in one storage value. Yield-mode
initialization requires a contract asset and exercises both ERC-4626 conversion
methods before the proxy can be registered. These are interface sanity checks;
they do not replace reviewing the vault implementation.

Yield mode is intended for reviewed, conventional vaults whose raw share unit
is economically negligible. It does not attempt exact, claim-history-independent
allocation for coarse shares. ERC-4626 floor rounding can move less than one raw
share per claim or revoke transition between recipient principal and owner
yield; production vault review must confirm that this bound is immaterial.

Amounts and initial principal are limited to `uint128`; duration is limited to
`uint64`. Live token balances may be larger because direct ERC-20 transfers
cannot be rejected, so balance-dependent accounting does not rely on the
initial amount bound.

The lifecycle retains the deployed overloads:

```text
claim(beneficiary=msg.sender, amount=max) -> vested tokens or principal shares
claim_yield()                            -> current yield shares to original owner
revoke(ts=block.timestamp, beneficiary=msg.sender)
                                         -> unvested tokens or vault shares
disown()                                 -> permanently remove revoke authority
set_open_claim()                         -> recipient controls third-party claims
collect_dust(token, beneficiary=msg.sender)
                                         -> tokens not reserved for vesting
```

Standard mode preserves the original partial-claim, beneficiary, revoke, and
dust behavior. Yield mode supports full scheduled claims, keeps vault shares
out of `collect_dust`, and reserves yield for the original owner. Regular
claims transfer principal only; yield moves only through `claim_yield()` or as
part of an owner-initiated revocation.

The existing `claim(beneficiary, amount)` ABI is unchanged. In standard mode,
`amount` caps a partial token claim. In yield mode, it is a maximum share-output
cap for the full currently vested principal claim; a lower cap reverts without
changing state.

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

The first branch also covers complete vault loss: every remaining share stays
in the principal pool, no asset-to-share division is attempted, and transferable
shares remain claimable rather than becoming stuck.

For a principal transition from `R` to `R2`, the escrow keeps the rounded-up
reserve and pays the remainder:

```text
whole, remainder = divmod(principal_shares, R)
reserve = whole * R2 + ceil(remainder * R2 / R)
payout = principal_shares - reserve
```

Each transition rounds the remaining principal reserve up and the payout down.
Because the asset-denominated schedule advances independently of whole-share
transfers, repeated claims can differ from one terminal claim by raw share
units. This accepted rounding avoids persistent checkpoint state and complex
rate-change logic. The remainder is strictly smaller than the `uint128`
principal, so the only explicit multiplication is bounded even when direct
transfers make the live share balance much larger. Vault losses are borne
proportionally by outstanding principal; gains above principal go to the
original owner.

## Frontend compatibility

The frontend uses the factory version for deployment and event decoding:

- both versions claim through `claim(recipient, max_value(uint256))`;
- claim calldata uses the live on-chain `recipient()`, never indexed metadata;
- version 1 reads the historical creation event;
- version 2 joins the compatible creation event with its configuration event;
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

Each indexed record carries its factory address and explicit version. Version 2
records join same-transaction creation and configuration events to add
`yieldToOwner`, `asset`, `yieldRecipient`, and `principal`.

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
