# TacNet Edge — Sentinel Forge Hackathon Plan

**Date:** 2026-05-02
**Status:** Active implementation path
**Build shell:** `../sentinel-forge/`
**Shared timing baseline:** `docs/demo-script-v1.md`
**Demo script:** `docs/branch-b-sentinel-forge-demo-script.md`
**Pitch window:** 3:00 total, ~1:30 live demo

This plan adapts Sentinel Forge into a TacNet Edge demo for Raven Gap, a fictional contested border valley/corridor. The goal is a polished browser-based command view that uses the existing FastAPI pipeline, React dashboard, and MapLibre surface to show tactical semantic compression under EW degradation: SATCOM denied and tactical radio intermittent.

**Branch lock:** Locked at Hour 1. Do not switch implementation paths mid-build.

---

## 1. Demo Promise

TacNet Edge is grounded in public U.S. Army doctrine: infantry platoon organization from ATP 3-21.8, mission-command framing from ADP 6-0, intelligence preparation concepts from ATP 2-01.3, and field-report brevity from the Ranger Handbook.

By rehearsal, the live screen must show:

- Raven Gap map/COP with MGRS grid, unit icons, NAIs, phase line, checkpoints, friendly, small UAS, JLTV support vehicle, OP/LP sensor, contact, and risk-zone markers.
- Scripted edge traffic from 3 rifle squads, 1 weapons squad, an attached JLTV support vehicle, a small UAS team/RQ-11-class UAS, and an unattended ground sensor or OP/LP sensor.
- Mesh hierarchy showing squad-level rollup.
- Compaction timeline showing SALUTE reports, ACE/LACE updates, UAS observations, sensor triggers, and PLI updates collapsing into squad summaries.
- Commander SITREP with "what changed" delta.
- Evidence drawer proving each SITREP line came from source reports.
- EW-degraded toggle that reduces source report detail while preserving the command picture.

The visual hook is the map. The product proof is the transition from noisy source reports to a compact, traceable commander SITREP.

Doctrine references for pitch/Q&A:

| Source | Demo use |
|---|---|
| [ATP 3-21.8 Infantry Rifle Platoon and Squad](https://rdl.train.army.mil/catalog-ws/view/100.ATSC/66D188F8-FA72-4BDD-9ABC-C9782A9F1654-1460473512157/ATP3_21x8wc1.pdf) | 3 rifle squads + 1 weapons squad, squad roles, platoon organization |
| [ATP 3-21.8 doctrine supplement](https://www.benning.army.mil/Infantry/DoctrineSupplement/ATP3-21.8/chapter_03/RoleoftheInfantry/Organization/index.html) | Quick public reference for rifle platoon/squad organization |
| [ADP 6-0 Mission Command](https://irp.fas.org/doddir/army/adp6_0.pdf) | Mission-command and commander decision framing |
| [FM 3-0 Operations](https://sof.news/publications/fm3-0-operations/) | Contested environment and multi-domain operations framing |
| [ATP 2-01.3 Intelligence Preparation of the Battlefield](https://home.army.mil/wood/application/files/8915/5751/8365/ATP_2-01.3_Intelligence_Preparation_of_the_Battlefield.pdf) | NAIs, threat patterning, operational environment, intelligence gaps |
| [TC 3-21.76 Ranger Handbook](https://www.benning.army.mil/Infantry/ARTB/4th-RTBn/content/pdf/TC%203-21.76%20Ranger%20Handbook.pdf) | Brevity, patrol language, troop-leading procedures, field-report tone |

---

## 2. Boot Test

Backend:

```bash
cd ../sentinel-forge/server
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --reload
# verify http://localhost:8000/state
```

Frontend:

```bash
cd ../sentinel-forge/client
npm install
npm run dev
```

Pass criteria:

- Backend starts and `/state` returns 200.
- Frontend loads without console errors.
- Existing scenario replay works end to end.
- Map panel renders markers/zones/tracks.
- UI is readable at 110% browser zoom from projector distance.

If map tiles fail, use a dark static/vector fallback inside the existing map panel. Do not debug tile networking during the pitch.

---

## 3. P0 Build Scope

| Work | Owner | Time | Deliverable |
|---|---|---:|---|
| Add Raven Gap scenario data | Backend | 1h | Rifle squad, weapons squad, JLTV support, UAS, OP/LP sensor reports as deterministic events |
| Add squad compaction rollup | Backend | 1.5h | Source reports grouped into 3 squad summaries |
| Add commander SITREP delta | Backend | 1h | "What changed" generated from successive state |
| Retarget map state to Raven Gap | Backend/frontend | 1.5h | MGRS grid, unit icons, NAIs, phase line, checkpoints, contacts, risk zones, routes |
| Add MeshTree component | Frontend | 1h | Command hierarchy visible and event-reactive |
| Add CompactionTimeline component | Frontend | 1h | Source reports visibly collapse into summaries |
| Add DegradedCommsToggle component | Frontend/backend | 1h | EW-degraded state reduces source detail; summary preserved |
| Add EvidenceDrawer component | Frontend | 1h | Click SITREP/summary line to show source reports |
| Relabel UI to TacNet vocabulary | Frontend | 1h | Incidents/signals become SITREP/reports/commander picture |

Target P0 build time: ~8-9h including integration slack.

---

## 4. Existing Surfaces To Reuse

Reuse these files and patterns:

- `server/app/main.py`
- `server/app/core/pipeline.py`
- `server/app/core/map.py`
- `server/app/state/store.py`
- `server/app/agent/router.py`
- `client/src/pages/Dashboard.tsx`
- `client/src/components/MapView.tsx`
- `client/src/components/LogStream.tsx`
- `client/src/components/IncidentCard.tsx`
- `client/src/hooks/useSimulation.ts`
- `client/src/styles/map.css`
- `client/src/styles/dashboard.css`

Avoid broad renames in backend contracts. Change display copy first; only change data model names where the UI cannot be made clear otherwise.

---

## 5. Screen Layout

Prioritize the map and commander picture:

- Center: Raven Gap map/COP with MGRS grid, unit icons, NAIs, phase line, and checkpoints.
- Left or top-left: source report stream.
- Left or top: mesh hierarchy.
- Bottom: compaction timeline.
- Right: commander SITREP, delta, recommended action.
- Drawer/modal: evidence/provenance detail.

Keep cards dense and readable. This is an operational command view, not a landing page.

---

## 6. Demo Storyboard

| Time | Action | On screen |
|---|---|---|
| 0:35-0:40 | Click Replay Scenario | Raven Gap COP, MGRS grid, mesh hierarchy, empty feed |
| 0:40-0:55 | Watch reports arrive | Map markers pulse; SALUTE/ACE/LACE/UAS/sensor/PLI reports stream in |
| 0:55-1:10 | Compaction timeline updates | ~12 source reports collapse into 3 squad summaries |
| 1:10-1:25 | Commander SITREP appears | Delta highlights new risk and collection recommendation |
| 1:25-1:35 | Click SITREP line | Evidence drawer shows contributing reports |
| 1:35-1:55 | Toggle EW-degraded mode | SATCOM denied/radio intermittent; fewer source details; shorter SITREP preserves the picture |
| 1:55-2:05 | Hold final state | Map, hierarchy, timeline, SITREP, delta, evidence visible |

Narration anchor:

> "TacNet keeps the commander picture alive by compressing edge reports into intent before the network collapses."

---

## 7. 18-Hour Schedule

| Hour | Goal | Exit criteria |
|---:|---|---|
| 0-1 | Boot backend/frontend/map | Existing scenario replays; map renders |
| 1-3 | Raven Gap scenario + map state | Deterministic doctrinal reports visible on map |
| 3-5 | Squad compaction + SITREP delta | Backend emits summaries and changed-state fields |
| 5-7 | MeshTree, CompactionTimeline, EvidenceDrawer | Components visible and connected to state |
| 7-9 | EW degradation behavior | Toggle visibly changes feed/map/SITREP |
| 9-10 | Full 90-second integration gate | Demo runs end to end |
| 10-12 | Copy, layout, projector polish | Readable command view at 110% |
| 12-14 | Rehearsal fixes | Three clean live runs |
| 14-15 | Backup video | MP4 captured from a clean run |
| 15-16.5 | Submission package | Devpost assets ready |
| 16.5-18 | Final rehearsal | Pitch lead can finish in 2:55-3:05 |

---

## 8. Hard Cuts

Do not build these during the hackathon:

- Real BLE, LoRa, ATAK, SDR, or encryption.
- Real iOS/on-device model integration.
- Backend-wide terminology migration.
- Multi-scenario toggle.
- Natural language query box.
- Belief lifecycle state machine.
- Reparenting visual.
- Hosted LLM dependency for the live demo.
- Full design-system migration.

---

## 9. Demo-Day Checklist

- [ ] Backend running at `http://localhost:8000`.
- [ ] Frontend running at known Vite URL.
- [ ] `/state` returns current Raven Gap state.
- [ ] Replay Scenario visible and tested.
- [ ] Map renders or static fallback is active.
- [ ] Static fallback styling tested with network disabled in DevTools; map still reads as a tactical surface with MGRS grid, NAIs, phase line, and checkpoints.
- [ ] Mesh hierarchy visible.
- [ ] Compaction timeline visible.
- [ ] EW-degraded toggle starts off.
- [ ] Evidence drawer works.
- [ ] Browser zoom set to 110%.
- [ ] Notifications silenced.
- [ ] Backup video open and ready.

---

## 10. Ship Criteria

Ship this plan only when:

- The 90-second demo completes without console errors or failed API calls.
- The map immediately reads as a tactical command picture, not a generic basemap.
- The compaction timeline is understandable without explanation.
- The degraded-mode beat visibly preserves the commander picture.
- The pitch lead can run three consecutive 3-minute rehearsals cleanly.
