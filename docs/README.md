## Norune Documentation Roadmap

This checklist surfaces the knowledge artifacts our LLM agents rely on while shipping the Norune experience.

### Core References
- `docs/anza-xyz-kit/` — upstream kit documentation for wallet connectivity and Solana client utilities (synced from GitHub).
- `docs/solana-playbook.md` — step-by-step guide for deploying, upgrading, and rolling back the Norune Solana program.
- `docs/state-migrations.md` — canonical log of on-chain state schema versions, migrations, and test evidence.
- `docs/solana-deployments.md` — environment matrix documenting program IDs, RPC endpoints, and deployment changelog.

### Security & Compliance
- `docs/security/solana-audit-log.md` — record of internal reviews, external audits, and remediation status.
- `docs/security/threat-model.md` — attack surface analysis covering wallet flows, transaction signing, and state persistence.
- `docs/wallet-compatibility.md` — support table per wallet provider, known issues, and mitigation steps.

### Experience & Systems Design
- `docs/ux/guidebook.md` — storyboard of the tutorial modal, camera affordances, and avatar possession flow.
- `docs/gameplay/town-state.md` — authoritative definition of the `TownState` domain model shared between client and program.
- `docs/gameplay/building-blueprints.md` — catalog of placeable objects, grid footprint, and resource costs.

### Engineering Enablement
- `docs/testing/solana-e2e.md` — end-to-end testing strategy with wallet stubs and devnet/localnet guidance.
- `docs/observability/runbooks.md` — procedures for monitoring RPC health, transaction confirmation times, and alert handling.
- `docs/contributing.md` — expectations for PR hygiene, linting, asset handling, and release cadence.

Keep this roadmap current by marking completed documents and linking to deep dives as they are authored.
