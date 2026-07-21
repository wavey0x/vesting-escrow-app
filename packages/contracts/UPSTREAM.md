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

The upstream release is the baseline, but the local contract source now
intentionally ports four changes from the verified Curve deployment at factory
`0xcf61782465Ff973638143d6492B51A85986aB347` and target
`0x9dd5cF263327e2D6a608da8c30368Eb27514bAD2`:

- record deployed escrows in `escrows` and `escrows_length`;
- default `support_vyper` to zero basis points;
- clear the escrow owner before the external transfer in `revoke`;
- assert vested-token solvency after `collect_dust`.

Commit `f3dcdd8` records the last all-Vyper-0.3.10 snapshot. At that commit,
compiling with the Curve constructor values produced factory and target runtime
bytecode hashes matching the deployed Curve contracts. The legacy
`VestingEscrowSimple` source remains frozen on Vyper 0.3.10 and is compiled
through VVM. The current factory, V2 implementation, and mocks use Vyper 0.4.3;
their behavior and ABI remain compatible where documented, but their bytecode
is intentionally different. These changes are unreleased and must not be
overwritten during an upstream sync.

The upstream `.github/workflows/test.yaml` file was intentionally omitted. A
workflow nested below `packages/contracts/` is not executed by GitHub, and the
historical dependency set needs to be made reproducible before enabling a root
monorepo contract workflow.

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
