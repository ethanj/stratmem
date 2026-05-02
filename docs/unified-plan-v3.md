# TacNet Hackathon — Unified Plan (v3)

**Date:** 2026-05-02
**Supersedes:** `docs/unified-plan-v2.md` (which superseded v1).
**Driver:** Codex review of v2 (3-minute pitch constraint + OLD CODE dashboard discovery).

This version is **stricter and shorter** than v2. The 3-minute constraint and the existence of a TacNet-shaped artifact in `voice-agents-hack/OLD CODE/dashboard/` together change the leading edge of the build plan. v2 stays in tree as historical reference.

---

## TL;DR

> **Build the smallest TacNet-shaped demo that the 90-second pitch window can show.** Hour 0–1 is a boot-test gate that picks one of two branches:
>
> - **Branch A (preferred):** OLD CODE dashboard as the demo shell. Tune it to Raven Gap; add bandwidth degradation + provenance click + SITREP-delta highlight.
> - **Branch B (fallback):** Sentinel Forge backend + reskin per v2. Used only if Branch A fails the gate.
>
> Either branch ships the same 90-second demo (`docs/demo-script-v1.md`). Build effort to demo-ready is similar (~4–6 hours of tuning either way), so the gate is decided on **what boots cleanly and looks credible at projector zoom in the first hour**, not on theoretical superiority.

---

## 1. The Hour-0 boot test (the gate)

This is non-optional. Two engineers, one hour, parallel work:

### A) Boot OLD dashboard

The OLD dashboard lives in a sibling repo. From this repo's root:

```bash
cd "../voice-agents-hack/OLD CODE/dashboard"
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt   # bleak, websockets, aiohttp
.venv/bin/python server.py
# open http://localhost:8080
# click "Demo Mode"
```

Use the venv invocation, not bare `python`/`pip`. macOS aliases `python` to system Python in surprising places, and `pip install` outside a venv risks polluting the system environment or hitting `externally-managed-environment` errors on newer macOS Python.

Pass criteria for Branch A:
- Server starts without crashing on macOS.
- Browser dashboard renders — hierarchy panel, live feed, demo-mode toggle.
- Demo mode emits messages on the timer; hierarchy populates; compaction summaries appear.
- At projector zoom (110% browser zoom, 2 m viewing distance), the dashboard looks intentional, not WIP.

**Known asset gap:** the `index.html` references `tecnet.mp4` for a cinematic landing overlay, but the file is not in the repo. This does not affect pass/fail — if the video element fails to load, the dashboard still renders. Either skip the landing overlay (comment out the `<div class="landing">` block) or substitute a static image. **Do not block the boot test on this.**

If any of the four pass criteria fail, we go to Branch B.

### B) Verify Sentinel Forge boots
```bash
cd ../sentinel-forge/server
# follow existing README / requirements
uvicorn app.main:app --reload
# in parallel:
cd ../client
npm install && npm run dev
```

Pass criteria for Branch B (always run regardless — this is the safety net):
- Backend starts; `/state` returns 200.
- Frontend loads; existing `coordinated_intrusion` scenario replays end-to-end.

### Decision rule

| Branch A | Branch B | Decision |
|---|---|---|
| Pass | Pass | **Branch A.** OLD dashboard is closer to TacNet-shaped. |
| Pass | Fail | **Branch A.** |
| Fail | Pass | **Branch B.** |
| Fail | Fail | Escalate to team. We have a problem. Either fix one or rewrite from scratch (not recommended in 18h). |

Decision must be locked by Hour 1:00. **Do not let this drift.**

---

## 2. Demo contract (shared by both branches)

The demo is fixed regardless of shell. Detailed in `docs/demo-script-v1.md`. The build target for either branch is to make this storyboard executable in 90 seconds:

| Beat | What's on screen |
|---|---|
| 0:00–0:05 | Press Replay → mesh hierarchy visible, empty event stream |
| 0:05–0:20 | Raw reports flow in from squad/vehicle/drone/sensor |
| 0:20–0:35 | Compaction collapses ~12 raw → 3 squad summaries |
| 0:35–0:50 | Commander SITREP appears; "what changed" highlighted |
| 0:50–1:00 | Click one SITREP line → provenance/evidence visible |
| 1:00–1:20 | Toggle bandwidth-degraded → smaller summary, same picture |
| 1:20–1:30 | Hold final composed state |

**Map note:** the OLD dashboard has no tactical map; Sentinel Forge has maplibre. The 90-second demo is map-optional — if Branch B ships, the map sits as supporting visual context but is not narrated. If Branch A ships, no map is shown and no map is mentioned. The demo script reflects this.

That's the only demo we ship. Everything else is Q&A or backup video.

---

## 3. Branch A scope — OLD dashboard as shell (preferred)

### What we keep from `../voice-agents-hack/OLD CODE/dashboard/`

- The Python WebSocket server (`server.py`, ~470 lines)
- The HTML/CSS/JS dashboard (`index.html`, `app.js`, `styles.css`, ~1,300 lines combined)
- Demo mode infrastructure (toggle, fake hierarchy, transcript/compaction generator)
- The cinematic landing overlay if `tecnet.mp4` is restored or replaced — otherwise comment it out (see §1 known asset gap)

### What we change (P0)

| Change | Effort | Why |
|---|---|---|
| Replace `DEMO_TRANSCRIPTS` and `DEMO_COMPACTIONS` with **deterministic Raven Gap script** | ~1h | Random rotation looks like a screensaver; deterministic looks like a system. |
| Replace random timing with **stepped replay** (Replay button advances script one event at a time, with auto-advance toggle) | ~1h | Pitch lead needs to control pace; auto-advance is for backup video |
| Add **bandwidth-degraded toggle** that gray-outs ~half the events and shrinks compactions | ~1h | This is the hero beat at 1:00 |
| Add **provenance highlight** — clicking a compaction highlights its source raw events | ~1h | The 0:50 beat |
| Add **"what changed since last SITREP"** delta line to compactions | ~1h | The 0:35–0:50 beat |
| Tune copy / labels to platoon-leader vocabulary | ~30m | Drop generic "tactical" framing |

**Total P0 tuning: ~5.5 hours.** All in Python + vanilla JS — no React, no shadcn, no migration. Deterministic compaction text is generated by the Raven Gap script (handcrafted per beat); no LLM is on the critical path.

### What we add only if P0 is stable (stretch)

| Change | Effort | Why deferred |
|---|---|---|
| Hosted LLM call for the final commander SITREP, with deterministic-script fallback | ~1h | Polish only. The pre-written compaction text is already credible at the 1-second read time judges spend on it. Adding a hosted LLM introduces a network dependency and a latency surface that the demo does not need to take on. Wire it only if the rest of the demo is locked. |
| Cinematic landing overlay restoration (sourcing or re-creating `tecnet.mp4`) | variable | Production polish only. Never block on this. |

### What we cut from Branch A

- BLE scanning entirely. Demo mode + scripted events only. The `connect_to_peer` / `BleakScanner` paths are orphaned; we don't use them.
- Tree-config characteristic. Hierarchy is hard-coded in the demo script.
- All MeshNode integration. Phones are not in the data path.

---

## 4. Branch B scope — Sentinel Forge backend (fallback)

Per `unified-plan-v2.md` §3, but with the codex 3-minute cuts applied:

### Keep
- FastAPI pipeline, fusion scoring, scenario engine, agent router with heuristic fallback
- React + Vite frontend, MapView (with offline tile cache), LogStream, useSimulation
- Mitigation feedback loop (used in Q&A talking points only)

### Add (P0 for 90s demo)
- `server/app/scenarios/raven_gap.py` — replaces `coordinated_intrusion` as default
- `server/app/compaction/squad_rollup.py` — Python deterministic
- `server/app/sitrep/delta.py` — diff successive correlations
- `agent/prompts.py` — `soul.md`-derived rules (per `unified-plan-v2.md` §C)
- New React components: `MeshTree.tsx`, `SitrepDeltaPanel.tsx`, `CompactionTimeline.tsx`, `BandwidthToggle.tsx`, `EvidenceDrawer.tsx`

### UI relabel (no rename)
- Display copy: "Sentinel Forge" / "incident" → "TacNet Edge" / "SITREP" / "Commander Situation."
- Backend field names stay `incident`. Confirmed in v2.

**Total Branch B effort: ~6–8 hours of tuning.** Comparable to Branch A; slightly more code-mass, slightly more known surface.

---

## 5. Hard cut list (both branches)

Codex's recommended cuts, ratified:

| Cut | Where it goes |
|---|---|
| Reparenting visual | Q&A only |
| Belief lifecycle (ACTIVE/WEAKENED/SUPERSEDED) | Q&A; SITREP delta carries the "what changed" load |
| Cyber scenario toggle | Q&A; mention as "the same pipeline runs cyber-physical fusion" |
| Tailwind / shadcn migration | Skip entirely |
| LLM streaming animation | Brief just appears |
| Asset heartbeat state machine (GREEN/AMBER/RED) | Cosmetic only |
| Live MeshNode bridge (Option A in `meshnode-integration.md`) | Cut — confirmed in `meshnode-integration.md` |
| Two parallel demos in the live pitch | Cut — backup video only |
| NL query box | Q&A; "next feature" |
| Compression-ratio chart | Verbal: "summaries are 5–10% the size of raw" |

If a P0 feature is not in the 90-second demo, it is not P0. Period.

---

## 6. 18-hour schedule

Hour 1 is the branch point. Schedules below assume the gate has been passed.

### Both branches share Hour 0–1

| Hour | Owner | Goal | Deliverable |
|---:|---|---|---|
| 0–1 | All | Boot test + branch decision | Branch A or B locked; everyone aligned |

### Branch A schedule (preferred)

| Hour | Owner | Goal | Deliverable |
|---:|---|---|---|
| 1–3 | Backend lead | Replace `demo_loop()` with deterministic Raven Gap script + handcrafted compaction text | Script-driven replay; Replay button advances one event |
| 1–3 | Frontend lead | Bandwidth toggle + provenance highlight scaffolding | Visible UI controls, even if not yet wired |
| 3–6 | Both | Wire compaction grouping, SITREP delta, evidence-source linking | Click compaction → source events highlight |
| 6–8 | All | Copy tune; verify deterministic SITREP looks credible at projector zoom | Demo runs end-to-end on script-only output, no LLM yet |
| 8–10 | All | **Hour-10 integration gate** — full 90s flow runs end-to-end |
| 10–12 | All | Polish: contrast, layout, readability; rehearse with pitch lead | Looks intentional at 110% zoom |
| 12–13 | Backend lead | **(Stretch)** Optional hosted LLM brief, with the existing deterministic text as fallback | Wired only if everything else is locked |
| 13–14 | All | Bug fixes; full pitches | Three back-to-back full pitches |
| 14–15 | All | **Backup video** | MP4 saved |
| 15–16.5 | All | Submission package | Devpost-ready |
| 16.5–18 | All | Final rehearsal | Three clean runs |

### Branch B schedule (fallback)

Per `unified-plan-v2.md` §5. Already validated; same 90s demo target; ~6–8 hours of new development.

---

## 7. What the demo doesn't need (and the build doesn't either)

This is the "do not build, even if proposed" list, tightened:

- ❌ Real BLE / LoRa / SDR / FHSS / ATAK plugin / Android port
- ❌ Squad (Steam game) integration
- ❌ S2 burst-sync uplink
- ❌ Real on-device STT / Gemma (hosted LLM is fine)
- ❌ Real AES-256 / dongle / PIN-derived crypto
- ❌ Auto-promotion / pre-sealed succession envelopes
- ❌ Heartbeat state machine
- ❌ Live audio recording
- ❌ Kill-chain, targeting, weapons logic
- ❌ Backend rename (`incident → sitrep`) — UI relabel only (Branch B)
- ❌ Belief lifecycle — replaced by SITREP delta
- ❌ MeshNode live integration — confirmed in `meshnode-integration.md`

---

## 8. Pitch alignment

Per `docs/demo-script-v1.md`. v3 doesn't change the script — both branches execute the same 90-second storyboard.

The two phrases judges should remember:
- **"Semantic compression over a tactical mesh."**
- **"C2 that degrades gracefully instead of going blind."**

Pitch-time A/B fork (MeshNode prop vs on-device framing sentence) — defaults to **B** (framing sentence), per demo script §3.

---

## 9. Open team decisions — priority ordered (v3)

| # | Question | Default | Who decides |
|---|---|---|---|
| 1 | Ratify "TacNet Edge" as project name | **Yes** | yifu |
| 2 | Run Hour-0 boot test on both branches in parallel | **Yes** | All |
| 3 | If both pass, prefer Branch A | **Yes** | All |
| 4 | Hosted LLM (OpenAI) for Branch A's commander brief | **OpenAI** | ML lead |
| 5 | Pitch-time decision A vs B | **B** (framing sentence) | Pitch lead |
| 6 | Backup video produced by Hour 14 | **Yes — non-negotiable** | All |
| 7 | If Branch A boot fails, do we attempt Branch B without further debate | **Yes** | All |
| 8 | If Branch A succeeds at Hour 1 but blocks at Hour 8, do we abandon to Branch B | **No.** Branch B is a one-way gate; if we ship Branch A, we ship it. | All |

**Rule:** decisions 7 and 8 are critical — they prevent the team from oscillating between branches mid-build, which is the easiest way to lose the hackathon.

---

## 10. Doc roles — current state

| Doc | Role |
|---|---|
| `docs/unified-plan-v3.md` (this) | **Canonical hackathon spec.** |
| `docs/demo-script-v1.md` | Canonical pitch / demo storyboard. Branch-agnostic. |
| `docs/unified-plan-v2.md` | Historical — Branch B reference scope. |
| `docs/unified-plan.md` (v1) | Historical — superseded. |
| `docs/meshnode-integration.md` | Decision doc: A/B/C options on MeshNode (live integration cut). |
| `docs/tacnet-pivot-analysis.md` | Reference: original pivot reasoning. |
| `tacnet/HACKATHON_README.md` | Long-term hackathon vision; not a build target. |
| `tacnet/pitch deck/*` | Pitch deck for after the demo. |
| `tacnet/strategy/*`, `tacnet/product/*`, etc. | Long-term company vision. Pitch language source. |

**Single rule:** scope changes go to v3 (this doc). Demo-flow changes go to `demo-script-v1.md`. Vision/pitch ideas go to `tacnet/`.

---

## 11. Risks specific to this version

| Risk | Mitigation |
|---|---|
| Branch A boot fails for unexpected reasons (Python deps, BLE permissions, missing `tecnet.mp4`) | Branch B runs in parallel during the gate so we always have a path |
| Branch A code is "vibe-coded" and a bug surfaces during rehearsal | Hour-10 integration gate catches it; fallback to backup video at the demo |
| Team oscillates between branches mid-build | Decision 8 in §9: branch lock at Hour 1 is one-way |
| Sentinel Forge code feels like dead weight after Branch A is chosen | It is. Don't try to integrate. Leave it untouched in `../sentinel-forge/`. |
| MeshNode setup attempts steal hours during the build | Already cut in `meshnode-integration.md`. If anyone starts building Cactus, stop them. |

---

## 12. Closing

The team has, within walking distance of this repo:
- A working backend pipeline (Sentinel Forge)
- A working TacNet-shaped dashboard (OLD CODE)
- A working iOS mesh app (MeshNode)
- A coherent vision (TacNet)
- A doctrine corpus (`soul.md`, Ranger Handbook)
- A 3-minute demo budget

v3 picks the artifact that's already closest to the demo we want to give. **Branch A if it boots. Branch B if it doesn't. Decide in Hour 1 and don't oscillate.**

If the team ratifies, two engineers run the boot test in parallel at Hour 0 and the rest of the schedule kicks off at Hour 1.
