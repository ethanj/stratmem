# TacNet — Hackathon Project README (Merged)

==Single source of truth for the team. Read this before writing any code. This doc merges three inputs: the original TacNet vision, the Sentinel Forge architecture proposal, and the judge-facing pivot analysis.==

---

## 1. What we are building

**TacNet** is a platoon-level command and control (C2) signal platform that collects intel from personnel and assets in real time, compresses it into bandwidth-tolerant tokens, and propagates it across a decentralized mesh. When external connectivity returns, battalion S2/J2 sees the same picture the platoon leader saw.

### The core promise

> A platoon leader can see where every soldier, vehicle, and drone is, hear what they are reporting, and query the network with natural language — even when satellite, cloud, and higher HQ are jammed or offline. When connectivity returns, the S2 shop sees the same picture, rendered in 3D via the Squad game engine.

### Judge-facing framing

The judges want innovation against a **specific problem for a specific role**.

| Judge Need | TacNet Answer |
|---|---|
| **Specific role** | Platoon leader / company edge commander operating forward of reliable network. |
| **Specific problem** | Cannot monitor 30-50 voice/status feeds, query vehicles/drones manually, or rely on satellite/cloud under EW pressure. |
| **Innovation** | AI-native semantic compression over mesh: raw voice/status/telemetry becomes intent tokens and compact SITREPs. |
| **Working demo** | Real iPhones connected via BLE mesh showing raw reports collapsing into a commander SITREP under bandwidth degradation. |
| **Military relevance** | Addresses tactical edge C2, radio scaling, asset visibility, and comms denial without entering autonomous targeting. |

---

## 2. Two zones — don't confuse them

### Zone A — The Field Mesh (peer-to-peer, fully offline)

| Property | Value |
|---|---|
| **Users** | Dismounted soldiers, vehicle crews, drone operators, platoon leader |
| **Network** | Peer-to-peer mesh — no server, no cloud, no internet |
| **Transport (demo)** | BLE mesh between iPhones (existing prototype) |
| **Transport (production)** | Long-range radio (LoRa / SDR / FHSS) or ATAK tactical network |
| **AI** | Small on-device models (Gemma 4 E4B, INT4) + cloud LLM fallback for demo summarization |
| **Data** | Compressed intent tokens — audio → text → metadata → bytes |
| **Range** | Platoon / company level (~20–50 personnel + vehicles + drones) |
| **Key rule** | If the battalion disappears, the field mesh keeps working. Zero dependency on external connectivity. |

### Zone B — The S2 Uplink (external connectivity required)

| Property | Value |
|---|---|
| **Users** | S2 (Battalion Intelligence), J2 (Joint Intelligence), higher HQ |
| **Network** | Starlink, satellite backhaul, or any external pipe when available |
| **Transport** | Burst-sync — compressed delta, not real-time streaming |
| **AI** | Powerful cloud LLM (OpenAI GPT-4o / Gemini 2.5 Pro) for analysis and Q&A |
| **Visualization** | **Squad (Steam game)** — 3D battlefield map with terrain, unit positions, movement trails |
| **Key rule** | Zone B is an **observer and analyst**, not a commander. Orders still flow down through normal military channels. |

==Zone A is a self-contained operating system. Zone B is a read-only 3D mirror with analytics.==

---

## 3. The data pipeline (how intel moves)

### For voice reports (soldier speaks)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Soldier    │ ──► │  On-Device   │ ──► │   Metadata   │ ──► │   Intent     │
│   Speaks     │     │  STT (Gemma) │     │   + GPS      │     │   Token      │
│  (audio)     │     │              │     │   + Status   │     │   (bytes)    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
     ~2 MB                ~200 bytes           ~400 bytes         ~50-100 bytes
                           (10,000:1
                            compression)
```

Then: encrypt (AES-256) → transmit over mesh → decrypt → render on receiver's map/chat → optional TTS playback.

### For asset status (vehicle, drone, sensor)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Asset      │ ──► │  Telemetry   │ ──► │   Structured │ ──► │   Intent     │
│   (GPS,      │     │   Parser     │     │   Tuple      │     │   Token      │
│   battery)   │     │  (ATAK/auto) │     │   (JSON)     │     │   (bytes)    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

Same encryption, same mesh, same size class as a voice report.

---

## 4. The mesh architecture (command structure)

The mesh follows the **actual Army chain of command**.

```
                    ┌──────────────┐
                    │ PLATOON      │  ← Root node. COP lives here.
                    │ LEADER       │     If killed, auto-promotion.
                    │ (ROOT)       │
                    └──────┬───────┘
                           │ compacted summaries
           ┌───────────────┼───────────────┐
      ┌────┴────┐     ┌────┴────┐    ┌────┴────┐
      │ SQUAD 1 │     │ SQUAD 2 │    │ SQUAD 3 │   ← Squad leaders.
      │ LEADER  │     │ LEADER  │    │ LEADER  │     Receive squad summaries.
      │ (L1)    │     │ (L1)    │    │ (L1)    │
      └────┬────┘     └────┬────┘    └────┬────┘
           │               │               │ child messages
      ┌────┼────┐     ┌────┼────┐    ┌────┼────┐
    ┌─┴─┐┌─┴─┐┌─┴─┐  ┌─┴─┐┌─┴─┐┌─┴─┐ ┌─┴─┐┌─┴─┐┌─┴─┐
    │P1 ││P2 ││P3 │  │P4 ││P5 ││P6 │ │P7 ││P8 ││P9 │   ← Soldiers, vehicle
    └───┘└───┘└───┘  └───┘└───┘└───┘ └───┘└───┘└───┘     crews, drone ops (LEAF)
```

### Succession rules (auto-promotion on node death)

| If this node dies... | Next in command becomes... | How the mesh knows |
|---|---|---|
| Platoon Leader (ROOT) | Platoon Sergeant (pre-designated L1) | Heartbeat timeout + pre-sealed promotion envelope |
| Squad Leader (L1) | Most senior team leader in that squad (pre-designated) | Same mechanism |
| Soldier / vehicle (LEAF) | No promotion needed — mesh routes around | Parent marks RED |

==Promotion is not an election. It is a pre-designated chain of command sealed in the network join handshake.==

---

## 5. Asset heartbeat protocol

Every asset sends a **heartbeat** every 30 seconds.

### Heartbeat envelope

```json
{
  "type": "HEARTBEAT",
  "asset_id": "V3-HUMVEE-A",
  "asset_type": "VEHICLE",
  "timestamp": "2026-05-02T14:32:10Z",
  "location": { "lat": 45.123, "lon": -93.456, "accuracy": 5 },
  "status": "GREEN",
  "fuel": 0.72,
  "crew_count": 4
}
```

### State machine per asset (on the COP)

| Last heartbeat | Display state | Meaning |
|---|---|---|
| < 60 seconds ago | **GREEN** | Asset is live and reporting |
| 60–180 seconds ago | **AMBER** | Missed 1-2 heartbeats — possible jamming, obstruction, or device failure |
| > 180 seconds ago | **RED** | Asset is non-responsive. Marked as **DESTROYED / MIA** on the COP. |
| Manually flagged by leader | **BLACK** | Confirmed KIA / write-off by command |

==This is active, not passive. The commander does not ask "where is my truck?" The truck tells the commander, continuously, or the commander knows it's gone.==

---

## 6. Unified dashboard — TacNet + Sentinel Forge panels

**One app. One URL. Two views accessible via tabs.** Not two separate products.

### Tab 1: TacNet Command Mesh (primary)

The main C2 view for the platoon leader.

```
┌──────────────────────────────────────────────────────────────┐
│ TACNET COMMAND MESH                              [Live Mesh] [Threat Fusion]
│ [Start] [Step] [Reset]                                       │
├───────────────┬─────────────────────────────┬────────────────┤
│ Mesh Tree     │ Local COP                    │ Commander SITREP│
│ - PL root     │ - squads                     │ - latest summary│
│ - squads      │ - vehicle                    │ - priority risk │
│ - leaf nodes  │ - drone                      │ - ask/answer    │
│ - reparenting │ - sensor                     │ - evidence trace│
├───────────────┴───────────────┬─────────────┴────────────────┤
│ Raw Reports / Event Stream    │ Compaction Timeline           │
│ voice/status/asset telemetry  │ raw -> squad -> commander     │
└───────────────────────────────┴──────────────────────────────┘
```

**Panels:**

1. **Mesh Tree** — Shows root, squad leaders, leaves, vehicle, drone, sensor. Node health and parent/child links. Reparent events visible.
2. **Local COP** — Tactical board showing squad positions, vehicle, drone, sensor. EW/bandwidth state overlay.
3. **Raw Reports** — Incoming reports in order. Labels voice-derived, asset telemetry, sensor trigger, compaction. Shows payload size.
4. **Compaction Timeline** — Raw child reports → squad summaries → commander SITREP. Shows compression ratio and "bytes avoided."
5. **Commander SITREP** — Current top-level summary, priority element, natural-language query answer, evidence trace.

### Tab 2: Threat Fusion (Sentinel Forge panels)

Threat intelligence derived from the same TacNet state. Not a separate system — an **interpretation layer**.

```
┌──────────────────────────────────────────────────────────────┐
│ THREAT FUSION                                    [Live Mesh] [Threat Fusion]
│ [Start] [Step] [Reset]                                       │
├───────────────────────┬──────────────────────────────────────┤
│ Signal Breakdown      │ Incident / Risk Panel               │
│ - comms.ew_degradation│ - HIGH: Movement Risk Under EW      │
│ - sensor.east_ridge   │ - Why: 4 signals correlated           │
│ - drone.low_battery   │ - Recommended action                  │
│ - node_loss           │ - Evidence trace                      │
├───────────────────────┴──────────────────────────────────────┤
│ Correlation Score     │ What Changed Panel                    │
│ - confidence: 0.87    │ - SITREP changed because...         │
│ - cross-domain bonus    │ - Raw reports supporting...           │
│ - evidence bonus        │ - Stale assumptions...              │
└──────────────────────────────────────────────────────────────┘
```

**Panels:**

6. **Signal Breakdown** — Extracted signals from TacNet events: `comms.ew_degradation`, `sensor.east_ridge_trigger`, `drone.low_battery`, `fusion.coordinated_risk`.
7. **Correlation Score** — How strongly signals correlate into an incident. Confidence level, cross-domain bonus, evidence bonus.
8. **Incident / Risk Panel** — Fused incident with severity, explanation, recommended action/collection.
9. **What Changed Panel** — Evidence trace: "SITREP changed because P4 reported movement and S7 triggered near east ridge." Links raw reports → squad summaries → commander SITREP → incident.

==The Threat Fusion tab answers "why did the commander summary change?" and "what should we collect next?" It does not replace the commander.==

---

## 7. S2 / J2 visualization tier (Zone B)

When Starlink or external connectivity is available, the Platoon Leader's device performs a **burst sync** to the S2 shop.

### What the S2 sees

- Full mesh state: every asset's position history, every voice transcript, every status change
- **Squad (Steam game)** as a **live 3D battlefield visualization** — terrain, unit positions, movement trails, contact reports
- Natural language query interface:
  - "Show me all RED assets in 1st Platoon in the last 4 hours"
  - "What was the last transmission from Drone Alpha before it went AMBER?"
  - "Plot the movement path of Squad 2 since 0600Z"
- **No hallucination guarantee**: answers retrieved from structured mesh database, not generated from model weights.

### How it works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Platoon     │ ──► │  Burst Sync  │ ──► │   S2 Cloud   │ ──► │   Squad      │
│  Mesh State  │     │  (Starlink)  │     │   Database   │     │   (Steam /   │
│  (local DB)  │     │  (opportun.) │     │   + LLM RAG  │     │   Unreal 5)  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

- **Burst sync**: compressed delta of changes since last sync.
- **Cloud DB**: PostgreSQL or similar, structured schema matching mesh intent-token format.
- **LLM layer**: GPT-4o or Gemini 2.5 Pro with RAG — queries hit the DB first, then LLM formats the answer.
- **Squad visualization**: Unreal Engine 5 map with overlays for friendly positions, contact reports, asset status.

**Squad integration requirements:**
- Someone on the team needs **Unreal Engine 5 / Blueprint** experience OR
- Use **Squad's modding tools** (if available and legal for hackathon use) OR
- Fallback: **web-based Three.js** tactical board if Squad integration is not achievable in 18 hours

==The S2 does not command the platoon. The S2 observes, analyzes, and briefs higher. The platoon leader retains tactical command.==

---

## 8. Compaction engine — LLM with deterministic fallback

### Primary: Real LLM calls (OpenAI / Gemini)

For the hackathon demo, squad-level and commander-level summarization calls the cloud LLM API.

```ts
async function compactReports(events: TacEvent[], nodeId: string): Promise<Compaction> {
  const prompt = `
You are a squad leader's AI assistant. Summarize the following raw reports
into a single military SITREP using SALUTE format. ≤50 words.

Raw reports:
${events.map(e => `- ${e.senderId}: ${e.rawText}`).join("\n")}

SITREP:`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // fast, cheap, sufficient for demo
    messages: [{ role: "user", content: prompt }],
    max_tokens: 80,
  });

  return {
    id: generateId(),
    sourceNodeId: nodeId,
    summary: response.choices[0].message.content,
    inputBytes: estimateBytes(events),
    outputBytes: estimateBytes(response.choices[0].message.content),
  };
}
```

**API requirements:**
- One team member brings an **OpenAI API key** or **Gemini API key**
- Budget: ~$5-10 for the entire hackathon (GPT-4o-mini is ~$0.60/million input tokens)
- Rate limit: batch calls, don't fire one per event

### Fallback: Deterministic rules

If the API fails (no key, rate limited, offline), compaction falls back to hardcoded rules:

```ts
function compactReportsDeterministic(events: TacEvent[]): Compaction {
  // Priority order:
  // 1. Contact/sensor triggers outrank routine status
  // 2. Asset amber/red status appears in summary
  // 3. Drone battery below 30% appears in summary
  // 4. Node loss/reparenting appears in summary
  // 5. Output capped to one short SITREP

  const contacts = events.filter(e => e.type === "CONTACT" || e.type === "SENSOR_TRIGGER");
  const assetIssues = events.filter(e => e.metadata?.status === "AMBER" || e.metadata?.status === "RED");
  const routine = events.filter(e => e.type === "STATUS" || e.type === "HEARTBEAT");

  let summary = "";
  if (contacts.length > 0) {
    summary = `${contacts.length} contact/sensor reports. ${contacts[0].rawText}`;
  } else if (assetIssues.length > 0) {
    summary = `Asset issues: ${assetIssues.map(e => e.senderId).join(", ")}`;
  } else {
    summary = `Routine: ${routine.length} status updates. All green.`;
  }

  return { summary, inputBytes: estimateBytes(events), outputBytes: estimateBytes(summary) };
}
```

==Primary path is LLM. Fallback is deterministic rules. The demo works either way.==

---

## 9. Backend architecture — team decides

### Option A: FastAPI backend (James's proposal)

Good if someone on the team knows Python and wants clean separation between mesh logic and UI.

```
server/
  app/
    main.py
    runtime.py
    models/
      state.py, node.py, tac_event.py, compaction.py, sitrep.py
    scenarios/
      raven_gap.py, registry.py
    tacnet/
      mesh_engine.py, heartbeat_engine.py, bandwidth_policy.py,
      compaction_engine.py, sitrep_engine.py, cop_projector.py
    sentinel/
      normalizer.py, detection_engine.py, fusion_scoring.py,
      incident_engine.py, recommendation_engine.py
    evidence/
      evidence_index.py, what_changed.py
    api/
      routes.py
```

**Runtime object:**

```py
class Runtime:
    def __init__(self):
        self.state = build_initial_state()

    def step(self):
        event = scenario.next_event(self.state["meta"]["step"])
        self.state = apply_tacnet_event(self.state, event)
        self.state = run_tacnet_compaction(self.state)
        self.state = build_commander_sitrep(self.state)
        self.state = run_sentinel_pipeline(self.state)
        self.state = build_evidence_trace(self.state)
        self.state["meta"]["step"] += 1
        return self.state
```

**API endpoints:**
```
GET  /state
GET  /scenarios
POST /scenario/select
POST /simulate/start
POST /simulate/step
POST /simulate/reset
POST /simulate/run-to-end
POST /query
GET  /evidence/{id}
GET  /nodes/{id}
```

### Option B: Frontend-only (React + TypeScript)

Good if the team is frontend-heavy and wants to move fast without a server.

```
client/
  src/
    App.tsx
    api.ts          # Mock API layer (can swap to real later)
    types.ts
    hooks/
      useRuntime.ts # All state logic in a React hook
    data/
      events.json   # Synthetic scenario data
      nodes.json    # Mesh node definitions
    pages/
      TacNetDashboard.tsx
      ThreatFusionDashboard.tsx
    components/
      tacnet/...
      sentinel/...
      evidence/...
```

**State shape (shared by both options):**

```ts
type AppState = {
  scenario: { id: string; name: string; description: string };
  meta: { step: number; status: "idle" | "running" | "complete"; bandwidthMode: "normal" | "degraded" | "critical" };
  tacnet: {
    nodes: TacNode[];
    rawEvents: TacEvent[];
    compactions: Compaction[];
    commanderSitrep: CommanderSitrep | null;
    localCop: LocalCOP;
    compressionStats: { inputBytes: number; outputBytes: number; ratio: number };
    droppedEvents: TacEvent[];
  };
  sentinel: {
    normalizedEvents: NormalizedEvent[];
    signals: Signal[];
    correlation: { confidence: number; level: "low" | "medium" | "high" | "critical"; explanation: string[] };
    incident: Incident | null;
  };
  evidence: {
    traces: EvidenceTrace[];
    whatChanged: WhatChanged[];
  };
};
```

==Team decides by Hour 1. Do not spend more than 15 minutes debating this.==

---

## 10. Demo scenario: Raven Gap

### Actors

| Node | Role | Reports |
|---|---|---|
| PL-1 | Platoon leader / root | Receives compacted summaries. Asks questions. |
| SL-1 | 1st Squad leader | Receives P1-P3 reports and compacts. |
| SL-2 | 2nd Squad leader | Receives P4-P6 reports and compacts. |
| SL-3 | 3rd Squad leader | Receives P7-P9 reports and compacts. |
| V1 | Vehicle node | Silently reports location, crew, fuel/ammo. |
| D1 | Drone node | Silently reports battery, position, sensor mode. |
| S7 | Sensor post | Reports trigger history. |

### Event sequence (14 steps, ~90 second demo)

| Step | Event | Demo Purpose |
|---:|---|---|
| 1 | Mesh initializes with three squads, V1, D1, S7. | Shows command tree and baseline COP. |
| 2 | P1 reports checkpoint clear. | Raw leaf report. |
| 3 | P4 reports movement east ridge. | Conflicting local observation. |
| 4 | V1 silently reports crew green, fuel amber, location 600m west. | Passive asset visibility. |
| 5 | D1 reports battery 32%, sensor mode EO, last position. | Drone as mesh node. |
| 6 | EW degradation drops available bandwidth. | Shows graceful degradation mode. |
| 7 | SL-1 compacts 1st Squad: clear but moving slow. | Squad-level compaction. |
| 8 | SL-2 compacts 2nd Squad: possible contact east ridge. | Squad-level compaction. |
| 9 | SL-3 times out; children reparent to PL-1 or nearest live L1. | Self-healing mesh moment. |
| 10 | Sensor S7 triggers near east ridge. | Non-human node report. |
| 11 | Root generates platoon SITREP. | Main commander payoff. |
| 12 | Commander asks: "Which element needs support first?" | Natural-language query against local state. |
| 13 | TacNet answers with evidence trace. | Shows explainability. |
| 14 | Threat Fusion tab shows incident: HIGH — Movement Risk Under EW. | Sentinel Forge payoff. |

**Example commander output:**
```
SITREP: 2nd Squad has the priority risk. Possible contact east ridge,
sensor S7 triggered, drone D1 low battery. V1 is 600m west with crew
green and fuel amber. Recommend retask D1 for one pass, then recover
before battery drops below 25%.
```

---

## 11. Real hardware demo (iPhones)

### Minimum viable demo (MVD)

1. **Two iPhones** connected via BLE mesh (existing `voice-agents-hack` codebase).
2. **iPhone A**: Soldier speaks into mic → STT (Gemma 4 or whisper.cpp) → intent token → encrypt → transmit over BLE.
3. **iPhone B**: Receives → decrypt → displays text on COP map → optional TTS playback.
4. **COP on both devices**: Shows both nodes' positions, heartbeat status (GREEN/AMBER/RED), last transmission.
5. **Heartbeat**: iPhone A stops transmitting → 3 minutes later, iPhone B shows iPhone A as RED.
6. **Succession**: Promote iPhone B to ROOT after iPhone A timeout — COP updates chain of command.

### Stretch goals (if time permits)

- Vehicle/drone mock node (laptop or Raspberry Pi sending GPS + fuel status via BLE).
- Natural language query: "Where is the vehicle?" → LLM answers from local COP.
- S2 visualization: One burst sync to cloud → Squad game shows platoon positions on map.
- Threat Fusion panel: After step 14, switch to Threat Fusion tab and show incident + correlation score.

### iPhone-specific notes

- **STT**: Use existing `Cactus` + `Gemma 4 E4B` integration from `voice-agents-hack/OLD CODE`.
- **BLE**: Use existing BLE mesh implementation from the iOS prototype.
- **COP**: SwiftUI map view showing node positions. Can be simple (dots on a grid) — doesn't need real terrain.
- **TTS**: iOS system `AVSpeechSynthesizer` for demo TTS. Replace with Piper later.

==The iPhones prove the mesh works. The web simulator proves the full system at scale. Show both if possible; prioritize the iPhone demo for judges.==

---

## 12. Build priority (18-hour hackathon)

```
P0 — Must ship:
1. Shared AppState (types + initial data)
2. Scenario replay (Raven Gap events.json)
3. Mesh node state + heartbeats
4. Raw report stream
5. Commander SITREP (deterministic fallback works, LLM is bonus)
6. iPhone BLE demo (2 devices, voice → text → mesh → display)
7. Demo script + narration (90 seconds)

P1 — Should ship:
8. Compaction timeline + compression ratio
9. Reparenting animation
10. Natural-language query box
11. Threat Fusion tab (signals + incident + correlation)
12. Evidence trace / "what changed" panel

P2 — Stretch:
13. Real LLM compaction (OpenAI/Gemini)
14. Squad game visualization
15. Cloud sync + S2 burst demo
16. Vehicle/drone mock node
```

### Hour-by-hour plan

| Hour | Goal | Deliverable |
|---:|---|---|
| 0-1 | Freeze story + assign roles | Scenario locked, team roles assigned, API key obtained |
| 1-3 | Data model + scenario | `events.json`, `nodes.json`, AppState types |
| 3-5 | iPhone BLE mesh | 2 iPhones talking, voice → text display |
| 5-7 | Web simulator shell | Mesh tree, COP, raw stream, commander panel |
| 7-9 | Compaction engine | Raw reports → squad summaries → commander SITREP |
| 9-11 | iPhone + web integration | iPhone reports feed into web simulator state |
| 11-13 | Threat Fusion + evidence | Signals, incident, correlation, what changed |
| 13-14 | Query + polish | NL query, UI polish, compression stats |
| 14-15 | Demo script | 90-second narration + backup video |
| 15-16.5 | Squad / S2 tier | Squad game bridge or web-based 3D fallback |
| 16.5-18 | Rehearse | Three clean runs; cut unstable P2 features |

---

## 13. Work division (suggested team roles)

| Role | Responsibilities | Skills needed |
|---|---|---|
| **@iOS / Mesh Lead** | iPhone BLE mesh, Cactus STT integration, message envelope, encryption, heartbeat protocol | Swift, SwiftUI, CoreBluetooth, Cactus SDK |
| **@Web / Frontend Lead** | React simulator, mesh tree visualization, COP rendering, Threat Fusion panels, evidence trace | React, TypeScript, SVG/Canvas/WebGL |
| **@Backend / Integration Lead** | FastAPI runtime (if chosen) OR frontend state management, scenario engine, compaction API, LLM integration | Python/FastAPI OR React hooks, OpenAI/Gemini API |
| **@ML / AI Lead** | LLM prompt engineering, compaction tuning, NL query handling, API key management, fallback deterministic rules | Python, OpenAI API, prompt engineering |
| **@S2 / Visualization Lead** | Squad game integration (Unreal/Blueprint), cloud DB schema, burst sync protocol, RAG pipeline | Unreal Engine 5, Python, PostgreSQL |
| **@DevOps / Demo Lead** | CI/CD, demo script, video recording, backup plans, integration testing | Docker, scripting, presentation |

---

## 14. Security model

### Field mesh (Zone A)

| Layer | Mechanism |
|---|---|
| **Encryption** | AES-256-GCM, pre-shared key derived from network PIN |
| **Authentication** | Every message signed with node-specific key |
| **Replay protection** | Monotonically increasing sequence numbers |
| **Tamper detection** | GCM authentication tag |
| **Traffic analysis resistance** | Uniform packet size (~100 bytes), jittered intervals |

### Why binary tokens help

- **Uniform size**: Eavesdropper cannot distinguish urgent contact from routine heartbeat by packet length.
- **No audio leakage**: If encryption breaks, adversary gets "CONTACT FRONT 200M 3 ENEMY" — not a recording of your voice, accent, or stress level.
- **No speaker ID**: Voiceprint analysis impossible when no audio crosses the network.

### S2 uplink (Zone B)

| Layer | Mechanism |
|---|---|
| **Transport** | TLS 1.3 over Starlink / satellite IP |
| **Authentication** | mTLS with hardware-backed certificates |
| **Data classification** | FOUO / Secret — encrypted at rest in cloud DB |

---

## 15. Tech stack

### Field mesh (Zone A — iPhone demo)

| Component | Choice | Notes |
|---|---|---|
| **STT** | Gemma 4 E4B via Cactus | Existing integration in `voice-agents-hack` |
| **TTS** | iOS `AVSpeechSynthesizer` | Demo-quality; replace with Piper later |
| **Mesh transport** | BLE (iOS `CoreBluetooth`) | Existing prototype; demo only |
| **Crypto** | `libsodium` via Swift wrapper | AES-256-GCM |
| **COP** | SwiftUI map view | Simple dots-on-grid for demo |

### Web simulator (unified dashboard)

| Component | Choice | Notes |
|---|---|---|
| **Frontend** | React + TypeScript + Vite | Team preference |
| **State** | React hooks OR FastAPI backend | **Team decides by Hour 1** |
| **Styling** | Tailwind or plain CSS | Keep it minimal |
| **Visualization** | SVG/Canvas for COP | Three.js if Squad fallback needed |

### S2 tier (Zone B)

| Component | Choice | Notes |
|---|---|---|
| **Cloud LLM** | OpenAI GPT-4o-mini | Fast, cheap, sufficient for demo |
| **Cloud DB** | Supabase or PostgreSQL | Structured schema matching mesh format |
| **Squad game** | Unreal Engine 5 mod | **Needs Unreal experience on team** |
| **RAG framework** | LangChain or custom | Queries hit DB first, LLM formats answer |

---

## 16. Glossary

| Term | Meaning |
|---|---|
| **C2** | Command and Control |
| **COP** | Common Operating Picture — the map + status display |
| **S2** | Battalion Intelligence Officer/section |
| **J2** | Joint Intelligence (higher echelon) |
| **STT** | Speech-to-Text |
| **TTS** | Text-to-Speech |
| **SLM** | Small Language Model (on-device) |
| **LLM** | Large Language Model (cloud, for S2 + demo compaction) |
| **Intent token** | Compressed binary representation of a message's meaning |
| **Mesh** | Peer-to-peer network where every node relays for others |
| **Heartbeat** | Periodic status ping from every asset |
| **ATAK** | Android Tactical Assault Kit — Army's standard Android C2 platform |
| **FHSS** | Frequency-Hopping Spread Spectrum (anti-jamming) |
| **RAG** | Retrieval-Augmented Generation (LLM queries a database, doesn't hallucinate) |
| **SITREP** | Situation Report |
| **SALUTE** | Military report format: Size, Activity, Location, Unit, Time, Equipment |

---

## 17. Open questions (decide by Hour 1)

1. **Backend or frontend-only?** FastAPI + React, or pure React with `events.json`?
2. **OpenAI API key?** Who brings it? GPT-4o-mini or Gemini Flash?
3. **iOS developer?** Who owns the iPhone BLE mesh + Cactus integration?
4. **Unreal/Squad experience?** Who can build the Squad game visualization? If nobody, what's the fallback?
5. **Demo transport for web simulator?** Mock mesh (deterministic events) or attempt to bridge real iPhone BLE into the web simulator?
6. **Deterministic vs. LLM compaction ratio?** Show both? Show LLM primarily with deterministic as "degraded mode"?

==If you are blocked on any of these for more than 15 minutes, the team lead decides. Don't let perfect be the enemy of shipped.==

---

## 18. One-line reminders

- ==Field mesh is peer-to-peer. No server. No cloud. No internet.==
- ==S2 tier is an observer, not a commander.==
- ==Audio never crosses the network. Only intent tokens.==
- ==Every asset must heartbeat or be marked destroyed.==
- ==Promotion is pre-sealed, not voted.==
- ==If it doesn't work in a Faraday cage, it's not Zone A.==
- ==One app, two tabs. Not two products.==
- ==LLM is a bonus. Deterministic fallback must work first.==
- ==iPhone demo is the proof. Web simulator is the vision.==
- ==Squad game is a stretch. Web 3D map is the fallback.==
