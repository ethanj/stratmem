# Backend API & Frontend Integration Map

> **Supersedes** the early-stage docs in `docs/docs/` (`API.md`, `BACKEND.md`, `ARCHITECTURE.md`, `FRONTEND.md`, `DEMO.md`). Those files reflect the original Sentinel Forge prototype and are kept as historical artifacts.
>
> **Cross-references:** `docs/THEPLAN.md` (state contract), `docs/team-c-state-contract.md` (frontend contract prose), `Frontend/src/types/ravenGap.ts` (authoritative TS types).

---

## 1. Architecture Summary

The backend is a **deterministic scenario-driven pipeline** built with FastAPI. State lives in a single in-process `StateStore` (`app/state/store.py`). Every `/simulate/step` call walks the same pipeline:

```
events -> normalize -> detect (signals) -> mitigation overlay -> correlate -> interpret (incident) -> map state
```

The frontend is React 19 + Vite + TypeScript. It talks to the backend at `http://localhost:8000` (hard-coded in `Frontend/src/services/api.ts`). All API calls are wrapped in try/catch with fallbacks to a local Raven Gap engine (`ravenGapEngine.ts`), so the demo runs fully offline.

---

## 2. Endpoint Reference

All non-GET endpoints that touch simulation state return the **full `/state` response** (see Section 3). The two agent endpoints return `{ "agent": string }`.

### 2.1 GET /scenarios

**Status:** LIVE

Returns all registered scenarios plus the currently selected one.

**Response:**
```json
{
  "scenarios": [
    { "id": "coordinated_intrusion", "name": "Coordinated Intrusion", "description": "..." },
    { "id": "cyber_breach", "name": "Cyber-Only Breach", "description": "..." },
    { "id": "physical_perimeter", "name": "Physical Perimeter Threat", "description": "..." }
  ],
  "selected": { "id": "coordinated_intrusion", "name": "Coordinated Intrusion", "description": "..." }
}
```

**Source:** `app/main.py:101`

---

### 2.2 POST /scenario/select

**Status:** LIVE

Switches the active scenario. Resets state and adapter.

**Request:**
```json
{ "scenario_id": "raven_gap" }
```

**Response:** Full `/state` with `meta.status = "idle"`, `meta.mode = "demo"`.

**Error:** 404 if `scenario_id` not in `SCENARIO_REGISTRY`.

**Source:** `app/main.py:109`

**Note:** Frontend calls `selectScenario("raven_gap")` on boot. Until `raven_gap` is registered in `app/core/scenario.py`, this 404s and the frontend falls back to its local engine.

---

### 2.3 POST /simulate/start

**Status:** LIVE

Resets state, emits one background telemetry event, runs the pipeline, returns state with `meta.status = "running"`.

**Request:** (none)

**Response:** Full `/state`.

**Source:** `app/main.py:126`

---

### 2.4 POST /simulate/step

**Status:** LIVE

Advances the scenario by one event. If the scenario is exhausted, emits a background telemetry ping and sets `meta.status = "complete"`.

**Request:** (none)

**Response:** Full `/state` with incremented `meta.step`.

**Source:** `app/main.py:148`

---

### 2.5 GET /state

**Status:** LIVE

Returns the current in-memory state snapshot. Attaches `scenario` metadata inline.

**Request:** (none)

**Response:** Full `/state` (see Section 3).

**Source:** `app/main.py:179`

---

### 2.6 POST /reset

**Status:** LIVE

Clears all state and resets the adapter. Returns fresh initial state.

**Request:** (none)

**Response:** Full `/state` with `meta.step = 0`, `meta.status = "idle"`, `events = []`.

**Source:** `app/main.py:212`

---

### 2.7 POST /comms/degrade

**Status:** LIVE

Sets EW-degraded mode. Updates `comms` state, re-runs pipeline, returns updated state.

**Request:**
```json
{ "degraded": true, "kbps": 3.0 }
```

`kbps` is optional (defaults to `null`).

**Response:** Full `/state` with `comms.degraded` updated.

**Source:** `app/main.py:186`

**Frontend fallback:** If this endpoint fails, `api.ts:setCommsDegraded` returns a local stub `{ comms: { degraded, source_detail_level } }`.

---

### 2.8 POST /compression/toggle

**Status:** LIVE

Toggles compression mode for the voice report feature.

**Request:**
```json
{ "enabled": true }
```

**Response:** Full `/state` with `comms.compression_enabled` updated.

**Source:** `app/main.py:194`

---

### 2.9 POST /voice/report

**Status:** LIVE

Processes a pre-recorded voice report. If compression is off, returns `voice_report.status = "blocked_raw"`. If on, creates a structured event from the voice fixture and runs the pipeline.

**Request:**
```json
{ "audio_id": "raven_gap_salute_1" }
```

**Response:** Full `/state` with `voice_report` populated.

**Error:** 404 if `audio_id` fixture not found.

**Source:** `app/main.py:201`

---

### 2.10 POST /incident/resolve

**Status:** LIVE

Marks the current incident as manually resolved. Re-runs the pipeline with the resolved flag.

**Request:**
```json
{ "incident_id": "INC-A1B2C3" }
```

**Response:** Full `/state` with incident status potentially updated to `"resolved"`.

**Error:** 404 if `incident_id` doesn't match current `state.incident.id`.

**Source:** `app/main.py:277`

---

### 2.11 POST /incident/action

**Status:** LIVE

Toggles an operator action on the current incident. Records the action in `operator_actions` history and re-runs the pipeline (which recalculates mitigation-weighted signals).

**Request:**
```json
{
  "incident_id": "INC-A1B2C3",
  "action": "Lock affected accounts",
  "completed": true,
  "note": "optional operator note"
}
```

**Response:** Full `/state` with `incident.operator_actions` and `incident.operator_report` updated.

**Source:** `app/main.py:300`

---

### 2.12 POST /agent/analyze

**Status:** LIVE (requires LLM or falls back to heuristic)

Runs the AI agent (OpenAI / Ollama / heuristic fallback) on the current correlation + incident context.

**Request:**
```json
{
  "correlation": { "confidence": 0.85, "signals": [...], "..." },
  "incident": { "id": "INC-...", "severity": "critical", "..." }
}
```

**Response:**
```json
{ "agent": "Analysis text from the LLM or heuristic fallback..." }
```

**Source:** `app/api/routes/agent.py:28`

---

### 2.13 POST /agent/chat

**Status:** LIVE (requires LLM or falls back to heuristic)

Answers an operator's free-form question using the provided context.

**Request:**
```json
{
  "question": "What is the highest-priority threat right now?",
  "state": { "..." },
  "incident": { "..." },
  "correlation": { "..." }
}
```

All fields except `question` are optional.

**Response:**
```json
{ "agent": "Response text from the LLM or heuristic fallback..." }
```

**Source:** `app/api/routes/agent.py:40`

---

## 3. Full `/state` Response Shape

Every state-returning endpoint sends this shape. Fields marked **[RAVEN GAP]** are additive keys for the TacNet Edge demo. Fields marked **[STUB ONLY]** are currently only populated by the frontend's local stub, not the backend.

```jsonc
{
  // --- Core event stream ---
  "events": [
    {
      "id": "evt_001",                         // string, unique
      "timestamp": "2026-05-02T14:30:40Z",     // ISO 8601
      "type": "salute",                        // string
      "source": "1/A",                         // string (callsign)
      "domain": "cyber | physical | osint | unknown",
      "severity": "low | medium | high | critical | unknown",
      "message": "1x dismount moving south...",
      "raw": {},                               // original unprocessed event
      "metadata": {
        "sender_id": "1st_squad_team_a",       // [RAVEN GAP] mesh node id
        "unit_label": "1st Squad / Team A",    // [RAVEN GAP] human label
        "mgrs": "11SLT 12345 67890",           // [RAVEN GAP] grid ref
        "report_type": "salute",               // [RAVEN GAP] salute|ace|lace|pli|spot|sitrep
        "background": false                    // true = telemetry, filtered from feed
      },
      "geospatial": { "lat": 36.123, "lon": -115.456 }  // optional
    }
  ],

  // --- Detection signals ---
  "signals": [
    {
      "id": "sig_001",
      "kind": "auth.failed_burst",
      "domain": "cyber",
      "weight": 0.6,
      "evidence": ["evt_001", "evt_002"],
      "label": "Failed Login Burst",
      "active": true,
      "description": "Multiple failed auth attempts",
      "source": "fusion-engine",
      "location": { "lat": null, "lon": null },
      "metadata": { "status": "active" }
    }
  ],

  // --- Correlation output ---
  "correlation": {
    "confidence": 0.85,                       // 0..1, residual risk score
    "level": "low | medium | high | critical",
    "cyberCount": 4,
    "physicalCount": 1,
    "osintCount": 1,
    "signals": [ /* serialized Signal objects */ ],
    "history": [
      { "timestamp": "...", "confidence": 0.4, "level": "medium" }
    ],
    "explanation": [ "Cross-domain signals detected", "..." ],
    "scoreBreakdown": {
      "base": 0.3,
      "evidenceBonus": 0.1,
      "diversityBonus": 0.15,
      "crossDomainBonus": 0.2,
      "escalationBonus": 0.1,
      "raw": 0.85
    }
  },

  // --- Incident / SITREP ---
  "incident": {
    "id": "INC-A1B2C3",                       // or "sitrep_002" for Raven Gap
    "type": "Coordinated Intrusion Attempt",   // or "Commander SITREP"
    "severity": "critical",
    "confidence": 0.85,                        // active/residual risk
    "detection_confidence": 0.92,              // high-water-mark detection certainty
    "active_risk": 0.85,                       // same as confidence
    "summary": "...",
    "narrative": "...",
    "signals": ["auth.failed_burst", "..."],
    "recommended_actions": ["Lock affected accounts", "..."],
    "timestamp": "2026-05-02T...",             // ISO 8601 or "T+75" for Raven Gap
    "why": ["Repeated auth failures", "Lateral movement", "..."],
    "status": "active | containment_in_progress | resolved",
    "resolution_ready": false,
    "manually_resolved": false,
    "resolved_at": null,
    "evidence_lines": [                        // [RAVEN GAP] clickable SITREP lines
      {
        "text": "Contact: 2x dismounts NAI 1",
        "evidence_ids": ["rg_001", "rg_004"]
      }
    ],
    "operator_actions": { "Lock affected accounts": true },  // injected by store
    "operator_report": {                                      // injected by store
      "completed_actions": ["Lock affected accounts"],
      "completion_count": 1,
      "total_actions": 5,
      "completion_percent": 20,
      "summary": "Operator completed 1 of 5...",
      "history": [{ "action": "...", "completed": true, "note": null }]
    }
  },

  // --- AI agent output ---
  "agent": { "analysis": "LLM-generated text" },  // or null

  // --- Map state (geographic command picture) ---
  "map_state": {
    "mgrs_grid_anchor": { "mgrs": "11S LV 42820 49210", "lat": 37.4755, "lon": -118.6818 },
    "mgrs_grid": {
      "datum": "WGS84", "zone": "11S",
      "anchor": { "mgrs": "11S LV 42820 49210", "lat": 37.4755, "lon": -118.6818 },
      "cell_size_m": 1000,
      "labels": ["LV 42 49", "LV 43 49", "LV 42 50", "LV 43 50"]
    },
    "phase_line": [
      { "id": "pl_raven", "label": "PL Raven",
        "points": [{ "lat": 37.4662, "lon": -118.6788 }, { "lat": 37.4825, "lon": -118.6762 }] }
    ],
    "checkpoints": [
      { "id": "cp-1", "name": "CP1", "location": { "lat": 37.4718, "lon": -118.6821 } }
    ],
    "nais": [
      { "id": "nai-1", "name": "NAI-1 North Draw",
        "center": { "lat": 37.482, "lon": -118.684 }, "radius_m": 350 }
    ],
    "friendly_markers": [
      { "id": "plt-raven", "label": "PL Raven", "unit": "PL Raven", "kind": "command",
        "location": { "lat": 37.4755, "lon": -118.6818 }, "status": "green" }
    ],
    "contact_markers": [
      { "id": "contact-1", "label": "NAI-1", "kind": "salute",
        "location": { "lat": 37.482, "lon": -118.684 },
        "severity": "medium", "source_event_id": "evt_001", "message": "..." }
    ],
    "risk_zones": [
      { "id": "risk-nai-2", "name": "NAI-2 contact risk",
        "center": { "lat": 37.4792, "lon": -118.6738 }, "radius_m": 520,
        "risk": "high", "active": true, "source": "squad_compaction" }
    ],
    "routes": [
      { "id": "route-finch", "name": "Route Finch", "status": "amber",
        "points": [{ "lat": 37.4685, "lon": -118.6886 }, { "lat": 37.4815, "lon": -118.6698 }] }
    ],
    "event_pulses": [
      { "id": "evt_001", "location": { "lat": 37.482, "lon": -118.684 },
        "severity": "medium", "sequence": 1 }
    ],
    "risk_level": "normal | high | critical",
    "phase": "baseline | movement_to_contact | contact_confirmed | ew_degraded | legacy_fusion",
    "tracks": [ /* legacy track markers from geospatial events */ ],
    "assets": [
      { "name": "AUTH SERVER", "status": "operational | suspect | alerting | streaming | live | standby" }
    ],
    "zones": [ /* same as risk_zones */ ],
    "threat_paths": [
      { "id": "path-auth", "active": true, "severity": "high" }
    ],
    "friendly_marker_details": [ /* same shape as friendly_markers */ ],
    "contact_marker_details": [ /* same shape as contact_markers */ ]
  },

  // --- [RAVEN GAP] Tactical mesh hierarchy ---
  "mesh": {                                    // [STUB ONLY] — backend does not populate yet
    "root": { "id": "PL", "label": "Platoon Leader" },
    "edges": [
      { "parent": "PL", "child": "1st_squad" },
      { "parent": "PL", "child": "2nd_squad" },
      { "parent": "PL", "child": "3rd_squad" },
      { "parent": "PL", "child": "weapons_squad" },
      { "parent": "PL", "child": "uas_team" },
      { "parent": "PL", "child": "op_lp" },
      { "parent": "1st_squad", "child": "1st_squad_team_a" },
      { "parent": "1st_squad", "child": "1st_squad_team_b" },
      { "parent": "2nd_squad", "child": "2nd_squad_team_a" },
      { "parent": "2nd_squad", "child": "2nd_squad_team_b" },
      { "parent": "3rd_squad", "child": "3rd_squad_team_a" },
      { "parent": "weapons_squad", "child": "jltv_v1" },
      { "parent": "uas_team", "child": "rq_11" },
      { "parent": "op_lp", "child": "sensor_s7" }
    ],
    "nodes": {
      "PL": { "id": "PL", "label": "PL" },
      "1st_squad": { "id": "1st_squad", "label": "1ST SQUAD" },
      "2nd_squad": { "id": "2nd_squad", "label": "2ND SQUAD" },
      "3rd_squad": { "id": "3rd_squad", "label": "3RD SQUAD" },
      "weapons_squad": { "id": "weapons_squad", "label": "WPNS SQUAD" },
      "uas_team": { "id": "uas_team", "label": "UAS TEAM" },
      "op_lp": { "id": "op_lp", "label": "OP/LP" },
      "1st_squad_team_a": { "id": "1st_squad_team_a", "label": "1/A" },
      "1st_squad_team_b": { "id": "1st_squad_team_b", "label": "1/B" },
      "2nd_squad_team_a": { "id": "2nd_squad_team_a", "label": "2/A" },
      "2nd_squad_team_b": { "id": "2nd_squad_team_b", "label": "2/B" },
      "3rd_squad_team_a": { "id": "3rd_squad_team_a", "label": "3/A" },
      "jltv_v1": { "id": "jltv_v1", "label": "V1 (JLTV)", "kind": "vehicle" },
      "rq_11": { "id": "rq_11", "label": "RQ-11", "kind": "drone" },
      "sensor_s7": { "id": "sensor_s7", "label": "S7", "kind": "sensor" }
    }
  },

  // --- [RAVEN GAP] Compaction timeline ---
  "compactions": [                             // [STUB ONLY] — backend does not populate yet
    {
      "id": "comp_1st_squad_t60",
      "squad_id": "1st_squad",
      "label": "1ST SQUAD",
      "summary": "1st Squad: 1x contact NAI 1 confirmed, ammo green, casualties zero.",
      "source_event_ids": ["rg_001", "rg_002"],
      "t_compacted_sec": 60
    }
  ],

  // --- [RAVEN GAP] SITREP delta ---
  "sitrep_delta": {                            // [STUB ONLY] — backend does not populate yet
    "since_id": "sitrep_001",
    "what_changed": [
      "NAI 1 contact upgraded from suspected to confirmed (2/A SALUTE).",
      "Vehicle activity new at NAI 2; recommend retask UAS-02."
    ]
  },

  // --- [RAVEN GAP] Comms / EW degradation ---
  "comms": {
    "degraded": false,
    "source_detail_level": "full",             // "full" | "reduced"
    "kbps": null,                              // optional display value
    "window_sec": 10,
    "budget_bytes": null,
    "raw_bytes": 0,
    "compacted_bytes": 0,
    "compression_ratio": null,
    "fits_budget": true,
    "compression_enabled": false
  },

  // --- Voice report (compression demo) ---
  "voice_report": {                            // populated by POST /voice/report
    "audio_id": "raven_gap_salute_1",
    "status": "ready | processed | blocked_raw",
    "mode": "raw_audio | compressed_json",
    "transcript": "...",
    "structured_event_id": "...",
    "schema": "SALUTE",
    "structured_event": {
      "type": "...", "source": "...", "size": "...", "activity": "...",
      "location": "...", "unit": "...", "time": "...", "equipment": "...", "request": "..."
    },
    "audio_estimated_bytes": 48000,
    "transcript_bytes": 320,
    "json_bytes": 180,
    "transmit_bytes": null,
    "fits_budget": null,
    "blocked_reason": null
  },

  // --- Scenario metadata ---
  "scenario": {
    "id": "coordinated_intrusion",
    "name": "Coordinated Intrusion",
    "description": "..."
  },

  // --- Simulation metadata ---
  "meta": {
    "mode": "demo",
    "step": 0,
    "status": "idle | running | complete"
  },

  // --- Operator action tracking ---
  "operator_actions": {
    "INC-A1B2C3": {
      "action_status": { "Lock affected accounts": true },
      "history": [{ "action": "Lock affected accounts", "completed": true, "note": null }]
    }
  },

  // --- Resolved incident archive ---
  "resolved_incidents": [ /* same shape as incident */ ]
}
```

---

## 4. Raven Gap State Additions (Frontend Expects, Backend Gaps)

These keys are defined in `Frontend/src/types/ravenGap.ts` and populated by the local stub (`ravenGapStub.ts`). The backend needs to produce them for full integration.

### 4.1 mesh

The tactical mesh hierarchy. Frontend builds a tree from `root` + `edges`. `nodes` is optional (fallback: use edge child ids as labels).

**Consumer:** `MeshTree.tsx`

**Shape:** See Section 3 `mesh` block (15 nodes, 14 edges).

### 4.2 compactions

Squad-level summaries that roll up raw source reports. Visible in the compaction timeline once all `source_event_ids` have been revealed.

**Consumer:** `CompactionTimeline.tsx`

**Shape:**
```json
{
  "id": "comp_1st_squad_t60",
  "squad_id": "1st_squad",
  "label": "1ST SQUAD",
  "summary": "1st Squad: 1x contact NAI 1 confirmed, ammo green, casualties zero.",
  "source_event_ids": ["rg_001", "rg_002"],
  "t_compacted_sec": 60
}
```

`source_event_ids` must reference ids in `events[]`. Clicking emits these ids to `EvidenceDrawer`.

### 4.3 sitrep_delta

What changed since the previous SITREP. Rendered as bullet list.

**Consumer:** `SitrepDeltaPanel.tsx`

**Shape:**
```json
{
  "since_id": "sitrep_001",
  "what_changed": ["NAI 1 contact upgraded from suspected to confirmed."]
}
```

### 4.4 incident.evidence_lines

New field on the existing incident object. Each line is a clickable SITREP row that links to source events.

**Consumer:** `IncidentCard.tsx` -> `EvidenceDrawer.tsx`

**Shape:**
```json
{
  "text": "Contact: 2x dismounts NAI 1, weapons observed",
  "evidence_ids": ["rg_001", "rg_004"]
}
```

### 4.5 Raven Gap scenario registration

Frontend boots with `selectScenario("raven_gap")`. Backend needs `raven_gap` in `SCENARIO_REGISTRY` (`app/core/scenario.py`). 12 events with Raven Gap metadata (sender_id, unit_label, mgrs, report_type, background).

### 4.6 map_state for Raven Gap

The backend's `app/core/map.py` already builds a Raven Gap map state with MGRS grid, phase line, checkpoints, NAIs, friendly markers, contact markers, risk zones, and routes. The frontend stub uses slightly different coordinate values (stub: ~36.1/-115.4; backend: ~37.4/-118.6). Once the backend ships, the frontend renders from `state.map_state` and the stub coordinates become dead code.

---

## 5. Gap Analysis — What Backend Needs to Ship

| # | Gap | Files | Priority | Notes |
|---|-----|-------|----------|-------|
| 1 | Register `raven_gap` scenario | `app/core/scenario.py` | P0 | 12 events with Raven Gap metadata. Do NOT change `DEFAULT_SCENARIO_ID`. |
| 2 | `store.py` init new keys | `app/state/store.py` | P0 | `build_initial_state` must initialize `mesh`, `compactions`, `sitrep_delta`. `comms` is already initialized. |
| 3 | `store.py` apply new keys | `app/state/store.py` | P0 | `apply_pipeline_result` must copy `mesh`, `compactions`, `sitrep_delta` from pipeline result. Currently only copies `events`/`signals`/`correlation`/`incident`/`map_state`/`agent`. |
| 4 | Squad compaction rollup | NEW `app/compaction/squad_rollup.py` | P0 | Groups events by `metadata.sender_id`, emits squad summaries. ~80 lines. |
| 5 | SITREP synthesizer | NEW `app/sitrep/synthesizer.py` | P0 | Builds `incident` dict from compactions + events. Must populate legacy fields: `active_risk`, `confidence`, `detection_confidence`, `why`, `signals`, `evidence_lines`. |
| 6 | SITREP delta | NEW `app/sitrep/delta.py` | P1 | Diffs successive SITREPs to populate `sitrep_delta.what_changed`. |
| 7 | Pipeline bypass for Raven Gap | `app/core/pipeline.py` | P0 | Current pipeline only emits `incident` when `adjusted_signals` is non-empty (line 47). Raven Gap skips detection rules, so `adjusted_signals` is always empty. Bypass: call synthesizer when `compactions` is non-empty. |
| 8 | Pipeline returns new keys | `app/core/pipeline.py` | P0 | Add `mesh`, `compactions`, `sitrep_delta` to return dict. `comms` is already passed through. |
| 9 | Raven Gap mesh definition | `app/core/pipeline.py` or new file | P1 | Static mesh hierarchy (15 nodes, 14 edges). Can be a constant dict returned by pipeline when scenario is `raven_gap`. |
| 10 | Pipeline comms parameter | `app/core/pipeline.py` | Already done | `run_pipeline` already accepts `comms` param and `run_and_apply_pipeline` passes it. |

**Already done (no action needed):**
- `/comms/degrade` endpoint exists in `main.py:186`
- `comms` state is initialized in `store.py` and passed through pipeline
- `map.py` already builds Raven Gap map state with geographic anchors
- `run_pipeline` already accepts `comms` parameter

---

## 6. Frontend Type Reference

Key interfaces from `Frontend/src/types/ravenGap.ts`, translated for backend devs.

### Mesh
```
root: { id: string, label: string }
edges: [{ parent: string, child: string }]
nodes?: { [id]: { id: string, label: string, kind?: string } }
```

### Compaction
```
id: string
squad_id: string           -- mesh node id
label?: string              -- human label
summary: string             -- one-line summary
source_event_ids: string[]  -- event ids that rolled in
t_compacted_sec: number     -- seconds since scenario start
```

### SitrepDelta
```
since_id?: string           -- id of prior SITREP
what_changed: string[]      -- human-readable bullets
```

### Comms
```
degraded: boolean
source_detail_level: "full" | "reduced"
```

### EvidenceLine
```
text: string                -- operator-facing SITREP line
evidence_ids: string[]      -- event ids supporting this line
```

### RavenGapEventMetadata
```
sender_id?: string          -- mesh node id (for MeshTree leaf lighting)
unit_label?: string         -- human label
mgrs?: string               -- MGRS grid reference
report_type?: "salute" | "ace" | "lace" | "pli" | "spot" | "sitrep"
background?: boolean        -- true = LogStream filters out
```

### MapState (frontend stub shape)
```
mgrs_grid_anchor?: { easting, northing, zone }
phase_line?: [{ id, label, points: [{lat, lon}] }]
checkpoints?: [{ id, label, lat, lon }]
nais?: [{ id, label, polygon: [{lat, lon}] }]
friendly_markers?: [{ id, label, lat, lon, kind? }]
contact_markers?: [{ id, label, lat, lon, confidence }]
risk_zones?: [{ id, label?, lat, lon, radius_m }]
routes?: []
```

**Note:** The frontend stub uses `{lat, lon}` directly on markers, while the backend `map.py` uses `{location: {lat, lon}}`. The frontend components handle both shapes, but standardizing would reduce confusion.

---

## 7. Integration Testing Checklist

### Prerequisites
```bash
# Terminal 1: Backend
cd Backend
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd Frontend
npm run dev
```

### Existing test suite
```bash
cd Backend && pytest
```

### Manual integration test (12-step Raven Gap flow)

**Step 0: Select scenario**
```bash
curl -s -X POST http://localhost:8000/scenario/select \
  -H "Content-Type: application/json" \
  -d '{"scenario_id": "raven_gap"}'
# EXPECT: 200, state.scenario.id == "raven_gap"
# FAILS UNTIL: Gap #1 (raven_gap scenario registered)
```

**Step 1: Start simulation**
```bash
curl -s -X POST http://localhost:8000/simulate/start | python -m json.tool
# EXPECT: meta.status == "running", meta.step == 0, events.length >= 1 (background telemetry)
```

**Steps 2-13: Step through 12 events**
```bash
for i in $(seq 1 12); do
  curl -s -X POST http://localhost:8000/simulate/step | python -c "
import sys, json
s = json.load(sys.stdin)
print(f'Step {s[\"meta\"][\"step\"]}: {len(s[\"events\"])} events, '
      f'{len(s.get(\"compactions\", []))} compactions, '
      f'incident={\"yes\" if s.get(\"incident\") else \"no\"}, '
      f'status={s[\"meta\"][\"status\"]}')
"
done
# EXPECT after all 12 steps:
#   - 12+ events (12 scenario + 1 background from start)
#   - events with metadata.background == false: exactly 12
#   - compactions: >= 3 squad rollups
#   - incident: populated with SITREP content
#   - sitrep_delta.what_changed: non-empty
#   - mesh: populated with root + edges
#   - map_state: NAIs, phase line, friendly/contact markers
#   - meta.status == "complete" after step 12
```

**Step 14: EW-degraded toggle**
```bash
curl -s -X POST http://localhost:8000/comms/degrade \
  -H "Content-Type: application/json" \
  -d '{"degraded": true}' | python -c "
import sys, json
s = json.load(sys.stdin)
print(f'degraded={s[\"comms\"][\"degraded\"]}, '
      f'detail={s[\"comms\"][\"source_detail_level\"]}')
"
# EXPECT: comms.degraded == true, comms.source_detail_level == "reduced"
# incident and sitrep_delta should remain fully populated
```

**Step 15: Verify state consistency**
```bash
curl -s http://localhost:8000/state | python -c "
import sys, json
s = json.load(sys.stdin)
e = [ev for ev in s['events'] if not ev.get('metadata',{}).get('background')]
print(f'Source reports: {len(e)}')
print(f'Compactions: {len(s.get(\"compactions\", []))}')
print(f'Incident type: {(s.get(\"incident\") or {}).get(\"type\", \"NONE\")}')
print(f'Evidence lines: {len((s.get(\"incident\") or {}).get(\"evidence_lines\", []))}')
print(f'Delta items: {len((s.get(\"sitrep_delta\") or {}).get(\"what_changed\", []))}')
print(f'Mesh edges: {len((s.get(\"mesh\") or {}).get(\"edges\", []))}')
print(f'Friendly markers: {len((s.get(\"map_state\") or {}).get(\"friendly_markers\", []))}')
"
```

**Step 16: Reset**
```bash
curl -s -X POST http://localhost:8000/reset | python -c "
import sys, json
s = json.load(sys.stdin)
print(f'step={s[\"meta\"][\"step\"]}, status={s[\"meta\"][\"status\"]}, events={len(s[\"events\"])}')
"
# EXPECT: step=0, status=idle, events=0
```
