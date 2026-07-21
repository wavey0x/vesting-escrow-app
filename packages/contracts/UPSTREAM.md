# Upstream provenance

This directory is a source import of the Yearn Vesting Escrow contract project,
not a nested Git repository or a Git submodule.

| Field | Value |
| --- | --- |
| Upstream | `https://github.com/yearn/yearn-vesting-escrow.git` |
| Branch | `master` |
| Release | `v0.3.0` |
| Commit | `d14eed16f5b131bc35c58df2b8b4a03427928ef1` |
| Commit date | `2023-10-13T18:10:02+01:00` |
| Imported | `2026-07-21` |

## Local divergence

Commit `f3dcdd8` records the last all-Vyper-0.3.10 snapshot. At that commit,
compiling with the Curve constructor values produced factory and target runtime
bytecode hashes matching the verified Curve deployment at factory
`0xcf61782465Ff973638143d6492B51A85986aB347` and target
`0x9dd5cF263327e2D6a608da8c30368Eb27514bAD2`.

The current unreleased source is a deliberate versioned redesign:

- one Vyper 0.4.3 `VestingEscrowSimple` implementation handles standard ERC-20
  vesting and optional ERC-4626 share accounting;
- one factory target replaces separate legacy/current implementation routing;
- proxies are funded before one-time initialization;
- recipient and yield destinations are fixed, and claims have no destination
  arguments;
- the factory emits one complete creation event and keeps no redundant escrow
  registry;
- Titanoboa tests replace the imported Ape suite.

This changes ABI and bytecode intentionally. Deployed version 1 contracts are
preserved as historical frontend/indexer integrations rather than retained as
editable source. The unreleased changes must not be overwritten during an
upstream sync.

The upstream workflow was replaced by the root monorepo workflow. Its stale
development spec and redundant local demo deployment were omitted; the current
architecture and rollout documents are canonical.

## Sync procedure

1. Clone or fetch upstream outside this repository.
2. Review the full diff from the commit above to the intended new commit.
3. Copy only tracked source files into this directory; never copy upstream
   `.git` metadata.
4. Preserve the local divergence above and all monorepo-specific files; reconcile
   changes to this note and the package readme.
5. Update the commit, release, date, and any intentionally omitted files above.
6. Run the contract release gates and the frontend/indexer compatibility tests
   from the rollout plan before accepting the sync.

Do not blindly replace this directory with a new checkout. Contract changes may
require coordinated ABI, deployment-manifest, frontend, indexer, and generated
data changes elsewhere in the monorepo.
