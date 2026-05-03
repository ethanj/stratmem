# Team — C. Frontend Components (Generalist) — v3

**Role:** Build new React components against A's stub state shape. You don't need backend context.
**Build shell:** `../sentinel-forge/`
**Cross-cutting reference:** `docs/THEPLAN.md` (full team plan, all roles)
**Pitch script (so you understand the demo flow):** `docs/branch-b-sentinel-forge-demo-script.md`
**v3 addendum:** `docs/team-c-frontend-components-v3-addendum.md`
**Branch lock:** Locked at Hour 1. Do not switch implementation paths mid-build.
**v3 scope:** carries forward the **3 Kbps** visible proof point and adds one prerecorded voice-to-SALUTE report panel with a compression OFF/ON switch.

---

## Read first

You're doing isolated frontend work — six new React components plus a small set of modifications to existing ones. You consume A's `/state` JSON shape through the existing `useSimulation` hook; you don't touch the backend.

Two big things that aren't pure-relabel:
1. **`IncidentCard.tsx` extension** — must render `incident.evidence_lines` as clickable rows. The 1:25 demo beat ("click any SITREP line → evidence opens") depends on this; reuse alone is not enough.
2. **`LogStream.tsx` filter + source rendering** — must filter `metadata.background === true` events out of the main feed (telemetry pollutes), and render the raw `event.source` callsign (current `sourceType()` maps unrecognized values to "SYS", erasing Raven Gap callsigns like "1/A", "RQ-11").

You also own the boot-effect rewrite in `useSimulation.ts` so the demo loads Raven Gap on mount without a manual scenario switch.

New P0 addition: a small voice-report panel for one prerecorded SALUTE report. It can play an audio file if D/B provide one, but the critical path is a before/after switch: compression OFF shows raw audio/report over the 3 Kbps budget and blocked; compression ON calls A's deterministic `/voice/report` endpoint and shows transcript → SALUTE JSON → fits.

No live iPhone app path is in this demo. Do not touch iOS/MeshNode code. Do not use Chrome throttling as the 3 Kbps proof; Chrome throttling only helps D test map fallback.

---

## Files (new)

| File | Purpose |
|---|---|
| `client/src/components/MeshTree.tsx` + `client/src/styles/meshtree.css` | Render `state.mesh` as a hierarchy tree (PL → squads → teams). Leaf nodes light up when their `sender_id` emits an event. |
| `client/src/components/CompactionTimeline.tsx` + `client/src/styles/compaction.css` | Render `state.compactions[]` rows. Each row groups its `source_event_ids` visually (think: source events listed under each squad-summary entry). Exposes `onEvidenceClick: (ids: string[]) => void` — D wires this. |
| `client/src/components/EvidenceDrawer.tsx` + `client/src/styles/evidence.css` | Side drawer that takes `events` + `ids` props and displays the matching events. D mounts this. |
| `client/src/components/DegradedCommsToggle.tsx` + `client/src/styles/degraded.css` | Compact bandwidth meter. Props: `comms: any`. D mounts it where judges can see `3 KBPS LINK`, raw bytes vs budget, compacted bytes vs budget, and compression ratio. In v3 the stage toggle is compression, not EW mode. |
| `client/src/components/VoiceReportPanel.tsx` + `client/src/styles/voice-report.css` | Prerecorded report flow with compression OFF/ON. Props: `voiceReport: any`, `comms: any`, `onSubmit: (audioId: string) => void`, `onCompressionChange: (enabled: boolean) => void`. Shows audio/play control if an asset exists, transcript, structured SALUTE JSON, raw-audio bytes vs budget, JSON bytes vs budget, and blocked/fits state. |
| `client/src/components/SitrepDeltaPanel.tsx` + `client/src/styles/sitrep-delta.css` | Renders `state.sitrep_delta.what_changed`. The SITREP body itself reuses existing `IncidentCard.tsx` (state.incident is populated by A); only the delta needs a new panel. |

## Files (modified — functional changes, not just relabel)

| File | Changes |
|---|---|
| `client/src/components/IncidentCard.tsx` | Add rendering for `incident.evidence_lines` (one row per line, each clickable). Click handler emits the line's `evidence_ids` via `onEvidenceClick`. The 1:25 demo beat depends on this. |
| `client/src/components/LogStream.tsx` | (1) Filter out events where `metadata.background === true` from the main feed (current `all` view shows everything; background telemetry pollutes the source-report feed). (2) Render the raw `event.source` value directly in the source column — current `sourceType()` maps unrecognized values to "SYS", which would erase Raven Gap callsigns. Either extend `sourceType()` to recognize callsign patterns or bypass it for events where `event.source` is set to a Raven Gap callsign. |
| `client/src/components/TopBar.tsx` | (1) Replace "SENTINEL FORGE" logo text with "TACNET EDGE". (2) Replace product description with TacNet vocabulary. (3) Hide the scenario selector dropdown (multi-scenario is hard-cut and the dropdown is first-viewport visible during the demo). (4) **Rename the primary "START" / run button to "REPLAY SCENARIO"** — both the demo script and runbook reference this exact label. |
| `client/src/components/SignalBreakdown.tsx`, `AssetStatus.tsx` | Task 9 vocabulary relabel using B's list (delivered H5). |
| `client/src/services/api.ts` | **Add** `setCommsDegraded(degraded: boolean, kbps = 3)` wrapper for `POST /comms/degrade`, `setCompressionEnabled(enabled: boolean)` wrapper for `POST /compression/toggle`, and `submitVoiceReport(audioId = "raven_gap_salute_1")` wrapper for `POST /voice/report`. All API calls live here; do not hand-roll fetches in components. |
| `client/src/hooks/useSimulation.ts` | (1) **Replace the existing boot effect's `Promise.all([refresh(), loadScenarios()])` with an explicit sequence:** `await loadScenarios()` → `await selectScenario("raven_gap")` → `applyState(...)`. Without sequencing, `refresh()` can race and overwrite the selected Raven Gap state with the default `coordinated_intrusion` state. (2) Add `setCompressionEnabled` and `submitVoiceReport` actions that call the api service and apply returned state. |

---

## What A's `/state` looks like (relevant slice)

You consume this from the existing `useSimulation` hook. Don't worry about how A produces it.

```jsonc
{
  "events": [
    {
      "id": "rg_001",
      "type": "salute",
      "source": "1/A",                     // render this directly in LogStream
      "domain": "physical",
      "severity": "low",
      "message": "1x dismount moving south, 11SLT 12345 67890, light pack...",
      "metadata": {
        "sender_id": "1st_squad_team_a",
        "unit_label": "1st Squad / Team A",
        "mgrs": "11SLT 12345 67890",
        "report_type": "salute",
        "background": false                // filter true out of main feed
      },
      "geospatial": { "lat": 36.123, "lon": -115.456 }
    }
  ],
  "voice_report": {
    "audio_id": "raven_gap_salute_1",
    "status": "ready",
    "mode": "raw_audio",
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
      "source_event_ids": ["rg_001", "rg_004"],   // emit these on click
      "t_compacted_sec": 60
    }
  ],
  "incident": {                            // SITREP rendered via IncidentCard
    "id": "sitrep_002",
    "summary": "...",
    "narrative": "...",
    "recommended_actions": ["..."],
    "evidence_lines": [                    // NEW; render as clickable rows
      { "text": "Contact: 1x dismount, NAI 1", "evidence_ids": ["rg_001"] }
    ],
    "active_risk": 0.7, "confidence": 0.7, "detection_confidence": 0.7,
    "why": ["..."],                        // existing KEY FACTORS list
    "signals": []
  },
  "sitrep_delta": {                        // NEW; SitrepDeltaPanel renders this
    "since_id": "sitrep_001",
    "what_changed": ["NAI 1 contact upgraded from suspected to confirmed"]
  },
  "comms": {
    "degraded": true,
    "kbps": 3,
    "window_sec": 10,
    "budget_bytes": 3750,
    "raw_bytes": 0,
    "compacted_bytes": 0,
    "compression_ratio": null,
    "fits_budget": true,
    "source_detail_level": "full",
    "compression_enabled": false
  }
}
```

A might add fields. Treat the contract as additive — unknown fields are ignored, missing fields are bugs to file at A.

---

## Convention to match

Read `theme.css`, `dashboard.css`, `map.css` first. CSS-only, namespaced selectors per component. One `{component}.css` per component.

---

## Hourly schedule

| Hour | Goal | Hand-offs |
|---|---|---|
| **H0–1** | Read `App.tsx`, `Dashboard.tsx`, `MapView.tsx`, `useSimulation.ts`, theme/dashboard CSS. Survey existing component patterns. Wait for A's stub state shape. | **← A** at H1: stub state shape published. |
| **H1–3** | `MeshTree.tsx` + CSS done. Renders against A's stub state (placeholder data is fine). | |
| **H3–5** | `CompactionTimeline.tsx` + CSS done. Visibly shows source reports collapsing into squad summaries. | **← B** at H5: vocabulary list. |
| **H4** | **A/C confirm comms + compression contract before you wire the switch.** 5-min sync with A; if anything in the State Contract is fuzzy on `compression_enabled`, blocked raw payload, or budget fields, A clarifies before you start `VoiceReportPanel` wiring. | **A ↔ C** standalone sync. |
| **H5–7** | `EvidenceDrawer.tsx` + CSS done (click handler wired). `DegradedCommsToggle.tsx` + CSS done as a visible 3 Kbps budget meter. `VoiceReportPanel.tsx` + CSS done as compression OFF/ON panel: blocked raw payload → SALUTE JSON fits. `SitrepDeltaPanel.tsx` + CSS done. **`IncidentCard.tsx` extended** to render `incident.evidence_lines`. | |
| **H7–9** | Pair with D on Dashboard layout integration. Fix wire-up bugs. Wire `useSimulation.ts` to `selectScenario("raven_gap")` on mount. Begin task 9 relabel. | **H7 sync with A+D**: end-to-end click-through on compression OFF/ON. |
| **H9** | **Integration gate.** Core spine works end-to-end. | **H9 sync with all four**. |
| **H9–12** | Task 9 relabel pass. Visual polish at 110% zoom. | |
| **H12–18** | Rehearsal bug fixes only. | |

**Task 9 (relabel) is the swing item** — if you're behind at H9, defer to H10–12 polish window. It's pure find/replace, lowest deferral risk.

---

## H7 hackathon-pragmatism fallback

If `EvidenceDrawer` or `SitrepDeltaPanel` is shaky at H7, **ship simpler inline versions and keep moving**:

- **EvidenceDrawer fallback:** highlight source rows in `LogStream` when a SITREP line is clicked (no slide-in drawer). D passes `selectedEvidenceIds` to LogStream; LogStream adds a CSS class to matching rows.
- **SitrepDeltaPanel fallback:** render `incident.why` items with a "NEW" badge on entries since the previous SITREP, inline in the right panel. No separate component.

The map + source-report feed + compression OFF/ON proof + compaction + SITREP is the core spine. Do not let drawer/delta polish risk those at H9.

If `VoiceReportPanel` audio playback is shaky, ship the transcript/JSON button path without audio controls. The proof is the OFF/ON byte-budget contrast and the SALUTE JSON event entering the pipeline, not media playback.

---

## Hand-off contracts (with D)

D owns `Dashboard.tsx`. You don't touch it. The handshake:

**Evidence click:**
- You expose `onEvidenceClick: (ids: string[]) => void` on `IncidentCard` and `CompactionTimeline`.
- D's Dashboard supplies a single handler that sets `selectedEvidenceIds` state and either mounts `<EvidenceDrawer/>` or passes the ids to `LogStream` for highlighting.
- You don't own click state. D doesn't own row rendering.

**3 Kbps meter:**
- You expose `<DegradedCommsToggle comms={...} />` as a readout, not the primary stage switch.
- D's Dashboard renders the meter where judges can see it.
- Without this hand-off line, the meter is built but never mounted — make sure D knows.

**Voice report panel:**
- You expose `<VoiceReportPanel voiceReport={...} comms={...} onSubmit={...} onCompressionChange={...} />` and the `submitVoiceReport` + `setCompressionEnabled` actions on the `useSimulation` hook.
- The action calls `submitVoiceReport("raven_gap_salute_1")` in `services/api.ts`.
- The compression switch calls `setCompressionEnabled(true)` before the second submit.
- D mounts the panel where it is visible before the raw-report stream starts moving.

**Bandwidth meter display rules:**
- Always show `3 KBPS DEGRADED LINK` in v3; the stage switch is compression, not link condition.
- Compression starts OFF. The first voice attempt should show raw audio/report bytes over `budget_bytes` and a blocked state.
- Compression ON should show JSON bytes under `budget_bytes` and a fits state.
- Show `RAW: {raw_bytes} > BUDGET: {budget_bytes}` in red when raw exceeds budget.
- Show `COMPACTED: {compacted_bytes} FITS` in green when compacted bytes fit.
- Show `compression_ratio` if present. Keep this small but readable from the judge table.

---

## Verification gate (your gate)

- `MeshTree`, `CompactionTimeline`, and `DegradedCommsToggle` render as real components with A's stub state, no React console errors.
- `VoiceReportPanel` can call the endpoint with compression OFF and show `blocked_raw` with raw bytes over budget; after toggling compression ON, the same report displays SALUTE JSON, fits budget, and produces a voice-derived event in the feed after state refresh.
- 3 Kbps meter visibly shows `3 KBPS DEGRADED LINK`, raw traffic over budget, compacted traffic fitting, and compression ratio when `state.comms.degraded` is true.
- `EvidenceDrawer` and `SitrepDeltaPanel` are either real components or in their H7-approved inline-fallback form.
- `IncidentCard` renders `incident.evidence_lines`, and clicking a line surfaces source events somewhere visible (drawer or highlighted feed rows — both acceptable).
- `useSimulation` selects `raven_gap` on mount.
- `npm run build` passes.

---

## Hard cuts (do not build)

- Tailwind / shadcn migration — full design-system migration is hard-cut.
- Belief lifecycle UI.
- Reparenting visual.
- Multi-scenario toggle.
- Natural language query box.
- LLM streaming animation.
- Live iPhone/iOS/MeshNode work.
- Live mic / live STT. One prerecorded report plus stored transcript is the limit.
- Chrome throttling as the degraded-bandwidth proof.

If anyone proposes one, the answer is "after the demo."
