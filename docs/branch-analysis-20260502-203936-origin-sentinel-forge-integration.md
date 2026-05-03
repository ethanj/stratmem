# Branch Analysis - origin/Sentinel-Forge-Integration - 20260502-203936 PDT

## Snapshot

Ref: `origin/Sentinel-Forge-Integration`  
SHA: `f3acd89199e3`

This is the backend-heavy Raven Gap branch.

## What Is Done

Changed files compared with `origin/main`:

- Added `Backend/app/compaction/squad_rollup.py`
- Added `Backend/app/sitrep/synthesizer.py`
- Added `Backend/app/sitrep/delta.py`
- Added `Backend/app/core/map_contract.py`
- Added `docs/state-contract.md`
- Modified backend core pipeline, map, scenario, state store, and FastAPI main.

Implemented backend capabilities:

- Registers a `raven_gap` scenario with 12 deterministic events.
- Adds a static Raven Gap mesh, compaction state, SITREP delta state, and comms state to the store.
- Adds `/comms/degrade`.
- Passes `comms=state.get("comms")` into pipeline calls.
- Groups Raven Gap reports into deterministic compactions by `metadata.sender_id`.
- Computes raw and compacted byte counts for the 3 Kbps proof.
- Synthesizes a Commander SITREP into the legacy `state.incident` field so existing `IncidentCard` can render.
- Adds `state.sitrep_delta`.
- Preserves original Sentinel Forge detection-driven path for other scenarios.

## What Still Needs To Be Done For v3

The branch is mostly v2. It does not implement the v3 voice/compression switch.

Missing backend pieces:

- `POST /compression/toggle { "enabled": bool }`
- `POST /voice/report { "audio_id": "raven_gap_salute_1" }`
- `state.voice_report`
- `state.comms.compression_enabled`
- Default v3 comms state:
  - `degraded: true`
  - `kbps: 3`
  - `budget_bytes: 3750`
  - `compression_enabled: false`
- Compression OFF behavior:
  - report is blocked;
  - no event is appended;
  - `voice_report.status = "blocked_raw"`;
  - `transmit_bytes = audio_estimated_bytes`;
  - `fits_budget = false`.
- Compression ON behavior:
  - stored transcript becomes the expected SALUTE JSON;
  - JSON byte count fits;
  - one normalized SALUTE event is appended;
  - compaction/SITREP/delta rerun.
- `Backend/app/voice/salute_extractor.py` or equivalent deterministic helper.

## Contract Risks

This branch's backend contract does not match the current v3 frontend/team docs in a few places.

### Mesh Shape

Backend branch emits roughly:

```json
{
  "mesh": {
    "root": "PLT",
    "nodes": [{ "id": "PLT", "label": "PL Raven" }],
    "links": [{ "from": "SQD-1", "to": "PLT" }]
  }
}
```

Current v3 frontend docs expect:

```json
{
  "mesh": {
    "root": { "id": "PL", "label": "Platoon Leader" },
    "edges": [{ "parent": "PL", "child": "1st_squad" }],
    "nodes": {
      "PL": { "id": "PL", "label": "Platoon Leader" }
    }
  }
}
```

This must be normalized before the frontend branch is merged, or `MeshTree` will render empty or stale.

### Sender IDs

Backend branch uses IDs like:

- `mesh-1a`
- `mesh-1b`
- `mesh-rq11`
- `mesh-op7`

Team v3 docs expect IDs like:

- `1st_squad_team_a`
- `1st_squad_team_b`
- `rq11_team`
- `op_lp_sensor`

Pick one set and use it everywhere. For minimum risk, change backend to match the v3 docs, because the docs are what C/D/B are building and rehearsing against.

### Scenario Content

Backend branch uses MGRS-style strings like `11S LV 42181 49118`. Current voice fixture and presenter/operator scripts use `11SLT 12345 67890`.

This does not break the app, but it will look inconsistent on screen if the voice report says one grid and the map/feed use another. Use Team B's final fixture and map/event table as source of truth before rehearsal.

## Tests

The branch retains the original API contract tests. Those tests mainly protect the default `coordinated_intrusion` scenario.

Add one focused Raven Gap v3 test before relying on the branch:

1. `POST /scenario/select {"scenario_id":"raven_gap"}`
2. `POST /simulate/start`
3. Assert `state.comms.degraded is true`, `kbps == 3`, and `compression_enabled is false`.
4. `POST /voice/report {"audio_id":"raven_gap_salute_1"}`.
5. Assert blocked raw report, no voice event appended.
6. `POST /compression/toggle {"enabled": true}`.
7. `POST /voice/report {"audio_id":"raven_gap_salute_1"}`.
8. Assert processed voice report, SALUTE event appended, byte budget fits.
9. Step replay enough times to assert compactions, SITREP, delta, and evidence lines.

## Merge Recommendation

Use this branch for backend implementation, but do not treat it as done. Bring it into the integration branch first, then patch the v3 voice endpoints and contract shape before C/D wire against it.

Practical order:

1. Merge/cherry-pick backend compaction, SITREP, map, scenario, and state store changes.
2. Normalize `mesh` and sender IDs to v3.
3. Implement `voice_report`, `/compression/toggle`, and `/voice/report`.
4. Add the Raven Gap v3 backend smoke test.
5. Hand the final `/state` contract to C/D.
