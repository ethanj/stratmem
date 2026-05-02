#startup/tacnet

# TacNet Product Spec — Key Decisions

==Distilled from the 21 design decisions in `DECISIONS.md` and the protocol section of `Orchestrator.md`.==

## Platform
- **iOS 18.6+**, native Swift / SwiftUI.
- **iPhone 15+** (8 GB RAM minimum to host Gemma 4 E4B INT4 ~2.8 GB VRAM).
- Cactus SDK as a vendored **XCFramework** (no SPM/CocoaPods).

## Message envelope
```
{
  id: uuid,
  type: BROADCAST | COMPACTION | CLAIM | RELEASE | TREE_UPDATE | PROMOTE | CLAIM_REJECTED
        | EXTERNAL_TRACK | EXTERNAL_COMPACTION | COP_SYNC | HOP_ACK,
  sender_id, sender_role, parent_id, tree_level, timestamp, ttl,
  payload: {
    location: { lat, lon, accuracy },   // auto-embedded GPS
    encrypted: true,                    // AES-256, pre-shared key
    payload: { transcript | summary | external_track | cop_delta | hop_status | ... }
  }
}
```

## Routing rules (app layer)

| Type | Sender | Plays / displays on |
|---|---|---|
| `BROADCAST` | Any node | Sender's siblings + sender's parent |
| `COMPACTION` | Intermediate / root | That node's parent only |
| `CLAIM` / `RELEASE` | Any | Tree state — organiser arbitrates |
| `TREE_UPDATE` | Organiser (or auto on reparent) | All nodes |
| `PROMOTE` | Organiser | Target node becomes new organiser |
| `EXTERNAL_TRACK` | Gateway node | Sender's siblings + sender's parent (like `BROADCAST`) |
| `EXTERNAL_COMPACTION` | Gateway or section leader | Parent only (like `COMPACTION`) |
| `COP_SYNC` | Any node (on request or periodic) | Root-ward; target node reconstructs full COP |
| `HOP_ACK` | Gateway node | Parent only — confirms sat backhaul succeeded |

## External asset payload (`EXTERNAL_TRACK`)
Normalized metadata tuple for higher-HQ assets that bridge into the mesh from outside the company/platoon scope:
```
{
  asset_id: string,           // e.g., "ARTY-01" or "CAS-F16"
  asset_type: "ARTILLERY" | "AIR_SUPPORT" | "JOINT_FIRES" | "MANUAL",
  source_system: "VMF" | "COT" | "MANUAL",
  lat: number, lon: number, alt?: number,
  timestamp: ISO8601,
  status: "GREEN" | "AMBER" | "RED" | "OFFLINE",
  payload_summary?: string     // free-text, e.g., "battery 60%, ordinance remaining 4x JDAM"
}
```

==All data compresses into the same intent-token format as voice.== An artillery call-for-fire update and a soldier's voice transcript consume identical mesh bandwidth after compression.

## Higher-HQ bridge role
- Occasional burst-sync node that bridges higher-HQ assets (artillery, air support, joint fires) into the mesh when satellite connectivity exists.
- Runs standard TacNet software + **parser module** for one military data standard (Cursor-on-Target XML as pre-seed target).
- Parses external feed → normalized tuple → feeds into local Gemma 4 → emits `EXTERNAL_TRACK` or `EXTERNAL_COMPACTION`.
- Emits `HOP_ACK` on confirmed delivery to higher HQ.
- ==The mesh operates fully without the bridge. HQ sync is opportunistic, not required.==

## The 21 decisions (summary)
- iOS 16+ minimum target (current code at 18.6) for prototype
- Real Cactus SDK, no mocks
- Audio stays local — **only transcript text crosses the mesh**
- No internet, no STT fallback (Cactus / Gemma only)
- Compaction latency target 1–2s
- Drag-and-drop tree builder for organiser
- Full message history with search (SwiftData)
- Organiser can promote any node mid-op
- Organiser wins on conflict
- Auto-reparenting on parent timeout (60s)
- E2E encryption, AES-256, PIN-derived key
- GPS auto-embedded in every message
- Single Gemma 4 E4B for both STT and summarization (no Whisper)
- Same model on every device for MVP
- Two-step pipeline: transcribe → compact
- Model weights downloaded on first launch (~6.7 GB)
- Full spec, no MVP cuts (3+ days build, 4+ test iPhones)
- XCTest for logic, manual device testing for mesh/AI
- Five-milestone build: Foundation → Tree & Roles → Comms Core → Full UX → Resilience

## Persona / TTS
- The on-device SLM speaks in a **Ranger-style brevity register** — fine-tuned on the Ranger Handbook (TC 3-21.76) using LoRA on Gemma.
- Output rules enforce SALUTE / SITREP / ACE / LACE / 9-line MEDEVAC / contact-flash schemas, with hard limits (≤18 words for leader earpiece, ≤12 for peer routing).
- Single bonded operator per device. No cloud. Mesh or nothing.

## Related
- [[tacnet homepage]]
- [[architecture]]
- [[technical moat]]
