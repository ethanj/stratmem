# TacNet Edge — Branch A Hackathon Plan

**Date:** 2026-05-02
**Build shell:** `../voice-agents-hack/OLD CODE/dashboard/`
**Shared timing baseline:** `docs/demo-script-v1.md`
**Demo script:** `docs/branch-a-old-dashboard-demo-script.md`
**Pitch window:** 3:00 total, ~1:30 live demo

This plan turns the existing OLD dashboard into a focused TacNet Edge demo for Raven Gap. The goal is not a general product rebuild. The goal is one reliable, visually clear live sequence: raw edge reports become squad summaries, then a commander SITREP, then bandwidth degrades and the command picture survives.

**Branch lock:** Locked at Hour 1. Do not switch implementation paths mid-build.

---

## 1. Demo Promise

By rehearsal, the live screen must show:

- Static Raven Gap COP panel with friendly, drone, vehicle, sensor, contact, and risk-zone markers.
- Mesh hierarchy lighting up as scripted reports arrive.
- Raw event feed with distinct broadcast and compaction rows.
- Commander SITREP with a visible "what changed" delta.
- Evidence/provenance click that highlights which raw reports created a summary or SITREP line.
- Bandwidth-degraded toggle that thins raw detail while preserving a shorter commander-level picture.

The wow factor is visual first, conceptual second: the map catches attention; graceful information degradation proves the product.

---

## 2. Boot Test

From this repo root:

```bash
cd "../voice-agents-hack/OLD CODE/dashboard"
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python server.py
# open http://localhost:8080
# click "Demo Mode"
```

Pass criteria:

- Server starts without crashing.
- Browser dashboard renders at `http://localhost:8080`.
- WebSocket connects on `:8081`.
- Demo mode emits messages and populates hierarchy/feed/SITREP.
- Page is readable at 110% browser zoom from projector distance.

If `tecnet.mp4` is missing, do not block. Remove or bypass the landing overlay and go straight to the dashboard.

---

## 3. P0 Build Scope

| Work | Owner | Time | Deliverable |
|---|---|---:|---|
| Replace random demo data with deterministic Raven Gap script | Backend | 1h | Fixed sequence of raw reports and compactions |
| Replace timer-only demo with stepped replay | Backend/frontend | 1h | Replay button advances the scenario predictably |
| Add static Raven Gap COP panel | Frontend | 1h | Tactical sketch, markers, risk overlay, event pulses |
| Wire marker state to replay steps | Frontend | 1h | Markers pulse, cluster, fade, and update with the story |
| Add bandwidth-degraded toggle | Frontend/backend | 1h | Raw feed thins; static-COP markers dim/sparse to match reduced data; summary gets shorter |
| Add provenance highlighting | Frontend | 1h | Click summary/SITREP line highlights source reports |
| Add SITREP delta line | Backend/frontend | 1h | "What changed" visible in the commander panel |
| Copy tune labels and scenario text | Pitch/backend | 30m | Platoon-leader language, no generic dashboard copy |

Target P0 build time: ~7.5h including integration slack.

---

## 4. Screen Layout

Prioritize the first visual impression:

- Center: Raven Gap COP panel.
- Left: mesh hierarchy and connection/demo controls.
- Bottom or center-adjacent: raw event feed.
- Right: commander SITREP, delta, and stats.
- Drawer/overlay: evidence/provenance detail.

The map must not require live tiles, GPS, or a geospatial library. It can be a styled div/SVG/canvas-like HTML panel with fixed coordinates.

---

## 5. Demo Storyboard

| Time | Action | On screen |
|---|---|---|
| 0:35-0:40 | Click Replay Scenario | Mesh hierarchy, empty feed, Raven Gap COP |
| 0:40-0:55 | Watch reports arrive | Feed fills; map markers pulse; leaf nodes light up |
| 0:55-1:10 | Squad summaries appear | Raw rows group into 3 squad summaries; map clusters resolve |
| 1:10-1:25 | Commander SITREP appears | SITREP + delta + risk overlay |
| 1:25-1:35 | Click SITREP line | Evidence drawer opens; source rows highlight |
| 1:35-1:55 | Toggle degraded mode | Raw detail thins; shorter SITREP preserves recommendation |
| 1:55-2:05 | Hold final state | COP, hierarchy, feed, SITREP, delta, evidence visible |

Narration anchor:

> "TacNet does not push more data through a broken network. It turns battlefield traffic into tactical intent before it moves."

---

## 6. 18-Hour Schedule

| Hour | Goal | Exit criteria |
|---:|---|---|
| 0-1 | Boot and inspect dashboard | Server/browser/demo mode verified |
| 1-3 | Deterministic Raven Gap replay | Replay button advances fixed events |
| 1-3 | Static COP visual scaffold | Map panel and markers visible |
| 3-6 | Compaction, delta, evidence wiring | Clickable provenance works |
| 6-8 | Degraded mode + COP state wiring | Bandwidth beat visible |
| 8-10 | Full 90-second integration gate | Demo runs end to end without manual repair |
| 10-12 | Visual polish and projector readability | Text, markers, and panels readable at 110% |
| 12-14 | Rehearsal fixes | Three clean live runs |
| 14-15 | Backup video | MP4 captured from a clean run |
| 15-16.5 | Submission package | Devpost assets ready |
| 16.5-18 | Final rehearsal | Pitch lead can finish in 2:55-3:05 |

---

## 7. Hard Cuts

Do not build these during the hackathon:

- BLE scanning or live phone data path.
- MeshNode protocol integration.
- Real LoRa, ATAK, SDR, or encryption.
- Hosted LLM on the critical path.
- MapLibre/live basemap.
- Natural language query box.
- Reparenting visual.
- Multi-scenario toggle.
- Tailwind/shadcn migration.

---

## 8. Demo-Day Checklist

- [ ] Server running at `http://localhost:8080`.
- [ ] WebSocket status connected.
- [ ] Replay Scenario visible and tested.
- [ ] Static Raven Gap COP visible.
- [ ] Markers pulse on incoming reports.
- [ ] Bandwidth toggle starts in full-bandwidth state.
- [ ] Evidence click works.
- [ ] Browser zoom set to 110%.
- [ ] Notifications silenced.
- [ ] Backup video open and ready.

---

## 9. Ship Criteria

Ship this plan only when:

- The 90-second demo completes without console errors or visible dead states.
- The final screen tells the story without narration: map, hierarchy, feed, SITREP, delta, evidence.
- The degraded-mode beat is obvious to a viewer in the back of the room.
- The pitch lead can run three consecutive 3-minute rehearsals cleanly.
