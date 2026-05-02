#startup/tacnet

# The Problem — Centralized Vulnerability

==Modern warfare relies on "reach-back" architectures. The cloud, the satellite, the high-power radio — cut any one and the unit goes blind.==

## The three failure modes

### 1. High RF signature
- Current tactical radios emit strong, predictable signals.
- Easy targets for **electronic warfare (EW)** and **direction finding (DF)**.
- "If they can hear you, they can kill you."

### 2. Bandwidth dependency
- Current C2 systems crash when throughput drops below several Mbps.
- Near-peer adversaries (China, Russia) can degrade bandwidth by orders of magnitude with cheap jammers.
- The system goes from "fully operational" to "blind" with no graceful middle.

### 3. Hardware lock-in
- Proprietary "black box" radios from primes that don't interoperate.
- Forces multi-million-dollar replacement cycles.
- Vendor lock-in slows iteration; the warfighter pays the latency cost.

## Why the radio scaling wall is a separate problem
- A platoon leader with 30+ subordinates across vehicles, drones, and dismounted teams **cannot listen to that many simultaneous voice channels**.
- Traditional radio requires humans to manually relay and summarize upward — a cognitive bottleneck during a firefight.
- TacNet's [[architecture|compaction layer]] solves this with on-device AI summarization that propagates up a command tree, compressing voice, vehicle telemetry, and drone status into a single SITREP.

## 4. Asset visibility is manual and slow
- Traditional radio gives a commander **zero passive awareness** of vehicle status, drone position, or sensor state.
- To know where a Humvee is, whether the drone battery is low, or if a sensor post has triggered, the commander must **ask over voice and wait for a human to respond**.
- In a firefight, the driver is busy driving. The drone operator is busy flying. Nobody answers the radio.
- ==The commander fights blind to the location and status of the very assets organic to their platoon.==

## Related
- [[tacnet homepage]]
- [[solution]]
- [[why now]]
