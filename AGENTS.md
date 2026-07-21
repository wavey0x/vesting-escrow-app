# AGENTS.md

- Start with `docs/product/requirements.md`, `docs/design/style-guide.md`, and `docs/architecture/contracts-and-indexing.md`.
- For contract work, also read `docs/architecture/contracts-development-and-deployment.md` and `packages/contracts/UPSTREAM.md`.
- Treat `public/data/*.json` as generated files. Update them through `scripts/indexer/index_escrows.py`, not by hand.
- Frontend commands: `npm run dev`, `npm run test`, `npm run build`, `npm run lint`.
- Indexer setup: `./scripts/indexer/setup-python.sh`.
- Contract sources, Titanoboa scripts, and tests live in `packages/contracts/`.
- Contract setup: `./packages/contracts/setup-python.sh`.
- Do not reuse the demo deployment scripts for mainnet until the deployment hardening phase in the rollout plan is complete.
