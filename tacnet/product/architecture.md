#startup/tacnet #AI

# TacNet Architecture (High-Level)

==Every device runs the same software. The tree configuration determines its role.==

## Network shape — platoon / company mesh

All nodes — dismounted soldiers, vehicle crews, drone operators — are first-class mesh participants. They communicate directly through the MASH network using long-range radio or ATAK. Only higher-HQ assets above company level (artillery, Air Force coordination) bridge in from outside.

```
                         ┌─────────────┐
                         │ HIGHER HQ   │  ← occasional satellite backhaul
                         │  (SATLINK)  │     for artillery, air support,
                         └──────┬──────┘     joint fires coordination
                                │  (HOP_ACK confirms receipt)
                                │
                ┌───────────────┼───────────────┐
                │  HIGHER-HQ BRIDGE (occasional)  │
                │   Artillery │ Air │ Fires      │
                └───────────────┼───────────────┘
                                │  higher-hq asset tokens
                       ┌────────┴────────┐
                       │   ROOT NODE     │  Commander / COP device
                       │  (Tablet / ATAK)│  renders: all platoon assets
                       └────────┬────────┘
                                │  compacted summaries from L1
              ┌─────────────────┼─────────────────┐
         ┌────┴────┐       ┌────┴────┐       ┌────┴────┐
         │ L1 NODE │       │ L1 NODE │       │ L1 NODE │   Squad / section leaders
         │(incl. V1│       │(incl. D1│       │         │   V1 = vehicle crew node
         └────┬────┘       └────┬────┘       └────┬────┘   D1 = drone operator node
              │                 │                 │
         ┌────┼────┐       ┌────┼────┐       ┌────┼────┐
       ┌─┴─┐┌─┴─┐┌─┴─┐   ┌─┴─┐┌─┴─┐┌─┴─┐   ┌─┴─┐┌─┴─┐┌─┴─┐
       │ P4││ P5││ P6│   │ P7││ P8││ P9│   │P10││P11││P12│   Dismounted soldiers
       └───┘└───┘└───┘   └───┘└───┘└───┘   └───┘└───┘└───┘   (leaf nodes)
```

- **Vehicles** (Humvee, JLTV) and **drones** are platoon assets — they run TacNet on an ATAK tablet or mounted display and participate in the mesh as regular nodes, not external gateways.
- **Higher-HQ bridge** is the only external interface — occasional burst-sync for artillery, air support, joint fires. The mesh operates independently; HQ sync is opportunistic, not required.
- **The COP** (commander's tablet / ATAK plugin) renders all mesh data into a unified picture — fully offline, reconstructed from the mesh.
- See [[primary c2 ecosystem]] for the full evolution.

## Transport stack

| Phase | Transport | Use case |
|---|---|---|
| **Prototype (now)** | BLE mesh | iOS development and hackathon demos only |
| **Production — dismounted** | Long-range radio (LoRa/SDR/FHSS) | Soldier-to-soldier, soldier-to-leader |
| **Production — vehicle / drone** | ATAK + tactical radio | Crew-to-crew, crew-to-dismounted |
| **Production — commander** | ATAK tablet | COP rendering, natural-language query |
| **Higher-HQ bridge** | Satellite backhaul (opportunistic) | Burst-sync with artillery, air support |

==BLE is prototype-only. The production transport is long-range radio and ATAK.==

## Two layers running in parallel

### Layer 1 — Broadcast (radio replacement)
- Leaf pushes talk → records audio locally → on-device STT → **transcript text** is what crosses the mesh.
- ==Audio is **never** transmitted over the radio — only transcript text.== This keeps bandwidth minimal and avoids streaming complexity.
- Visibility scope: sender's **siblings + immediate parent**. Cousins and grandparents filter it out at the app layer.

### Layer 2 — Compaction (AI summarization upward)
- Each parent node runs Gemma 4 locally on the queued child transcripts and track data.
- ==Output: one compact summary per parent, propagated upward.==
- Root node compacts the L1 summaries into a top-level SITREP.
- Latency target: **1–2 seconds** from last child message to summary emission.

## Mesh properties
- Fully decentralized, no server, no internet.
- Store-and-forward — messages hop through intermediates.
- All nodes physically receive all messages; **logical filtering** happens in the app layer based on the tree.
- Conflict resolution on race conditions: **organiser wins**.
- Auto-reparenting: 60s timeout on parent disconnect → children find nearest live ancestor and the tree rebroadcasts.

## On-device AI stack (per device)
- **Cactus runtime** (INT4 on Apple NPU / Qualcomm NPU) wrapping Gemma 4 E4B.
- **Two-step pipeline**:
  1. Mic → Gemma 4 audio conformer → transcript text.
  2. Queued transcripts + track data → Gemma 4 → compacted summary.
- Model weights (~6.7 GB INT4) downloaded on first launch, not bundled.
- See [[technical moat]] for the moat-level details.

## Security
- **End-to-end encryption** on all messages, AES-256, pre-shared key derived during PIN-gated network join.
- Every message envelope auto-embeds **GPS** (lat / lon / accuracy) for shared situational awareness.

## Roles
- **Organiser** — builds the tree drag-and-drop, names nodes, sets PIN, publishes the network. Can promote any participant to organiser mid-op.
- **Participant** — joins, claims a node, push-to-talks. Vehicle crews and drone operators are participants with their own nodes.
- See [[product spec]] for message-type and protocol details.

## Related
- [[tacnet homepage]]
- [[product spec]]
- [[technical moat]]
- [[solution]]
