# Branch Analysis - origin/main - 20260502-203936 PDT

## Snapshot

Ref: `origin/main`  
SHA: `244303b074a4`

This is the current official repo baseline. It contains the planning docs, CI setup, baseline `Backend/` and `Frontend/` code, and archived superseded planning docs.

## What Is Done

- Active v3 planning docs exist:
  - `docs/team-a-backend-v3.md`
  - `docs/team-b-domain-pitch-v3.md`
  - `docs/team-c-frontend-components-v3.md`
  - `docs/team-d-integration-demo-v3.md`
  - `docs/operator-script.md`
  - `docs/presenter-script-source.md`
  - `docs/presenter-script.md`
  - `docs/pitch-v3-degraded-c2.md`
- Branch A docs and older v1/v2 docs are archived.
- Fallow CI exists:
  - `.fallowrc.json`
  - `.github/workflows/ci.yml`
- Baseline Sentinel Forge code exists under:
  - `Backend/`
  - `Frontend/`

## What Is Not Done In Main

- No Raven Gap scenario in `Backend/app/core/scenario.py`.
- No backend compaction package.
- No SITREP synthesizer/delta package.
- No `/comms/degrade`, `/compression/toggle`, or `/voice/report` endpoints.
- No `voice_report` or `comms.compression_enabled` state.
- No MeshTree, CompactionTimeline, EvidenceDrawer, SitrepDeltaPanel, DegradedCommsToggle, or VoiceReportPanel in `Frontend/src/components`.
- `Frontend/src/hooks/useSimulation.ts` still boots the default scenario with `Promise.all([refresh(), loadScenarios()])`.
- `Frontend/src/pages/Dashboard.tsx` still uses the original Sentinel Forge layout.

## Plan Alignment

Main is the right branch to use as the clean integration base, not as the demo implementation. The implementation work lives on the feature branches.

The v3 team docs in main are more current than some shared docs. Treat these as source of truth:

- `docs/team-a-backend-v3.md`
- `docs/team-b-domain-pitch-v3.md`
- `docs/team-c-frontend-components-v3.md`
- `docs/team-d-integration-demo-v3.md`
- `docs/operator-script.md`
- `docs/presenter-script-source.md`
- `docs/presenter-script.md`

Known stale/drifted docs:

- `docs/THEPLAN.md` still has a v2-ish state contract without `/compression/toggle` and `/voice/report`.
- `docs/branch-b-sentinel-forge-hackathon-plan.md` still frames the P0 build around an EW-degraded toggle rather than the v3 compression OFF/ON switch.

## New Gaps To Cover

- Decide whether to update stale shared docs or just tell the team to work from the four v3 team files and operator/presenter scripts.
- Align command examples with the actual repo paths if the team is integrating in this repo:
  - backend is `Backend/`, not `server/`;
  - frontend is `Frontend/`, not `client/`.
- Add npm/operator scripts after code lands. Right now `Frontend/package.json` only has `dev`, `build`, `lint`, and `preview`.

## Recommendation

Use `origin/main` as the base for a fresh integration branch. Pull in useful code from the backend and frontend branches, then patch to the v3 contract before rehearsal.
