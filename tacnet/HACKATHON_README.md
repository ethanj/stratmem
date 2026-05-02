# TacNet — Hackathon Project README

==Single source of truth for the team. Read this before writing any code.==

## 1. What we are building

**TacNet** is a platoon-level command and control (C2) signal platform that collects intel from personnel and assets in real time, compresses it into bandwidth-tolerant binary tokens, and propagates it across a decentralized mesh — all while keeping battalion-level S2/J2 intelligence sections informed through an external uplink.

### The core promise

> A platoon leader can see where every soldier, vehicle, and drone is, hear what they are reporting, and query the network with natural language — even when satellite, cloud, and higher HQ are completely jammed or offline. When connectivity returns, the S2 shop sees the same picture the platoon leader saw, in real time.

---

## 2. Two zones — don't confuse them

This architecture has **two distinct operational zones**. Mixing them up will kill the project scope.

### Zone A — The Field Mesh (peer-to-peer, fully offline)

| Property | Value |
|---|---|
| **Users** | Dismounted soldiers, vehicle crews, drone operators, platoon leader |
| **Network** | Peer-to-peer mesh — no server, no cloud, no internet |
| **Transport** | Long-range radio (LoRa / SDR / FHSS) or ATAK tactical network |
| **AI** | Small on-device models (Gemma 4 E4B, INT4, runs on phone/ATAK tablet NPU) |
| **Data** | Compressed binary intent tokens — audio becomes text becomes metadata becomes bytes |
| **Range** | Platoon / company level (~20–50 personnel + vehicles + drones) |
| **Key rule** | If the battalion disappears, the field mesh keeps working. Zero dependency on external connectivity. |

### Zone B — The S2 Uplink (external connectivity required)

| Property | Value |
|---|---|
| **Users** | S2 (Battalion Intelligence), J2 (Joint Intelligence), higher HQ |
| **Network** | Starlink, satellite backhaul, or any external pipe when available |
| **Transport** | Burst-sync — not real-time streaming. Data ships when the link exists. |
| **AI** | Powerful cloud LLM (OpenAI GPT-4o / Gemini 2.5 Pro) for analysis, visualization, and Q&A |
| **Data** | Full mesh state — every node's position, status, and history |
| **Key rule** | Zone B is an **observer and analyst**, not a commander. Orders still flow down through normal military channels. Zone B sees what the platoon saw, after the fact or during intermittent sync. |

==Zone A is a self-contained operating system. Zone B is a read-only mirror with analytics.==

---

## 3. The data pipeline (how intel moves)

### For voice reports (soldier speaks)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Soldier    │ ──► │  On-Device   │ ──► │   Metadata   │ ──► │   Binary     │
│   Speaks     │     │  STT (Gemma) │     │   + GPS      │     │   Intent     │
│  (audio)     │     │              │     │   + Status   │     │   Token      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
     ~2 MB                ~200 bytes           ~400 bytes         ~50-100 bytes
                           (10,000:1
                            compression)
```

Then: encrypt (AES-256) → transmit over mesh → decrypt → render on receiver's map/chat → optional TTS playback.

### For asset status (vehicle, drone, sensor)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Asset      │ ──► │  Telemetry   │ ──► │   Structured │ ──► │   Binary     │
│   (GPS,      │     │   Parser     │     │   Tuple      │     │   Intent     │
│   battery)   │     │  (ATAK/auto) │     │   (JSON)     │     │   Token      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

Same encryption, same mesh, same size class as a voice report.

---

## 4. The mesh architecture (command structure)

The mesh follows the **actual Army chain of command**. Not a tech abstraction — a military one.

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
| Soldier / vehicle (LEAF) | No promotion needed — mesh routes around the dead node | Parent stops receiving heartbeat, marks RED |

==Promotion is not an election. It is a pre-designated chain of command sealed in the network join handshake.==

---

## 5. Asset heartbeat protocol

Every asset — soldier, Humvee, drone, sensor post — sends a **heartbeat** at a regular interval (default: every 30 seconds).

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

## 6. S2 / J2 visualization tier (Zone B)

When Starlink or external connectivity is available, the Platoon Leader's device (or a designated uplink node) performs a **burst sync** to the S2 shop.

### What the S2 sees

- Full mesh state: every asset's position history, every voice transcript, every status change
- **Squad** (Steam game) as a **live 3D battlefield visualization** — terrain, unit positions, movement trails, contact reports
- Natural language query interface:
  - "Show me all RED assets in 1st Platoon in the last 4 hours"
  - "What was the last transmission from Drone Alpha before it went AMBER?"
  - "Plot the movement path of Squad 2 since 0600Z"
- **No hallucination guarantee**: answers are retrieved from the structured mesh database, not generated from model weights. The LLM is a query engine and renderer, not a storyteller.

### How it works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Platoon     │ ──► │  Burst Sync  │ ──► │   S2 Cloud   │ ──► │   S2 Squad   │
│  Mesh State  │     │  (Starlink)  │     │   Database   │     │   (Steam /   │
│  (local DB)  │     │  (opportun.) │     │   (OpenAI    │     │   Web viz)    │
└──────────────┘     └──────────────┘     │   or Gemini) │     └──────────────┘
                                           └──────────────┘
```

- **Burst sync**: compressed delta of changes since last sync — not a constant stream. Works even on intermittent satellite.
- **Cloud DB**: PostgreSQL or similar, structured schema matching the mesh intent-token format.
- **LLM layer**: GPT-4o or Gemini 2.5 Pro with retrieval-augmented generation (RAG) — queries hit the DB first, then the LLM formats the answer.
- **Squad visualization**: Unreal Engine 5 map ( Squad game terrain) with overlays for friendly positions, contact reports, and asset status.

==The S2 does not command the platoon. The S2 observes, analyzes, and briefs higher. The platoon leader retains tactical command at all times.==

---

## 7. Security model

### Field mesh (Zone A)

| Layer | Mechanism |
|---|---|
| **Encryption** | AES-256-GCM, pre-shared key derived from network PIN + hardware-bound key (dongle or TPM) |
| **Authentication** | Every message signed with node-specific key derived from the pre-shared key + node ID |
| **Replay protection** | Monotonically increasing sequence numbers per node; old packets rejected |
| **Tamper detection** | GCM authentication tag — any bit-flip in transit causes rejection |
| **Traffic analysis resistance** | Uniform packet size (~100 bytes), uniform transmission interval (jittered ±20%), no metadata leakage |

### Why binary tokens help security

- **Uniform size**: Every packet is the same small size. An eavesdropper cannot distinguish "urgent contact report" from "routine heartbeat" by packet length.
- **No audio leakage**: If encryption is somehow broken, the adversary gets "CONTACT FRONT 200M 3 ENEMY" — not a recording of your voice, accent, stress level, or background noise.
- **No speaker identification**: Voiceprint analysis is impossible when no audio crosses the network.

### S2 uplink (Zone B)

| Layer | Mechanism |
|---|---|
| **Transport** | TLS 1.3 over Starlink / satellite IP |
| **Authentication** | mTLS with hardware-backed certificates (dongle or device TPM) |
| **Data classification** | FOUO / Secret — encrypted at rest in cloud DB, access controlled by unit crypto fills |

---

## 8. Tech stack (proposed — team decides)

### Field mesh (Zone A)

| Component | Option A | Option B | Decision needed |
|---|---|---|---|
| **On-device STT** | Gemma 4 E4B (our model) | whisper.cpp (fallback) | **→** @ML lead |
| **On-device TTS** | Piper TTS | Kokoro TTS | **→** @ML lead |
| **Mesh transport** | Custom over LoRa/SDR | Meshtastic fork | **→** @RF lead |
| **ATAK integration** | ATAK plugin (Java/Android) | Standalone Android app | **→** @Mobile lead |
| **Crypto** | libsodium (AES-256-GCM) | Custom (don't) | **→** @Security lead |
| **COP rendering** | ATAK map overlay | Custom OpenGL/WebGL | **→** @Mobile lead |

### S2 tier (Zone B)

| Component | Option A | Option B | Decision needed |
|---|---|---|---|
| **Cloud LLM** | OpenAI GPT-4o | Gemini 2.5 Pro | **→** @S2 lead |
| **Cloud DB** | PostgreSQL + PostGIS | Supabase | **→** @Backend lead |
| **Visualization** | Squad (Steam) mod/plugin | Custom Unreal/WebGL | **→** @S2 lead |
| **Burst sync protocol** | Custom delta compression | rsync-inspired | **→** @Backend lead |
| **RAG framework** | LangChain | LlamaIndex | **→** @S2 lead |

---

## 9. Work division (suggested team roles)

| Role | Responsibilities | Skills needed |
|---|---|---|
| **@ML Lead** | On-device STT (Gemma/whisper.cpp), on-device TTS (Piper), intent-token format definition, model quantization (INT4) | Python, ONNX, TensorFlow Lite, CoreML, ggml |
| **@RF / Mesh Lead** | Mesh networking protocol, LoRa/SDR bring-up, packet fragmentation/reassembly, store-and-forward routing, heartbeat protocol | C/C++, LoRa, SDR (GNU Radio), network protocols |
| **@Mobile / ATAK Lead** | ATAK plugin development, COP map rendering, Android NDK, UI/UX for tactical use (gloves, low-light, stress) | Java/Kotlin, Android, ATAK SDK, OpenGL |
| **@Security / Crypto Lead** | Key derivation, AES-256-GCM implementation, sequence number management, anti-replay, PIN-based network join | libsodium, cryptography, secure coding |
| **@Backend / S2 Lead** | Cloud DB schema, burst sync API, OpenAI/Gemini integration, RAG pipeline, Squad game visualization bridge | Python/Node, PostgreSQL, OpenAI API, Unreal modding |
| **@DevOps / Integration Lead** | CI/CD, test harness, mesh simulation environment, integration testing between zones | Docker, Python, networking, testing |

---

## 10. Hackathon deliverables (what we demo)

### Minimum viable demo (MVD)

1. **Two Android devices** (or ATAK tablets) connected via mesh (BLE acceptable for demo, LoRa preferred).
2. **Device A**: Soldier speaks into mic → STT → intent token → encrypt → transmit.
3. **Device B**: Receives → decrypt → displays text on COP map → optional TTS playback.
4. **COP**: Shows both nodes' positions, heartbeat status (GREEN/AMBER/RED), and last transmission.
5. **Heartbeat**: Device A stops transmitting → 3 minutes later, Device B shows Device A as RED.
6. **Succession**: Promote Device B to ROOT after Device A timeout — COP updates chain of command.

### Stretch goals (if time permits)

- Vehicle/drone mock node (laptop or Raspberry Pi sending GPS + fuel status).
- Natural language query: "Where is the vehicle?" → SLM answers from local COP.
- S2 visualization: One burst sync to cloud → Squad game shows platoon positions on map.
- Jamming demo: Third device broadcasts noise on mesh frequency — mesh routes around it, packets still arrive.

---

## 11. Glossary (terms we use constantly)

| Term | Meaning |
|---|---|
| **C2** | Command and Control |
| **COP** | Common Operating Picture — the map + status display |
| **S2** | Battalion Intelligence Officer/section |
| **J2** | Joint Intelligence (higher echelon) |
| **STT** | Speech-to-Text |
| **TTS** | Text-to-Speech |
| **SLM** | Small Language Model (on-device) |
| **LLM** | Large Language Model (cloud, for S2) |
| **Intent token** | Compressed binary representation of a message's meaning |
| **Mesh** | Peer-to-peer network where every node relays for others |
| **Heartbeat** | Periodic status ping from every asset |
| **ATAK** | Android Tactical Assault Kit — the Army's standard Android C2 platform |
| **FOUO** | For Official Use Only (unclassified but sensitive) |
| **FHSS** | Frequency-Hopping Spread Spectrum (anti-jamming) |
| **RAG** | Retrieval-Augmented Generation (LLM queries a database, doesn't hallucinate) |

---

## 12. Open questions (decide ASAP)

1. **STT model**: Gemma 4 E4B (unified STT+summarization) or whisper.cpp (proven, faster)?
2. **Mesh transport**: Custom protocol or fork Meshtastic?
3. **Demo transport**: BLE (easier) or LoRa (more impressive)?
4. **S2 visualization**: Squad game mod or web-based Three.js?
5. **Cloud LLM**: OpenAI or Gemini? (affects API keys, rate limits, cost)
6. **Heartbeat interval**: 30 seconds? 60 seconds? Shorter = more traffic but faster MIA detection.
7. **Crypto key rotation**: Static per mission or rotating? How often?
8. **Device count for demo**: 2? 4? 10? (affects mesh routing complexity)

==If you are blocked on any of these for more than 30 minutes, ask in the group chat and the team decides. Don't let perfect be the enemy of shipped.==

---

## 13. Reference documents

- [[architecture]] — full mesh topology and message protocol
- [[product spec]] — message envelope format, routing rules, `HEARTBEAT` type definition
- [[data flow and open source landscape]] — STT options, mesh options, crypto options
- [[primary c2 ecosystem]] — full system scope and phased build path
- [[solution]] — primary C2 operating system framing
- [[technical moat]] — semantic compression and on-device AI details

---

## 14. One-line reminders

- ==Field mesh is peer-to-peer. No server. No cloud. No internet.==
- ==S2 tier is an observer, not a commander.==
- ==Audio never crosses the network. Only intent tokens.==
- ==Every asset must heartbeat or be marked destroyed.==
- ==Promotion is pre-sealed, not voted.==
- ==If it doesn't work in a Faraday cage, it's not Zone A.==
