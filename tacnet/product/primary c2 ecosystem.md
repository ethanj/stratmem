#startup/tacnet #career/army #AI

# Primary C2 Ecosystem

==TacNet is the primary command-and-control operating system for platoon and company-level operations in contested environments. Every dismounted soldier, vehicle crew, and drone operator is a node in a self-healing mesh. The commander sees the full picture — positions, status, AI-synthesized summaries — fully off-grid. Higher-HQ assets (artillery, air support) bridge in only when satellite connectivity exists; the mesh operates independently.==

## Scope: platoon and company level

- **Target customer**: platoon-level special operations and area-of-operations (AO) commanders.
- **Unit size**: 20–50 personnel across 2–4 squads/sections, plus vehicles and drones organic to the platoon.
- **Not in scope**: battalion/brigade staff sections, theater-level C2, multi-domain operations above company level.

==Platoons and small company elements are the units that most often lose connectivity in contested environments. They are also the units least served by current C2 systems, which are built for battalion+ staff with server racks and satellite uplinks.==

## What the mesh contains

Every asset organic to the platoon or company is a first-class mesh node:

| Node type | Hardware | Role in mesh |
|---|---|---|
| **Dismounted soldier** | Phone or ATAK-enabled device | Leaf node; push-to-talk, position, status |
| **Vehicle crew** | ATAK tablet in Humvee / JLTV | Internal node (can be parent for dismounted squads it carries); GPS, crew status, cargo manifest |
| **Drone operator** | ATAK tablet or controller | Internal node; drone position, sensor mode, battery, heading |
| **Sensor post** | Ruggedized node or relay | Internal node; trigger alerts, observation reports |
| **Commander** | ATAK tablet or tablet | Root node; receives all compactions, renders COP |

==Vehicles and drones are platoon assets. They communicate directly through the MASH network just like dismounted soldiers. They are not external gateways.==

## What bridges from outside

Only assets **above company level** connect from outside the mesh:

| Asset type | Bridge mechanism | When it connects |
|---|---|---|
| **Artillery** | Cursor-on-Target or VMF via sat backhaul | Call-for-fire requests, shot notifications |
| **Air support / CAS** | JREAP or CoT via sat backhaul | 9-line, situation updates, BDA |
| **Joint fires coordination** | Military data standard via sat backhaul | Targeting, clearance, deconfliction |
| **Higher-HQ SITREP** | Burst-sync via sat backhaul | Periodic or on-demand when connectivity exists |

==The mesh does not depend on any of these bridges. It operates fully offline. Bridges are opportunistic — when satellite is available, the mesh absorbs the external data; when it's not, the platoon's internal picture is still complete.==

## Transport stack

| Phase | Transport | Use case |
|---|---|---|
| **Prototype (now)** | BLE mesh | iOS development and hackathon demos only |
| **Production — dismounted** | Long-range radio (LoRa / SDR / FHSS) | Soldier-to-soldier, soldier-to-leader |
| **Production — vehicle / drone** | ATAK + tactical radio | Crew-to-crew, crew-to-dismounted |
| **Production — commander** | ATAK tablet | COP rendering, natural-language query |
| **Higher-HQ bridge** | Satellite backhaul (opportunistic) | Artillery, air support, joint fires |

==BLE is prototype-only. The production transport is long-range radio and ATAK.==

## Commander's COP (Common Operating Picture)

A local-first rendering layer on the commander's ATAK tablet.

What it shows without any internet, cloud, or higher HQ:
- **All dismounted personnel** — positions, health, last voice summary
- **All vehicles** — GPS, crew status, cargo manifest (from their mesh nodes)
- **All drones** — position, sensor mode, battery, heading (from their mesh nodes)
- **All sensor posts** — trigger history, observation reports
- **AI-synthesized answers** to natural-language queries:
  - "Where is 3rd squad's closest vehicle?"
  - "Which drone has the most battery left?"
  - "Show me every sensor trigger in the last 10 minutes"

How it survives the loss of any single device:
- All COP data is **replicated across the mesh** via `COP_SYNC` messages.
- If the commander's tablet is destroyed, any other node reconstructs the full picture in seconds.
- ==The COP is not a server dashboard. It is a consensus state that the mesh maintains collectively.==

## SLM as the embedded staff section

The on-device SLM ingests **all platoon-internal data streams** (voice + vehicle tracks + drone telemetry + sensor triggers) and generates:
- **Situational awareness summaries**: "3rd squad is pinned, 2nd squad is 400m west, vehicle V1 reports ammo green"
- **Asset management**: "Drone Alpha is at 40% battery, recommend recall or handoff to 1st squad"
- **Anomaly detection**: "Sensor post 7 triggered at 0315Z, no patrol scheduled — flag"
- **Decision support**: "Nearest MEDEVAC is vehicle V3, 8 minutes, crew reports green"

==The SLM becomes the staff section that fits in a tablet. S2 (intel), S3 (ops), and S4 (logistics) compressed into one on-device model running on the commander's ATAK.==

## Higher-HQ bridge message types

New envelope types for the occasional external connection:

| Type | Payload | Routing | Notes |
|---|---|---|---|
| `EXTERNAL_TRACK` | Normalized asset metadata (artillery, air support) | Siblings + parent (like `BROADCAST`) | Tagged with `source_system: "VMF" \| "COT" \| "MANUAL"` |
| `EXTERNAL_COMPACTION` | AI summary of all external tracks | Parent only (like `COMPACTION`) | Generated by the higher-HQ bridge node |
| `COP_SYNC` | Full or delta state of the commander's COP | Root-ward on-demand or periodic heartbeat | Used when a new commander device joins and needs state catch-up |
| `HOP_ACK` | Acknowledgment that a bridge successfully backhauled to higher HQ | Parent only | Lets the commander know "higher HQ got this" even if sat is otherwise dark |

## Security boundary

| Classification level | Dongle payload | What the device sees |
|---|---|---|
| **Unclassified / FOUO** | No dongle needed | Everything — mesh is open |
| **Secret** | Encryption keys + unit crypto fills | Encrypted payload only; device is the radio |
| **Top Secret / SCI** | Full crypto + biometric auth + SCIF pairing cert | Device is an untrusted display; processing on dongle secure element |

The mesh itself stays at the lowest common denominator — unclassified/FOUO — with encrypted tunnels for higher classification. Vehicle and drone nodes carry the same dongle as dismounted soldiers at their classification level.

## Pitch framing

> "TacNet is the primary command-and-control operating system for platoon and company-level operations in contested environments. Every soldier, vehicle crew, and drone operator is a node in a self-healing mesh running on ATAK and long-range radio. The commander sees the full battlespace picture — positions, status, AI-synthesized summaries — even when satellites, cloud, and higher HQ are completely blacked out. Legacy C2 requires constant connectivity; TacNet assumes denial is the default and still delivers full situational awareness."

**Why this sells:**
- Replaces existing C2 at the echelon that needs it most (platoon/company).
- Competes with Palantir TITAN, RTX MAINGATE, L3Harris AN/PRC-163 — at 10x lower unit cost and fully offline.
- DARPA PMs (I2O / STO) are explicitly funding decentralized AI-native C2 for the tactical edge.

## Phased build path

### Pre-seed (now — 12 months)
- **ATAK port**: TacNet as an ATAK plugin for Android tablets (vehicle-mounted and commander).
- **Long-range radio bring-up**: LoRa or SDR reference nodes for dismounted transport, replacing BLE.
- **Mock vehicle/drone node**: One ATAK tablet simulating a vehicle or drone crew node inside the mesh.
- **COP on ATAK**: Map layer showing all mesh nodes (people + vehicle + drone).
- **One natural-language query**: "Where is the vehicle?" → SLM answers from local COP database.
- **Mock higher-HQ bridge**: One script parsing Cursor-on-Target XML, injecting artillery/air support tracks.

### STTR Phase I — validate the architecture
- Field test with MN Guard: one vehicle + one drone + 10+ dismounted nodes on long-range radio.
- Publish the intent-token schema for platoon-internal assets (vehicle, drone, sensor) as an open standard.

### STTR Phase II — scale the mesh
- Multi-platoon exercise: 3+ vehicles, 2+ drones, 30+ dismounted nodes.
- SDR evaluation with radio prime partner for EW-resilient FHSS transport.
- Formal VMF / Link-16 parsing modules for higher-HQ bridge (compliance-certified).

### Phase III / POR — become the standard
- Army-wide pilot at platoon/company echelon.
- Sole-source contracts via SBIR Phase III pathway.

## Risks

| Risk | Mitigation |
|---|---|
| **Classification complexity** | Mesh stays unclassified; dongle-based tunnels handle higher classification. Pre-seed only builds unclassified/FOUO. |
| **Higher-HQ parsing is brittle** | Start with one standard (Cursor-on-Target). VMF and Link-16 are Phase II+. |
| **ATAK integration learning curve** | ATAK is Android + military standard; the team already has Android/embedded expertise. |
| **Scope creep kills pre-seed** | ATAK port + long-range radio + mock vehicle node + COP + one NL query is the pre-seed scope. Everything else is Phase II+. |

## Related
- [[solution]] — primary C2 operating system framing
- [[architecture]] — mesh topology with vehicle/drone as internal nodes
- [[product spec]] — message protocol, routing rules, higher-HQ bridge types
- [[technical moat]] — semantic compression + Shannon math
- [[ask and roadmap]] — funding phases aligned with build path
- [[market strategy]] — B2G GTM, DARPA STTR pathway
- [[tacnet homepage]]
- [[product homepage]]
