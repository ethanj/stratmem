# Team — A. Backend (Sentinel Forge owner) — v3

**Role:** Backend critical path. You built Sentinel Forge; everyone else's work depends on your data shapes.
**Build shell:** `../sentinel-forge/`
**Cross-cutting reference:** `docs/THEPLAN.md` (full team plan, all roles, mandatory syncs)
**Pitch script:** `docs/branch-b-sentinel-forge-demo-script.md`
**v3 addendum:** `docs/team-a-backend-v3-addendum.md`
**Branch lock:** Locked at Hour 1. Do not switch implementation paths mid-build.
**v3 scope:** carries forward the **3 Kbps** degraded-link proof and adds one prerecorded voice-to-SALUTE report path with a compression OFF/ON switch.

---

## Read first

You are the only backend engineer. The other three (B/C/D) all consume data shapes you produce. **Publishing the State Contract by H1 is the most important thing you do all day** — without it, three people block.

You are also the rescue path when Raven Gap reports don't slot into the existing pipeline. The most subtle issue is in §"Critical pipeline rewiring" below: Sentinel Forge's pipeline only emits `incident` when detection rules produce signals, and Raven Gap skips detection rules. You must add a SITREP-synthesis path or `IncidentCard` stays blank on stage.

The 3 Kbps proof is deterministic application logic, **not Chrome throttling and not live iPhones**. Do not modify iOS/MeshNode code for this demo. The browser shows a simulated tactical-link budget calculated from the scenario payloads.

New P0 addition: one prerecorded voice report proves why compression matters. The demo starts on a **3 Kbps** link with semantic compression OFF. First `/voice/report` shows the raw audio/report payload does not fit and does not enter the command picture. Then `/compression/toggle {"enabled": true}` turns compression ON; the same report becomes SALUTE JSON, fits the byte budget, appends to the Raven Gap stream, and flows through compaction/SITREP. This is not live mic/STT.

---

## Files you own

| File | What changes |
|---|---|
| `server/app/core/scenario.py` | Add `raven_gap` builder, register in `SCENARIO_REGISTRY`. **Do NOT change `DEFAULT_SCENARIO_ID`** — `server/tests/test_api_contract.py` asserts the default is `coordinated_intrusion` (17 events, specific signal set). C selects `raven_gap` on frontend mount; tests stay green. |
| `server/app/core/pipeline.py` | Integrate compaction + SITREP synthesizer + delta. `run_pipeline()` returns `mesh`, `compactions`, `sitrep_delta`, `comms` in addition to existing keys. Add `comms` parameter to the signature. |
| `server/app/core/map.py` | Raven Gap geographic anchors (MGRS grid, NAI centers, phase line, checkpoints, asset definitions). **Single source of truth for all coordinates.** D renders from `state.map_state`; do not hardcode coords elsewhere. |
| `server/app/state/store.py` | **Two changes, both load-bearing.** (1) `build_initial_state` initializes `mesh`, `compactions`, `sitrep_delta`, `voice_report`, and `comms: { degraded: true, kbps: 3, window_sec: 10, budget_bytes: 3750, raw_bytes: 0, compacted_bytes: 0, compression_ratio: null, fits_budget: true, source_detail_level: "full", compression_enabled: false }`. (2) `apply_pipeline_result` copies these new keys from the pipeline result — current implementation only copies `events`/`signals`/`correlation`/`incident`/`agent`/`map_state`, so anything else is silently dropped. |
| `server/app/main.py` | Add `POST /comms/degrade { degraded: bool, kbps?: 3 }`, `POST /compression/toggle { enabled: bool }`, and `POST /voice/report { audio_id: "raven_gap_salute_1" }` endpoints inline. **Update `run_and_apply_pipeline()` (around line 62) to pass `comms=state.get("comms")` into every `run_pipeline` call** — current call site doesn't pass any comms state, so the next pipeline run after a toggle would be unaware. |
| `server/app/compaction/squad_rollup.py` | NEW, ~80 lines, deterministic Python. Groups events by `metadata.sender_id` (squad) and emits squad summaries. |
| `server/app/sitrep/synthesizer.py` | NEW, ~80 lines. See §"Critical pipeline rewiring" below. |
| `server/app/sitrep/delta.py` | NEW, ~60 lines, diffs successive SITREP outputs to populate `state.sitrep_delta`. |
| `server/app/voice/salute_extractor.py` | NEW, ~60 lines. Deterministic fixture for `audio_id = "raven_gap_salute_1"`: stored transcript in, SALUTE JSON out. No live STT, no model dependency. |
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

You publish the full `/state` response shape and the `/comms/degrade` + `/compression/toggle` + `/voice/report` endpoints by H1. C and D do not guess; if they need a field that isn't in the contract, they ask you to add it.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/scenario/select { scenario_id: "raven_gap" }` | Switch active scenario (existing). |
| `POST` | `/simulate/start` | Reset and seed (existing). |
| `POST` | `/simulate/step` | Advance one event (existing). |
| `GET` | `/state` | Full state, shape below. |
| `POST` | `/compression/toggle { enabled: bool }` | **NEW.** Toggle semantic compression. Demo starts `false`; when `true`, the voice report transmits as compact SALUTE JSON. |
| `POST` | `/voice/report { audio_id: "raven_gap_salute_1" }` | **NEW.** If compression is OFF, show raw payload blocked by 3 Kbps budget. If ON, deterministically turns the prerecorded report fixture into one SALUTE JSON event, appends it to the stream, runs the pipeline, and returns state. |
| `POST` | `/comms/degrade { degraded: bool, kbps?: 3 }` | **NEW.** Set EW-degraded mode. Default degraded bandwidth is 3 Kbps. |
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
  "voice_report": {
    "audio_id": "raven_gap_salute_1",
    "status": "ready",                    // "ready" | "blocked_raw" | "processed"
    "mode": "raw_audio",                  // "raw_audio" when compression is off; "compressed_json" when on
    "transcript": "One Alpha reports one dismount moving south near NAI 1...",
    "structured_event_id": "rg_voice_001",
    "schema": "salute",
    "structured_event": {
      "type": "salute",
      "source": "1/A",
      "size": "1 dismount",
      "activity": "moving south",
      "location": "11SLT 12345 67890",
      "unit": "unknown dismount",
      "time": "T+45",
      "equipment": "light pack; no visible crew-served weapon",
      "request": "uas_confirm"
    },
    "audio_estimated_bytes": 64000,
    "transcript_bytes": 180,
    "json_bytes": 220,
    "transmit_bytes": null,
    "fits_budget": null,
    "blocked_reason": null
  },
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
    "degraded": true,
    "kbps": 3,
    "window_sec": 10,
    "budget_bytes": 3750,                  // 3 Kbps * 10 sec / 8
    "raw_bytes": 0,                        // serialized source-report envelope bytes in current window
    "compacted_bytes": 0,                  // compacted summary bytes in current window
    "compression_ratio": null,             // e.g. "7.8x"
    "fits_budget": true,
    "source_detail_level": "full",
    "compression_enabled": false           // demo starts OFF; switch ON before successful voice transmit
  },
  "scenario": {                            // populated by main.py GET /state, not by store
    "id": "raven_gap", "name": "Raven Gap", "description": "..."
  },
  "meta": { "step": 0, "status": "running" }
}
```

**Degraded behavior:** v3 starts with the tactical link already constrained to **3 Kbps over a 10-second demo window**. Compute `budget_bytes = kbps * 1000 / 8 * window_sec`. Compute `raw_bytes` from UTF-8 bytes of the serialized source-report envelopes for the current window, and `compacted_bytes` from the compacted summaries. No real networking, queues, packet loss, or Chrome throttling. `state.comms` must make the proof visible: raw exceeds budget, compacted fits.

**Compression OFF behavior:** `POST /voice/report` does not append an event. It returns `state.voice_report.status = "blocked_raw"`, `mode = "raw_audio"`, `transmit_bytes = audio_estimated_bytes`, `fits_budget = false`, and `blocked_reason = "raw audio exceeds 3 Kbps / 10 sec budget"`.

**Compression ON behavior:** after `POST /compression/toggle {"enabled": true}`, `POST /voice/report` receives `audio_id`, loads the stored transcript fixture, returns `state.voice_report.status = "processed"`, `mode = "compressed_json"`, `transmit_bytes = json_bytes`, `fits_budget = true`, appends a normalized `type: "salute"` event with `metadata.report_type = "salute"` and `metadata.voice_source = true`, then reruns the pipeline. The UI can still play the prerecorded audio file, but the backend proof starts at the transcript fixture and carries real JSON through the pipeline.

**Background telemetry:** `/simulate/start` already emits a heartbeat-style event with `metadata.background = true`. Frontend filters these out of the source-report feed.

---

## Hourly schedule

| Hour | Goal | Hand-offs |
|---|---|---|
| **H0–1** | Scaffold `raven_gap` scenario id with **12 placeholder events** (real types, timestamps, sources, MGRS grids; "TBD" message bodies). Add placeholder `voice_report` shape and `compression_enabled:false`. 12 is the target everywhere. **Publish State Contract** so C and D have concrete fields to build against. Confirm boot. | **→ C, D**: State Contract published. |
| **H1–3** | Receive B's scenario content and voice fixture (transcript + expected SALUTE JSON); paste real strings into events and `salute_extractor.py`. | **← B**: 12-event scenario table + voice fixture. **H3 sync with B**: 15-min joint sanity check on rendered map. |
| **H3–5** | Squad compaction rollup + SITREP delta wired into `pipeline.py`. Add `/compression/toggle` and `/voice/report`: compression OFF blocks raw payload; compression ON appends the fixture-derived SALUTE event and makes it visible in `/state`. | |
| **H4** | **A/C confirm degraded-comms contract before C wires toggle.** 5-min sync; if anything is fuzzy in the State Contract, A clarifies before C starts wiring `DegradedCommsToggle`. | **A ↔ C** standalone sync. |
| **H5–7** | Comms + compression backend wiring. (1) `POST /comms/degrade {"degraded":true,"kbps":3}` updates state with byte-budget fields. (2) Add `comms` to `run_pipeline()` signature. (3) Update `run_and_apply_pipeline()` in `main.py:62` to pass `comms=state.get("comms")`. (4) `POST /compression/toggle` updates `state.comms.compression_enabled`. Use simple deterministic UTF-8 byte counts; do not build transport simulation. | |
| **H7–9** | Integration support. Fix bugs surfaced by C/D wiring. | **H7 sync with C+D**: end-to-end click-through on compression OFF/ON. |
| **H9** | **Integration gate.** Run the full 90-second script: `/simulate/start`, `POST /voice/report {"audio_id":"raven_gap_salute_1"}` while compression is OFF and confirm blocked; `POST /compression/toggle {"enabled":true}`; repeat `/voice/report` and confirm SALUTE event enters the feed. Then sequential `/simulate/step` calls show `raw_bytes > budget_bytes`, `compacted_bytes <= budget_bytes`, and SITREP intact. **Don't false-pass on a single step.** | **H9 sync with all four**. |
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

With `state.comms.compression_enabled = false`, `POST /voice/report {"audio_id":"raven_gap_salute_1"}` returns `state.voice_report.status = "blocked_raw"`, `transmit_bytes > budget_bytes`, `fits_budget = false`, and appends no event.

Then `POST /compression/toggle {"enabled":true}` followed by the same `POST /voice/report` returns `state.voice_report.status = "processed"`, `transmit_bytes = json_bytes`, `fits_budget = true`, appends one event with `type = "salute"` and `metadata.voice_source = true`, and reruns compaction/SITREP so the voice-derived report appears in the feed, evidence trail, and byte counts.

After subsequent `POST /simulate/step` calls, `comms.degraded=true`, `comms.kbps=3`, `comms.raw_bytes > comms.budget_bytes`, `comms.compacted_bytes <= comms.budget_bytes`, while `state.incident` and `state.sitrep_delta` remain coherent.

Existing `server/tests/test_api_contract.py` still passes. Run from inside `server/`:
```bash
cd ../sentinel-forge/server && .venv/bin/python -m pytest tests/
```
(The test imports `from app.main import app`, which only resolves when working dir is `server/`.)

---

## Hard cuts (do not build)

- Real BLE / LoRa / SDR / ATAK / encryption
- Live iPhone/iOS/MeshNode app path
- Live mic / live STT. The demo uses one prerecorded audio file plus stored transcript fixture.
- Real packet/network simulation or Chrome throttling as the proof. The 3 Kbps proof is deterministic byte-budget math only.
- Real on-device model integration
- Backend-wide terminology migration (no rename of `incident` → `sitrep`; UI labels only)
- Multi-scenario toggle
- Belief lifecycle state machine
- Reparenting visual
- Hosted LLM dependency for the live demo (stretch only at H12–13 if everything else is locked)

If anyone proposes one mid-build, the answer is "after the demo."
