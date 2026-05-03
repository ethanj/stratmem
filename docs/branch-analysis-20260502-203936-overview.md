# Branch Review Overview - 20260502-203936 PDT

## Snapshot

Reviewed from `/Users/ethan/projects/stratmem/stratmem` after `git fetch --all --prune`.

| Ref | SHA | Role in review |
|---|---:|---|
| `origin/main` | `244303b074a4` | Current official planning/docs baseline plus unmodified Sentinel Forge code shell. |
| `origin/Sentinel-Forge-Integration` | `f3acd89199e3` | Backend Raven Gap, compaction, SITREP, and 3 Kbps proof branch. |
| `origin/James-research-raven-gap-attempt` | `651b9e572c12` | Frontend Raven Gap UI, local fallback engine, map/layout/components branch. |
| `origin/feature/audio-semantic-compression-architecture` | `a088dfbd1990` | Standalone voice-to-metadata prototype with offline STT, CBOR, and WebRTC shaping. |
| `origin/James-research` | `0ae0f334388b` | Research/config branch; no meaningful demo implementation. |

Current v3 target read from:

- `docs/team-a-backend-v3.md`
- `docs/team-b-domain-pitch-v3.md`
- `docs/team-c-frontend-components-v3.md`
- `docs/team-d-integration-demo-v3.md`
- `docs/operator-script.md`
- `docs/presenter-script-source.md`
- `docs/presenter-script.md`
- `docs/branch-b-sentinel-forge-demo-script.md`

The active v3 demo proof is: `3 Kbps` link visible from the start, compression OFF blocks one prerecorded voice report, compression ON converts the same stored transcript to SALUTE JSON, the JSON fits, and the resulting event updates the source feed, compaction timeline, SITREP, map, and evidence trail.

## Executive Read

Branch B is still the practical path. The branch work is useful, but the implementation is one plan revision behind the current v3 docs.

The backend branch has most of the v2 Raven Gap pipeline: scenario registration, compaction, SITREP synthesis, evidence lines, map state, and `/comms/degrade`.

The frontend branch has most of the v2 visual spine: MeshTree, CompactionTimeline, EvidenceDrawer, SitrepDeltaPanel, map retargeting, layout, TopBar changes, and a 3 Kbps degraded-comms meter.

No branch currently implements the v3 compression OFF/ON voice-report flow inside the main FastAPI/React app. That is the biggest remaining demo gap.

The audio prototype branch proves a richer future direction, but it is a separate app. Do not merge it wholesale into the hackathon demo unless P0 is already stable.

## Branch Status

| Branch | What is done | What is missing for v3 | Recommendation |
|---|---|---|---|
| `origin/main` | Planning docs, Fallow CI, baseline `Backend/` and `Frontend/`. | No Raven Gap implementation in code. | Use as integration base. |
| `origin/Sentinel-Forge-Integration` | Backend Raven Gap scenario, rollups, SITREP, delta, `/comms/degrade`, byte proof. | `/compression/toggle`, `/voice/report`, `voice_report`, `compression_enabled`, v3 default 3 Kbps ON, contract alignment with frontend. | Cherry-pick or merge backend pieces, then patch to v3. |
| `origin/James-research-raven-gap-attempt` | Frontend components, dashboard layout, local fallback engine, degraded-comms meter. | `VoiceReportPanel`, compression API wrappers/actions, v3 readout behavior, contract alignment with backend. | Cherry-pick frontend pieces after backend contract is fixed. |
| `origin/feature/audio-semantic-compression-architecture` | Standalone voice/STT/metadata/CBOR/WebRTC demo. | Not integrated, wrong live-demo scope, transmits CBOR not v3 JSON. | Reuse ideas/parser only. Keep standalone. |
| `origin/James-research` | Agent docs/config/package-lock churn. | No P0 code. | Do not spend demo time here. |

## Critical Gaps

1. **Backend/frontend state contract mismatch.**
   - Backend branch `mesh` is `{ root: "PLT", nodes: [...], links: [...] }`.
   - Frontend branch expects `{ root: { id, label }, edges: [...], nodes?: Record<string, ...> }`.
   - Backend event sender IDs are `mesh-1a`, `mesh-rq11`, etc.
   - Current v3 docs expect IDs like `1st_squad_team_a`, `rq11_team`, etc.
   - This affects MeshTree lighting, compaction labels, and evidence grouping.

2. **v3 compression switch is not implemented.**
   - Backend needs `POST /compression/toggle`, `POST /voice/report`, `state.voice_report`, and `state.comms.compression_enabled`.
   - Frontend needs `VoiceReportPanel`, `setCompressionEnabled()`, and `submitVoiceReport()`.
   - Demo starts with compression OFF and 3 Kbps already constrained. Current branches still treat degraded mode as the main toggle.

3. **Plan docs are not all equally current.**
   - The team-specific v3 docs and presenter/operator scripts are current.
   - `docs/THEPLAN.md` and `docs/branch-b-sentinel-forge-hackathon-plan.md` still contain v2-ish state contract and P0 scope sections that omit the voice endpoints.
   - Use the four team v3 docs plus `operator-script.md` as the implementation truth.

4. **Path naming drift.**
   - Current repo uses `Backend/` and `Frontend/`.
   - Several docs still say `server/`, `client/`, or `../sentinel-forge/`.
   - That is harmless only if the team intentionally builds in the separate local shell. For GitHub integration, use `Backend/` and `Frontend/`.

5. **Tests do not yet protect the Raven Gap contract.**
   - Backend branch keeps the original API contract tests, but does not assert `raven_gap`, compactions, SITREP, map_state additions, `/comms/degrade`, or the v3 voice endpoints.
   - Frontend branch needs at least `npm run build` after the branch merge and contract alignment.

## Recommended Integration Order

1. Create a new integration branch from `origin/main`.
2. Bring in backend code from `origin/Sentinel-Forge-Integration`.
3. Immediately patch backend to the v3 contract:
   - default `comms.degraded=true`, `kbps=3`, `compression_enabled=false`;
   - add `voice_report`;
   - add `/compression/toggle`;
   - add `/voice/report`;
   - normalize `mesh` to the frontend/team v3 shape;
   - normalize Raven Gap sender IDs to the v3 docs.
4. Add one backend smoke test for the v3 proof:
   - select `raven_gap`;
   - start;
   - voice report with compression OFF returns `blocked_raw` and appends no event;
   - toggle compression ON;
   - same voice report returns `processed`, fits budget, appends a SALUTE event;
   - after replay steps, compaction/SITREP/evidence are populated.
5. Bring in frontend code from `origin/James-research-raven-gap-attempt`.
6. Replace the v2 degraded toggle behavior with the v3 voice panel:
   - keep the 3 Kbps meter;
   - add compression OFF/ON switch;
   - wire the two new backend actions;
   - keep local fallback only if it mirrors the v3 backend contract.
7. Run:
   - `cd Backend && .venv/bin/python -m pytest tests/`
   - `cd Frontend && npm run build`
   - `fallow` or CI after code lands.

## Practical Demo Priority

Ship the visible P0 spine first:

1. Map/COP with Raven Gap military marks.
2. Voice report panel proving OFF blocked and ON fits.
3. Source feed gets the voice-derived SALUTE event.
4. Compaction timeline rolls source reports into summaries.
5. Commander SITREP and evidence click work.
6. 3 Kbps meter shows raw over budget and compacted fits.

Everything else is polish.
