# Team — A. Backend (Sentinel Forge owner)

**Role:** Backend critical path. You built Sentinel Forge; everyone else's work depends on your data shapes.
**Build shell:** `../sentinel-forge/`
**Cross-cutting reference:** `docs/we-have-four-team-implementation-plan.md` (full team plan, all roles, mandatory syncs)
**Pitch script:** `docs/branch-b-sentinel-forge-demo-script.md`
**Branch lock:** Locked at Hour 1. Do not switch implementation paths mid-build.

---

## Read first

You are the only backend engineer. The other three (B/C/D) all consume data shapes you produce. **Publishing the State Contract by H1 is the most important thing you do all day** — without it, three people block.

You are also the rescue path when Raven Gap reports don't slot into the existing pipeline. The most subtle issue is in §"Critical pipeline rewiring" below: Sentinel Forge's pipeline only emits `incident` when detection rules produce signals, and Raven Gap skips detection rules. You must add a SITREP-synthesis path or `IncidentCard` stays blank on stage.

---

## Files you own

| File | What changes |
|---|---|
| `server/app/core/scenario.py` | Add `raven_gap` builder, register in `SCENARIO_REGISTRY`. **Do NOT change `DEFAULT_SCENARIO_ID`** — `server/tests/test_api_contract.py` asserts the default is `coordinated_intrusion` (17 events, specific signal set). C selects `raven_gap` on frontend mount; tests stay green. |
| `server/app/core/pipeline.py` | Integrate compaction + SITREP synthesizer + delta. `run_pipeline()` returns `mesh`, `compactions`, `sitrep_delta`, `comms` in addition to existing keys. Add `comms` parameter to the signature. |
| `server/app/core/map.py` | Raven Gap geographic anchors (MGRS grid, NAI centers, phase line, checkpoints, asset definitions). **Single source of truth for all coordinates.** D renders from `state.map_state`; do not hardcode coords elsewhere. |
| `server/app/state/store.py` | **Two changes, both load-bearing.** (1) `build_initial_state` initializes `mesh`, `compactions`, `sitrep_delta`, and `comms: { degraded: false, source_detail_level: "full" }`. (2) `apply_pipeline_result` copies these new keys from the pipeline result — current implementation only copies `events`/`signals`/`correlation`/`incident`/`agent`/`map_state`, so anything else is silently dropped. |
| `server/app/main.py` | Add `POST /comms/degrade { degraded: bool }` endpoint inline. **Update `run_and_apply_pipeline()` (around line 62) to pass `comms=state.get("comms")` into every `run_pipeline` call** — current call site doesn't pass any comms state, so the next pipeline run after a toggle would be unaware. |
| `server/app/compaction/squad_rollup.py` | NEW, ~80 lines, deterministic Python. Groups events by `metadata.sender_id` (squad) and emits squad summaries. |
| `server/app/sitrep/synthesizer.py` | NEW, ~80 lines. See §"Critical pipeline rewiring" below. |
| `server/app/sitrep/delta.py` | NEW, ~60 lines, diffs successive SITREP outputs to populate `state.sitrep_delta`. |
| `server/app/normalization/schemas.py` | Confirm/use existing `"physical"` domain for Raven Gap. **No top-level field additions** — keep custom Raven Gap fields inside `metadata` so the normalizer doesn't drop them. |

**Skip:** new detection rules. `server/app/detection/engine.py` has a hardcoded `RULES = [...]` list; new rule files would silently no-op. Raven Gap reports (SALUTE/ACE/LACE/UAS/sensor/PLI) don't need detection — they're already structured. Compaction groups them by squad directly off normalized events.

---

## Critical pipeline rewiring (read carefully)

Existing `core/pipeline.py:43-47`:
```python
incident = interpret(
    correlation,
    action_status=action_status,
    previous_incident=previous_incident,
) if adjusted_signals else None
```

For Raven Gap there are no detection rules → `adjusted_signals` is empty → `incident = None` → `IncidentCard` renders nothing on stage. **Fix:** call `synthesize_sitrep(compactions, normalized_events, previous_incident, comms)` when `compactions` is non-empty, **bypassing the signals guard for Raven Gap**. Existing detection-driven path stays for `coordinated_intrusion`/`cyber_breach`/`physical_perimeter`.

`synthesizer.py` must populate the **full** `IncidentCard` shape — not just the new fields (`summary`, `narrative`, `recommended_actions`, `evidence_lines`, `timestamp`, `severity`, `status`) but also legacy fields the existing card renders unconditionally (`active_risk`, `confidence`, `detection_confidence`, `why`, `signals`). Without these, IncidentCard shows "CURRENT RISK 0%", "DETECTION CONFIDENCE 0%", empty KEY FACTORS — looks broken on stage. Derive sensible scalars: `confidence`/`active_risk`/`detection_confidence` from compaction count or severity; `why` from compaction summaries; `signals` may stay `[]`.

---

## State Contract — what you publish at H1

You publish the full `/state` response shape and the `/comms/degrade` endpoint by H1. C and D do not guess; if they need a field that isn't in the contract, they ask you to add it.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/scenario/select { scenario_id: "raven_gap" }` | Switch active scenario (existing). |
| `POST` | `/simulate/start` | Reset and seed (existing). |
| `POST` | `/simulate/step` | Advance one event (existing). |
| `GET` | `/state` | Full state, shape below. |
| `POST` | `/comms/degrade { degraded: bool }` | **NEW.** Set EW-degraded mode. |
| `POST` | `/reset` | Clear state (existing). |

### `/state` response

Compatibility constraints baked in:
- **Custom event fields go in `metadata`** because `normalizer.py` only preserves canonical keys (`type`, `domain`, `severity`, `message`) plus `metadata`, `raw`, `geospatial`. Top-level `sender_id` would be dropped.
- **Coordinates are named keys** (`{ "lat": …, "lon": … }`), not positional arrays. `core/map.py` and frontend disagree on `[lon, lat]` vs `[lat, lon]`; named keys remove the ambiguity.
- **SITREP renders through `state.incident`**, not a new `state.sitrep`, so existing `IncidentCard.tsx` keeps working.

```jsonc
{
  "events": [
    {
      "id": "rg_001",
      "type": "salute",                    // | "ace_lace" | "uas_obs" | "sensor_trigger" | "pli"
      "source": "1/A",                     // callsign; existing LogStream renders this
      "domain": "physical",
      "severity": "low",                   // | "medium" | "high"
      "message": "1x dismount moving south, 11SLT 12345 67890, light pack...",
      "metadata": {
        "sender_id": "1st_squad_team_a",   // for compaction grouping; matches mesh node id
        "unit_label": "1st Squad / Team A",
        "mgrs": "11SLT 12345 67890",
        "t_offset_sec": 5,
        "report_type": "salute",
        "background": false                // true for telemetry; field already in use
      },
      "geospatial": { "lat": 36.123, "lon": -115.456 }
    }
  ],
  "mesh": {
    "root": { "id": "PL", "label": "Platoon Leader" },
    "edges": [
      { "parent": "PL", "child": "1st_squad" },
      { "parent": "1st_squad", "child": "1st_squad_team_a" }
    ]
  },
  "compactions": [
    {
      "id": "comp_1st_squad_t60",
      "squad_id": "1st_squad",
      "summary": "1st Squad: 1x contact NAI 1, ammo green, casualties zero.",
      "source_event_ids": ["rg_001", "rg_004"],
      "t_compacted_sec": 60
    }
  ],
  "incident": {                            // SITREP rendered via existing IncidentCard
    "id": "sitrep_002",
    "type": "Commander SITREP",
    "severity": "high",
    "status": "active",
    "summary": "Possible enemy advance NAI 1; UAS retask recommended",
    "narrative": "Contact: 1x dismount, NAI 1. Squad 1 reports ammo green, casualties zero.",
    "recommended_actions": ["Retask RQ-11 to NAI 2", "Confirm contact NAI 1"],
    "evidence_lines": [                    // NEW field; clickable rows in IncidentCard
      { "text": "Contact: 1x dismount, NAI 1", "evidence_ids": ["rg_001"] },
      { "text": "UAS vehicle activity NAI 2", "evidence_ids": ["rg_004"] }
    ],
    "timestamp": "T+75",
    // Legacy fields IncidentCard reads — synthesizer must populate:
    "active_risk": 0.7,
    "confidence": 0.7,
    "detection_confidence": 0.7,
    "why": ["Squad 1 contact at NAI 1", "UAS confirms vehicle activity NAI 2"],
    "signals": []
  },
  "sitrep_delta": {                        // NEW field
    "since_id": "sitrep_001",
    "what_changed": ["NAI 1 contact upgraded from suspected to confirmed"]
  },
  "map_state": {
    "mgrs_grid_anchor": { "easting": 12000, "northing": 67000, "zone": "11SLT" },
    "phase_line": [
      { "id": "pl_alpha", "label": "PL ALPHA",
        "points": [{ "lat": 36.10, "lon": -115.50 }, { "lat": 36.20, "lon": -115.40 }] }
    ],
    "checkpoints": [{ "id": "cp1", "label": "CP-1", "lat": 36.123, "lon": -115.456 }],
    "nais": [
      { "id": "nai_1", "label": "NAI 1",
        "polygon": [{ "lat": 36.10, "lon": -115.50 }] }
    ],
    "friendly_markers": [{ "id": "1st_squad", "label": "1/A", "lat": 36.10, "lon": -115.50 }],
    "contact_markers": [{ "id": "ctc_001", "label": "?", "lat": 36.20, "lon": -115.40, "confidence": "suspected" }],
    "risk_zones": [{ "id": "rz1", "lat": 36.15, "lon": -115.45, "radius_m": 200 }],
    "routes": []
  },
  "comms": {
    "degraded": false,
    "source_detail_level": "full"          // "reduced" when degraded:true
  },
  "scenario": {                            // populated by main.py GET /state, not by store
    "id": "raven_gap", "name": "Raven Gap", "description": "..."
  },
  "meta": { "step": 0, "status": "running" }
}
```

**Degraded behavior:** when `comms.degraded` is true, trim `events[*].message` and `compactions[*].summary` to short forms; `incident` and `sitrep_delta` remain fully populated. `map_state.contact_markers` may drop low-confidence markers. Commander picture must remain coherent.

**Background telemetry:** `/simulate/start` already emits a heartbeat-style event with `metadata.background = true`. Frontend filters these out of the source-report feed.

---

## Hourly schedule

| Hour | Goal | Hand-offs |
|---|---|---|
| **H0–1** | Scaffold `raven_gap` scenario id with **12 placeholder events** (real types, timestamps, sources, MGRS grids; "TBD" message bodies). 12 is the target everywhere. **Publish State Contract** so C and D have concrete fields to build against. Confirm boot. | **→ C, D**: State Contract published. |
| **H1–3** | Receive B's scenario content (markdown table); paste real strings into events. | **← B**: 12-event scenario table. **H3 sync with B**: 15-min joint sanity check on rendered map. |
| **H3–5** | Squad compaction rollup + SITREP delta wired into `pipeline.py`. Both visible in `/state`. | |
| **H4** | **A/C confirm degraded-comms contract before C wires toggle.** 5-min sync; if anything is fuzzy in the State Contract, A clarifies before C starts wiring `DegradedCommsToggle`. | **A ↔ C** standalone sync. |
| **H5–7** | EW-degraded backend wiring. (1) `POST /comms/degrade` updates state. (2) Add `comms` to `run_pipeline()` signature. (3) Update `run_and_apply_pipeline()` in `main.py:62` to pass `comms=state.get("comms")`. Trimming acts on `events[*].message` and `compactions[*].summary`. | |
| **H7–9** | Integration support. Fix bugs surfaced by C/D wiring. | **H7 sync with C+D**: end-to-end click-through on EW toggle. |
| **H9** | **Integration gate.** Run the full 90-second script: `/simulate/start` then 12 sequential `/simulate/step` calls. After step 8, `POST /comms/degrade {degraded:true}`; subsequent state reflects reduced source detail with SITREP intact. **Don't false-pass on a single step.** | **H9 sync with all four**. |
| **H10–12** | Backend polish, perf, default values. | |
| **H12–18** | On-call for rehearsal bug fixes only. **Don't add features.** | |

---

## Verification gate (your gate)

After `POST /simulate/start` then 12 sequential `POST /simulate/step`, `GET /state` returns:
- **12 source reports** (events with `metadata.background == false`; total event count will be 13+ due to start-time background telemetry, expected)
- Mesh hierarchy populated
- ≥3 squad compactions in `state.compactions`
- `state.incident` populated with SITREP content (so `IncidentCard.tsx` renders)
- Non-empty `state.sitrep_delta.what_changed`
- `state.map_state` populated with NAIs/checkpoints/markers

Then `POST /comms/degrade {degraded:true}` → another step → `comms.degraded=true`, reduced `events[*].message` and `compactions[*].summary`, while `state.incident` and `state.sitrep_delta` remain coherent.

Existing `server/tests/test_api_contract.py` still passes. Run from inside `server/`:
```bash
cd ../sentinel-forge/server && .venv/bin/python -m pytest tests/
```
(The test imports `from app.main import app`, which only resolves when working dir is `server/`.)

---

## Hard cuts (do not build)

- Real BLE / LoRa / SDR / ATAK / encryption
- Real on-device model integration
- Backend-wide terminology migration (no rename of `incident` → `sitrep`; UI labels only)
- Multi-scenario toggle
- Belief lifecycle state machine
- Reparenting visual
- Hosted LLM dependency for the live demo (stretch only at H12–13 if everything else is locked)

If anyone proposes one mid-build, the answer is "after the demo."
