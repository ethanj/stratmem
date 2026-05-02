#startup/tacnet #AI #career/army

# Data Flow & Open Source Landscape

==Complete walkthrough of TacNet's end-to-end data flow — audio capture → SLM transcription → mesh transmission → receiver playback — plus the open source projects already doing pieces of it, and the hard problems nobody has solved yet.==

---

## Part 1: The Exact Data Flow

### Sender side (the soldier speaking)

```
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: AUDIO CAPTURE                                       │
│  - Phone microphone records 30s voice clip                 │
│  - Raw audio: ~2 MB (PCM, 16kHz, 16-bit, mono)              │
│  - NEVER leaves the device                                   │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: ON-DEVICE STT (Gemma 4 Audio Conformer)           │
│  - Model: Gemma 4 E4B INT4 on NPU                           │
│  - Input: raw audio waveform                                 │
│  - Output: transcript text (~200 bytes)                     │
│  - Latency target: <500ms for 30s audio                   │
│  - Compression: 2MB → 200 bytes = 10,000:1                │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: BUILD MESSAGE ENVELOPE                              │
│  {                                                           │
│    id: uuid,                                                 │
│    type: "BROADCAST",                                        │
│    sender_id: "user_abc123",                                 │
│    sender_role: "RIFLEMAN",                                 │
│    parent_id: "squad_leader_456",                            │
│    tree_level: 2,                                            │
│    timestamp: "2026-05-02T14:32:10Z",                        │
│    ttl: 64,                                                  │
│    payload: {                                                │
│      location: { lat: 45.123, lon: -93.456, accuracy: 5 }, │
│      encrypted: true,                                      │
│      payload: {                                            │
│        transcript: "Contact front, 200m, 3 enemy pax"      │
│      }                                                       │
│    }                                                         │
│  }                                                           │
│  Full envelope size: ~400-500 bytes                         │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: AES-256 ENCRYPTION                                  │
│  - Pre-shared key derived from PIN-gated network join       │
│  - Encrypt the entire payload block                         │
│  - Adds ~16-32 bytes overhead (IV + auth tag)               │
│  - Encrypted size: ~450-550 bytes                           │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: MESH TRANSMISSION                                   │
│  Protocol stack:                                             │
│    - BLE (prototype): 20-byte MTU, fragmented              │
│    - Long-range radio (production): LoRa/SDR/FHSS          │
│    - ATAK (vehicle/drone): Android mesh overlay             │
│  Store-and-forward: intermediate nodes relay                 │
│  Logical filtering: siblings + parent receive; others drop │
└──────────────────────────────────────────────────────────────┘
```

### Receiver side (the squad leader hearing)

```
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: RECEIVE & DECRYPT                                   │
│  - Receive encrypted envelope from mesh                       │
│  - Decrypt with pre-shared key                               │
│  - Validate sender_id is in routing table (sibling/parent)  │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 7: RENDER & TTS                                        │
│  - Display transcript in chat panel (instant)              │
│  - Optional: feed text to on-device TTS engine             │
│    → Piper TTS or device system TTS                        │
│    → Audio plays through earpiece/headset                  │
│  - Latency: <200ms for TTS playback                        │
└──────────────────────────────────────────────────────────────┘
```

### Compaction layer (the AI summarization upward)

```
┌──────────────────────────────────────────────────────────────┐
│  STEP 8: PARENT NODE COMPACTION (if receiver is parent)     │
│  - Queue child messages (transcripts + metadata)            │
│  - Feed into Gemma 4 with summarization prompt:            │
│    "Summarize squad status. SALUTE format. ≤18 words."    │
│  - Output: compacted summary (~100-150 bytes)               │
│  - Propagate upward to parent node                         │
│  - Latency target: 1-2s from last child message            │
└──────────────────────────────────────────────────────────────┘
```

### Vehicle/drone status (automated, no voice)

```
┌──────────────────────────────────────────────────────────────┐
│  AUTOMATED ASSET STATUS FLOW                                 │
│                                                              │
│  Vehicle ATAK tablet / drone controller:                   │
│  1. GPS + telemetry → structured tuple                     │
│     { asset_id, asset_type, lat, lon, status, battery }    │
│  2. No STT needed (already text)                           │
│  3. Build envelope with type: "BROADCAST"                  │
│  4. Same encryption + mesh transmission                    │
│  5. Commander's COP renders on map + status panel            │
│                                                              │
│  Size: ~300-400 bytes (smaller than voice transcripts)    │
└──────────────────────────────────────────────────────────────┘
```

---

## Part 2: Open Source Projects — What's Already Built

### Layer A: On-Device Speech-to-Text

| Project | License | What it does | Relevance to TacNet |
|---|---|---|---|
| **whisper.cpp** (ggml-org) | MIT | OpenAI Whisper in C/C++ — runs on CPU, fully offline | The gold standard for edge STT. ~1-2GB models, runs on phone CPU, decent accuracy. Could replace Gemma 4 audio conformer for STT-only. |
| **Piper TTS** (rhasspy) | MIT | Fast local neural TTS — Raspberry Pi capable | Perfect for receiver-side TTS. ~50-100MB models, realtime on phone CPU. |
| **OpenWhispr** | Open source | Cross-platform offline dictation with Whisper + cloud BYOK | Similar concept but consumer-focused. Useful reference for UI patterns. |
| **Canary** (NVIDIA) | Commercial/free | State-of-the-art edge ASR, multilingual | Higher accuracy than Whisper but bigger models. Research direction. |
| **Kokoro TTS** | MIT | Lightweight neural TTS, high quality | Alternative to Piper. Smaller models, good military-style voice potential. |
| **Bark** (Suno) | MIT | Generative neural TTS with emotion/intonation | Overkill for TacNet. Good for reference but too heavy/slow for tactical. |
| **Vosk** | Apache 2.0 | Lightweight STT — 50MB models, works offline | Older architecture, lower accuracy. Not competitive with Whisper for TacNet quality bar. |

**Bottom line**: ==whisper.cpp + Piper TTS gives you 90% of the STT→TTS pipeline for free.== Gemma 4's native audio conformer is the differentiator because it does STT + summarization in one model — Whisper can't summarize.

### Layer B: Mesh Networking & Transport

| Project | License | What it does | Relevance to TacNet |
|---|---|---|---|
| **Meshtastic** | GPL v3 | LoRa mesh network — text messages, GPS, offline | The most mature open source mesh. ATAK plugin exists. Encryption included. **Direct competitor** to TacNet at the transport layer — but no AI, no semantic compression. |
| **MeshCore** | Open | Alternative LoRa mesh protocol, SMS-like | Newer, smaller community. Simpler than Meshtastic. |
| **OpenThread** | BSD | 802.15.4 mesh (Google/Nest ecosystem) | Wrong frequency band for tactical. Good reference for mesh routing algorithms. |
| **BATMAN-adv** | GPL | Layer-2 mesh routing for WiFi | Requires WiFi radios. Not applicable to long-range tactical. |
| **goTenna** SDK | Proprietary | Commercial mesh messaging SDK | Paid, proprietary. Not open source but the closest commercial analog. |
| **Akita MeshTAK** (ATAK plugin) | Open | ATAK plugin for Akita Mesh BLE/USB devices | Directly relevant — shows how to bridge mesh hardware into ATAK. Code pattern for TacNet's ATAK integration. |
| **Meshtastic ATAK Plugin** | GPL | Official Meshtastic plugin for ATAK-Civ | Sends Cursor-on-Target (CoT) over Meshtastic mesh. **Directly applicable** — we could fork this for our message types. |
| **blackbox_node** | Open | Meshtastic + local AI + Bitcoin payments + TAK | Interesting hybrid — mesh + AI + ATAK. Closest open source project to our concept, but scope-creeped with Bitcoin. |

**Bottom line**: ==Meshtastic is the 800-lb gorilla. It solves the mesh, encryption, and ATAK integration. What it lacks is the SLM layer — no transcription, no summarization, no semantic compression.== That's TacNet's entire moat.

### Layer C: Semantic Compression & On-Device LLM

| Project | License | What it does | Relevance to TacNet |
|---|---|---|---|
| **llama.cpp** (ggml-org) | MIT | Run LLaMA/Gemma/Phi on CPU/GPU — the engine | The inference engine that powers most edge LLMs. Cactus (TacNet's runtime) is likely built on similar ggml primitives. |
| **MLC-LLM** | Apache 2.0 | Universal edge LLM deployment — Android, iOS, web | Could replace Cactus for cross-platform deployment. Supports Gemma, Phi, Mistral. |
| **MediaPipe LLM** (Google) | Apache 2.0 | On-device LLM for Android/iOS — Gemma support | Google's official on-device Gemma runner. Potentially more stable than Cactus for production. |
| **Semantic Compression paper** (Gilbert et al., arXiv 2304.12512) | Research | LLM-based semantic compression for text | Academic foundation. Shows LLMs can compress text ~10x while preserving meaning. Not a product. |
| **Quarkus Semantic Compression** | Open | LangChain4j plugin — auto-summarizes chat history | Consumer pattern. Summarizes when token count exceeds threshold. Similar concept to our compaction layer. |
| **MLLM-Token-Compression** | Research | Survey of multimodal LLM token compression | Research direction. Relevant for compressing vision + audio into fewer tokens. |

**Bottom line**: ==Nobody has built an open source "semantic compression over mesh" system. llama.cpp gives you the engine, but the application layer — STT → summarization → intent token → mesh → TTS — is uncharted.== That's the gap.

### Layer D: End-to-End Encryption for Mesh

| Project | License | What it does | Relevance to TacNet |
|---|---|---|---|
| **Signal Protocol** (Double Ratchet) | GPL v3 | E2E encryption for messaging — forward secrecy | Gold standard for messaging crypto. Meshtastic uses a simplified version. We should study their approach. |
| **Noise Protocol Framework** | Public domain | Modern crypto handshake framework (used by WireGuard) | Cleaner, more modern than Signal for pre-shared key scenarios. Good fit for TacNet's PIN-derived key model. |
| **Libsodium** | ISC | Modern crypto library — NaCl successor | The implementation layer. AES-256-GCM, X25519, Ed25519. Standard choice. |

---

## Part 3: The Challenges Nobody Has Solved

### Technical challenges

| Challenge | Why it's hard | Severity |
|---|---|---|
| **STT accuracy under gunfire / rotor noise** | Whisper and Gemma 4 conformer are trained on clean audio. Combat audio is the worst case: gunfire, engine noise, shouting, radio squeal. | 🔴 Critical — if STT fails, the whole pipeline fails |
| **STT latency on battery power** | Gemma 4 E4B INT4 needs ~2.8GB VRAM. On Apple NPU it's fast; on Qualcomm/MediaTek NPU (production Android) it's untested. | 🔴 Critical — >1s STT latency breaks conversation flow |
| **TTS that sounds like a soldier, not a robot** | Piper/Kokoro are generic voices. Tactical TTS needs military brevity register, calm-under-fire tone, and male/female voice options. | 🟡 Hard — affects adoption but not function |
| **Message ordering across multi-hop mesh** | Store-and-forward means messages arrive out of order. A parent can't summarize children if messages arrive jumbled. Need vector clocks or sequence numbering. | 🔴 Critical — breaks compaction layer |
| **Fragmentation for >500 byte payloads** | BLE MTU is 20 bytes. LoRa payloads are ~200 bytes. Any message >200 bytes must be fragmented, transmitted, reassembled, and decrypted across multiple hops. | 🟡 Hard — adds complexity and failure modes |
| **Mesh topology changes during operation** | A node dies → children reparent → message routing changes mid-flight. In-flight messages may be lost or misrouted during the transition. | 🟡 Hard — requires careful state machine design |
| **GPS accuracy in urban canopy / indoors** | ATAK-grade positioning needs <5m accuracy. GPS alone fails indoors and in dense urban environments. Need UWB or visual-inertial odometry as fallback. | 🟡 Hard — affects COP accuracy, not mesh function |
| **Power consumption for continuous mesh + SLM** | Running SLM inference + radio TX/RX + GPS + screen on a phone burns battery fast. Soldiers carry power banks, but it's a logistics concern. | 🟡 Hard — affects field endurance |
| **Model download/update in denied environments** | Gemma 4 E4B is ~6.7GB. Downloading over satcom or pre-staging on SD cards is a deployment logistics problem. | 🟡 Hard — affects deployment, not runtime |

### Architectural challenges

| Challenge | Why it's hard | Severity |
|---|---|---|
| **Compaction timing: when does a parent summarize?** | Wait too long = stale SITREP. Summarize too fast = incomplete picture. Need adaptive timing based on message velocity + urgency flags. | 🔴 Critical — core product behavior |
| **Conflict resolution: two nodes claim the same slot** | Race condition in mesh claiming. "Organiser wins" is simple but what if organiser is offline? Need consensus or CRDT approach. | 🟡 Hard — affects mesh join UX |
| **COP state consistency across the mesh** | Commander's tablet and squad leader's tablet both render the COP. If they see different states, trust breaks. Need CRDT or operational transform for map state. | 🟡 Hard — affects command confidence |
| **Natural language query against local COP database** | "Where is my closest MEDEVAC?" requires embedding the query, semantic search over local mesh state, and generating an answer. All on-device, all offline. | 🟡 Hard — needs vector DB on phone + SLM RAG |
| **Higher-HQ bridge: what syncs, when, how much?** | Burst-sync 500 messages over Iridium = expensive and slow. Need delta compression, priority queuing, and graceful degradation when the link is intermittent. | 🟡 Hard — affects higher-HQ integration |

### Operational / adoption challenges

| Challenge | Why it's hard | Severity |
|---|---|---|
| **Soldier training: new UI in combat** | Every second spent thinking about the app is a second not spent fighting. UI must be muscle-memory simple. Push-to-talk is the right pattern; anything else is cognitive load. | 🔴 Critical — adoption killer |
| **Integration with existing radios** | The Army has SINCGARS, PRC-152, PRC-163. TacNet doesn't replace them on day one. It must interoperate or be carried alongside. That's two devices per soldier initially. | 🟡 Hard — affects field trial acceptance |
| **Classification and COMSEC** | FOUO/Secret voice on a consumer iPhone requires the USB-C dongle crypto module. Dongle certification (NSA CSfC, etc.) is a 12-18 month process. | 🟡 Hard — affects DoD deployment timeline |
| **ATAK plugin certification** | ATAK plugins require Army testing and approval. The plugin architecture is documented but the approval process is not fast. | 🟡 Hard — affects production deployment |
| **Spectrum allocation for LoRa/SDR** | Using LoRa in military spectrum requires frequency coordination. SDR/FHSS needs crypto-allocated hopsets. Can't just use ISM bands in a warzone. | 🟡 Hard — affects legal radio operation |

---

## Part 4: How Open Source Accelerates TacNet

### What we should use (don't reinvent)

| Component | Open Source Choice | Why |
|---|---|---|
| **STT fallback / prototyping** | whisper.cpp | Proven, fast, MIT license. Use while Gemma 4 audio conformer is being validated. |
| **TTS** | Piper TTS | 50-100MB models, realtime on phone CPU, MIT license. Perfect for tactical voice playback. |
| **Mesh transport (research)** | Meshtastic | Study their routing, encryption, and ATAK plugin. Fork the ATAK plugin for our message types. |
| **Encryption primitives** | libsodium | Standard, audited, ISC license. AES-256-GCM + X25519 for key exchange. |
| **Edge LLM runtime** | llama.cpp / MLC-LLM | Research alternative to Cactus for Android/ATAK deployment. Cross-platform is a requirement. |
| **ATAK plugin scaffolding** | Meshtastic ATAK-Plugin | Fork and modify for our envelope format. Proves the integration pattern. |

### What nobody has built (our moat)

| Component | Status | Why it's ours alone |
|---|---|---|
| **STT + summarization in one model** | Gemma 4 E4B | Single-model pipeline: audio → transcript → compacted summary. No open source model does both well on-device. |
| **Semantic compression for tactical domain** | TacNet-specific | Ranger Handbook fine-tune, SALUTE/SITREP/ACE/LACE output schemas. Domain-specific, not generic summarization. |
| **Mesh-native compaction layer** | TacNet-specific | Parent nodes auto-summarize children only when enough messages queued, then propagate upward. Time-aware, urgency-aware. No open source equivalent. |
| **COP consensus over mesh** | TacNet-specific | Mesh nodes replicate map state collectively. CRDT-based operational picture that survives any single node failure. Meshtastic has GPS sharing; not a full COP. |
| **Intent-token protocol** | TacNet-specific | Standardized envelope format where voice, vehicle telemetry, drone status, and sensor triggers all compress into the same semantic token structure. Open standard ambition. |

---

## Part 5: Pre-Seed Realistic Scope

Given the challenges above, here's what's actually achievable in 12 months with $1M:

### Must prove (pre-seed)
1. **whisper.cpp STT** on iPhone + Android (ATAK) — <1s latency for clean audio
2. **Piper TTS** for receiver playback — military brevity voice tuning
3. **Meshtastic mesh** for transport — LoRa hardware, proven range, ATAK plugin forked
4. **Single-level compaction** — squad leader summarizes 3 squad members' transcripts
5. **COP on ATAK** — map rendering of mesh nodes (people + one mock vehicle)
6. **One NL query** — "Where is the vehicle?" answered from local COP

### Should prove (STTR Phase I)
1. **Gemma 4 E4B** on Android NPU — replace whisper.cpp with unified model
2. **Noise-robust STT** — gunfire/rotor audio dataset, fine-tuned model
3. **Multi-hop mesh** with ordering guarantees — vector clocks or sequence numbers
4. **Real vehicle node** — ATAK tablet in MN Guard Humvee, GPS + status broadcasting
5. **Classification dongle prototype** — USB-C crypto module, unclassified/FOUO validation

### Phase II+
1. SDR/FHSS transport — partner with radio prime
2. Full NL query RAG — vector DB + SLM on device
3. Multi-platoon mesh — 50+ nodes, stress testing
4. COMSEC certification — NSA CSfC or equivalent

## Related
- [[architecture]] — mesh topology and transport layers
- [[product spec]] — message protocol and routing rules
- [[technical moat]] — on-device AI and semantic compression
- [[primary c2 ecosystem]] — full system scope
- [[solution]] — how the data flow solves operational problems
- [[tacnet homepage]]
- [[product homepage]]
