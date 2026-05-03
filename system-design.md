# Sentinel Forge / Raven Gap — System Design

> Pitch-flavored reference for the hackathon demo. Read top-to-bottom in one
> sitting. Every diagram fits in ~80 columns so it screenshares cleanly.

---

## 1. TL;DR

Sentinel Forge is a **decision layer** — it turns fragmented battlefield
reports (typed, voiced, sensed) into a single auditable commander's picture in
real time. The Raven Gap demo proves the system on a fictional platoon under
electronic warfare: raw voice reports get compressed into ~200 bytes of
structured metadata, sent over a 3 Kbps link, and reconstructed into readable
text on the commander's screen — without losing the meaning that drives the
decision.

Three things ship together:

```
            +--------------+
            |   BACKEND    |   FastAPI pipeline
            |  port 8000   |   - 7-stage fusion
            +------+-------+   - StateStore
                   ^
                   |  HTTP  (JSON state)
                   |
            +------+-------+
            |   FRONTEND   |   React 19 + Vite
            |  port 5173   |   - Tactical dashboard
            +------+-------+   - Offline fallback engine
                   ^
                   |  WebRTC DataChannel (3 Kbps shaped)
                   |
            +------+-------+
            |  PROTOTYPE   |   Node + vanilla JS
            |  port 8787   |   - Voice -> metadata -> CBOR
            +--------------+   - Two-laptop peer demo
```

The Frontend is the **only thing on screen**. The Backend is the brain. The
Prototype is the proof that the network claim is real.

---

## 2. The bandwidth proof (the hero claim)

This is what the demo is selling. One spoken battlefield report, three sizes:

```
Voice (15s spoken report, raw audio estimate)
##############################################################  7,500 B

3 Kbps budget (per 10-second window)
###############################                                 3,750 B

Compacted CBOR metadata frame (the wire payload)
##                                                                200 B
```

Reading the chart:

- **Raw voice doesn't fit.** A 15-second utterance over an open-mic codec is
  roughly 7.5 KB. A degraded tactical link (3 Kbps over a 10-second window)
  carries ~3.75 KB. Voice loses.
- **CBOR metadata fits ~18× over.** The prototype extracts the meaning of the
  utterance (who, what, where, status, request) into ~12 fields, encodes it as
  CBOR, and sends ~200 bytes. The receiver reconstructs commander-readable
  text on the other side.
- **Same applies to compactions.** The Backend's squad rollups carry
  `raw_bytes` vs `compacted_bytes` numbers per group
  (`Backend/app/compaction/squad_rollup.py:77-80`). Toggle EW DEGRADED in the
  dashboard and the meter shows raw > budget (red) and compacted ≤ budget
  (green).

Why this matters: in a contested environment SATCOM is denied, voice is
expensive, and bandwidth is rationed. Sentinel Forge keeps the picture moving
when the pipe shrinks.

Sources: `prototype/public/codec.js` (CBOR subset, no npm deps),
`prototype/public/link.js:25-26` (default `bandwidthKbps = 3`,
`jitterMs = 150`), `Backend/app/compaction/squad_rollup.py` (deterministic
JSON byte counting via `byte_count()` on raw vs compacted envelopes).

---

## 3. The Raven Gap demo story (12 beats, inline)

Source: `Frontend/src/services/ravenGapStub.ts`. Replay cadence:
`AUTO_STEP_MS = 900 ms` in `Frontend/src/hooks/useSimulation.ts:65`. Total
replay time ≈ 11 seconds for a story that spans ~60 seconds of in-world time.

Mesh heartbeats `rg_005` and `rg_011` carry `metadata.background: true` and
are filtered out of the `LogStream` panel. They still tick the platoon mesh.

Each beat is presented as a 3-line block: the report itself, the panels that
update, and what to point the audience at.

```
 1. rg_001  1/A    "1x dismount NAI 1, light pack."
    panels   LogStream, MeshTree, MapView (NAI-1 highlight)
    note     First report. Routine.

 2. rg_002  1/B    "ACE: green / zero / green."
    panels   LogStream, MeshTree
    note     Status check, no contact.

 3. rg_003  RQ-11  "UAS spot: 2x dismounts NAI 2, moving NW."
    panels   LogStream, MeshTree, MapView (NAI-2 contact pin)
    note     Drone sees something.

 4. rg_004  2/A    "2x dismounts confirmed NAI 1, weapons observed, 220 m."
    panels   LogStream, MapView (NAI-1 contact upgrades)
    note     First ARMED report. Story turns.

 5. rg_005  PL     "Mesh heartbeat."  (filtered from LogStream)
    panels   MeshTree only (background tick)
    note     All leaves still green.

 6. rg_006  S7     "Sensor trigger at OP/LP picket line."
    panels   LogStream, MeshTree, MapView (S7 marker pulses)
    note     Tripwire hit. Independent source.

 7. rg_007  2/B    "LACE: liquids amber, ammo green."
    panels   LogStream, MeshTree
    note     Sustainment risk emerges.

 8. rg_008  V1     "JLTV PLI: grid, fuel 78 %, crew 4."
    panels   LogStream, MapView (V1), IncidentCard appears
    note     Commander SITREP fires.   <-- INCIDENT_AT step

 9. rg_009  RQ-11  "Vehicle dust trail vic NAI 2 - possible technical."
    panels   LogStream, MapView (NAI-2 risk zone), IncidentCard refresh
    note     Escalation.

10. rg_010  3/A    "3x dismounts NAI 3 dispersing, no contact."
    panels   LogStream, MeshTree, SitrepDeltaPanel populates
    note     What changed since last SITREP.   <-- DELTA_AT step

11. rg_011  PL     "Mesh heartbeat."  (filtered from LogStream)
    panels   MeshTree only (background tick)
    note     Mesh still healthy.

12. rg_012  RQ-11  "EW alert: SATCOM denied, falling back to LoRa."
    panels   LogStream, DegradedCommsToggle pulses
    note     HERO BEAT. Compression saves the day.
```

Conditional reveals coded in `Frontend/src/services/ravenGapEngine.ts`:

- `incident` populates at step ≥ 8 (`INCIDENT_AT`).
- `sitrep_delta` populates at step ≥ 10 (`DELTA_AT`).
- NAI-1 contact upgrades to "confirmed" after step 4.
- NAI-2 contact appears at step 9 (vehicle dust trail).

When the EW DEGRADED toggle flips on at the end (or any time), the
`DegradedCommsToggle` component switches each compaction summary from full
("1st Squad: <full messages>") to reduced ("1st Squad: SALUTE; GREEN."), and
the meter shows raw bytes > 3 Kbps budget vs compacted bytes ≤ budget.
Compaction logic is deterministic — see `rollup_summary()` in
`Backend/app/compaction/squad_rollup.py:126-135`.

---

## 4. End-to-end runtime topology

All three deployables on one machine for the local demo:

```
+-------------------------------------------------------------------+
| Operator laptop                                                   |
|                                                                   |
|   +-----------------+   HTTP  +------------------+                |
|   |   Frontend UI   +-------->+    Backend API   |                |
|   |  localhost:5173 |<--------+   localhost:8000 |                |
|   +--------+--------+   JSON  +---------+--------+                |
|            |                            ^                         |
|            | embeds receiver UI         | POST /api/receiver/      |
|            | (S2 dashboard)             | decode (frame_hex)       |
|            v                            |                         |
|   +-----------------+  WebRTC  +------------------+                |
|   |  Receiver page  +<---------+    Sender page   |                |
|   |  (Frontend tab) | shaped   | (Prototype tab)  |                |
|   |                 | 3 Kbps   |                  |                |
|   +-----------------+ + jitter +---------+--------+                |
|                                          |                         |
|                                          | Local STT (HTTP)        |
|                                          v                         |
|                                +------------------+                |
|                                | Prototype server |                |
|                                | localhost:8787   |                |
|                                | + whisper.cpp    |                |
|                                +------------------+                |
+-------------------------------------------------------------------+
```

Two-laptop layout (per `prototype/README.md:27-34`): sender laptop runs the
prototype on `localhost:8787`, receiver laptop opens the same room at
`http://<sender-ip>:8787`. Both browsers connect via the prototype's signaling
endpoint, then the WebRTC DataChannel goes peer-to-peer. The receiver
forwards every decoded frame to the Backend so the dashboard updates exactly
the same way as in the single-laptop flow.

---

## 5. Backend deep dive — module-level

**Why this matters:** the Backend is what makes the demo *deterministic*. No
LLM is on the critical path. Every report becomes a signal, every signal
folds into one incident, and the operator can replay the same scenario and
get the same answer.

### 5.1 Pipeline (`Backend/app/core/pipeline.py`)

Each `/simulate/step` call walks the same chain:

```
+-----------+    +-----------+    +-----------+    +------------+
|  Adapter  |--->| Normalize |--->|  Detect   |--->|  Mitigate  |
|  events   |    |  events   |    |  signals  |    |  overlay   |
+-----------+    +-----------+    +-----------+    +-----+------+
                                                         |
                                                         v
+-----------+    +-----------+    +-----------+    +-----------+
|    Map    |<---| Interpret |<---|  Compact  |<---| Correlate |
|   state   |    |  incident |    |  rollups  |    |  + score  |
+-----------+    +-----------+    +-----------+    +-----------+
```

### 5.2 Detection rules

`Backend/app/detection/rules/*.py`. Seven rules, each emits one Signal kind
with a fixed weight:

| Rule                  | Signal kind                       | Domain   | Weight |
|-----------------------|-----------------------------------|----------|-------:|
| failed_logins         | auth.failed_burst                 | cyber    |   0.18 |
| suspicious_login      | auth.anomalous_login              | cyber    |   0.22 |
| lateral_movement      | network.lateral_movement          | cyber    |   0.26 |
| privilege_escalation  | identity.privilege_escalation     | cyber    |   0.12 |
| data_exfiltration     | network.data_exfiltration         | cyber    |   0.16 |
| drone_activity        | physical.drone_recon              | physical |   0.25 |
| ais_anomaly           | osint.ais_anomaly                 | osint    |   0.10 |

Cross-domain bonus = 0.15 (cyber + physical + osint). A coordinated multi-
domain threat scores higher than any single noisy alert.

### 5.3 Mitigation overlay

`Backend/app/response/effects.py`. When the operator marks an action complete
in the UI, the relevant signals get downweighted by a single knob:

```python
MITIGATED_WEIGHT_FACTOR = 0.2
```

Action → Signal mapping is explicit (auth lockdowns mitigate auth signals,
isolating a node mitigates lateral/exfil signals, etc.). The pipeline reruns
and the incident's confidence drops in real time — the operator sees their
work paying off.

### 5.4 API routes

| Route                       | Method | Purpose                                  |
|-----------------------------|--------|------------------------------------------|
| /scenarios                  | GET    | List available scenarios                 |
| /scenario/select            | POST   | Switch scenario + reset                  |
| /simulate/start             | POST   | Begin replay                             |
| /simulate/step              | POST   | Advance one tick, run pipeline           |
| /state                      | GET    | Full current state                       |
| /reset                      | POST   | Hard reset                               |
| /comms/degrade              | POST   | Toggle EW degradation, recompute meter   |
| /compression/toggle         | POST   | Enable / disable compaction wire form    |
| /voice/report               | POST   | Inject a decoded voice frame             |
| /incident/action            | POST   | Mark an action complete                  |
| /incident/resolve           | POST   | Close the incident manually              |
| /agent/analyze              | POST   | Optional LLM enrichment                  |
| /agent/chat                 | POST   | Operator Q&A on the incident             |
| /api/receiver/decode        | POST   | Decode a CBOR frame from the prototype   |

### 5.5 StateStore (`Backend/app/state/store.py`)

Single in-process singleton, instantiated once in `Backend/app/main.py:65`.
Holds:

```
events           normalized event stream
signals          detected + mitigated signals
correlation      confidence, domain mix, history
incident         current active incident or None
agent            optional LLM analysis
map_state        COP / tactical picture
mesh             platoon command tree (PL -> 3 squads -> teams; UAS; OP/LP)
compactions      squad rollups (with raw_bytes / compacted_bytes proof)
sitrep_delta     what changed since the last SITREP
comms            { degraded, kbps, compression_enabled, window_sec }
voice_report     last decoded voice frame
scenario         current scenario metadata
meta             { mode, step, status }
operator_actions per-incident action completion tracking
resolved_incidents history
```

`build_comms_proof()` in the same file is what fills `raw_bytes`,
`compacted_bytes`, and `fits_budget` on each rollup — the same numbers that
drive the bandwidth-meter UI.

### 5.6 Agent layer

`Backend/app/agent/router.py` picks between **OpenAI**, **Ollama**, and a
**heuristic** fallback. The heuristic always works (no LLM dependency on the
demo's critical path). LLMs enrich the narrative; they do not gate the
incident.

### 5.7 Adapter pattern

`Backend/app/adapters/{base,mock,defender,siem}.py`. Only `MockAdapter` is
wired in `main.py` today — Defender and SIEM are pluggable scaffolds. New
real sources implement `Adapter` and drop into `main.py`.

---

## 6. Frontend deep dive — module-level

**Why this matters:** the Frontend is the part the audience sees. It has a
self-contained offline engine so the demo keeps running even if the Backend
is down. Same on-screen story either way.

### 6.1 Composition (`Frontend/src/pages/Dashboard.tsx`)

```
+----------------------------------------------------------------------+
|                              TopBar                                  |
| brand | Replay/Step/Reset | Scenario picker | DegradedCommsToggle    |
+--------------------------------+-------------------------------------+
|                                |                                     |
|         MAP AREA (2fr)         |  READINESS RAIL (0.72fr)            |
|   +-------------------------+  |  +-------------------------------+  |
|   |       MapView           |  |  |  TacticalEntityDrawer         |  |
|   |  (MIL-2525E markers)    |  |  |  - selected entity readiness  |  |
|   |  + OverlayTabs:         |  |  |  - history + transmissions    |  |
|   |    REPORTS / MESH /     |  |  +-------------------------------+  |
|   |    SITREP / TIMELINE /  |  |                                     |
|   |    VOICE / ASSETS       |  |                                     |
|   +-------------------------+  |                                     |
|                                |                                     |
+--------------------------------+-------------------------------------+
|                          EvidenceDrawer                              |
|   (slides up when the user clicks an evidence line)                  |
+----------------------------------------------------------------------+
```

The six **OverlayTabs** swap a single panel inside the map area:

- **REPORTS** → `LogStream` (raw event feed, filterable, hides background).
- **MESH** → `MeshTree` (platoon hierarchy, highlights the sender of the
  selected event).
- **SITREP** → `IncidentCard` + `SitrepDeltaPanel`.
- **TIMELINE** → `CompactionTimeline` (squad-level rollups, click to drill).
- **VOICE** → `VoiceReportPanel` (S2 receiver decode + voice-report submit).
- **ASSETS** → `AssetStatus` (equipment/vehicle status rows).

### 6.2 Component inventory

| Component               | One-line role                                              |
|-------------------------|------------------------------------------------------------|
| TopBar                  | Replay controls, scenario picker, degraded toggle, offline |
| MapView                 | MapLibre common operating picture with milsymbol markers   |
| MeshTree                | Platoon → squad → team hierarchy, sender highlight         |
| LogStream               | Raw event feed, filtered by `metadata.background`          |
| CompactionTimeline      | Squad-level rollup timeline, click-to-drill                |
| IncidentCard            | Commander SITREP card + evidence lines                     |
| SitrepDeltaPanel        | "What changed since last SITREP" bullets                   |
| EvidenceDrawer          | Slide-up source events for a clicked evidence line         |
| DegradedCommsToggle     | EW toggle + bandwidth meter (raw vs compacted vs budget)   |
| VoiceReportPanel        | S2 receiver decode panel + voice-report submit             |
| AssetStatus             | Equipment / vehicle / fuel status rows                     |
| TacticalEntityDrawer    | Right-rail readiness detail for a selected unit            |
| S2ReceiverChip          | Tiny status indicator: receiver up / connected / decoding  |

### 6.3 The local fallback engine

Three Frontend files run the demo with **no Backend at all**:

- `Frontend/src/types/ravenGap.ts` — authoritative TypeScript types.
- `Frontend/src/services/ravenGapStub.ts` — 12-event fixture (the story).
- `Frontend/src/services/ravenGapEngine.ts` — `buildScenarioState(stepIndex,
  comms, status)` returns a `/state`-shaped object with progressive reveals.

`Frontend/src/hooks/useSimulation.ts` tries the Backend first; on any error
it falls through to `localBoot / localStart / localStep / localReset /
localToggleDegraded`. Components see the same shape either way. This is what
makes the demo robust under flaky wifi at a hackathon.

---

## 7. Prototype deep dive — module-level

**Why this matters:** this is the *proof*. Sentinel Forge claims it can
collapse a voice report into ~200 bytes and still deliver readable text on
the other side. The prototype demonstrates that path end-to-end with zero
hidden dependencies.

```
+-------------------+     +------------------+     +-----------------+
|  Microphone      |---->| AudioWorklet     |---->| whisper.cpp     |
|  (sender browser) |     | (PCM capture)   |     | base.en (local) |
+-------------------+     +------------------+     +--------+--------+
                                                            |
                                                            v
                                                  +-------------------+
                                                  |  metadata.js      |
                                                  |  SALUTE/ACE/LACE  |
                                                  |  CASEVAC/Resupply |
                                                  |  UAS/free-text    |
                                                  +---------+---------+
                                                            |
                                                            v
                                                  +-------------------+
                                                  | codec.js          |
                                                  | CBOR + FNV-1a     |
                                                  | (~200 B frame)    |
                                                  +---------+---------+
                                                            |
                                                            v
                                                  +-------------------+
                                                  | link.js           |
                                                  | WebRTC DataChannel|
                                                  | shaped: 3 Kbps,   |
                                                  | jitter 150 ms     |
                                                  +---------+---------+
                                                            |
                                              receiver browser
                                                            |
                                                            v
                                                  +-------------------+
                                                  | s2-bridge.js      |
                                                  | POST /api/        |
                                                  | receiver/decode   |
                                                  +---------+---------+
                                                            |
                                                            v
                                                  +-------------------+
                                                  | Backend decodes,  |
                                                  | reconstructs text |
                                                  | dashboard updates |
                                                  +-------------------+
```

Why the prototype is **separate** from Backend/Frontend:

- **Zero npm dependencies.** Intentional. Every byte is auditable.
  `prototype/public/codec.js` is a hand-rolled CBOR subset; `link.js` is
  bare WebRTC; `metadata.js` is regex-based (deterministic, no LLM).
- **It's a sender-side device.** In a real deployment it would run on the
  soldier's phone, not a control plane. Keeping it isolated reflects that
  boundary.
- **It can replace voice with text.** If the demo machine's microphone
  doesn't cooperate, the sender page exposes sample buttons (SALUTE,
  Resupply, CASEVAC) that exercise the same metadata + binary path.

Field-key dictionary (`prototype/public/metadata.js:7-20`): twelve numbered
keys (report_type, speaker, unit, location, status, request, destination,
priority, timestamp, confidence, source_transcript_id, raw_transcript). The
CBOR encoder substitutes integers for string keys — that's a meaningful
chunk of the size win.

Bandwidth shaping (`prototype/public/link.js:65-77`):

```
txDelayMs = (frameBytes.length * 8) / bandwidthKbps
delayMs   = txDelayMs + Math.random() * jitterMs
```

A 200-byte frame at 3 Kbps shapes to ~533 ms transmission time + up to
150 ms jitter. Audible pause, but the report still arrives intact.

---

## 8. Sequence: `/simulate/step` (backend success path)

```
TopBar         useSimulation       api.ts         FastAPI         StateStore
  |                |                  |               |                 |
  | click "Step"   |                  |               |                 |
  |--------------->|                  |               |                 |
  |                | step()           |               |                 |
  |                |----------------->|               |                 |
  |                |                  | POST /simulate/step             |
  |                |                  |-------------->|                 |
  |                |                  |               | adapter.fetch_  |
  |                |                  |               | next_event      |
  |                |                  |               |---------------->|
  |                |                  |               | run_pipeline:   |
  |                |                  |               |  normalize      |
  |                |                  |               |  detect         |
  |                |                  |               |  mitigate       |
  |                |                  |               |  correlate      |
  |                |                  |               |  compact        |
  |                |                  |               |  interpret      |
  |                |                  |               |  map            |
  |                |                  |               |---------------->|
  |                |                  |               | persist state   |
  |                |                  |  200 OK +     |                 |
  |                |                  |  full state   |                 |
  |                |                  |<--------------|                 |
  |                |  state           |               |                 |
  |                |<-----------------|               |                 |
  |                |                                                    |
  |  setState() -> React re-render                                      |
  |  -> LogStream, MeshTree, MapView, IncidentCard, etc.                |
  |                                                                     |
```

If the `POST /simulate/step` fetch throws or returns non-200, `useSimulation`
calls `localStep(state)` instead and the same UI updates from the local
engine. The audience can't tell the difference.

---

## 9. Sequence: voice path (prototype demo)

```
Sender browser                Prototype server          Receiver browser           Backend
  |                                |                          |                       |
  | speak (push-to-talk)           |                          |                       |
  |---+ AudioWorklet captures PCM  |                          |                       |
  |   |                            |                          |                       |
  |<--+ POST /api/local/transcribe |                          |                       |
  |------------------------------->|                          |                       |
  |                                | run whisper.cpp          |                       |
  |                                | base.en (CPU)            |                       |
  |   transcript text              |                          |                       |
  |<-------------------------------|                          |                       |
  |                                                                                   |
  |---+ extractMetadata(transcript)                                                   |
  |   | -> {report_type, speaker, location, status, ...}                              |
  |   |                                                                               |
  |---+ compactMetadata(meta) -> int-keyed object                                     |
  |---+ encodeFrame(compact) -> CBOR bytes (~200 B)                                   |
  |---+ link.sendFrame(bytes)                                                         |
  |                                                                                   |
  |--- WebRTC DataChannel (shaped 3 Kbps + 150 ms jitter) --->|                       |
  |                                                          |                        |
  |                                                          | decodeFrame(bytes)     |
  |                                                          | expandMetadata(...)    |
  |                                                          | reconstructText(...)   |
  |                                                          |                        |
  |                                                          | POST /api/receiver/    |
  |                                                          | decode (frame_hex)     |
  |                                                          |----------------------->|
  |                                                          |                        |
  |                                                          | inject voice event,    |
  |                                                          | rerun pipeline         |
  |                                                          |<-----------------------|
  |                                                          |                        |
  |                                                          | Frontend re-fetches    |
  |                                                          | /state -> dashboard    |
  |                                                          | shows the new report   |
```

Net effect on the dashboard: a new event appears in `LogStream`, the
sender's mesh node pulses in `MeshTree`, and (if it triggers compaction or
meets incident criteria) `CompactionTimeline` and `IncidentCard` update.

---

## 10. Operating modes

The system degrades gracefully — three modes, all of which still tell the
story:

### Mode A — Backend up + Prototype up *(full demo)*

```
[ Frontend ] <--HTTP--> [ Backend ]
     ^
     |  WebRTC
     v
[ Prototype ]
```

Hero beat works. Live voice → ~200 B CBOR → 3 Kbps link → readable text on
the dashboard. Bandwidth meter shows the proof.

### Mode B — Backend up + Prototype down *(deterministic scenario only)*

```
[ Frontend ] <--HTTP--> [ Backend ]

[ Prototype ]   (offline)
```

Replay-button driven. The 12-beat Raven Gap scenario still runs through the
real pipeline. Voice path is silent, but everything else (compactions,
incident, SITREP delta, EW toggle) works.

### Mode C — Backend down *(silent fallback)*

```
[ Frontend ]   (loops on its own)

[ Backend ]    (offline)

[ Prototype ]  (offline)
```

`useSimulation` catches the `POST /simulate/start` error, sets `isOffline =
true`, and runs `ravenGapEngine.ts` against `ravenGapStub.ts`. The audience
sees the same panels, the same beats, the same conditional reveals. No
network calls leave the laptop.

---

## 11. Glossary (plain English)

For non-military readers — terms that show up on the dashboard and in this
doc.

- **NAI** — *Named Area of Interest.* A pre-marked tripwire box on the map.
  "Two dismounts in NAI 1" means a contact has crossed a watch zone.
- **MGRS** — *Military Grid Reference System.* The coordinate format you'll
  see on markers (e.g. `11SLT 12450 67950`). 5+5 digits = 1-meter precision.
- **SALUTE** — A standard contact report. Size, Activity, Location, Unit,
  Time, Equipment.
- **ACE / LACE** — Status check. Ammo, Casualties, Equipment (LACE adds
  Liquids).
- **PLI** — *Position Location Information.* "I am here."
- **SPOT** — Informal sighting report.
- **SITREP** — *Situation Report.* What the commander actually reads.
- **COP** — *Common Operational Picture.* The shared map. The MapView panel
  is the COP.
- **AO** — *Area of Operations.*
- **Phase Line** — A coordination line drawn on the map (e.g. PL BLUE).
- **Checkpoint** — A named point on a route.
- **Dismount** — Soldier on foot.
- **JLTV** — *Joint Light Tactical Vehicle.* Callsign V1 in this scenario.
- **UAS** — Drone. The Raven Gap UAS is an RQ-11 Raven (callsign RQ-11).
- **OP / LP** — *Observation Post / Listening Post.* Sensor-equipped
  picket. Callsign S7 in this scenario.
- **PL** — *Platoon Leader.*
- **Technical** — Improvised armed pickup truck.
- **EW** — *Electronic Warfare.* Adversary jamming or spoofing the link.
- **SATCOM** — Satellite comms. In this demo, denied.
- **LoRa** — Long-range, low-bandwidth radio fallback (~0.3-37 kbps). What
  the platoon falls back to when SATCOM goes down.
- **vic** — "in the vicinity of."
- **Callsigns in this demo:** `1/A`, `1/B` = 1st Squad fire teams Alpha /
  Bravo. `2/A`, `2/B` = 2nd Squad. `3/A` = 3rd Squad. `RQ-11` = drone. `S7`
  = sensor. `V1` = JLTV. `PL` = platoon leader.
- **CBOR** — *Concise Binary Object Representation.* A compact binary
  format like JSON but smaller. The wire format the prototype uses.
- **FNV-1a** — A small fast hash. The prototype uses it for frame
  integrity.

---

## Appendix — file map

If you want to see the source for anything in this doc:

- **Backend pipeline:** `Backend/app/core/pipeline.py`
- **Detection rules:** `Backend/app/detection/rules/`
- **Mitigation knob:** `Backend/app/response/effects.py`
- **Correlation scoring:** `Backend/app/fusion/correlator.py`,
  `Backend/app/fusion/scoring.py`
- **Compaction (raw vs compacted bytes):**
  `Backend/app/compaction/squad_rollup.py`
- **State store:** `Backend/app/state/store.py`
- **API routes:** `Backend/app/api/routes/`
- **Adapter contract:** `Backend/app/adapters/base.py`
- **Frontend composition:** `Frontend/src/pages/Dashboard.tsx`
- **Sim hook + offline fallback:** `Frontend/src/hooks/useSimulation.ts`
- **API service (hardcodes localhost:8000):** `Frontend/src/services/api.ts`
- **12-event story fixture:** `Frontend/src/services/ravenGapStub.ts`
- **Local scenario engine:** `Frontend/src/services/ravenGapEngine.ts`
- **Type contract:** `Frontend/src/types/ravenGap.ts`
- **Map markers (MIL-2525E):** `Frontend/src/components/map/militarySymbols.ts`
- **Voice prototype README:** `prototype/README.md`
- **Voice metadata parser:** `prototype/public/metadata.js`
- **CBOR codec (no deps):** `prototype/public/codec.js`
- **WebRTC + bandwidth shaping:** `prototype/public/link.js`
- **Receiver → Backend bridge:** `prototype/public/s2-bridge.js`
- **Prototype server (signaling + STT):** `prototype/server.mjs`
