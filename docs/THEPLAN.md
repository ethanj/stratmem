# TacNet Edge — 4-Person Implementation Plan

## Context

The Cerebral Valley NatSec Hackathon is starting. The team has 18 hours to ship a 3-minute demo of "TacNet Edge" — a platoon-leader command console for the Raven Gap scenario, built by adapting the existing Sentinel Forge codebase (FastAPI + React + maplibre, ~80% built). The build plan and demo script are locked; what's left is **dividing the work cleanly across four people** so the critical path doesn't stall and nobody is idle.

Two of the four already own the relevant codebases (Sentinel Forge and TacNet/MeshNode); the other two are generalists with no project context. This plan assigns each person a coherent slice, names the files they touch, defines hand-off contracts so they can work in parallel, and lists the mandatory syncs.

**Active build doc:** `docs/branch-b-sentinel-forge-hackathon-plan.md`
**Active pitch script:** `docs/branch-b-sentinel-forge-demo-script.md`
**Build shell:** `../sentinel-forge/`
**Hour-1 branch lock is in effect.** No switching paths mid-build.

---

## Team roles

| Owner | Background | Role |
|---|---|---|
| **A. Forge** | Built Sentinel Forge | Backend critical path |
| **B. TacNet** | Built original TacNet/MeshNode; doctrine-fluent | Domain content + pitch lead |
| **C. Gen1** | Generalist, no codebase context | Frontend components (isolated) |
| **D. Gen2** | Generalist, no codebase context | Frontend integrator + demo infra + laptop operator |

Critical decision: **B does not write code.** Their leverage is doctrinal fidelity and pitch delivery — both single-points-of-failure that nobody else can recover. B writes scenario content as markdown/JSON, hands off to A. B operates as content reviewer for task 9 (UI vocabulary), not implementer.

---

## State Contract (A publishes this at H1; everyone builds against it)

A pushes a single source of truth for the `/state` response shape and the toggle endpoint by H1. C and D do not guess; if they need a field that isn't in the contract, they ask A to add it.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/scenario/select { scenario_id: "raven_gap" }` | Switch active scenario (existing). |
| `POST` | `/simulate/start` | Reset and seed (existing). |
| `POST` | `/simulate/step` | Advance one event (existing). |
| `GET` | `/state` | Full state, shape below. |
| `POST` | `/comms/degrade { degraded: bool }` | **NEW.** Set EW-degraded mode. |
| `POST` | `/reset` | Clear state (existing). |

### `/state` response (minimum required fields for the demo)

Two compatibility constraints baked in:
- **Custom event fields go in `metadata`** because Sentinel Forge's `normalizer.py` only preserves canonical keys (`type`, `domain`, `severity`, `message`) plus `metadata`, `raw`, and `geospatial`. Top-level `sender_id` would be dropped silently.
- **Coordinates are named keys** (`{ "lat": …, "lon": … }`), not positional arrays. Sentinel Forge's `core/map.py` and frontend disagree on `[lon, lat]` vs `[lat, lon]` ordering; using named keys removes the ambiguity entirely.
- **SITREP renders through the existing `state.incident` field**, not a new `state.sitrep`, so the existing `IncidentCard.tsx` keeps working without a new component. C still adds `SitrepDeltaPanel.tsx` for the "what changed" beat (no existing component covers it).

```jsonc
{
  "events": [
    {
      "id": "rg_001",
      "type": "salute",                    // | "ace_lace" | "uas_obs" | "sensor_trigger" | "pli"
      "source": "1/A",                     // callsign/unit; existing LogStream renders this. Must NOT default to "unknown"/"SYS".
      "domain": "physical",
      "severity": "low",                   // | "medium" | "high"
      "message": "1x dismount moving south, 11SLT 12345 67890, light pack...",
      "metadata": {
        "sender_id": "1st_squad_team_a",   // for compaction grouping; matches mesh node id
        "unit_label": "1st Squad / Team A",
        "mgrs": "11SLT 12345 67890",
        "t_offset_sec": 5,
        "report_type": "salute",           // mirrors event.type for UI filters
        "background": false                // true for telemetry/heartbeat events; field already in use by Sentinel Forge
      },
      "geospatial": { "lat": 36.123, "lon": -115.456 }
    }
  ],
  "mesh": {
    "root": { "id": "PL", "label": "Platoon Leader" },
    "edges": [
      { "parent": "PL", "child": "1st_squad" },
      { "parent": "1st_squad", "child": "1st_squad_team_a" }
      // …
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
    "status": "active",                    // existing field; keep "active" for SITREPs
    "summary": "Possible enemy advance NAI 1; UAS retask recommended",
    "narrative": "Contact: 1x dismount, NAI 1. Squad 1 reports ammo green, casualties zero. UAS observation places vehicle activity NAI 2.",
    "recommended_actions": ["Retask RQ-11 to NAI 2", "Confirm contact NAI 1"],
    "evidence_lines": [                    // NEW field; clickable rows in IncidentCard
      { "text": "Contact: 1x dismount, NAI 1", "evidence_ids": ["rg_001"] },
      { "text": "UAS vehicle activity NAI 2", "evidence_ids": ["rg_004"] }
    ],
    "timestamp": "T+75",
    // Legacy fields IncidentCard reads. Synthesizer must populate or C must hide their UI blocks:
    "active_risk": 0.7,                    // 0..1; renders as "CURRENT RISK 70%"
    "confidence": 0.7,                     // fallback if active_risk missing
    "detection_confidence": 0.7,           // 0..1; renders as "DETECTION CONFIDENCE 70%"
    "why": [                               // renders as KEY FACTORS list
      "Squad 1 contact at NAI 1",
      "UAS confirms vehicle activity NAI 2"
    ],
    "signals": []                          // existing card iterates this; empty array is acceptable
  },
  "sitrep_delta": {                        // NEW field; rendered by new SitrepDeltaPanel
    "since_id": "sitrep_001",
    "what_changed": [
      "NAI 1 contact upgraded from suspected to confirmed"
    ]
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
        "polygon": [{ "lat": 36.10, "lon": -115.50 }, /* … */] }
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
    "id": "raven_gap",
    "name": "Raven Gap",
    "description": "..."
  },
  "meta": {
    "step": 0,
    "status": "running"
  }
}
```

(`scenario` is set inline by `main.py`'s GET `/state` handler from `current_scenario()`; do not duplicate it in `meta`.)

**Degraded behavior:** when `comms.degraded` is true, A trims `events[*].message` and `compactions[*].summary` to short forms; `incident` (SITREP) and `sitrep_delta` remain fully populated. `map_state.contact_markers` may drop low-confidence markers. The commander picture must remain coherent.

**Background telemetry:** `/simulate/start` already emits a heartbeat-style background event before any scenario step. These events have `metadata.background = true`. Frontend should filter them out of the "source report" feed; A's verification gate counts only events where `metadata.background` is falsy.

A is allowed to add fields. C/D treat the contract as additive — unknown fields are ignored, missing fields are bugs to file at A.

---

## A. Forge — Backend critical path

**Owns the server/ side of the build. Everyone else's work depends on A's data shapes.**

### Files
- `server/app/core/scenario.py` — add `raven_gap` builder, register in `SCENARIO_REGISTRY`. **Do NOT change `DEFAULT_SCENARIO_ID`** — `server/tests/test_api_contract.py` asserts the default scenario is `coordinated_intrusion` (17 events, specific signal set). C explicitly selects `raven_gap` on frontend mount via `selectScenario("raven_gap")` so existing tests stay green and the demo is still one-click.
- `server/app/core/pipeline.py` — integrate compaction + delta into existing pipeline flow; `run_pipeline()` returns `mesh`, `compactions`, `sitrep_delta`, `comms` in addition to existing keys
- `server/app/core/map.py` — Raven Gap geographic anchors (MGRS grid, NAI centers, phase line, checkpoints, asset definitions). **Single source of truth for all coordinates.**
- `server/app/state/store.py` — **two changes, both load-bearing.** (1) `build_initial_state` initializes `mesh`, `compactions`, `sitrep_delta`, and `comms: { degraded: false, source_detail_level: "full" }` so the keys exist before the first pipeline run. (2) `apply_pipeline_result` copies these keys from the pipeline result into `self._state` — without this, anything `run_pipeline` returns under those names is silently dropped (existing implementation only copies `events`/`signals`/`correlation`/`incident`/`agent`/`map_state`).
- `server/app/main.py` — add `POST /comms/degrade` endpoint inline (existing pattern; route stub files are 0 lines)
- `server/app/compaction/squad_rollup.py` — NEW, ~80 lines, deterministic Python. Groups events by `metadata.sender_id` (squad) and emits squad summaries.
- `server/app/sitrep/synthesizer.py` — NEW, ~80 lines. Builds an `incident` dict from compactions + recent events. **Must populate the full IncidentCard shape**: not just the new fields (`summary`, `narrative`, `recommended_actions`, `evidence_lines`, `timestamp`, `severity`, `status`) but also the legacy fields the existing card renders without conditional hiding (`active_risk`, `confidence`, `detection_confidence`, `why`, `signals`). Without these, IncidentCard shows "CURRENT RISK 0%", "DETECTION CONFIDENCE 0%", and empty KEY FACTORS — broken-looking on stage. Synthesizer derives sensible scalars: `confidence`/`active_risk`/`detection_confidence` from compaction count or severity; `why` from the compaction summaries; `signals` may stay `[]`. **Critical:** existing `pipeline.py` only emits `incident` when `adjusted_signals` is non-empty (line 47). Since Raven Gap skips detection rules, `adjusted_signals` will be empty and `IncidentCard` would stay blank. A modifies `pipeline.py` to call `synthesize_sitrep(compactions, normalized_events, previous_incident, comms)` when `compactions` is non-empty, **bypassing the signals guard for Raven Gap**. The existing detection-driven path is preserved for `coordinated_intrusion`/`cyber_breach`/`physical_perimeter`.
- `server/app/sitrep/delta.py` — NEW, ~60 lines, diffs successive SITREP outputs to populate `state.sitrep_delta`.
- `server/app/normalization/schemas.py` — confirm/use existing `"physical"` domain for Raven Gap reports (no new domain needed). **No top-level field additions** — keep custom Raven Gap fields inside `metadata` so the normalizer doesn't drop them.

**Skip:** new detection rules. Sentinel Forge's `server/app/detection/engine.py` has a hardcoded `RULES = [...]` list; new rule files would silently no-op without engine.py edits. Raven Gap reports (SALUTE/ACE/LACE/UAS/sensor/PLI) don't need detection — they're already structured. Compaction groups them by squad directly off normalized events. This pivot saves ~1h of plumbing and removes a hidden registration step.

### Hourly deliverables
- **H0–1:** Scaffold `raven_gap` scenario id with **12 placeholder events** (real types, timestamps, sources, MGRS grids; "TBD" message bodies). 12 is the target everywhere — A, B, C, D all design against the same count to avoid off-by-two drift in the demo timing. **Publish the State Contract (see §State Contract below) so C and D have concrete fields to build against.** Confirm boot.
- **H1–3:** Receive B's scenario content (markdown table); paste real strings into events. Pair with B for 15-min sanity check on rendered output (mandatory sync).
- **H3–5:** Squad compaction rollup + SITREP delta wired into `pipeline.py`. Both visible in `/state` response.
- **H5–7:** EW-degraded backend wiring. (1) `POST /comms/degrade` updates `state.comms.degraded` and `state.comms.source_detail_level`. (2) **Add `comms` parameter to `run_pipeline()` signature** in `core/pipeline.py`. (3) **Update `run_and_apply_pipeline()` in `main.py:62`** to pass `comms=state.get("comms")` into every `run_pipeline` call (current call site does not pass any comms state, so the next pipeline run after a toggle would be unaware of degraded mode). Trimming logic lives inside `run_pipeline` (or a helper it calls) and acts on `events[*].message` and `compactions[*].summary`. **Toggle interface contract is part of the State Contract published at H1.** Confirm with C at H4 that contract is unambiguous.
- **H7–9:** Integration support. Fix bugs surfaced by C/D wiring. Pair on demo-day surface issues.
- **H9:** Integration gate — run the full 90-second script: `/simulate/start` then 12 sequential `/simulate/step` calls. After each step, `/state` reflects new event in feed, mesh tree, and (when applicable) updated compactions/SITREP/delta. After step 8, `POST /comms/degrade {degraded:true}`; subsequent state reflects reduced source detail with SITREP intact. **Don't false-pass on a single step.**
- **H10–12:** Backend polish, perf, default values.
- **H12–18:** On-call for rehearsal bug fixes only. Don't add features.

---

## B. TacNet — Domain content + pitch lead

**Owns scenario realism and stage delivery. Writes no Python.**

### Deliverables
- **Scenario events table** — 12 events for the 90-second window. One row per event: `t_offset_sec | source (callsign, e.g. "1/A", "RQ-11", "OP-7") | unit_label | sender_id | report_type | mgrs | body`. The `source` field is what LogStream displays as the report origin; it must read like a real callsign, not "SYS"/"unknown". Doctrinally correct SALUTE/ACE/LACE/UAS observation/sensor trigger/PLI per ATP 3-21.8 + Ranger Handbook brevity.
- **Map content list** — NAI names, MGRS coordinates for friendly markers + checkpoints, phase line label, risk-zone names, asset callsigns (rifle squads, weapons squad, JLTV, RQ-11, OP/LP).
- **Vocabulary list for task 9** — one column "current copy" → "TacNet copy" (incidents → SITREP, signals → reports, etc.). Hand to C as a find/replace list.
- **Pitch rehearsal** — owns `branch-b-sentinel-forge-demo-script.md` execution. Three clean rehearsals by H14, three more H16:30–18.

### Hourly deliverables
- **H0–3:** Scenario events table done by H1; NAI/grid content done by H3. Hand to A. Joint sanity check at H3.
- **H3–5:** Refine event content based on rendered map; finalize MGRS grid + phase line names. Vocabulary list for task 9 ready for C.
- **H5–7:** Q&A prep: review the 10 anticipated answers in demo script §7; refine wording for the doctrine-grounded ones (ATP/ADP/FM references).
- **H7–10:** Pitch dry runs against C+D's working build. Time each pass.
- **H10–14:** Three clean rehearsals as pitch lead. Calibrate pace to 2:55–3:05.
- **H14–15:** Narrate backup video.
- **H16:30–18:** Final rehearsals. Operates pitch.

**Risk:** B may want to write code. Don't. The bus factor on doctrine + pitch is too high.

---

## C. Gen1 — Frontend components (isolated work)

**Builds new React components against A's stub state shape. Doesn't need backend context.**

### Files (new)
- `client/src/components/MeshTree.tsx` + `client/src/styles/meshtree.css`
- `client/src/components/CompactionTimeline.tsx` + `client/src/styles/compaction.css`
- `client/src/components/EvidenceDrawer.tsx` + `client/src/styles/evidence.css`
- `client/src/components/DegradedCommsToggle.tsx` + `client/src/styles/degraded.css`
- `client/src/components/SitrepDeltaPanel.tsx` + `client/src/styles/sitrep-delta.css` — renders `state.sitrep_delta.what_changed`. The SITREP body itself reuses existing `IncidentCard.tsx` (state.incident is populated by A); only the delta needs a new panel.

### Files (modified)
- `client/src/components/IncidentCard.tsx` — **functional change, not just relabel.** Add rendering for `incident.evidence_lines` (one row per line, each clickable). Click handler emits the `evidence_ids` for that line; Dashboard wires it to open EvidenceDrawer. The 1:25 demo beat ("click any SITREP line → evidence drawer opens") depends on this; reuse alone is not enough.
- `client/src/components/LogStream.tsx` — **functional change, not just relabel.** (1) Filter out events where `metadata.background === true` from the main feed (current `all` view shows everything; background telemetry pollutes the source-report feed). (2) Render the raw `event.source` value (e.g., "1/A", "RQ-11", "OP-7") directly in the source column — current `sourceType()` maps unrecognized values to "SYS", which would erase Raven Gap callsigns. Either extend `sourceType()` to recognize callsign patterns or bypass it for events where `event.source` is set to a Raven Gap callsign.
- `client/src/components/TopBar.tsx` — **C owns relabel.** (1) Replace "SENTINEL FORGE" logo text with "TACNET EDGE". (2) Replace product description with TacNet vocabulary. (3) Hide the scenario selector dropdown (multi-scenario is hard-cut and the dropdown is first-viewport visible during the demo). (4) **Rename the primary "START" / run button to "REPLAY SCENARIO"** — both the demo script and runbook reference this exact label, and the pitch lead's first click depends on the button reading right.
- `client/src/components/SignalBreakdown.tsx`, `AssetStatus.tsx` — task 9 vocabulary relabel using B's list
- `client/src/services/api.ts` — **add** `setCommsDegraded(degraded: boolean)` wrapper for `POST /comms/degrade`. All API calls live here; do not hand-roll fetches in components.
- `client/src/hooks/useSimulation.ts` — (1) **Replace the existing boot effect's `Promise.all([refresh(), loadScenarios()])` with an explicit sequence:** `await loadScenarios()` → `await selectScenario("raven_gap")` (this returns Raven Gap's initial state) → `applyState(...)`. Without sequencing, `refresh()` can race and overwrite the selected Raven Gap state with the default `coordinated_intrusion` state. (2) Add a toggle action that calls `setCommsDegraded` from the api service.

### Convention to match
Read `theme.css`, `dashboard.css`, `map.css` first. CSS-only, namespaced selectors per component. One `{component}.css` per component.

### Hourly deliverables
- **H0–1:** Read `App.tsx`, `Dashboard.tsx`, `MapView.tsx`, `useSimulation.ts`, theme/dashboard CSS. Survey existing component patterns. Wait for A's stub state shape (H1).
- **H1–3:** `MeshTree.tsx` + CSS done. Renders against A's stub state (placeholder data is fine).
- **H3–5:** `CompactionTimeline.tsx` + CSS done. Visibly shows source reports collapsing into squad summaries.
- **H5–7:** `EvidenceDrawer.tsx` + CSS done (click handler wired). `DegradedCommsToggle.tsx` + CSS done, wired to A's interface contract (mandatory H4 hand-off from A). `SitrepDeltaPanel.tsx` + CSS done. **`IncidentCard.tsx` extended** to render `incident.evidence_lines` as clickable rows that emit `evidence_ids` to the EvidenceDrawer.
- **H7–9:** Pair with D on Dashboard layout integration. Fix wire-up bugs. Wire `useSimulation.ts` to `selectScenario("raven_gap")` on mount. Begin task 9 relabel.
- **H9:** Integration gate. The core spine (map + source-report feed + compaction + SITREP + EW toggle) works end-to-end. `MeshTree`, `CompactionTimeline`, and `DegradedCommsToggle` are real components. `EvidenceDrawer` and `SitrepDeltaPanel` are either real or in their inline-fallback form per the H7 rule below — both are acceptable at H9. `IncidentCard` renders `evidence_lines` and clicking a line surfaces the source events somewhere visible (drawer or highlighted feed rows).
- **H9–12:** Task 9 relabel pass. Visual polish at 110% zoom.
- **H12–18:** Rehearsal bug fixes only.

**Note:** Task 9 (relabel) is the swing item — if C is behind at H9, defer to H10–12 polish window. It's pure find/replace, lowest deferral risk.

**H7 hackathon-pragmatism fallback:** if `EvidenceDrawer` or `SitrepDeltaPanel` is shaky at H7, ship simpler inline versions and keep moving. EvidenceDrawer can degrade to "highlight source rows in LogStream when a SITREP line is clicked" (no slide-in drawer). SitrepDeltaPanel can degrade to "render `incident.why` items with a 'NEW' badge on entries since previous SITREP" inline in the right panel. The map + source-report feed + compaction + SITREP + EW toggle is the core spine; do not let drawer/delta polish risk those at H9.

---

## D. Gen2 — Frontend integrator + demo infra + laptop operator

**Owns the layout, the map retarget, and the demo-day machine. Generalist with the most-approachable code surface.**

### Files
- `client/src/pages/Dashboard.tsx` — only 110 lines; retarget panel layout per build plan §5 (center map / left feed / top mesh tree / bottom timeline / right SITREP / drawer or highlight target for evidence). **Also owns the evidence-click wiring**: hold local state for `selectedEvidenceIds`, pass an `onEvidenceClick(ids)` callback into `IncidentCard` and `CompactionTimeline`. **Then either:** render `<EvidenceDrawer events={...} ids={selectedEvidenceIds} onClose={...} />` (full version) **or** pass `selectedEvidenceIds` to `LogStream` and let it highlight matching rows (H7-approved inline fallback). D matches whichever shape C ships. C owns the components and the callback shape; D owns the Dashboard plumbing that closes the loop.
- `client/src/components/MapView.tsx` — render Raven Gap surface from `state.map_state` (A's source of truth). MGRS grid overlay, NAI markers, phase line, checkpoints, friendly/contact/risk-zone markers — **all coordinates come from `state.map_state`, not hardcoded in MapView**. D owns rendering only; never copy values from `core/map.py`.
- `client/src/styles/map.css` — static fallback styling (dark vector-only mode that works with network disabled in DevTools)
- `docs/demo-day-runbook.md` — **NEW**, D authors. Section H10 below lists the items.

### Callback contract (locks the C/D handoff)

**Evidence click:** C's `IncidentCard` and `CompactionTimeline` both expose an `onEvidenceClick: (ids: string[]) => void` prop. D's Dashboard supplies a single handler that sets `selectedEvidenceIds` state. The matching events from `state.events` are rendered either by `<EvidenceDrawer/>` (full version) or by `LogStream` highlighting the rows whose `id` is in `selectedEvidenceIds` (H7 inline fallback). C does not own click state; D does not own row rendering.

**Degraded-comms toggle:** D's Dashboard renders `<DegradedCommsToggle degraded={state.comms?.degraded} onChange={toggleDegraded} />`, where `toggleDegraded` is the hook action C added to `useSimulation.ts` (calls `setCommsDegraded()` from `services/api.ts`, then refreshes state). C owns the toggle component and the hook action; D owns placing the toggle in the layout and wiring the `onChange` prop. Without this hand-off line, the toggle is built but never mounted.

### Hourly deliverables
- **H0–1:** Read `Dashboard.tsx`, `MapView.tsx`, `map.css`. Verify boot. Confirm static-fallback approach with A.
- **H1–3:** Dashboard layout retargeted per §5 — placeholder panels in correct positions, even if components not yet built. Static map fallback CSS scaffolded.
- **H3–5:** MapView retargeted for Raven Gap — friendly markers, NAI markers, phase line drawn, checkpoint icons. Works against A's stub state at H2.
- **H5–7:** Static fallback fully tested with DevTools network disabled. Map still reads as a tactical surface (MGRS grid, NAIs, phase line all visible without tiles).
- **H7–9:** Active integration testing: click through the full 90-second flow, file bugs to A and C. Verify EW-degraded toggle ripples through map detail.
- **H9:** Integration gate operator. Confirms end-to-end demo runs.
- **H10–12:** Author `docs/demo-day-runbook.md` — see runbook section below — and run it once on the actual demo laptop.
- **H12–14:** Rehearsal QA. Files bugs.
- **H14–15:** Backup video recording — clean run with screen capture. B narrates.
- **H15–16:30:** Devpost submission upload (README, screenshots, deploy URL).
- **H16:30–18:** Pre-flights demo machine. Operates laptop while B pitches.

### `docs/demo-day-runbook.md` contents (D authors at H10–12)

The runbook is a checklist file, not a sticky note. Stages:

**T-30 minutes (offstage):**
- [ ] Laptop fully charged + power adapter packed
- [ ] Backend running: `cd ../sentinel-forge/server && .venv/bin/python -m uvicorn app.main:app` — verify `curl http://localhost:8000/state` returns 200
- [ ] Frontend running: `cd ../sentinel-forge/client && npm run dev` — Vite URL noted
- [ ] Browser at 110% zoom, single window, no tabs visible, no notification chrome
- [ ] Dock hidden, menu bar auto-hide on (so projector shows only browser chrome)
- [ ] All notifications silenced: Do Not Disturb on, Slack closed, Mail closed, phone in silent mode (and pocketed)
- [ ] Backup video MP4 open in a hidden tab; verified plays from frame 1
- [ ] DevTools closed (no console clutter on stage)

**T-5 minutes (onstage prep):**
- [ ] Replay Scenario button visible
- [ ] Map renders correctly (visual confirmation only — do **NOT** toggle Wi-Fi at T-5; the destructive offline test was already done in rehearsal at H5–7)
- [ ] Mesh hierarchy populated
- [ ] Compaction timeline visible
- [ ] EW-degraded toggle starts in OFF position
- [ ] Evidence click/highlight works on a SITREP line (drawer OR inline-highlight fallback per H7 rule); reset before pitch
- [ ] State reset: click the UI **Reset** button (preferred — keeps browser in sync). If reset only via `curl -X POST http://localhost:8000/reset`, hit `Cmd+R` to refresh the browser; otherwise the React hook keeps showing stale state from the previous run.
- [ ] Pitch lead (B) confirms ready

**T-0 (pitch):**
- D operates trackpad / clicks per the demo script. B speaks. **Do not swap roles mid-pitch.**

**Failure escalation:** if anything in this list fails at T-5, switch to backup video and tell B to rehearse the "for time, here's the same run captured this morning" pivot from `branch-b-sentinel-forge-demo-script.md` §6.

**Post-pitch:**
- [ ] Leave final composed state on screen for the demo-table photo
- [ ] Devpost submission verified live

---

## Mandatory syncs (5 total)

| Hour | Who | What |
|---|---|---|
| **H1** | A → C, A → D | A publishes the State Contract (see §State Contract above). All endpoints + `/state` shape + `/comms/degrade` defined. Without this, C and D guess. |
| **H3** | A ↔ B | 15-min joint sanity check on rendered map with B's content baked in. Catches doctrine errors before compaction is built on top. |
| **H4** | A → C | C confirms the State Contract is unambiguous — specifically, what `comms.degraded:true` does to `events`/`compactions`/`map_state.contact_markers`. If anything is fuzzy, A clarifies in the contract doc. |
| **H7** | A + C + D | End-to-end click-through on EW toggle. Recovery time exists if broken. |
| **H9** | All four | 90-second integration gate. Run the full script: start → 12 sequential steps → degrade midway → final state holds. Single-step false-pass is not acceptable. Fails here = backup video becomes the demo. |

---

## Hard cuts (from build plan §8 — do not build)

- Real BLE / LoRa / SDR / ATAK / encryption
- Real iOS / on-device model integration
- Backend-wide terminology migration (no rename of `incident` → `sitrep`; UI label only)
- Multi-scenario toggle
- Natural language query box
- Belief lifecycle state machine
- Reparenting visual
- Hosted LLM dependency for the live demo (stretch only at H12–13 if everything else is locked)
- Full design-system migration

If anyone proposes one of these mid-build, the answer is "after the demo."

---

## Verification

### Per-owner gates
- **A**: After `POST /simulate/start` then 12 sequential `POST /simulate/step`, `GET /state` returns: **12 source reports** (events with `metadata.background == false`; total event count will be 13+ due to the start-time background telemetry, which is expected), mesh hierarchy populated, ≥3 squad compactions in `state.compactions`, `state.incident` populated with SITREP content (so `IncidentCard.tsx` renders), non-empty `state.sitrep_delta.what_changed`, `state.map_state` populated with NAIs/checkpoints/markers. Then `POST /comms/degrade {degraded:true}` followed by another step shows `comms.degraded=true` and reduced `events[*].message`/`compactions[*].summary` while `state.incident` and `state.sitrep_delta` remain coherent. Existing `server/tests/test_api_contract.py` still passes. Run from inside `server/`: `cd ../sentinel-forge/server && .venv/bin/python -m pytest tests/` (the test imports `from app.main import app`, which only resolves when the working dir is `server/`; running pytest from the repo root with `server/tests/` will fail at import).
- **B**: Pitch lead can read scenario content aloud and have it sound like a real soldier wrote it. Vocabulary list for C is complete and unambiguous.
- **C**: `MeshTree`, `CompactionTimeline`, and `DegradedCommsToggle` render as real components with A's stub state, no React console errors. `EvidenceDrawer` and `SitrepDeltaPanel` are either real components or in their H7-approved inline-fallback form (e.g., source-row highlight; "NEW" badges on `incident.why` items). `IncidentCard` renders `incident.evidence_lines`, and clicking a line surfaces source events somewhere visible (drawer or highlighted feed rows — both acceptable). `useSimulation` selects `raven_gap` on mount. `npm run build` passes.
- **D**: Static fallback loads with DevTools network blocked. Full 90-second demo runs without errors. Demo-day checklist (§9) all green.

### Integration gate (H9)
Demo runs end-to-end: Replay → reports stream → compaction collapses → SITREP appears → click for evidence → EW toggle → final state holds. No console errors, no failed network calls. Total runtime 85–95 seconds.

### Ship criteria (build plan §10)
- 90-second demo completes without console errors or failed API calls.
- Map immediately reads as tactical command picture, not generic basemap.
- Compaction timeline understandable without explanation.
- EW-degraded beat visibly preserves commander picture.
- Three consecutive 3-minute rehearsals clean.

---

## Risks specific to this division

| Risk | Mitigation |
|---|---|
| B wants to code | Block. B's bandwidth on doctrine + pitch is the constraint, not Python proficiency. |
| C and D collide on Dashboard.tsx | C only edits component files; D owns Dashboard.tsx layout. Single-writer rule. |
| EW-degraded interface contract slips | Hard deadline H4. If A doesn't publish, escalate at H4:30 sync. |
| A is the bottleneck if scenario shape changes | Lock the events shape at H1. B writes content into a shape A already coded against. |
| Static fallback never gets tested | D's H5–7 task. Demo-day checklist requires it. Don't skip. |
| Pitch lead also operates the laptop | Don't. D owns laptop, B owns voice. Separation enforced from H10 onward. |
| Branch oscillation pressure ("can we use the OLD dashboard instead?") | Branch lock is one-way. Refer to v3 §6 decision 8. |

---

## What "done" looks like at H18

A working `npm run dev` + `uvicorn app.main:app` pair on the demo laptop. Browser at 110% zoom, notifications off, backup video queued in a hidden tab. Pitch lead has rehearsed three back-to-back successful 3-minute pitches. Static fallback has been tested with network disabled. Devpost is submitted. The four-panel command picture (mesh tree top-left, source-report feed bottom-left, map center, SITREP+delta right) holds the final state for the post-pitch photo.

The two phrases land:
- **"Semantic compression over a tactical mesh"** in the solution beat (0:20).
- **"C2 that degrades gracefully instead of going blind"** in the close (2:45).
