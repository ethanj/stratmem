#startup/tacnet

# The Solution — Primary C2 Operating System

==TacNet is the primary command-and-control operating system for platoon and company-level operations in contested environments — fully off-grid, decentralized, and the single source of truth for everything a commander needs to know.==

## Core ideas
- **Primary C2**: legacy systems assume constant cloud connectivity. TacNet assumes connectivity is the exception and still delivers full situational awareness.
- **Decentralized**: no servers, no cloud, no internet dependency. The COP (Common Operating Picture) lives on-device, reconstructed from the mesh.
- **Self-healing**: nodes auto-reparent if the parent goes down; the battlespace picture survives the loss of any single device.
- **Hardware-agnostic**: the same software runs on commodity phones (dismounted), ATAK tablets (vehicle-mounted), and long-range radio rigs. Vehicles and drones are mesh nodes just like people.
- **Semantic, not syntactic**: instead of moving raw bytes, move **intent** — voice transcripts, vehicle tracks, drone telemetry, and sensor triggers all compress into the same token format.

## Three data layers
TacNet runs three parallel layers over the same mesh — see [[architecture]] for the full diagram and [[primary c2 ecosystem]] for the expanded scope.

1. **Broadcast layer** — replaces the platoon radio. Push-to-talk, transcript-only over long-range radio or ATAK, audio plays locally.
2. **Compaction layer** — on-device AI rolls up child messages (voice + tracks + sensors) into squad summaries that propagate to the commander.
3. **Higher-HQ bridge** — occasional burst-sync with assets above company level (artillery, Air Force coordination) via satellite backhaul when available. The mesh does not depend on it.

## Every asset is a silent reporter
- Every vehicle, drone, and sensor post is a **mesh node** — same software stack as a dismounted soldier.
- They passively broadcast GPS, status, and telemetry as structured mesh messages at regular intervals.
- The commander sees it **on the local COP without asking**: vehicle positions, drone battery, sensor triggers, crew status.
- No human in the loop required. The commander knows where every asset is and what state it is in — in real time, fully offline.

==This solves the current radio problem where a commander must call over voice and wait for a human to respond. In a firefight, the driver is driving and the drone operator is flying — nobody answers the radio. TacNet removes that dependency entirely.==

## What the commander sees (the local-first COP)

Even when satellites, cloud, and higher HQ are completely blacked out:
- **Every soldier's** position, last voice summary, health status
- **Every vehicle's** GPS, crew status, cargo manifest — tracked as a mesh node
- **Every drone's** last known position, sensor mode, battery — tracked as a mesh node
- **Every sensor's** trigger history
- **AI-synthesized answers** to natural-language queries: "where is my closest MEDEVAC?"

==The COP is not a server dashboard. It is a consensus state that the mesh maintains collectively.==

## Why it replaces current C2

| Dimension | Legacy C2 (Palantir TITAN, RTX MAINGATE) | TacNet |
|---|---|---|
| Connectivity assumption | Constant satellite / cloud | Assumes denial; works at near-zero bandwidth |
| Cost per seat | $15–25K hardware + $50K+ software | Software on commodity device |
| Cognitive load | Raw feed overload (dozens of screens) | AI-synthesized summaries, natural-language query |
| Survivability | Single point of failure (server, cloud) | Mesh replicates state; lose any node, picture survives |
| Portability | Vehicle-mounted racks | Fits in a pocket; runs on anything |

## Aligned with Mosaic Warfare
- DoD doctrine is shifting from **monolithic, expensive platforms** to **disaggregated, attritable (disposable) systems**.
- TacNet is a textbook fit: cheap, redundant, software-defined, no single point of failure — the primary C2 operating system for the platoon and company edge.

## Related
- [[tacnet homepage]]
- [[problem]]
- [[architecture]]
- [[technical moat]]
- [[primary c2 ecosystem]]
