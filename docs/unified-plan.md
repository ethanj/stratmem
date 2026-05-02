# TacNet Hackathon — Unified Plan

**Date:** 2026-05-02
**Purpose:** Reconcile the six parallel strategy/vision documents, name what we're shipping, and lock in the team decisions that need to be made before code starts.

---

## TL;DR — what we're shipping

> **TacNet Edge** — a platoon-leader micro-C2 console that demonstrates **AI-compacted mesh communications under comms degradation.** Browser-based simulator running on Sentinel Forge's existing backend, rebranded and extended with a belief / "what changed" layer. Optional iPhone running MeshNode as a hardware prop in the pitch.

This is **Phase 0** of the long-term TacNet vision (yifu's pitch deck, slides 1–6, 15). It is not the full Two-Zone architecture in `HACKATHON_README.md`, and it is not a Sentinel Forge SOC dashboard. The pitch ends by gesturing at the long-term vision; the demo proves the smallest loop.

---

## 1. The doc landscape — what each doc is, what it's good for

We currently have six docs setting strategy or scope. They mostly agree, but they sit at different altitudes and a few contradict each other. This is the canonical map going forward:

| Doc | Altitude | Role going forward |
|---|---|---|
| `tacnet/pitch deck/pitch deck.md` | **Company vision** — investor-facing | **Pitch deck for after the demo.** Slides 1–6 + 15 are what we'll riff off in the 3-min pitch. Slides 7–14 are pitch-only (market sizing, competition, valuations). Don't try to demo any of slides 7–14. |
| `tacnet/strategy/*` + `tacnet/product/*` + `tacnet/market/*` + `tacnet/business/*` | **Long-term company vision** — TacNet as primary C2 OS for platoon/company under EW | **Reference, not build target.** These describe Year 1+ TacNet. Use them for pitch language, doctrine, and "what we'd build next" in Q&A. They are not the hackathon. |
| `tacnet/HACKATHON_README.md` | **Maximalist hackathon scope** — Two-Zone, Field Mesh + S2 Uplink, Squad-game viz, ATAK plugin, LoRa, dongles | **Aspirational.** This is closer to a 6-month build than 18 hours. Use its glossary, heartbeat protocol, and security model for pitch flavor. **Do not try to build all of it.** Specific cuts in §4. |
| `docs/tacnet-pivot-analysis.md` | **Scoped hackathon plan** — frontend-only React simulator, deterministic compaction, 18-hour budget | **The closest thing we have to the right scope.** Treat as the canonical hackathon spec. |
| `docs/sentinel-forge-deep-dive.md` | **Existing codebase audit** — what's already built in `../sentinel-forge` | **Canonical for what we're starting from.** ~80% of the backend we need already exists; we extend rather than rebuild. |
| `docs/meshnode-integration.md` | **Optional hardware prop decision** — A/B/C options for the `../voice-agents-hack/AryaaBluetoothMesh` iOS app | **Decision pending.** Default to Option B (steal `soul.md`). Add Option C if any teammate has phones built today. |

**One-line rule for the team:** if a new strategy idea pops up, ask "does this go in pitch deck (yifu's), or does it cost build hours?" If the latter, it has to displace something already in `tacnet-pivot-analysis.md`.

---

## 2. Tensions across the docs — and how we resolve them

These are the contradictions that have been wasting team cycles:

| # | Tension | Side A | Side B | **Resolution** |
|---|---|---|---|---|
| 1 | **Domain framing** | Sentinel Forge: cyber-physical SOC, "coordinated intrusion" | TacNet: military mission C2, EW degradation | **TacNet wins.** xTech rewards military fit (30% weight); judges have seen 100 SOC dashboards. Drop the cyber/intrusion language from any judge-facing surface. Keep cyber as a *secondary scenario toggle* if time allows. |
| 2 | **Build target** | Real BLE / iOS / Cactus / LoRa / ATAK | Browser-based simulator | **Browser simulator.** `HACKATHON_README.md` proposes hardware that we cannot ship in 18h. The simulator is what wins the demo. iPhone is a *prop*, not part of the data path. |
| 3 | **Reuse Sentinel Forge?** | Yes — 80% of backend is done | No — wrong domain, throw away | **Yes, but rebrand and re-narrate.** Keep the FastAPI pipeline, fusion scoring, scenario engine, mitigation loop, agent router. Replace the frontend visual layer. Rename `incident` → `commander_situation`, signals stay (they're already domain-tagged). |
| 4 | **Frontend stack** | React + Tailwind + shadcn (the original STRATMEM pick) | Keep Sentinel Forge's hand-rolled CSS as-is | **Add Tailwind + shadcn + Motion.** Sentinel Forge's existing components stay, but get re-skinned. Visual polish is the gap; this closes it. |
| 5 | **Map** | Real maplibre (Sentinel Forge already has it) | SVG tactical board (STRATMEM plan said) | **Keep maplibre.** Already works, looks credible, supports geospatial events the scenarios already emit. |
| 6 | **AI source** | Cloud LLM (OpenAI / Gemini) | On-device (Gemma via Cactus) | **Cloud LLM with heuristic fallback for the demo.** The agent router (`agent/router.py`) already does this. On-device is a *talking point* in the pitch, not the demo path. |
| 7 | **Compaction logic** | LLM-driven | Deterministic rules | **Deterministic rules drive belief / SITREP state. LLM only writes the prose brief.** This is exactly the principle from the STRATMEM plan and from `pivot-analysis.md`. The state machine cannot fail because of an API. |
| 8 | **Scenario** | Sentinel Forge's `coordinated_intrusion` (cyber + drone + AIS) | STRATMEM's `Route Blue` convoy | New: **`Raven Gap`** from `pivot-analysis.md` (platoon under EW degradation). It's already structured as the right scope and uses the right doctrine vocabulary. |
| 9 | **Project name** | "STRATMEM Lite" | "Sentinel Forge" | **TacNet Edge.** Matches yifu's company branding, matches the repo, matches the deck. Drop the other two names from anything judge-facing. |
| 10 | **What is the user role?** | SOC operator / staff officer / drone analyst | Platoon leader | **Platoon leader.** Single user role, single demo path. `pivot-analysis.md` is right on this. |

---

## 3. The unified scope — what TacNet Edge actually is

### One-line definition

> TacNet Edge transforms raw squad voice and asset telemetry into a low-bandwidth commander SITREP and a local Common Operating Picture, even when satellite and cloud reach-back are unavailable.

### Demo contract

Press **Replay Scenario** → 12 events arrive across a simulated platoon mesh under EW degradation → squad leaders compact child reports → commander sees a SITREP with evidence trace and "what changed since last SITREP" → commander asks "Which element needs support first?" → system answers from local state, citing evidence.

### What's in (P0)

| Feature | Source | Status |
|---|---|---|
| Scenario replay engine | Sentinel Forge `core/scenario.py`, replace events | **Mostly built** — replace event list |
| Mesh tree visualization (PL → SL × 3 → P × 9 + V1 + D1 + S7) | New | **Build** — single React component |
| Local COP map | Sentinel Forge `core/map.py` + `MapView.tsx` | **Mostly built** — re-tune zones to convoy AO |
| Raw event stream | Sentinel Forge `LogStream.tsx` | **Built** |
| Squad-level compaction (deterministic) | New | **Build** — pure TS function |
| Commander SITREP panel | Sentinel Forge `IncidentCard.tsx` | **Re-skin** + rename incident → SITREP |
| Belief / "what changed" panel | New (steals STRATMEM lifecycle concept) | **Build** — uses Sentinel Forge fusion `history` |
| Evidence trace | New, on top of Sentinel Forge `evidence_ids` | **Build** — drawer that shows raw events |
| Bandwidth degradation mode | New — toggle that drops half the events | **Build** — 30 lines |
| Reparenting visual | New — 1 squad leader timeout | **Build** — affects mesh tree only |
| LLM commander brief with `soul.md` doctrine | Sentinel Forge `agent/` + MeshNode `soul.md` | **Wire up** — replace prompt |
| Reset and replay | Sentinel Forge | **Built** |

### What's in (P1, build only after P0 is stable)

- Constrained natural-language query box ("Which element needs support first?")
- Compression-ratio chart (bytes raw vs bytes after compaction)
- Cyber scenario toggle (re-uses Sentinel Forge's existing `coordinated_intrusion`) — only as a "this generalizes" beat
- MeshNode iPhone as live demo prop (Option C from `meshnode-integration.md`)

### What's out (we don't build, even if proposed)

The full HACKATHON_README's Two-Zone + S2 + Squad-game + LoRa + ATAK + dongle scope is **out**. Specifically:

- ❌ Real BLE mesh
- ❌ Real LoRa / SDR / FHSS
- ❌ ATAK plugin / Android port
- ❌ Squad (Steam game) integration
- ❌ S2 burst-sync uplink (the Zone B half of HACKATHON_README)
- ❌ Real on-device STT / Gemma (cloud LLM is fine for demo)
- ❌ Real AES-256 / dongle / PIN-derived crypto (use TLS via FastAPI, mention crypto in pitch)
- ❌ Auto-promotion / pre-sealed succession envelopes (visual reparent only)
- ❌ Heartbeat state machine (GREEN/AMBER/RED can be cosmetic on the asset panel)
- ❌ Live audio recording (pre-recorded events)
- ❌ Kill-chain, targeting, weapons logic (out for legal + xTech reasons)

Each of these is a defensible Phase 1+ talking point. **None of them is the hackathon.**

---

## 4. Architecture

### Single diagram, replaces all previous architecture diagrams for hackathon purposes

```
┌─────────────────── Frontend (Vite + React + shadcn) ───────────────────┐
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ Mesh Tree    │  │ Local COP    │  │ Commander SITREP            │  │
│  │ (D3 / SVG)   │  │ (maplibre)   │  │ + What-Changed panel        │  │
│  └──────────────┘  └──────────────┘  │ + Evidence drawer           │  │
│                                       │ + NL query box (P1)         │  │
│  ┌──────────────────────────────┐   └─────────────────────────────┘  │
│  │ Raw Event Stream             │                                      │
│  │ + Compaction Timeline        │   ┌─────────────────────────────┐  │
│  └──────────────────────────────┘   │ Asset Status (heartbeat)    │  │
│                                       │ + Bandwidth degradation tgl │  │
│                                       └─────────────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     │ HTTP (existing endpoints)
                                     ▼
┌──────────────────────── Backend (FastAPI, existing) ──────────────────────┐
│                                                                            │
│  /scenario/select   /simulate/start   /simulate/step   /state              │
│  /agent/analyze     /incident/action  (rename: /sitrep/action)             │
│                                                                            │
│  ┌─────────────────── core/pipeline.py ───────────────────────┐          │
│  │  events → normalize → detect → compact → fuse → SITREP    │          │
│  └────────────────────────────────────────────────────────────┘          │
│                                                                            │
│  + NEW: server/app/compaction/ — deterministic squad-level rollup         │
│  + NEW: server/app/belief/ — lifecycle layer between detect & fuse        │
│                                                                            │
│  agent/ — heuristic → openai with soul.md prompt (existing router)        │
└────────────────────────────────────────────────────────────────────────────┘

[OPTIONAL] iPhone running MeshNode as a pitch prop, not in data path.
```

### What's new vs. what we keep

**Keep (rename only):**
- `core/pipeline.py`, `core/correlation.py`, `core/scenario.py`, `core/map.py`, `core/interpreter.py` (rename to `sitrep.py`)
- `fusion/scoring.py`, `fusion/correlator.py`
- `state/store.py`
- `agent/` (whole module — multi-provider router with heuristic fallback)
- `response/effects.py` (operator-action mitigation loop — a unique demo win)
- All API routes (rename `/incident/*` → `/sitrep/*`)
- `MapView.tsx`, `LogStream.tsx`, `useSimulation.ts`

**Add (small, well-scoped):**
- `server/app/compaction/squad_rollup.py` (~80 lines, deterministic)
- `server/app/belief/lifecycle.py` (~120 lines, ACTIVE/WEAKENED/SUPERSEDED + why_changed)
- `server/app/scenarios/raven_gap.py` (replaces `coordinated_intrusion` as default)
- `agent/prompts.py` — replace with `soul.md`-derived prompt
- New React components: `MeshTree.tsx`, `WhatChangedPanel.tsx`, `CompactionTimeline.tsx`, `BandwidthToggle.tsx`
- Tailwind + shadcn migration

**Cut:**
- `pipeline/process_pipeline.py` (orphaned earlier draft)
- `adapters/defender.py`, `adapters/siem.py` (stubs)

---

## 5. 18-hour build plan

This is the merged version of the schedules in `Tactical_STRATMEM_Lite_18h_Hackathon_Plan.md`, `tacnet-pivot-analysis.md`, and `sentinel-forge-deep-dive.md`. Locks once the team agrees.

| Hour | Owner | Goal | Deliverable / gate |
|---:|---|---|---|
| 0–1 | All | Lock scope, ratify this doc, freeze names | This doc signed off; everyone agrees on "TacNet Edge" |
| 1–3 | Backend lead | New scenario `raven_gap`, rename `incident → sitrep`, replace agent prompt with `soul.md`-derived | Scenario list shows Raven Gap as default; brief reads in Ranger register |
| 1–3 | Frontend lead | shadcn + Tailwind migration of existing components | Visual layer no longer hand-rolled CSS |
| 3–6 | Backend lead | `compaction/squad_rollup.py` (deterministic) + `belief/lifecycle.py` | Unit tests pass; existing pipeline still green |
| 3–6 | Frontend lead | `MeshTree.tsx` (mesh topology view) + `WhatChangedPanel.tsx` | Visible on dashboard; auto-updates on `/state` poll |
| 6–8 | Both | Wire belief lifecycle into pipeline + UI | Replay shows a belief transitioning ACTIVE → WEAKENED with why_changed text |
| 8–10 | All | **Day 1 integration gate** | End-to-end Raven Gap replay works, even rough |
| 10–12 | Frontend lead | Compaction timeline, bandwidth toggle, polish | All P0 panels populated |
| 10–12 | Backend lead | LLM commander brief streaming + heuristic fallback verification | Brief generates in <2s every replay |
| 12–13 | Pitch lead | 3-min pitch script, Q&A one-pager | Script rehearsed once |
| 13–14 | All | Evidence drawer + bug fixes | Click any belief or sitrep line → see raw events |
| 14–15 | All | **Backup video** (60–90s, screen recording of clean run) | MP4 saved, will play if live demo fails |
| 15–16.5 | All | Submission package: README, screenshots, deploy URL | Devpost-ready |
| 16.5–18 | All | Rehearse 3 clean runs; cut anything flaky | Three back-to-back successful demos |

### Day-1 gate at Hour 10

If by Hour 10 we don't have an end-to-end Raven Gap replay (even ugly), **cut all P1 work immediately and finish polishing P0**. This is the same hard rule the original STRATMEM plan had; it still applies.

---

## 6. Open team decisions — priority ordered

These need to be made by the team in the first hour. Listed in priority order; each has a default if nobody has a strong opinion.

| # | Question | Default if undecided | Who decides |
|---|---|---|---|
| 1 | Do we ratify "TacNet Edge" as the project name? | **Yes** — matches deck, repo, doc corpus | yifu (founder) |
| 2 | Do we keep the Sentinel Forge backend or rewrite? | **Keep + extend** — saves ~8 hours | Backend lead |
| 3 | Cloud LLM choice (OpenAI / Anthropic / Gemini) for the brief? | **OpenAI** — already wired in `agent/openai_agent.py` | ML lead |
| 4 | Do we use MeshNode iPhone as a pitch prop (Option C)? | **Yes if any teammate has it building today, otherwise no** | MeshNode owner |
| 5 | Do we attempt MeshNode live integration (Option A)? | **No** — risk too high for the demo | All |
| 6 | Cyber scenario as P1 secondary toggle? | **Yes** — already exists, near-zero cost | Backend lead |
| 7 | Pitch persona — do we lead with "platoon leader on Route Blue" or "platoon leader in Raven Gap"? | **Raven Gap** — matches `pivot-analysis.md` | Pitch lead |
| 8 | Backup video produced by Hour 14 — non-negotiable? | **Yes** — non-negotiable | All |

**Rule:** anything not on this list is locked by this doc. If it gets debated for >30 minutes during the build, escalate to ratify here, not in chat.

---

## 7. Pitch alignment

The 3-minute pitch in `pivot-analysis.md` is the working draft. Tweaks based on this synthesis:

1. **Open** with the Raven Gap problem (`why now` slide from yifu's deck — "the cloud is the casualty").
2. **Demo** TacNet Edge end-to-end (Replay → squad compaction → commander SITREP → "what changed" → query).
3. **Close** by gesturing at Phase 1+: "Today this runs in a browser. The same architecture runs on iPhones we have in the room (lift the prop), and tomorrow on ATAK tablets and LoRa radios over the warfighter's existing kit."
4. **Q&A prep** — pull from `tacnet/reference/natsec hackathon 3 assessment.md`. The honest framing there is the right register: we are the platoon-edge OS, not battalion S2 or kill-chain.

The two phrases judges should remember:

- **"Semantic compression over a tactical mesh."**
- **"C2 that degrades gracefully instead of going blind."**

---

## 8. Doc roles going forward

To stop the doc fragmentation:

| Doc | Role | Owner |
|---|---|---|
| `docs/unified-plan.md` (this) | **Canonical hackathon spec.** Updates only by team consensus. | Everyone |
| `docs/sentinel-forge-deep-dive.md` | Reference: what we inherit | — (frozen) |
| `docs/meshnode-integration.md` | Decision doc: A/B/C options | — (frozen until team decides) |
| `docs/tacnet-pivot-analysis.md` | Reference: original pivot reasoning | — (frozen) |
| `tacnet/HACKATHON_README.md` | **Long-term hackathon-vision deck**, not a build target | yifu |
| `tacnet/pitch deck/*` | **Pitch deck**, not a build target | yifu |
| `tacnet/strategy/*`, `tacnet/product/*`, etc. | **Long-term company vision**, used for pitch language only | yifu |

**Single rule:** if you have an idea that affects build scope, propose an edit to `docs/unified-plan.md` rather than starting a new doc. Strategy/vision ideas go to `tacnet/`. The boundary is: does this cost build hours? If yes → here. If no → tacnet/.

---

## 9. Risk register (additions to original plans)

| Risk | Trigger | Mitigation |
|---|---|---|
| Doc thrash continues | Someone proposes a new architecture in chat | Point them at this doc and §6 — escalate or stop |
| Team splits work along old doc lines | One person builds STRATMEM-style frontend while another builds HACKATHON_README mesh | Hour-1 sync, shared task board, this doc pinned |
| Sentinel Forge rebrand misses spots | Judges see "incident" or "Sentinel Forge" copy in the demo | Hour-13 grep for the old strings; replace |
| LLM brief contradicts doctrine prompt | Cloud LLM ignores `soul.md` rules (>20 words, hedging language) | Heuristic fallback already in `agent/router.py`; flip env var to force heuristic if needed |
| iPhone prop crashes mid-pitch | MeshNode runs out of battery / Gemma hangs | Don't depend on it for the data path; rehearse the pitch with prop *off* as the default |

---

## 10. Closing

The team has a strong codebase (Sentinel Forge), a strong vision (TacNet long-term), a strong scenario (Raven Gap), and a strong doctrine asset (`soul.md`). The only thing that can lose this hackathon now is **scope drift between competing visions**. This doc names one vision, points each existing doc at its role, and locks the build target.

If the team ratifies, **stop debating architecture and start cutting hour 1 of the schedule.**
