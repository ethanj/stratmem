# Team — D. Integration + Demo Infra + Laptop Operator (Generalist) — v3

**Role:** Frontend integrator — Dashboard layout, MapView retarget, evidence-drawer wiring, static fallback, demo-day machine.
**Build shell:** `../sentinel-forge/`
**Cross-cutting reference:** `docs/THEPLAN.md` (full team plan, all roles)
**Pitch script:** `docs/branch-b-sentinel-forge-demo-script.md`
**v3 addendum:** `docs/team-d-integration-demo-v3-addendum.md`
**Branch lock:** Locked at Hour 1. Do not switch implementation paths mid-build.
**v3 scope:** carries forward the visible **3 Kbps degraded bandwidth** proof and adds one prerecorded voice-to-SALUTE report panel with a compression OFF/ON switch to the demo flow.

---

## Read first

You're a generalist with the most-approachable code surface (`Dashboard.tsx` is only ~110 lines). You own three things:

1. **Dashboard layout** — retarget the panel arrangement and wire up evidence-click + 3 Kbps meter + compression switch + voice-report submit from C's components.
2. **MapView retargeting** — render Raven Gap from `state.map_state` (A's source of truth). Don't hardcode coordinates.
3. **Demo-day machine** — static map fallback (mandatory checklist item), backup video recording, Devpost submission, operating the laptop while B pitches.

C builds the new components in isolation; you mount them, wire the callbacks, and own the integration story. You and B are not interchangeable — B is the voice, you operate the trackpad.

New P0 addition: mount the one-report voice panel. The demo can play a prerecorded audio clip if present, but it must still work with transcript-only fallback. The panel must make the before/after obvious: compression OFF blocks raw payload; compression ON sends compact SALUTE JSON.

No live iPhone app path is in the demo. Do not modify or depend on iOS/MeshNode. Do not use Chrome throttling as the 3 Kbps proof; Chrome throttling is only for map fallback rehearsal.

---

## Files you own

| File | What changes |
|---|---|
| `client/src/pages/Dashboard.tsx` | Retarget panel layout per build plan §5: center map / left feed / top mesh tree / bottom timeline / right SITREP / drawer or highlight target for evidence. **Also owns the evidence-click wiring.** Hold local state for `selectedEvidenceIds`. Pass `onEvidenceClick(ids)` callback into `IncidentCard` and `CompactionTimeline`. **Then either** render `<EvidenceDrawer events={...} ids={selectedEvidenceIds} onClose={...} />` (full version) **or** pass `selectedEvidenceIds` to `LogStream` and let it highlight matching rows (H7 inline fallback). Mount C's 3 Kbps meter where judges can see the budget numbers during the hero beat. Mount C's voice-report panel near the source feed so compression OFF → blocked raw payload and compression ON → SALUTE JSON → event are visible before compaction. Match whichever shape C ships. |
| `client/src/components/MapView.tsx` | Render Raven Gap surface from `state.map_state`. MGRS grid overlay, NAI markers, phase line, checkpoints, friendly/contact/risk-zone markers — **all coordinates come from `state.map_state`, not hardcoded in MapView**. Never copy values from `core/map.py`. |
| `client/src/styles/map.css` | Static fallback styling — dark vector-only mode that works with network disabled in DevTools. |
| `docs/demo-day-runbook.md` | NEW — you author at H10–12. Contents listed below. |

You don't touch component internals — that's C. You own the *plumbing* between components and the *layout* on screen.

---

## Hand-off contracts (with C)

C owns the new components and exposes callback shapes. You wire them in Dashboard.

**Evidence click:**
- C's `IncidentCard` and `CompactionTimeline` both expose `onEvidenceClick: (ids: string[]) => void`.
- Your Dashboard supplies a single handler that sets `selectedEvidenceIds` state.
- The matching events from `state.events` are rendered either by `<EvidenceDrawer/>` (full version) or by `LogStream` highlighting the rows whose `id` is in `selectedEvidenceIds` (H7 inline fallback).
- You don't own click state initiation; C doesn't own row rendering.

**3 Kbps meter:**
- C's `DegradedCommsToggle` is now a meter/readout with `comms: any` props.
- Your Dashboard renders `<DegradedCommsToggle comms={state.comms} />` and places it in the layout.
- During the hero beat it must visibly read something like: `3 KBPS LINK`, `RAW > BUDGET`, `COMPACTED FITS`, and a compression ratio.
- **Without this hand-off line, the meter is built but never mounted.**

**Voice report panel:**
- C's `VoiceReportPanel` accepts `voiceReport: any`, `comms: any`, `onSubmit: (audioId: string) => void`, and `onCompressionChange: (enabled: boolean) => void`.
- C's `useSimulation` hook exposes `submitVoiceReport` and `setCompressionEnabled`, which call `POST /voice/report` and `POST /compression/toggle`.
- Your Dashboard renders `<VoiceReportPanel voiceReport={state.voice_report} comms={state.comms} onSubmit={submitVoiceReport} onCompressionChange={setCompressionEnabled} />`.
- Place it where B can say "raw voice fails, compressed SALUTE JSON fits" without hunting for it on screen.

---

## What `state.map_state` looks like (you render from this)

Coordinates are always named keys (`{ lat, lon }`), never positional arrays. Don't reverse them.

```jsonc
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
}
```

If a field is missing, render nothing for it (graceful degradation). If a field is present but malformed, file a bug at A.

---

## Hourly schedule

| Hour | Goal | Hand-offs |
|---|---|---|
| **H0–1** | Read `Dashboard.tsx`, `MapView.tsx`, `map.css`. Verify boot. Confirm static-fallback approach with A. | **← A** at H1: stub state shape published. |
| **H1–3** | Dashboard layout retargeted per §5 — placeholder panels in correct positions, including voice-report slot, even if components not yet built. Static map fallback CSS scaffolded. | |
| **H3–5** | MapView retargeted for Raven Gap — friendly markers, NAI markers, phase line drawn, checkpoint icons. Works against A's stub state. | |
| **H5–7** | Static fallback fully tested with **DevTools network disabled**. Map still reads as a tactical surface (MGRS grid, NAIs, phase line all visible without tiles). This is not the bandwidth proof; it is only tile-fallback rehearsal. | **H7 sync with A+C**: end-to-end click-through on compression OFF/ON. |
| **H7–9** | Active integration testing: click through the full 90-second flow, file bugs to A and C. Verify voice report submit with compression OFF is blocked, compression ON creates a feed event, and the 3 Kbps meter shows raw traffic over budget and compacted traffic fitting. Mount C's components in Dashboard. Wire evidence-click + 3 Kbps meter + compression switch + voice-report handshakes. | |
| **H9** | **Integration gate operator.** Confirm end-to-end demo runs. | **H9 sync with all four**. |
| **H10–12** | Author `docs/demo-day-runbook.md` (contents below). Run it once on the actual demo laptop. | |
| **H12–14** | Rehearsal QA. File bugs. | |
| **H14–15** | **Backup video recording** — clean run with screen capture. B narrates. | |
| **H15–16:30** | Devpost submission upload (README, screenshots, deploy URL). | |
| **H16:30–18** | Pre-flight demo machine. **Operate laptop while B pitches.** Don't swap roles mid-pitch. | |

---

## `docs/demo-day-runbook.md` contents (author at H10–12)

Checklist file. Stages:

### T-30 minutes (offstage)
- [ ] Laptop fully charged + power adapter packed
- [ ] Backend running: `cd ../sentinel-forge/server && .venv/bin/python -m uvicorn app.main:app` — verify `curl http://localhost:8000/state` returns 200
- [ ] **Verify the active scenario is Raven Gap, not the default**: `curl -s http://localhost:8000/state | grep -o '"id":"[^"]*"' | head -1` should show `raven_gap`. C hides the scenario selector dropdown, so this is the only visible check that the right scenario is loaded.
- [ ] 3 Kbps degraded-link proof verified in app: the UI shows a 3 Kbps budget, raw traffic over budget, and compacted traffic fitting.
- [ ] Compression OFF/ON proof verified in app: click the prerecorded report with compression OFF and confirm blocked raw payload; switch compression ON and confirm transcript, SALUTE JSON, and a source-feed event appear. If audio playback exists, confirm it plays; if not, confirm transcript-only fallback is rehearsed.
- [ ] Frontend running: `cd ../sentinel-forge/client && npm run dev` — Vite URL noted
- [ ] Browser at 110% zoom, single window, no tabs visible, no notification chrome
- [ ] Dock hidden, menu bar auto-hide on (so projector shows only browser chrome)
- [ ] All notifications silenced: Do Not Disturb on, Slack closed, Mail closed, phone in silent mode (and pocketed)
- [ ] Backup video MP4 open in a hidden tab; verified plays from frame 1
- [ ] DevTools closed (no console clutter on stage)

### T-5 minutes (onstage prep)
- [ ] Replay Scenario button visible
- [ ] Map renders correctly (visual confirmation only — do **NOT** toggle Wi-Fi at T-5; the destructive offline test was already done in rehearsal at H5–7)
- [ ] Mesh hierarchy populated
- [ ] Compaction timeline visible
- [ ] Voice-report panel visible; audio/transcript fallback state known before stepping onstage
- [ ] Compression switch starts in OFF position
- [ ] 3 Kbps bandwidth meter visible or one click away; do **not** use Chrome network throttling onstage
- [ ] Evidence click/highlight works on a SITREP line (drawer OR inline-highlight fallback per H7 rule); reset before pitch
- [ ] State reset: click the UI **Reset** button (preferred — keeps browser in sync). If reset only via `curl -X POST http://localhost:8000/reset`, hit `Cmd+R` to refresh the browser; otherwise the React hook keeps showing stale state from the previous run.
- [ ] Pitch lead (B) confirms ready

### T-0 (pitch)
- You operate trackpad / clicks per the demo script. B speaks. **Do not swap roles mid-pitch.**

### Failure escalation
If anything in this list fails at T-5, switch to backup video and tell B to use the "for time, here's the same run captured this morning" pivot from `branch-b-sentinel-forge-demo-script.md` §6.

### Post-pitch
- [ ] Leave final composed state on screen for the demo-table photo
- [ ] Devpost submission verified live

---

## Verification gate (your gate)

- Static fallback loads with DevTools network blocked. Map still reads as a tactical surface (MGRS grid, NAIs, phase line all visible without tiles).
- Full 90-second demo runs without errors on the actual demo laptop.
- Voice report path works: compression OFF yields blocked raw payload; compression ON yields transcript → SALUTE JSON → source event → compaction/SITREP update.
- Demo-day checklist (above) all green.
- Evidence click works end-to-end (drawer or inline highlight, either acceptable).
- Compression switch is mounted and visibly changes the voice report from blocked to fits.
- 3 Kbps meter visibly shows raw traffic over budget, compacted traffic fitting, and compression ratio during the hero beat.
- Backup video recorded and plays from frame 1.

---

## Hard cuts (do not build)

- Tailwind / shadcn migration — full design-system migration is hard-cut.
- Reparenting visual.
- Multi-scenario toggle (TopBar dropdown is hidden by C).
- LLM streaming animation.
- Live BLE / LoRa / ATAK / encryption.
- Live iPhone/iOS/MeshNode app dependency.
- Live mic / live STT.
- Chrome throttling as the degraded-bandwidth proof.

If anyone proposes one, the answer is "after the demo."

---

## Risks specific to your role

| Risk | Mitigation |
|---|---|
| You collide with C on Dashboard.tsx | Single-writer rule: C only edits component files; you own Dashboard.tsx layout. |
| Static fallback never gets tested | Your H5–7 task. Demo-day checklist requires it. Don't skip. |
| Pitch lead also operates the laptop | Don't. You own laptop, B owns voice. Separation enforced from H10 onward. |
| Map coordinates drift from `core/map.py` | Render only from `state.map_state`. Never copy values from `core/map.py`. |
| Devpost submission slips to T-30 minutes | Get it done H15–16:30. The submission is paperwork, not creative work. |
