# MeshNode Integration — Decision Doc

Source repo: `../voice-agents-hack/AryaaBluetoothMesh/` (sibling).

## Verdict

This is a genuine asset *and* a genuine scope risk. Use it **only if at least one teammate has already built MeshNode on a phone or owns the 4 iPhones** — otherwise the setup tax (Cactus build + 7 GB Gemma weights + xcframework gymnastics) eats most of Day 1.

If you do use it, it transforms the hybrid story from "command + simulated field agents on a laptop" into **"command + real edge devices running offline on-device AI"** — a step-function upgrade for xTech military-impact scoring.

**Default recommendation:** Option B (steal `soul.md`) unconditionally. Add Option C (phone as demo prop) if any teammate has phones already working. Avoid Option A unless you have ≥6 hours of integration buffer and a confirmed working build.

---

## What MeshNode actually is

Not a prototype — a complete iOS app:

- **Bluetooth mesh** between 4 iPhones (`Mesh/MeshCentral.swift`, `MeshPeripheral.swift`, `MeshManager.swift`, `MeshCrypto.swift`, `MeshCache.swift`). Full peer-to-peer, no infrastructure.
- **On-device LLM**: Gemma 4 E2B via the Cactus runtime. ~5 GB weights. Runs offline (`LLM/LLMService.swift`, `Cactus.swift`).
- **On-device STT**: Parakeet/Conformer for voice transcription (`LLM/STTService.swift`).
- **Voice ingest**: hold-to-talk mic → STT → on-device summarization (`Audio/`, `LLM/OutputPostProcessor.swift`).
- **Hierarchical routing graph** (`graph.json`): A↔B exact, B↔C exact down + summary up, B↔D exact down + summary up. **This is literally a command tree.**
- **Recon module** (`Recon/`): camera + heading + range + target fusion. Building toward "soldier-mounted sensor → mesh → command picture."
- **TTS earpiece output** (`Audio/TTSService.swift`): output is audio for *another* operator's earpiece, not a screen.
- **`soul.md`** — a 153-line doctrinal system prompt for the on-device LLM. Compression rules ("max 18 words for leader earpiece," "Negative. Count UNK"), SALUTE/SITREP/ACE/LACE schemas, Ranger Handbook recall. Better than anything we'd write from scratch for the Commander Brief prompt.
- **Storyboard** documents a 60-second demo video already designed around the same A/B/C/D node identities.

---

## How it maps to the Command-vs-Field-Agent hybrid

Almost too well — the architecture *predicts* MeshNode:

| Hybrid layer | Sentinel Forge has | MeshNode has |
|---|---|---|
| **Command Console** | FastAPI fusion engine, dashboard, mitigation loop | Node A (HQ) and B (Platoon Lead) views |
| **Field Agents** | Domain-tagged signals (cyber/physical/osint), simulated | **Real iPhones** running on-device LLM |
| **Belief lifecycle** | (we were going to add this) | Implicit in exact/summary routing |
| **"What changed" up the chain** | (planned) | `summary` edges literally compress chatter for command |
| **"Verbatim orders" down** | (we hadn't designed this) | `exact` edges already do this |
| **LLM commander brief** | Multi-provider router with heuristic fallback | Gemma + `soul.md` doctrinal prompt |
| **Voice/audio** | None | STT in + TTS out, full loop |

The hybrid plan treats "Field Agents" as React panels in a left rail. **MeshNode replaces those panels with real phones.** That's not just polish — it's a fundamentally different demo.

---

## Three integration options

### Option A — Full integration (high reward, high risk)

- 1–2 iPhones run MeshNode in the field-agent role.
- Build a thin HTTP bridge: a Mac (or one designated phone) listens for mesh broadcasts and POSTs them as events to a new `/events/inject` endpoint on Sentinel Forge.
- Sentinel Forge's existing pipeline runs — voice from phone becomes a SITREP-shaped event, gets normalized, detected, fused, lights up the Commander Console.
- Demo flow: Soldier on iPhone says *"Two contacts, 200 meters, suppressed by Bravo"* → STT on-device → Gemma summarizes per `soul.md` → mesh broadcast → bridge → Sentinel Forge → belief updates → Commander Console reflects.

**Cost:** ~4–6 hours if MeshNode already builds clean on someone's machine. ~12+ hours if not.
**Reward:** xTech-level differentiator. Problem Statements 2 (edge) AND 3 (mission C2) simultaneously, on real hardware.

### Option B — Cherry-pick `soul.md` only (low risk, modest reward)

- Drop the Swift/Bluetooth/Cactus stack entirely.
- Take the `soul.md` doctrinal prompt and use it as the system prompt for Sentinel Forge's existing `OpenAIAgent` and `OllamaAgent`.
- Adapt the SALUTE/SITREP/ACE schemas as the structured-output format for the Commander Brief.
- Commander briefs read like real military comms instead of generic AI text.

**Cost:** ~30 min.
**Reward:** Pitch quality goes up materially. Judges hear "EKIA," "CASEVAC," "Niner-line staging" instead of "the system has detected anomalous behavior."

### Option C — Phone as static demo prop (medium risk, high reward, lowest ambition)

- Don't integrate live. The phone runs alongside the laptop demo.
- Mid-pitch, point to the phone and say "and here's a real field-deployable version running offline" → press mic → Gemma answers a question on-screen.
- The phone doesn't talk to Sentinel Forge; complementary demos with a unified narrative.

**Cost:** ~1 hour (rehearse with the phone running).
**Reward:** Credibility story without integration risk. If MeshNode crashes during the live demo, skip the prop and lose nothing.

---

## Recommendation

**Do Option B unconditionally** — `soul.md` is too good not to steal, and it's a 30-minute win.

**Do Option C if anyone on the team has the phones working today.** Highest-reward / lowest-risk. The phone is a hardware prop that elevates the pitch without adding a single integration risk to the laptop demo.

**Do Option A only if both:**

1. Someone on the team has the MeshNode iOS app builds-and-runs on their phone today.
2. You're willing to pre-allocate 6 hours of Day 1 to the bridge layer + a fallback.

The reason A is risky isn't the bridge — that's straightforward FastAPI. It's that **iOS + Cactus + Gemma weights + Bluetooth permissions on iOS** is the kind of stack that fails 30 minutes before pitch time. If A breaks at 17:30 the day-of, you have nothing.

The asymmetric move is **B + C**: fast doctrine adoption, phone as a credibility prop, zero risk to the hero demo.

---

## Tactical note: command tree mapping

If you pick A or C, the existing `graph.json` (A↔B exact, B↔C/D exact-down/summary-up) is **already the right shape** for STRATMEM's command tree. Don't redesign it. Map:

| MeshNode node | xTech / STRATMEM role |
|---|---|
| **A** | HQ / Tactical Commander |
| **B** | Platoon Lead (the demo "eye") |
| **C** | Drone analyst (Raven-2) — generates summaries up |
| **D** | RF/SITREP analyst (Sensor Alpha / Team Bravo) |

The convoy/Route Blue scenario from the STRATMEM doc lands cleanly on this exact graph.

---

## Appendix A — Bridge design (only if Option A)

Minimum viable bridge between MeshNode and Sentinel Forge.

### Architecture

```
[iPhone C: Drone Analyst]    [iPhone D: RF Analyst]
      voice + STT                  voice + STT
          │                            │
          ▼                            ▼
       Gemma summarizes per soul.md (on-device)
          │                            │
          └──── BLE mesh broadcast ────┘
                       │
                       ▼
            [iPhone B: Platoon Lead]
            receives summaries via mesh
                       │
                       │  HTTP POST (over WiFi or USB tether)
                       ▼
        ┌───────────────────────────────┐
        │  Sentinel Forge backend       │
        │  POST /events/inject          │
        │  → normalize → detect → fuse  │
        │  → Commander Console (laptop) │
        └───────────────────────────────┘
```

### New endpoint to add to Sentinel Forge

```python
# server/app/api/routes/inject.py

class InjectedEvent(BaseModel):
    type: str                    # e.g. "physical.drone", "osint.sitrep"
    source: str                  # e.g. "mesh-node-C"
    domain: str                  # "physical" | "cyber" | "osint"
    severity: str                # "low" | "medium" | "high"
    message: str                 # the summarized SITREP from Gemma
    metadata: dict[str, Any] = {}
    geospatial: dict[str, float] | None = None

@router.post("/events/inject")
def inject_event(payload: InjectedEvent):
    state = store.append_event(payload.dict())
    state = run_and_apply_pipeline(state)
    return store.replace(state)
```

### iOS side — what node B needs to do

Add a small `BridgeService.swift` to MeshNode that:

1. Subscribes to incoming summarized mesh messages on node B.
2. On each new summary, POSTs an `InjectedEvent` JSON to `http://<laptop-ip>:8000/events/inject`.
3. No retry logic, no queueing — fire-and-forget. If the laptop is unreachable, the mesh keeps working independently.

The laptop and iPhone B share a WiFi network (or USB tether) for the bridge call. **The mesh itself stays Bluetooth and offline** — only the bridge call uses WiFi. This preserves the "the field never depends on infrastructure" story.

### Event-shape mapping

Gemma's `soul.md`-formatted output → Sentinel Forge event:

| Gemma output | Mapped event |
|---|---|
| `"OP1 SITREP: foyer clear, one EKIA."` | `type: "osint.sitrep", source: "mesh-node-C", domain: "osint", message: <as-is>` |
| `"CONTACT north 200 two suppressed."` | `type: "physical.contact", domain: "physical", severity: "high", message: <as-is>` |
| `"CASEVAC: one urgent WIA, leg."` | `type: "physical.casevac", domain: "physical", severity: "critical", message: <as-is>` |

Add corresponding detection rules in `detection/rules/` so these signals fuse into the existing correlation/incident model. Each rule is ~20–30 lines.

### Fallback if A breaks

If the bridge fails during the demo:

1. Drop to manual scenario replay (existing Sentinel Forge flow).
2. Keep the phones visible but treat them as Option C (props).
3. Pitch script swaps "watch this voice ingest live" for "and these phones are running the same agent stack offline — here's a recording of a live ingest from earlier."

Pre-record a 10-second backup video of the voice ingest working end-to-end. Always have the backup ready.

---

## Decision deadline

Make this call by **Hour 1** of Day 1. If nobody has phones building cleanly by Hour 1, drop A and commit to B + C. Do not let this decision drift to Hour 4 — the integration cost compounds with every hour you delay.
