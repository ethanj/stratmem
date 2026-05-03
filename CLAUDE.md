# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This repo holds **Sentinel Forge** — a cyber-physical threat fusion engine — alongside strategy/pitch material for the broader TacNet pivot.

- `Frontend/` — React 19 + Vite + TypeScript dashboard. Talks to the backend at `http://localhost:8000` (hard-coded in `Frontend/src/services/api.ts`).
- `Backend/` — FastAPI app (`app/main.py`). Runs the deterministic scenario pipeline.
- `docs/` — Hackathon plans, demo scripts, pivot analysis. `docs/docs/` has API/ARCHITECTURE/BACKEND/FRONTEND/DEMO references.
- `tacnet/` — Strategy and pitch markdown only. No code.
- `James_notes/` — Personal notes (gitignored). Not part of any build.

## Common Commands

### Frontend (`Frontend/`)
```sh
npm install              # first time only
npm run dev              # Vite dev server on :5173
npm run build            # tsc -b && vite build
npx tsc --noEmit         # type-check without emitting
npm run lint             # eslint
```

### Backend (`Backend/`)
```sh
# Linux / macOS / Git Bash
python3 -m venv venv && source venv/bin/activate

# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1
# (if blocked: Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned)

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

pytest                              # all backend tests
pytest tests/test_api_contract.py   # one file
pytest -k "scenario"                # filter by name
```

The backend loads `.env` from the repo root (not `Backend/`). Place secrets there.

## Architecture (the part that needs multi-file reading)

The backend is a **deterministic scenario-driven pipeline**, not a streaming ingestion system. Every `/simulate/step` call walks the same pipeline; state lives in a single in-process `StateStore` (`app/state/store.py`).

### Pipeline data flow (`app/core/pipeline.py::run_pipeline`)

```
events → normalize → detect (signals) → mitigation overlay → correlate → interpret (incident) → map state
```

Read these together to understand a single tick:
1. `app/generator/scenario_engine.py` + `app/core/scenario.py` — produce the next deterministic event(s).
2. `app/normalization/normalizer.py` — coerces raw events into the unified schema (`type/source/timestamp/metadata`).
3. `app/core/detection.py` + `app/detection/rules/*.py` — each rule extracts a `Signal` (e.g. `failed_logins`, `suspicious_login`, `lateral_movement`, `drone_activity`). New rules drop into `app/detection/rules/` and register with `app/detection/engine.py`.
4. `app/response/effects.py` + `app/fusion/*` — operator actions (via `/incident/action`) downweight signals before correlation. `MITIGATED_WEIGHT_FACTOR` is the single knob.
5. `app/core/correlation.py` — cross-domain correlation, confidence scoring, history.
6. `app/core/interpreter.py` (and `app/fusion/interpreter.py`) — produces the operator-facing `Incident` (severity, why, recommended actions).
7. `app/core/map.py` — derives the COP / map state for the frontend.

### Agent layer (`app/agent/`)

Used by `/agent/analyze`. `app/agent/router.py` chooses between OpenAI (`openai_agent.py`), Ollama (`ollama_agent.py`), and a heuristic fallback (`heuristic_agent.py`). Prompts live in `app/agent/prompts.py`. The router's heuristic fallback exists because **no LLM is on the demo's critical path** — agents enrich, they don't gate.

### API surface

Routes live in `app/api/routes/`: `simulate.py`, `state.py`, `reset.py`, `agent.py`. The frontend's `Frontend/src/services/api.ts` is the canonical list of endpoints actually consumed: `/scenarios`, `/scenario/select`, `/simulate/start`, `/simulate/step`, `/state`, `/reset`, `/agent/analyze`, `/incident/action`, `/incident/resolve`.

### Frontend composition

`Frontend/src/pages/Dashboard.tsx` is the composition root. `useSimulation` hook owns polling/stepping. The dashboard follows a four-panel layout (mesh tree top, source-report feed left, map center, SITREP+delta right) defined in `docs/THEPLAN.md`.

Components rendered by the dashboard:
- **Original Sentinel Forge:** `IncidentCard`, `SignalBreakdown`, `ActionList`, `LogStream`, `MapView`, `CorrelationScore`, `AssetStatus`, `TopBar`
- **Raven Gap additions:** `MeshTree` (platoon mesh hierarchy), `CompactionTimeline` (squad-level summaries), `SitrepDeltaPanel` (what-changed bullets), `EvidenceDrawer` (source event drill-down), `DegradedCommsToggle` (EW degradation toggle + bandwidth meter)

Styles are vanilla CSS modules in `Frontend/src/styles/`. **MapView uses MapLibre via react-map-gl** — heavy dep; treat changes there carefully.

### Frontend-only Raven Gap engine

The frontend can run the full Raven Gap demo **without the backend**. Three files power this:

1. `Frontend/src/types/ravenGap.ts` — authoritative type definitions for the Raven Gap state contract (Mesh, Compaction, SitrepDelta, Comms, MapState, etc.). Also referenced by `docs/team-c-state-contract.md`.
2. `Frontend/src/services/ravenGapStub.ts` — 12-event fixture mirroring the demo script beats. `mergeRavenGapStub(state)` fills keys the backend hasn't shipped yet; when the backend provides a real value, the merge is a no-op.
3. `Frontend/src/services/ravenGapEngine.ts` — local scenario engine. `buildScenarioState(stepIndex, comms)` returns a `/state`-shaped object with progressive reveals. Used by `useSimulation` as a fallback when backend calls fail.

The `useSimulation` hook tries the backend first; on failure it falls through to local functions (`localBoot`, `localStart`, `localStep`, `localReset`, `localToggleDegraded`). Components see the same state shape either way.

### Adapter pattern

`app/adapters/` (`base.py`, `mock.py`, `defender.py`, `siem.py`) is a pluggable source layer. **Only `MockAdapter` is wired into `main.py` today** — Defender/SIEM are scaffolds. New real sources implement `base.Adapter` and get injected in `main.py`.

## Scenario context

The hackathon scenario being built is **"Raven Gap"** (platoon under EW degradation). The active implementation plan is `docs/THEPLAN.md` (4-person team split). The demo script is `docs/branch-b-sentinel-forge-demo-script.md`. Older analysis lives in `docs/archive/tacnet-pivot-analysis.md`.

The backend's default scenario is still `coordinated_intrusion` (cyber+drone+AIS); plans call for a `raven_gap` module under `app/scenarios/` (not yet created). The frontend already runs Raven Gap via its local engine (see "Frontend-only Raven Gap engine" above). Compaction text for each Raven Gap beat is **pre-baked, not LLM-generated** — keep it that way unless the user says otherwise.

## Raven Gap reference

*Added 2026-05-02.*

Raven Gap is a **fictional tactical situation used as a demo fixture**, not a mission script. The "story" exists only as 12 event objects in `Frontend/src/services/ravenGapStub.ts:83-260` (`ravenGapEvents`). There is no prose narrative document — the array is the story. Progressive reveal lives in `Frontend/src/services/ravenGapEngine.ts` (`buildScenarioState(stepIndex, comms, status)`).

**Replay cadence:** `AUTO_STEP_MS = 900` in `Frontend/src/hooks/useSimulation.ts:65`. ~11 seconds of real time replays ~60 seconds of in-world story. Event `timestamp` fields are narrative time only; not used for scheduling.

**Conditional reveals (in `ravenGapEngine.ts`):** incident at step 8, sitrep_delta at step 10, NAI 1 contact confirmed at step 4, NAI 2 contact confirmed at step 9, total 12 steps.

### Glossary (US Army doctrine — standard infantry vocabulary, not elite/SOF)

Report formats: **SALUTE** (Size/Activity/Location/Unit/Time/Equipment) = contact report. **ACE** (Ammo/Casualties/Equipment) = status check. **LACE** = ACE plus Liquids. **PLI** (Position Location Information) = "I'm here." **SPOT** = informal sighting.

Map vocabulary: **NAI** (Named Area of Interest) = pre-marked tripwire box. **MGRS** = grid coordinate format `11SLT 12450 67950` — `11S` is Grid Zone Designator, `LT` is 100km × 100km square ID, the two 5-digit groups are easting/northing in meters within that square. 5+5 digits = 1m precision; 4+4 = 10m; soldiers usually drop the GZD/square in-AO. **COP** = Common Operational Picture. **AO** = Area of Operations. **Phase Line** = coordination line. **Checkpoint** = route reference point.

Units: **dismount** = soldier on foot. **UAS** = drone (in this scenario, **RQ-11** Raven). **OP/LP** = Observation Post / Listening Post (callsign **S7**). **JLTV** = Joint Light Tactical Vehicle (callsign **V1**). **PL** = Platoon Leader. **Technical** = improvised armed pickup truck.

Status colors: green = good, amber = watch, red = critical.

Comms: **EW** = Electronic Warfare. **SATCOM** = satellite comms (denied in scenario). **LoRa** = long-range low-bandwidth radio fallback (~0.3–37 kbps). **vic** = "in the vicinity of."

Callsigns in fixture: `1/A`, `1/B` = 1st Squad fire teams Alpha/Bravo. `2/A`, `2/B` = 2nd Squad teams. `3/A` = 3rd Squad team. `RQ-11` = drone. `S7` = sensor. `V1` = JLTV. `PL` = platoon leader. `MESH` = network heartbeats (filtered out of feed via `metadata.background = true`).

### Mission arc (12 reports)

1. `rg_001` 1/A SALUTE — 1 dismount NAI 1, light pack
2. `rg_002` 1/B ACE — green/zero/green
3. `rg_003` RQ-11 SPOT — 2 dismounts NAI 2, moving NW
4. `rg_004` 2/A SALUTE — 2 dismounts confirmed NAI 1, **armed**, 220m. *First hostile-shaped report.*
5. `rg_005` PL MESH heartbeat *(background, filtered)*
6. `rg_006` S7 trigger — motion at OP/LP picket line
7. `rg_007` 2/B LACE — liquids amber
8. `rg_008` V1 PLI — JLTV location/fuel/crew
9. `rg_009` RQ-11 SPOT (high) — vehicle dust trail vic NAI 2, possible technical. *Escalation.*
10. `rg_010` 3/A SALUTE — 3 dismounts NAI 3 dispersing, no contact
11. `rg_011` PL MESH heartbeat *(background, filtered)*
12. `rg_012` RQ-11 EW alert (high) — **drone link degraded, SATCOM denied, falling back to LoRa.** *Hero beat — pitch payoff.*

### Where TacNet sits

Standard military model: reports → S2/RTO/intel cell → SITREP → commander reads → updates COP. Human in the loop. TacNet's claim: reports → semantic compaction layer on the mesh → commander gets fused picture directly. The compaction layer replaces (or augments) the S2-first-pass.

Component mapping in the dashboard: raw reports = `LogStream`. Squad-level rollup ("S2 first pass") = `CompactionTimeline`. Final commander SITREP = `IncidentCard` + `SitrepDeltaPanel`. Live battlespace picture (COP) = `MapView`. Bandwidth proof = `DegradedCommsToggle`. The map tracks ~10 **elements** (squads, vehicles, drones, sensors) — not individual soldiers.

### Bandwidth math (the demo proof)

Voice version of one SALUTE: ~10–15s audio, ~10–20 KB → over a 3 Kbps budget. Structured SALUTE JSON (one `rg_xxx` event): ~200 bytes → fits in one second of 3 Kbps link. Soldier still speaks the SALUTE; phone runs voice → SALUTE JSON locally; only ~200 bytes cross the mesh.

## Code Style & Standards

- Files must be smaller than 400 lines excluding comments. Once 400 is exceeded, refactor.
- Functions must be smaller than 40 lines excluding comments and the catch/finally blocks of try/catch sections. If exceeded, refactor.
- Substantial JSDoc at the top of each TS/TSX file. Google-style docstrings at the top of each Python file.
- Document non-obvious behavior; avoid commenting the obvious.

## Pre-Commit Checks

Before committing or considering any task complete:

1. **Frontend:** `cd Frontend && npx tsc --noEmit && npm run build && npm run lint`
2. **Backend:** `cd Backend && pytest`
3. `fallow` if available — fix all reported issues (dead code, duplication, complexity). `fallow fix --dry-run` to preview, `fallow fix --yes` to apply. Do not commit until fallow reports clean.

There is currently no `npm test` in `Frontend/package.json` and no JS test runner configured — frontend correctness is verified via `tsc`, `build`, and `lint` only.

## General Rules

- First think through the problem, read the codebase for relevant files.
- Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
- Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Make sure to investigate and read relevant files BEFORE answering questions about the codebase. Never make any claims about code before investigating unless you are certain of the correct answer - give grounded and hallucination-free answers.

## hackathon adjustments

- this is greenfield and focused on demo so implementation speed takes priority over perfection. the 400 line and 40 line rules should be considered soft.
