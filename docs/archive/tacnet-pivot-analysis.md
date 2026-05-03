# TacNet Pivot Analysis

Date: 2026-05-02  
Source docs: `tacnet/`

## Executive Summary

TacNet is a stronger fit for the judges' latest guidance than the prior STRATMEM concept because it can be framed around a specific role, a specific operational failure, and a specific technical innovation.

The strongest framing is not "primary C2 operating system" for the hackathon. That is the long-term company vision. The strongest hackathon wedge is:

> TacNet is a low-bandwidth AI staff layer for platoon leaders operating under comms denial. It turns raw voice, position, and asset telemetry from the squad mesh into compact SITREPs and a local common operating picture without cloud, satellite, or constant human radio checks.

This gives the team a clear judge-facing story:

- **Role:** platoon leader or small-unit commander.
- **Problem:** overloaded voice nets and missing asset status during EW-contested operations.
- **Innovation:** semantic compression over a self-healing mesh, with on-device AI summarization up the command tree.
- **Demo:** many raw subordinate reports collapse into a commander-level SITREP and local COP under simulated bandwidth degradation.

The old STRATMEM belief lifecycle can still be useful, but it should become a supporting feature: "why did the commander summary change?" TacNet should lead.

## Core Judge Fit

The judges are looking for innovation against a very specific problem for a specific role. TacNet maps cleanly.

| Judge Need | TacNet Answer |
|---|---|
| Specific role | Platoon leader / company edge commander operating forward of reliable network connectivity. |
| Specific problem | Cannot monitor 30-50 voice/status feeds, query vehicles/drones/sensors manually, or rely on satellite/cloud under EW pressure. |
| Innovation | AI-native semantic compression over mesh: raw voice/status/telemetry becomes intent tokens and compact SITREPs. |
| Working demo path | Simulated platoon mesh, degraded comms, raw reports, squad compaction, local COP, natural-language query. |
| Military relevance | Addresses tactical edge C2, radio scaling, asset visibility, and comms denial without entering autonomous targeting. |

## Long-Term Vision

TacNet's long-term vision is a primary command-and-control operating system for platoon and company-level operations in contested environments.

### Long-Term Product Definition

TacNet is a decentralized, AI-native communication and situational-awareness layer where every soldier, vehicle, drone, and sensor is a mesh node. The commander sees a local-first COP generated from replicated mesh state, not from a cloud server.

Long-term product pillars:

1. **Primary C2 at the tactical edge**
   - Works when cloud, satellite, LTE, and higher HQ are intermittent or unavailable.
   - Runs at platoon/company level, not battalion/brigade staff echelon.
   - Makes every organic asset visible without a manual radio check.

2. **Protocol-agnostic mesh**
   - Prototype transport: BLE for iOS/hackathon development.
   - Production transport: long-range radio, LoRa, SDR/FHSS, ATAK-adjacent tactical radio workflows.
   - The semantic layer stays stable while the transport changes.

3. **On-device AI**
   - Audio and status data are processed locally.
   - Raw audio/video should not leave the device in the intended architecture.
   - AI compaction runs at squad/section leaders and root commander nodes.

4. **Semantic compression**
   - TacNet moves intent, not raw bytes.
   - A voice report becomes transcript text, doctrine-shaped summary, or an intent token.
   - Lower data requirements let the network survive lower channel capacity and worse signal-to-noise conditions.

5. **Self-healing command tree**
   - Nodes are arranged by tactical role: root commander, L1 squad/section leaders, leaf soldiers, vehicle/drone/sensor nodes.
   - Parent timeout triggers reparenting.
   - Root commander can reconstruct the local COP from replicated state.

6. **Asset visibility by default**
   - Vehicles report GPS, crew status, cargo/role, and operational state.
   - Drones report position, sensor mode, heading, and battery.
   - Sensors report triggers and last observation.
   - Commander gets this passively.

### Long-Term Architecture

```text
leaf soldier / vehicle / drone / sensor node
  -> local capture or telemetry tuple
  -> on-device extraction / transcription
  -> encrypted TacNet envelope
  -> mesh transport
  -> squad/section compaction
  -> root commander compaction
  -> local COP + commander query interface
```

Representative envelope:

```json
{
  "id": "uuid",
  "type": "BROADCAST | COMPACTION | TREE_UPDATE | COP_SYNC | ASSET_STATUS",
  "sender_id": "P7",
  "sender_role": "RIFLEMAN",
  "parent_id": "SQUAD_2",
  "tree_level": 2,
  "timestamp": "2026-05-02T14:32:10Z",
  "ttl": 64,
  "payload": {
    "location": { "lat": 45.123, "lon": -93.456, "accuracy": 5 },
    "encrypted": true,
    "payload": {
      "transcript": "Contact front, 200 meters, three enemy personnel"
    }
  }
}
```

### Long-Term Moat

TacNet's defensibility is not "we have a mesh" or "we have an LLM." Those are increasingly common. The defensibility is the combination:

- Tactical hierarchy-aware routing.
- On-device multimodal processing.
- Doctrine-shaped summarization.
- Semantic compression tuned for military reports.
- Mesh-native state replication.
- Hardware-agnostic transport path.
- Operator credibility and field-test access.

The strongest technical phrase:

> Semantic compression over tactical mesh.

That is more memorable and more specific than "AI-native C2."

### Long-Term Roadmap

| Phase | Goal | Build |
|---|---|---|
| Phase 0 | Prove the loop | Web/iOS demo, simulated mesh, voice/status compaction, commander COP. |
| Phase 1 | Prove field feasibility | BLE or Meshtastic/LoRa prototype, multi-phone test, single-level squad compaction. |
| Phase 2 | Prove military integration | ATAK plugin alpha, long-range radio transport, vehicle/drone mock nodes, field exercise. |
| Phase 3 | Prove resilience | Multi-hop ordering, reparenting under node loss, bandwidth degradation tests, replicated COP. |
| Phase 4 | Scale to acquisition | STTR/SBIR, university partner, formal pilot, security/compliance path, IP filing. |

### Long-Term Risks

| Risk | Why It Matters | Mitigation |
|---|---|---|
| STT accuracy under tactical noise | Bad transcription breaks the full pipeline. | Demo with clean/simulated audio first; later collect noisy training/eval set. |
| Battery and thermal load | Continuous AI + GPS + radio may drain phones quickly. | Use push-to-talk and event-based compaction, not always-on inference in early versions. |
| Message ordering across mesh | Out-of-order reports can produce wrong summaries. | Add sequence numbers and parent-level compaction windows. |
| COP state consistency | Different nodes seeing different state destroys trust. | Use append-only event log first, CRDT-style state later. |
| ATAK/plugin complexity | Production customer expects ATAK/Android path. | Treat ATAK as post-hackathon roadmap unless a teammate already owns it. |
| Classification/COMSEC | Consumer devices cannot casually handle classified payloads. | Keep hackathon at unclassified synthetic data; propose dongle/security boundary later. |

## Hackathon Vision

The hackathon should not attempt to build the long-term product. It should demonstrate the smallest loop that proves the innovation.

### Hackathon Product Definition

TacNet Hackathon MVP is a browser-based micro-C2 simulator:

> A platoon leader watches a local mesh continue functioning under comms degradation. Raw subordinate voice/status reports and asset telemetry are compressed into squad summaries, a commander SITREP, and a local COP. The system shows what got through, what was dropped, what was compacted, and why the commander answer changed.

This can be built as a web app with synthetic data. It does not need real BLE, iOS, Cactus, Gemma, ATAK, or LoRa to win.

### Hackathon User

Primary user:

- Platoon leader operating a dismounted platoon with attached vehicle and drone assets.

Secondary users:

- Squad leaders who receive raw leaf reports and forward compacted summaries.
- Vehicle/drone operators whose devices silently report status.

Do not pitch to:

- Battalion S2/S3 staff.
- Theater-level C2.
- SOC analyst.
- Kill-chain automation team.

### Hackathon Problem

One specific operational moment:

> The platoon is moving under EW pressure. Satellite and cloud reach-back are unavailable. The leader has three squads, one vehicle, and one drone. Reports arrive as short voice/status bursts. The leader cannot listen to every report or query every asset manually while making a movement/support decision.

The demo should make three pain points visible:

1. Raw reports are too many and too noisy.
2. Bandwidth degradation means not every message can be sent in full.
3. Asset status must be passive because humans are busy.

### Hackathon Innovation Claim

TacNet does not just display messages. It transforms tactical communications into a low-bandwidth, AI-compacted command state.

Core innovation claims:

- **Semantic compression:** send intent summaries rather than raw voice/audio.
- **Command-tree compaction:** squad nodes summarize child reports before root receives them.
- **Local-first COP:** commander state is reconstructed from mesh messages, not cloud APIs.
- **Graceful degradation:** when bandwidth drops, TacNet sends smaller summaries instead of going blind.
- **Evidence trace:** commander can inspect which raw reports supported the SITREP.

### Hackathon Demo Scenario

Scenario name:

> Raven Gap: Platoon Movement Under EW Degradation

Actors:

| Node | Role | Reports |
|---|---|---|
| PL-1 | Platoon leader / root | Receives compacted summaries and asks questions. |
| SL-1 | 1st Squad leader | Receives P1-P3 reports and compacts. |
| SL-2 | 2nd Squad leader | Receives P4-P6 reports and compacts. |
| SL-3 | 3rd Squad leader | Receives P7-P9 reports and compacts. |
| V1 | Vehicle node | Silently reports location, crew, fuel/ammo status. |
| D1 | Drone node | Silently reports battery, position, sensor mode. |
| S7 | Sensor post | Reports trigger history. |

Event sequence:

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

Example commander output:

```text
SITREP: 2nd Squad has the priority risk. Possible contact east ridge, sensor S7 triggered, drone D1 low battery. V1 is 600m west with crew green and fuel amber. Recommend retask D1 for one pass, then recover before battery drops below 25%.
```

### Hackathon UI

Use a practical command-console layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ TACNET | Contested Edge Micro-C2 | START / STEP / RESET      │
├───────────────┬─────────────────────────────┬────────────────┤
│ Mesh Tree     │ Local COP                    │ Commander SITREP│
│ - PL root     │ - squads                     │ - latest summary │
│ - squads      │ - vehicle                    │ - priority risk  │
│ - leaf nodes  │ - drone                      │ - ask/answer     │
│ - reparenting │ - sensor                     │ - evidence trace │
├───────────────┴───────────────┬─────────────┴────────────────┤
│ Raw Reports / Event Stream    │ Compaction Timeline           │
│ voice/status/asset telemetry  │ raw -> squad -> commander     │
└───────────────────────────────┴──────────────────────────────┘
```

Required panels:

1. **Mesh Tree**
   - Shows root, squad leaders, leaves, vehicle, drone, sensor.
   - Shows node health and parent/child links.
   - Shows reparent event visibly.

2. **Local COP**
   - Simple tactical board, not necessarily real map.
   - Shows squads, vehicle, drone, sensor.
   - Shows EW/bandwidth state.

3. **Raw Reports**
   - Shows incoming reports in order.
   - Labels voice-derived, asset telemetry, sensor trigger, compaction.
   - Shows payload size estimate.

4. **Compaction Timeline**
   - Shows raw child reports becoming squad summaries.
   - Shows squad summaries becoming commander SITREP.
   - Shows compression ratio or "bytes avoided."

5. **Commander SITREP**
   - Shows current top-level summary.
   - Shows priority element.
   - Shows evidence trace.
   - Shows natural-language query answer.

### Hackathon Build Architecture

Recommended: frontend-only React/TypeScript simulator.

```text
events.json
  -> replay engine
  -> mesh state reducer
  -> compaction engine
  -> bandwidth policy
  -> COP projection
  -> commander brief generator
  -> React dashboard
```

Core TypeScript types:

```ts
type NodeRole =
  | "PL"
  | "SQUAD_LEADER"
  | "RIFLEMAN"
  | "VEHICLE"
  | "DRONE"
  | "SENSOR";

type TacNode = {
  id: string;
  label: string;
  role: NodeRole;
  parentId: string | null;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  location: { x: number; y: number };
  lastSeenStep: number;
};

type TacEvent = {
  id: string;
  step: number;
  type: "VOICE" | "ASSET_STATUS" | "SENSOR_TRIGGER" | "COMPACTION" | "TREE_UPDATE" | "EW";
  senderId: string;
  targetId?: string;
  rawText?: string;
  compactedText?: string;
  payloadBytes: number;
  priority: "LOW" | "MEDIUM" | "HIGH";
  evidenceIds: string[];
};

type Compaction = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  inputEventIds: string[];
  summary: string;
  inputBytes: number;
  outputBytes: number;
  doctrineFormat: "SITREP" | "SALUTE" | "ACE" | "FREE_TEXT";
};
```

Compaction can be deterministic for the demo. Do not make an LLM required.

```ts
function compactReports(events: TacEvent[], nodeId: string): Compaction {
  // Deterministic rules:
  // - contact/sensor triggers outrank routine status
  // - asset amber/red status appears in summary
  // - drone battery below threshold appears in summary
  // - output is capped to one short SITREP
}
```

### Hackathon Scope

P0:

- Synthetic scenario replay.
- Mesh tree view.
- Local COP tactical board.
- Raw report stream.
- Deterministic squad compaction.
- Deterministic commander SITREP.
- Bandwidth degradation mode.
- Reparenting event.
- Evidence trace from SITREP to raw reports.
- Reset/replay.

P1:

- Natural-language query box with constrained query options.
- Payload byte chart and compression ratio.
- Node detail drawer.
- "What changed since last SITREP" panel.

P2:

- Real microphone transcription.
- Real local LLM.
- BLE simulation across multiple browser tabs/devices.
- ATAK/Meshtastic concept import/export.

Do not build:

- Real RF.
- Real BLE mesh.
- Real ATAK plugin.
- Real drone integration.
- Real encryption.
- Real classified/security workflow.
- Kill-chain or targeting logic.

### Hackathon Acceptance Tests

The demo is successful when:

- Replay runs from start to finish in under 2 minutes.
- At least 12 events arrive in deterministic order.
- At least 3 raw reports compact into a squad summary.
- At least 2 squad summaries compact into a commander SITREP.
- A vehicle and drone report silently without human query.
- Bandwidth degradation changes what is transmitted.
- One node drops and children reparent.
- Commander answer cites evidence IDs.
- Reset and replay work twice.
- No copy suggests targeting or engagement.

### 18-Hour Hackathon Plan

| Hour | Goal | Deliverable |
|---:|---|---|
| 0-1 | Freeze story | One persona, one scenario, one demo path. |
| 1-3 | Data model + scenario | `events.json`, `nodes.json`, deterministic event list. |
| 3-5 | Replay engine + mesh reducer | Start/step/reset, node status, reparenting. |
| 5-7 | Compaction engine | Raw reports -> squad summaries -> commander SITREP. |
| 7-9 | UI shell | Mesh tree, COP, raw stream, commander panel. |
| 9-11 | Bandwidth + evidence | Compression ratio, payload policy, evidence trace. |
| 11-13 | Query + polish | Constrained query, "which element needs support first?" |
| 13-14 | Demo script | 90-second narration and one backup path. |
| 14-15 | Recording | Backup video. |
| 15-16.5 | README/submission | Setup, safety boundary, future work. |
| 16.5-18 | Rehearse | Three clean runs; cut unstable P1/P2. |

## Relationship To STRATMEM

STRATMEM's belief lifecycle should not lead the new pitch, but it can strengthen TacNet if scoped carefully.

Useful STRATMEM concepts:

- Evidence lineage.
- "What changed" deltas.
- Stale or superseded assumptions.
- Commander brief sections.

TacNet version:

| STRATMEM Concept | TacNet Adaptation |
|---|---|
| Belief lifecycle | SITREP / COP state changes with evidence trace. |
| Evidence drawer | Click commander summary to see raw reports and compactions. |
| Collection recommendation | Retask drone / query vehicle / ask squad leader for ACE report. |
| Stale assumptions | Node last-seen timeout and stale asset status. |

Do not use STRATMEM language heavily in the pitch. "Belief lifecycle" is less direct than "the commander knows which squad needs support and why."

## Messaging

### One-Liner

TacNet compresses platoon voice and asset telemetry into low-bandwidth command intent so leaders keep a local operating picture when the cloud and satellite are gone.

### 20-Second Pitch

Platoon leaders cannot listen to 30 voice channels, manually query every vehicle and drone, and maintain command when EW breaks reach-back. TacNet turns every soldier, vehicle, drone, and sensor into a mesh node, then uses on-device AI to compact raw reports into squad summaries and a commander SITREP. It is C2 that degrades gracefully instead of going blind.

### 90-Second Demo Script

1. "This is a platoon under EW degradation. The leader has three squads, a vehicle, a drone, and a sensor post."
2. "Raw reports arrive from the edge. In today's radio workflow, these compete for the leader's attention."
3. "TacNet keeps the reports local and compacts them at the squad level before they reach the commander."
4. "The vehicle and drone silently report status. The commander does not have to ask while crews are busy."
5. "Now bandwidth drops and a squad leader goes offline. TacNet re-parents the tree and switches to smaller intent summaries."
6. "The commander gets one SITREP with an evidence trace. The system recommends a collection/support action, not engagement."

### Closing Line

Most C2 systems fail when the network fails. TacNet assumes the network will fail and still gives the platoon leader a usable command picture.

## Pitch Boundaries

Say:

- "Simulated mesh."
- "Prototype transport."
- "Synthetic tactical scenario."
- "Deterministic compaction for demo reliability."
- "Future path to on-device models and ATAK."

Avoid:

- "Autonomous targeting."
- "Kill-chain automation."
- "Works on real Army radios today" unless actually proven.
- "Combat-ready."
- "Classified data."
- "Replaces all C2" in the hackathon context.

## Open Technical Questions

Before implementation, the team should answer:

1. Are we building a web-only simulator or using any existing iOS prototype?
2. Do we have actual prototype code available locally?
3. Can one teammate own domain language and scenario realism?
4. Is the demo judged live, recorded, or both?
5. Do judges reward hardware/network demos, or is software simulation acceptable?
6. Do we want to show "semantic compression math" visually, or keep it as pitch support?

## Recommendation

Pivot to TacNet for the hackathon, but narrow the scope aggressively.

The winning hackathon product is not the full TacNet company vision. It is:

> A platoon-leader micro-C2 simulator showing that local AI compaction over a degraded mesh gives a commander a usable SITREP and asset picture when normal comms collapse.

Build that loop first. Add real audio, BLE, or model integration only after the simulator is stable.

## Source Notes

Local TacNet docs used:

- `tacnet/strategy/problem.md`
- `tacnet/strategy/solution.md`
- `tacnet/product/architecture.md`
- `tacnet/product/product spec.md`
- `tacnet/product/technical moat.md`
- `tacnet/product/primary c2 ecosystem.md`
- `tacnet/product/data flow and open source landscape.md`
- `tacnet/reference/natsec hackathon 3 assessment.md`
- `tacnet/pitch deck/pitch deck.md`
- `tacnet/pitch deck/pitch deck (YC style).md`

External validation checked on 2026-05-02:

- Cactus Gemma 4 docs: `https://docs.cactuscompute.com/latest/blog/gemma4/`
- Cactus Swift SDK docs: `https://docs.cactuscompute.com/v1.14/apple/`
- NVIDIA Gemma 4 overview: `https://developer.nvidia.com/blog/bringing-ai-closer-to-the-edge-and-on-device-with-gemma-4/`
- Meshtastic ATAK Plugin: `https://github.com/meshtastic/ATAK-Plugin`

These sources support the general feasibility of on-device multimodal models and ATAK/Meshtastic-style mesh integration. They do not prove TacNet's field performance, combat-noise STT accuracy, battery profile, or Army deployability. Those should remain roadmap claims unless measured.
