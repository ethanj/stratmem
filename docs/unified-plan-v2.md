# TacNet Hackathon — Unified Plan (v2)

**Date:** 2026-05-02
**Supersedes:** `docs/unified-plan.md` (v1)
**Purpose:** Reconcile the parallel strategy/vision documents, name what we're shipping, and lock in the team decisions that need to be made before code starts.

## Revision notes (v1 → v2)

v2 is a tightening pass driven by a Codex review of v1. Material changes:

| Change | Reason |
|---|---|
| **Removed broken reference to `docs/sentinel-forge-deep-dive.md`** | File was moved to `localdocs/` (gitignored) by the team; v1 cited it as canonical, so the citation no longer resolves. The audit content is summarized inline in §A. |
| **Dropped backend `incident → sitrep` rename from P0** | Renaming a domain object cascades through FastAPI routes, Pydantic models, client services, React props, tests, and agent context. It improves internal naming but does not improve the demo. **UI-only relabel** going forward: backend keeps `incident`, only display copy says "SITREP" / "Commander Situation." |
| **Demoted Tailwind + shadcn migration to conditional / P1** | The full migration plus a backend extension plus new UI panels is the same hour-budget as the core demo. Migration now only happens if a frontend owner can do it without blocking the rest of P0. |
| **Replaced "belief lifecycle" as P0 with "SITREP Delta + Evidence Trace"** | Codex was right: TacNet's clearer innovation is *semantic compression over a tactical mesh.* "What changed since last SITREP" + clickable evidence trace gets the same UX value with less novel state-machine code. Belief lifecycle moves to P1. |
| **Made compaction location unambiguous: Python on the backend** | v1 contradicted itself (P0 row said "pure TS function," architecture said `server/app/compaction/squad_rollup.py`). Pick one. Given backend reuse, it goes in Python. |
| **Added explicit "backend reuse vs frontend-only" justification** | Codex flagged that v1 committed to backend reuse but never argued it against `tacnet-pivot-analysis.md`'s frontend-only recommendation. The argument is now in §B. |
| **Added MapLibre tile-cache mitigation** | Carto-dark tiles need network. Venue Wi-Fi can fail. Mitigation: pre-cache tiles to a local sprite/MBTiles before pitch day, with a flat dark fallback. |
| **Narrowed `soul.md` usage to derived rules, not verbatim prompt** | `soul.md` is earpiece-relay tuned (≤18 words, refusal strings, hard stops). The Commander Brief is a prose dashboard widget. Derive the schemas (SALUTE / SITREP / ACE / LACE) and the no-fabrication rule; do not paste the file as a system prompt. |
| **Added explicit pitch framing for cloud LLM** | Demo uses hosted LLM for reliability; product runs on-device. Pitch must say this, or judges hear "cloud AI for denied comms" and the premise breaks. |

---

## TL;DR — what we're shipping

> **TacNet Edge** — a platoon-leader micro-C2 console that demonstrates **AI-compacted mesh communications under comms degradation.** Browser-based simulator backed by Sentinel Forge's existing FastAPI pipeline, extended with deterministic squad compaction and a SITREP-delta panel with evidence trace. Optional iPhone running MeshNode as a hardware prop in the pitch.

This is **Phase 0** of the long-term TacNet vision (yifu's pitch deck, slides 1–6, 15). It is not the full Two-Zone architecture in `HACKATHON_README.md`, and it is not a Sentinel Forge SOC dashboard. The pitch ends by gesturing at the long-term vision; the demo proves the smallest loop.

---

## 1. The doc landscape — what each doc is, what it's good for

We have several docs setting strategy or scope. They mostly agree, but they sit at different altitudes and a few contradict each other. This is the canonical map going forward:

| Doc | Altitude | Role going forward |
|---|---|---|
| `tacnet/pitch deck/pitch deck.md` | **Company vision** — investor-facing | **Pitch deck for after the demo.** Slides 1–6 + 15 are what we'll riff off in the 3-min pitch. Slides 7–14 are pitch-only (market sizing, competition, valuations). Don't try to demo any of slides 7–14. |
| `tacnet/strategy/*` + `tacnet/product/*` + `tacnet/market/*` + `tacnet/business/*` | **Long-term company vision** — TacNet as primary C2 OS for platoon/company under EW | **Reference, not build target.** These describe Year 1+ TacNet. Use them for pitch language, doctrine, and "what we'd build next" in Q&A. They are not the hackathon. |
| `tacnet/HACKATHON_README.md` | **Maximalist hackathon scope** — Two-Zone, Field Mesh + S2 Uplink, Squad-game viz, ATAK plugin, LoRa, dongles | **Aspirational.** This is closer to a 6-month build than 18 hours. Use its glossary, heartbeat protocol, and security model for pitch flavor. **Do not try to build all of it.** Specific cuts in §3. |
| `docs/tacnet-pivot-analysis.md` | **Scoped hackathon plan** — frontend-only React simulator, deterministic compaction, 18-hour budget | **The closest scope target.** v2 of this plan keeps backend reuse but adopts the rest of the pivot's scoping. |
| `docs/meshnode-integration.md` | **Optional hardware prop decision** — A/B/C options for `../voice-agents-hack/AryaaBluetoothMesh` | **Decision pending.** Default to Option B (steal `soul.md`-derived rules). Add Option C if any teammate has phones built today. |
| *(private)* `localdocs/sentinel-forge-deep-dive.md` | **Existing codebase audit** — what's already built in `../sentinel-forge` | **Personal reference, not committed.** Its key facts are summarized inline in §A so this doc remains self-contained. |

**One-line rule for the team:** if a new strategy idea pops up, ask "does this go in pitch deck (yifu's), or does it cost build hours?" If the latter, it has to displace something already in this doc.

---

## 2. Tensions across the docs — and how we resolve them

| # | Tension | Side A | Side B | **Resolution (v2)** |
|---|---|---|---|---|
| 1 | **Domain framing** | Sentinel Forge: cyber-physical SOC, "coordinated intrusion" | TacNet: military mission C2, EW degradation | **TacNet wins.** xTech rewards military fit (30% weight); judges have seen 100 SOC dashboards. Drop cyber/intrusion language from any judge-facing surface. Cyber stays as a *secondary scenario toggle* if time allows. |
| 2 | **Build target** | Real BLE / iOS / Cactus / LoRa / ATAK | Browser-based simulator | **Browser simulator.** `HACKATHON_README.md` proposes hardware that we cannot ship in 18h. The simulator is what wins the demo. iPhone is a *prop*, not part of the data path. |
| 3 | **Reuse Sentinel Forge backend?** | Yes — 80% of backend already exists | No — frontend-only React simulator (per `tacnet-pivot-analysis.md`) | **Yes — but no rename, no migration, no domain object changes.** See §B for the cost math. Keep backend field names internal (`incident`, `signals`, etc.); UI relabels only. |
| 4 | **Frontend stack** | Tailwind + shadcn migration | Keep Sentinel Forge's hand-rolled CSS as-is | **Conditional.** Migration only happens if a frontend owner picks it up *without blocking* the SITREP-delta + mesh-tree + compaction-timeline panels. If unsure, ship existing CSS plus tightened spacing/typography. |
| 5 | **Map** | Real maplibre (Sentinel Forge already has it) | SVG tactical board (STRATMEM plan said) | **Keep maplibre, with offline mitigation.** Pre-cache Carto-dark tiles for the AO before pitch day; ship a flat dark fallback if the map sprite fails. SVG fallback is small and easy if MapLibre breaks. |
| 6 | **AI source** | Cloud LLM (OpenAI / Gemini) | On-device (Gemma via Cactus) | **Cloud LLM with heuristic fallback for the demo.** Pitch must explicitly frame this: *"Demo uses hosted summarization for reliability; production architecture runs on-device."* See §7 for the script. |
| 7 | **Compaction logic** | LLM-driven | Deterministic rules | **Deterministic rules drive SITREP state. LLM only writes the prose brief.** State machine cannot fail because of an API. |
| 8 | **Compaction location** | Python (backend) | TypeScript (frontend) | **Python.** Lives in `server/app/compaction/squad_rollup.py`. Consistent with backend reuse. The frontend timeline panel is a pure renderer of backend state. |
| 9 | **Scenario** | Sentinel Forge's `coordinated_intrusion` (cyber + drone + AIS) | STRATMEM's `Route Blue` convoy | **`Raven Gap`** from `pivot-analysis.md` (platoon under EW degradation). Right scope, right vocabulary. |
| 10 | **Project name** | "STRATMEM Lite" | "Sentinel Forge" | **TacNet Edge.** Matches yifu's company branding, repo, and deck. Drop other names from anything judge-facing. |
| 11 | **What is the user role?** | SOC operator / staff officer / drone analyst | Platoon leader | **Platoon leader.** Single user role, single demo path. |
| 12 | **Lead innovation phrase** | "Belief lifecycle" | "Semantic compression over tactical mesh" | **"Semantic compression over tactical mesh"** is the hero line. SITREP delta + evidence trace is the visible feature; belief-state vocabulary moves to internal docs and Q&A only. |

---

## 3. The unified scope — what TacNet Edge actually is

### One-line definition

> TacNet Edge transforms raw squad voice and asset telemetry into a low-bandwidth commander SITREP and a local Common Operating Picture, even when satellite and cloud reach-back are unavailable.

### Demo contract

Press **Replay Scenario** → ~12 events arrive across a simulated platoon mesh under EW degradation → squad leaders compact child reports → commander sees a SITREP with **what changed since last SITREP** + clickable evidence trace → commander asks "Which element needs support first?" (P1) → system answers from local state, citing evidence.

### What's in (P0)

| Feature | Source | Status |
|---|---|---|
| Scenario replay engine | Sentinel Forge `core/scenario.py`, replace events | **Mostly built** — replace event list |
| Mesh tree visualization (PL → SL × 3 → P × 9 + V1 + D1 + S7) | New | **Build** — single React component |
| Local COP map (with offline-tile fallback) | Sentinel Forge `core/map.py` + `MapView.tsx` | **Mostly built** — re-tune zones to convoy AO; pre-cache tiles |
| Raw event stream | Sentinel Forge `LogStream.tsx` | **Built** |
| Squad-level compaction (deterministic) | New — Python | **Build** — `server/app/compaction/squad_rollup.py`, ~80 lines |
| Commander SITREP panel | Sentinel Forge `IncidentCard.tsx` | **Re-skin + UI relabel** — backend field stays `incident`, display copy says "SITREP" |
| **SITREP Delta panel** ("what changed") | New, on top of fusion `history` | **Build** — diff between successive SITREPs, plain-language summary |
| Evidence trace drawer | New, on top of Sentinel Forge `evidence_ids` | **Build** — click any SITREP line → see contributing raw events |
| Bandwidth degradation mode | New — toggle that drops half the events | **Build** — ~30 lines |
| Reparenting visual | New — 1 squad leader timeout | **Build** — affects mesh tree only, no auto-promotion logic |
| LLM commander brief with `soul.md`-derived rules | Sentinel Forge `agent/` + `soul.md` schemas | **Wire up** — derived prompt only (see §C) |
| Reset and replay | Sentinel Forge | **Built** |

### What's in (P1, build only after P0 is stable)

- Constrained natural-language query box ("Which element needs support first?")
- Compression-ratio chart (bytes raw vs bytes after compaction)
- **Belief lifecycle** (ACTIVE / WEAKENED / SUPERSEDED status with `why_changed`) — adds depth to the SITREP delta panel
- **Tailwind + shadcn migration** of existing components — only if a frontend owner can do it without blocking P0
- Cyber scenario toggle (re-uses Sentinel Forge's existing `coordinated_intrusion`) — only as a "this generalizes" beat
- MeshNode iPhone as live demo prop (Option C from `meshnode-integration.md`)

### What's out (we don't build, even if proposed)

- ❌ Backend rename (`incident → sitrep`, `/incident/* → /sitrep/*`, etc.) — UI relabel only
- ❌ Real BLE mesh / LoRa / SDR / FHSS
- ❌ ATAK plugin / Android port
- ❌ Squad (Steam game) integration
- ❌ S2 burst-sync uplink (Zone B half of HACKATHON_README)
- ❌ Real on-device STT / Gemma (cloud LLM is fine for demo)
- ❌ Real AES-256 / dongle / PIN-derived crypto (mention crypto in pitch)
- ❌ Auto-promotion / pre-sealed succession envelopes (visual reparent only)
- ❌ Heartbeat state machine (GREEN/AMBER/RED can be cosmetic on the asset panel)
- ❌ Live audio recording (pre-recorded events)
- ❌ Kill-chain, targeting, weapons logic (out for legal + xTech reasons)

Each of these is a defensible Phase 1+ talking point. **None of them is the hackathon.**

---

## 4. Architecture

```
┌─────────────────── Frontend (Vite + React + existing CSS) ───────────────────┐
│   shadcn/Tailwind migration is conditional/P1, not P0.                        │
│                                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────────┐         │
│  │ Mesh Tree    │  │ Local COP    │  │ Commander SITREP            │         │
│  │ (D3 / SVG)   │  │ (maplibre +  │  │ (relabeled IncidentCard)    │         │
│  │              │  │  cached      │  │ + SITREP Delta panel        │         │
│  │              │  │  tiles)      │  │ + Evidence drawer           │         │
│  └──────────────┘  └──────────────┘  │ + NL query box (P1)         │         │
│                                       └─────────────────────────────┘         │
│  ┌──────────────────────────────┐                                             │
│  │ Raw Event Stream             │     ┌─────────────────────────────┐         │
│  │ + Compaction Timeline        │     │ Asset Status (heartbeat)    │         │
│  └──────────────────────────────┘     │ + Bandwidth degradation tgl │         │
│                                       └─────────────────────────────┘         │
└─────────────────────────────────┬─────────────────────────────────────────────┘
                                  │
                                  │ HTTP (existing endpoints — no rename)
                                  ▼
┌──────────────────────── Backend (FastAPI, existing) ──────────────────────────┐
│                                                                                │
│  /scenario/select   /simulate/start   /simulate/step   /state                  │
│  /agent/analyze     /incident/action          ← name kept; UI label changes    │
│                                                                                │
│  ┌─────────────────── core/pipeline.py ───────────────────────┐               │
│  │  events → normalize → detect → compact → fuse → SITREP    │               │
│  └────────────────────────────────────────────────────────────┘               │
│                                                                                │
│  + NEW: server/app/compaction/squad_rollup.py — deterministic                 │
│  + NEW: server/app/sitrep/delta.py — diff between successive correlation      │
│         outputs, generates "what changed" text                                 │
│  + P1: server/app/belief/lifecycle.py — ACTIVE/WEAKENED/SUPERSEDED            │
│                                                                                │
│  agent/ — heuristic → openai with soul.md-DERIVED prompt (see §C)             │
└────────────────────────────────────────────────────────────────────────────────┘

[OPTIONAL] iPhone running MeshNode as a pitch prop, not in data path.
```

### What's new vs. what we keep

**Keep as-is (no rename, no refactor):**
- `core/pipeline.py`, `core/correlation.py`, `core/scenario.py`, `core/map.py`, `core/interpreter.py`
- `fusion/scoring.py`, `fusion/correlator.py`
- `state/store.py`
- `agent/` (whole module — multi-provider router with heuristic fallback)
- `response/effects.py` (operator-action mitigation loop — a unique demo win)
- All existing API routes (no `/incident/* → /sitrep/*` rename)
- `MapView.tsx`, `LogStream.tsx`, `useSimulation.ts`

**Add (P0, small and well-scoped):**
- `server/app/compaction/squad_rollup.py` (~80 lines, deterministic Python)
- `server/app/sitrep/delta.py` (~60 lines, diff successive `correlation` snapshots)
- `server/app/scenarios/raven_gap.py` (replaces `coordinated_intrusion` as default scenario)
- `agent/prompts.py` — replace with `soul.md`-derived prompt (see §C for the derivation rule)
- New React components: `MeshTree.tsx`, `SitrepDeltaPanel.tsx`, `CompactionTimeline.tsx`, `BandwidthToggle.tsx`, `EvidenceDrawer.tsx`

**Add (P1, only after P0 ships):**
- `server/app/belief/lifecycle.py` — adds `status` and `why_changed` to existing signals
- Tailwind + shadcn migration of the existing components

**Cut:**
- `pipeline/process_pipeline.py` (orphaned earlier draft)
- `adapters/defender.py`, `adapters/siem.py` (stubs)

---

## 5. 18-hour build plan

| Hour | Owner | Goal | Deliverable / gate |
|---:|---|---|---|
| 0–1 | All | Lock scope, ratify this doc, freeze names | This doc signed off; everyone agrees on "TacNet Edge" |
| 1–3 | Backend lead | New scenario `raven_gap`, swap agent prompt to `soul.md`-derived, set Raven Gap as default | Scenario list shows Raven Gap; brief reads in Ranger register |
| 1–3 | Frontend lead | UI **relabel only** (display copy: "SITREP" / "Commander Situation"). Pre-cache MapLibre tiles. Tighten existing CSS spacing/typography. | No rebrand strings visible; map renders offline |
| 3–6 | Backend lead | `compaction/squad_rollup.py` (deterministic) + `sitrep/delta.py` (diff successive correlations) | Replay produces a "what changed" text block per step |
| 3–6 | Frontend lead | `MeshTree.tsx` + `SitrepDeltaPanel.tsx` + `EvidenceDrawer.tsx` | All three visible; auto-update on `/state` poll |
| 6–8 | Both | Compaction timeline + bandwidth toggle + reparenting visual | Toggle changes what gets compacted; one squad leader visibly times out and re-parents |
| 8–10 | All | **Day 1 integration gate** | End-to-end Raven Gap replay works, even rough |
| 10–12 | Frontend lead | Visual polish, copy pass, asset status panel | Looks credible on demo screen |
| 10–12 | Backend lead | LLM commander brief streaming + heuristic fallback verification | Brief generates in <2s; heuristic kicks in if LLM stalls |
| 12–13 | Pitch lead | 3-min pitch script, Q&A one-pager | Script rehearsed once |
| 13–14 | All | Bug fixes; stretch (cyber toggle / belief lifecycle / shadcn migration) **only if P0 stable** | Three rehearsed clean runs |
| 14–15 | All | **Backup video** (60–90s, screen recording of clean run) | MP4 saved, will play if live demo fails |
| 15–16.5 | All | Submission package: README, screenshots, deploy URL | Devpost-ready |
| 16.5–18 | All | Rehearse 3 clean runs; cut anything flaky | Three back-to-back successful demos |

### Day-1 gate at Hour 10

If by Hour 10 we don't have an end-to-end Raven Gap replay (even ugly), **cut all P1 work immediately and finish polishing P0**. Do not start the shadcn migration, belief lifecycle, or cyber toggle until P0 is locked.

---

## 6. Open team decisions — priority ordered

| # | Question | Default if undecided | Who decides |
|---|---|---|---|
| 1 | Do we ratify "TacNet Edge" as the project name? | **Yes** — matches deck, repo, doc corpus | yifu (founder) |
| 2 | Do we keep the Sentinel Forge backend or rewrite? | **Keep + extend** — see §B for the cost math | Backend lead |
| 3 | Do we attempt the Tailwind + shadcn migration? | **Only if a frontend owner can do it without blocking P0**; default no | Frontend lead |
| 4 | Cloud LLM choice (OpenAI / Anthropic / Gemini) for the brief? | **OpenAI** — already wired in `agent/openai_agent.py` | ML lead |
| 5 | Do we use MeshNode iPhone as a pitch prop (Option C)? | **Yes if any teammate has it building today, otherwise no** | MeshNode owner |
| 6 | Do we attempt MeshNode live integration (Option A)? | **No** — risk too high for the demo | All |
| 7 | Cyber scenario as P1 secondary toggle? | **Yes** — already exists, near-zero cost | Backend lead |
| 8 | Pitch persona — lead with "Raven Gap"? | **Yes** — matches `pivot-analysis.md` | Pitch lead |
| 9 | Backup video produced by Hour 14 — non-negotiable? | **Yes** — non-negotiable | All |

**Rule:** anything not on this list is locked by this doc. If it gets debated for >30 minutes during the build, escalate to ratify here, not in chat.

---

## 7. Pitch alignment

The 3-minute pitch in `pivot-analysis.md` is the working draft. v2 tweaks:

1. **Open** with the Raven Gap problem (`why now` slide from yifu's deck — "the cloud is the casualty").
2. **Demo** TacNet Edge end-to-end (Replay → squad compaction → commander SITREP → "what changed since last SITREP" → evidence trace → query).
3. **Frame the LLM honestly:** *"For demo reliability the commander brief is generated by a hosted model. The product architecture is on-device — every soldier's phone runs Gemma 4 locally so the network keeps working when the cloud is gone."* This single sentence prevents the most damaging Q&A trap.
4. **Close** by gesturing at Phase 1+: *"Today this runs in a browser. The same architecture runs on iPhones in the room (lift the prop), and tomorrow on ATAK tablets and LoRa radios over the warfighter's existing kit."*
5. **Q&A prep** — pull from `tacnet/reference/natsec hackathon 3 assessment.md`. We are the platoon-edge OS, not battalion S2 or kill-chain.

The two phrases judges should remember:

- **"Semantic compression over a tactical mesh."**
- **"C2 that degrades gracefully instead of going blind."**

---

## 8. Doc roles going forward

| Doc | Role | Owner |
|---|---|---|
| `docs/unified-plan-v2.md` (this) | **Canonical hackathon spec.** Updates only by team consensus. | Everyone |
| `docs/unified-plan.md` (v1) | Historical — superseded | — (frozen) |
| `docs/meshnode-integration.md` | Decision doc: A/B/C options | — (frozen until team decides) |
| `docs/tacnet-pivot-analysis.md` | Reference: original pivot reasoning | — (frozen) |
| `localdocs/sentinel-forge-deep-dive.md` | **Personal/private** codebase audit; not in repo | — |
| `tacnet/HACKATHON_README.md` | **Long-term hackathon-vision**, not a build target | yifu |
| `tacnet/pitch deck/*` | **Pitch deck**, not a build target | yifu |
| `tacnet/strategy/*`, `tacnet/product/*`, etc. | **Long-term company vision**, used for pitch language only | yifu |

**Single rule:** if you have an idea that affects build scope, propose an edit to `docs/unified-plan-v2.md` rather than starting a new doc. Strategy/vision ideas go to `tacnet/`. The boundary is: does this cost build hours? If yes → here. If no → tacnet/.

---

## 9. Risk register

| Risk | Trigger | Mitigation |
|---|---|---|
| Doc thrash continues | Someone proposes a new architecture in chat | Point them at this doc and §6 — escalate or stop |
| Team splits work along old doc lines | One person builds STRATMEM-style frontend while another builds HACKATHON_README mesh | Hour-1 sync, shared task board, this doc pinned |
| Sentinel Forge UI relabel misses spots | Judges see "incident" / "Sentinel Forge" copy in the demo | Hour-13 grep for the old strings in display layer; replace |
| LLM brief contradicts doctrine prompt | Cloud LLM ignores `soul.md`-derived rules | Heuristic fallback already in `agent/router.py`; flip env var to force heuristic if needed |
| iPhone prop crashes mid-pitch | MeshNode runs out of battery / Gemma hangs | Don't depend on it for the data path; rehearse the pitch with prop *off* as the default |
| **MapLibre tile fetch fails on venue Wi-Fi** | Carto-dark CDN unreachable | Pre-cache tiles to local `MBTiles` or sprite before pitch day; ship a flat dark fallback if the cache fails |
| **Cloud LLM contradicts the on-device pitch** | Q&A asks "wait, does this need internet?" | §7 framing sentence delivered every time, not optional. Heuristic fallback also lets us flip to fully offline mode for any demo we want to rehearse offline |
| **Backend rename creep** | A teammate starts renaming `incident → sitrep` "for clarity" mid-build | Pinned: backend keeps `incident`, UI relabels only. Reject the PR if it touches API/model code |

---

## 10. Closing

The team has a strong codebase (Sentinel Forge), a strong vision (TacNet long-term), a strong scenario (Raven Gap), and strong doctrine assets (`soul.md`-derived schemas). The only thing that can lose this hackathon now is **scope drift between competing visions**. v2 of this doc names one vision, points each existing doc at its role, locks the build target, and explicitly cuts the work codex flagged as too ambitious.

If the team ratifies, **stop debating architecture and start cutting hour 1 of the schedule.**

---

## §A. Sentinel Forge audit — inline summary

(Full audit at `localdocs/sentinel-forge-deep-dive.md`, not committed.)

**What's already built in `../sentinel-forge`:**
- Stateful FastAPI pipeline (`core/pipeline.py`): events → normalize → detect → mitigate-aware re-weight → correlate → interpret → map_state.
- 7 detection rules covering cyber + physical + OSINT signals.
- Transparent fusion scoring: `base + evidenceBonus + diversityBonus + crossDomainBonus + escalationBonus`, with confidence history.
- `StateStore` with persistent server-side state across HTTP calls.
- Multi-provider agent router (`agent/router.py`): heuristic → ollama → openai with automatic fallback.
- Mitigation feedback loop (`response/effects.py`): completed operator actions reduce signal weights → confidence drops → incident transitions `active` → `containment_in_progress` → `resolved`.
- 3 scenarios (`coordinated_intrusion`, `cyber_breach`, `physical_perimeter`) with realistic event metadata.
- Map state generator (`core/map.py`): tracks, assets, zones, threat_paths, mission `phase`.
- React 19 + Vite + maplibre frontend with `useSimulation` hook (auto-step, pause/resume/reset/scenario-change).

**What needs adapting:**
- Frontend visual layer (hand-rolled CSS — see Tension #4 for whether to migrate).
- New scenario `raven_gap` to replace cyber/intrusion default.
- Display-copy relabel: "incident" / "Sentinel Forge" → "SITREP" / "TacNet Edge."
- Add deterministic squad-level compaction layer.
- Add SITREP-delta diff between successive correlations.

---

## §B. Why backend reuse, not frontend-only

`tacnet-pivot-analysis.md` recommends a frontend-only React simulator for speed and reliability. Codex's review correctly flagged that v1 of this plan committed to backend reuse without arguing against the pivot's recommendation. Here is the explicit argument:

### Cost of frontend-only

Rebuild in TS:
- Stateful event pipeline with normalize/detect/correlate/interpret stages
- Confidence-scoring model with 5 bonus categories + history
- Map state generator (tracks/assets/zones/threat_paths/phase model)
- Mitigation feedback loop
- Multi-provider LLM router with heuristic fallback
- ~600 LOC of mature, tested logic

Realistic estimate: **6–8 hours** to rebuild the equivalent in TS, longer if we want the same explainability/scoring transparency.

### Cost of backend reuse (v2 scope)

- Add Raven Gap scenario: ~1 hour
- Add `compaction/squad_rollup.py`: ~1 hour
- Add `sitrep/delta.py`: ~1 hour
- UI relabel + tile pre-cache: ~1 hour
- Swap agent prompt: ~30 min

Realistic estimate: **~4 hours**, with no domain-object refactor and no migration.

### Why frontend-only loses

The codex critique of v1 was specifically that *backend reuse + rename + Tailwind migration* was too much. v2 cuts the rename and the migration. With those cut, backend reuse is unambiguously cheaper than rebuilding in TS — and the demo gets the operator-action mitigation loop and the multi-provider LLM router *for free*, both of which are differentiating demo features that frontend-only would have to skip or rebuild.

### Why backend reuse doesn't reintroduce the codex-flagged risk

Codex's High-3 critique was that v1's schedule was too optimistic given the chosen architecture. v2 fixes this by:
- Removing the rename (was Hours 1–3)
- Demoting shadcn migration to conditional/P1
- Replacing belief lifecycle as P0 with the lighter SITREP-delta panel
- Leaving Hours 13–14 explicitly free for stretch work *only if P0 is locked*

Net hour budget for new development drops from ~10 hours of new code in v1 to ~4 hours in v2.

---

## §C. `soul.md` derivation rule (not a verbatim prompt)

`soul.md` was authored for the **MeshNode iOS earpiece relay** — a TTS-destined audio channel where output goes to *another* operator's ear during combat. Several of its rules conflict with the Commander Brief use case:

| `soul.md` rule | Why it conflicts with Commander Brief |
|---|---|
| ≤18 words for leader earpiece | Brief is a dashboard widget; needs ~80–120 words |
| "No markdown, no formatting, no headers" | Brief renders as markdown in `react-markdown` |
| "No self-reference, no pleasantries" | Compatible — keep |
| Refusal strings ("Negative. Off-tree.") | TacNet Edge has no routing concept; refusals don't apply |
| SALUTE / SITREP / ACE / LACE schemas | **Compatible — keep, this is the value** |
| "Declarative statements only. Numbers spelled out." | Compatible — keep |
| "No fabrication. UNK if unknown." | **Compatible — keep, prevents LLM hallucination** |

**Derivation rule for `agent/prompts.py`:**
- Inherit: SALUTE/SITREP/ACE/LACE/9-line MEDEVAC schemas, declarative tone, no-fabrication, no-hedging, exact-counts, no-pleasantries, doctrine acronyms list.
- Drop: word-count caps, refusal strings, earpiece-relay routing rules, "no markdown."
- Replace word cap with: "Brief is 80–120 words. Use markdown headings: **What changed**, **Why it matters**, **Recommended next collection**."

This gives the demo doctrinal voice without forcing the model into earpiece register.
