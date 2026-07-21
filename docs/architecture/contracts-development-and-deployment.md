# Contract change and factory rollout plan

## Current state

The repository now contains all three parts of the system:

| Component | Location | Role |
| --- | --- | --- |
| Web app | `src/` | Reads escrows and creates new ones through the active factory |
| Indexer | `scripts/indexer/` | Scans all supported factories and generates `public/data/*.json` |
| Contracts | `packages/contracts/` | Vyper source, Ape config, tests, and deployment scripts |

The contract package is the upstream `yearn/yearn-vesting-escrow` v0.3.0 tag at
commit `d14eed16f5b131bc35c58df2b8b4a03427928ef1`. That release is the source for
the active Yearn factory `0x200C92Dd85730872Ab6A1e7d5E40A067066257cF`.
The indexer also follows the compatible Curve factory
`0xcf61782465Ff973638143d6492B51A85986aB347`; it is an actively used read
source, not the frontend's current write target.

The local unreleased source ports the Curve fork's escrow registry, zero default
donation, revoke checks-effects-interactions ordering, and dust-solvency
assertion. It now also includes a separate `VestingEscrowSimpleV2` implementation
and explicit factory routing for vault shares. The legacy path and creation
event remain compatible; the new mode adds a companion configuration event.

The toolchain is locked to Python 3.11, Ape 0.8, and Foundry 1.5.1. Root CI runs
the locked compile, functional, coverage, and Hypothesis commands for contract
changes.

## Rollout invariants

1. Existing escrows remain attached to their original implementation and are
   never migrated in place.
2. Historical factory addresses remain indexed after a new factory becomes the
   create-flow target.
3. The frontend does not switch to a new factory until its implementation,
   constructor values, bytecode, source verification, event decoding, and a
   canary escrow have been checked.
4. Deployment keys, RPC secrets, and explorer API keys never enter the repo.
5. A changed external ABI or event is treated as a versioned integration change,
   not silently substituted for the v0.3 interface.

## Phase 0: establish a reproducible baseline — complete

- Python 3.11, Vyper 0.3.10, Ape 0.8, and Foundry 1.5.1 are the supported
  contract toolchain.
- `requirements.in` records direct dependencies and the generated
  `requirements.txt` locks the full Python dependency graph.
- The unmodified v0.3.0 source was compiled and compared byte-for-byte with the
  active Yearn mainnet implementation and factory.
- The modernized baseline passed all 46 original functional tests and the
  Hypothesis integration test before the contract changes were applied.
- The root contract workflow is scoped to `packages/contracts/**` and runs the
  locked compile, gas, coverage, functional, and property-test commands.

Exit gate satisfied: the documented setup reproduces compilation and all tests.

## Phase 1: specify the contract change — complete

- Write the desired behavior and explicit non-goals before editing Vyper.
- Decide whether the new version must preserve:
  - `deploy_vesting_contract` arguments and return value;
  - the `VestingEscrowCreated` event signature and indexed fields;
  - escrow getters and action signatures consumed by the app;
  - current donation semantics and the `VYPER` destination;
  - current owner, recipient, cliff, revoke, and open-claim behavior.
- Produce a compatibility matrix for old escrow, old factory, new escrow, and
  new factory reads/writes.
- Threat-model token callbacks/non-standard ERC20 behavior, initialization,
  authorization, timestamp boundaries, rounding, dust collection, donation
  arithmetic, denial of service, and minimal-proxy assumptions.

Exit gate: the change has reviewable acceptance criteria and its frontend and
indexer impact is known.

## Phase 2: implement and validate — local validation complete

- Make the smallest Vyper change that satisfies the specification.
- Add regression tests first, then unit, boundary, property, and invariant tests
  for every changed behavior.
- Exercise zero/maximum values, start/cliff/end boundaries, partial claims,
  revoke/disown sequences, fee-on-transfer or non-returning tokens where in
  scope, and unauthorized callers.
- Run the suite on a local chain and an Ethereum mainnet fork.
- Compare ABI, selectors, topics, storage layout, creation/runtime bytecode,
  bytecode size, and gas against v0.3.0.
- Obtain independent security review; require a new audit when the change alters
  asset flow, authorization, accounting, initialization, or proxy behavior.

Exit gate: tests and review are green, compatibility deltas are documented, and
the exact release commit is frozen. Independent security review and a mainnet
fork run remain outstanding before this gate is fully satisfied.

## Phase 3: harden deployment tooling

Do not use the imported demo scripts unchanged for production. Replace or
harden them so one command performs a deterministic, auditable deployment:

1. Require an explicit network and assert the expected chain ID.
2. Select the intended signer without embedding a key.
3. Print and confirm the deployer, balance, nonce, gas assumptions, compiler
   versions, release commit, and constructor arguments.
4. Deploy `VestingEscrowSimple` and `VestingEscrowSimpleV2` first.
5. Deploy `VestingEscrowFactory(target, target_v2, vyper_donate)` using those exact targets.
6. Read back `TARGET()`, `TARGET_V2()`, and `VYPER()` and compare them to the inputs.
7. Write a deployment manifest containing chain ID, addresses, deployment block
   numbers, transaction hashes, constructor arguments, source commit, compiler
   settings, and bytecode hashes.
8. Verify all three contracts on the explorer and fail if verification cannot be
   reproduced from the frozen source.

Run the script on a local chain, a pinned mainnet fork, and Sepolia with the
production signer flow before authorizing mainnet.

Exit gate: a reviewed dry run produces the expected manifest and verified
contracts without manual address copying.

## Phase 4: deploy and canary on mainnet

- Tag the frozen release and deploy from a reviewed signer or multisig process.
- Verify both implementations before deploying the factory.
- Verify the factory, its constructor arguments, `TARGET()`, `TARGET_V2()`, `VYPER()`, code
  hashes, chain ID, transaction hashes, and deployment blocks.
- Create low-value legacy and ERC-4626 canary escrows using the same UI-facing
  argument shapes.
- Confirm both event shapes, exact share funding, the principal snapshot, all
  live getters, claims, yield claims, and any safe lifecycle action required by
  the new behavior.
- Publish the deployment manifest and review evidence before switching the app.

Exit gate: the canary and independent address/bytecode review pass.

## Phase 5: integrate the app and indexer

- Make the deployment manifest the source of truth for addresses and deployment
  blocks. Generate or import typed frontend constants and indexer configuration
  from it instead of maintaining unrelated literals.
- Point only the create flow at the new active factory. Keep every old factory
  in the indexer's scan list so old escrow URLs and searches continue to work.
- Add the new factory with its exact deployment block; do not rewrite historical
  factory metadata.
- Regenerate reviewed ABIs from the frozen contract build if any consumer-facing
  interface changed. Add version-aware decoding if event signatures differ.
- Store an explicit escrow mode from the companion event. Use the legacy action
  ABI for historical escrows and the ERC-4626 action ABI only for escrows whose
  mode was positively identified.
- Fix approval accounting before rollout: the current create page compares the
  allowance and balance with `amount`, but a non-zero `support_vyper` transfer
  requires `amount + amount * support_vyper / 10_000`.
- Test event parsing from a real deployment receipt and indexer discovery from
  the new deployment block.
- Run `npm run lint` and `npm run build`.
- Refresh `public/data/*.json` only through
  `scripts/indexer/index_escrows.py`, then review the generated diff.

Exit gate: the production build creates through the new factory and reads both
new and historical escrows.

## Phase 6: release, monitor, and roll back

- Deploy the frontend/indexer configuration change separately from the contract
  transaction so switching the create target is deliberate and observable.
- Monitor failed approvals/deployments, creation events, indexed block progress,
  and canary lifecycle behavior.
- Rollback means returning the frontend write target to the last known-good
  factory. Deployed factories are immutable and cannot be disabled; document a
  superseded factory publicly and keep indexing any escrows already created by
  it.
- Archive source verification, manifests, audit/review artifacts, release tag,
  and runbooks with the release.

## Decisions still needed before deployment

- The mainnet deployer/signer and approval process.
- The intended `vyper_donate` address and default donation policy.
- Security review/audit threshold and reviewers.
- Whether future upstream syncs use reviewed source snapshots, Git subtree, or a
  separately maintained fork as the canonical upstream.
