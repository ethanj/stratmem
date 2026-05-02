# TacNet Edge — Sentinel Forge Demo Script

**Date:** 2026-05-02
**Build shell:** `../sentinel-forge/`
**Total runtime:** 3:00
**Live demo window:** 0:35-2:05

This is the pitch lead's run sheet for the Sentinel Forge implementation. It assumes a React dashboard with Raven Gap map/COP, mesh hierarchy, raw event stream, compaction timeline, commander SITREP, evidence drawer, and bandwidth-degraded toggle.

**Branch lock:** Locked at Hour 1. Do not switch implementation paths mid-build.

---

## 1. Three-Minute Envelope

| Time | Block | Words / action |
|---|---|---|
| 0:00-0:20 | Problem | "The cloud is the casualty." Frame Raven Gap: a platoon under EW pressure still needs command without reach-back. |
| 0:20-0:35 | Solution | "TacNet Edge is semantic compression over a tactical mesh: noisy edge traffic becomes compact commander intent." |
| 0:35-2:05 | Live demo | Follow §2 exactly. |
| 2:05-2:25 | Impact | "The commander keeps the picture, and every recommendation is traceable." |
| 2:25-2:45 | Vision close | "Today browser. Tomorrow ATAK over tactical radios." |
| 2:45-3:00 | Tagline | "C2 that degrades gracefully instead of going blind." Sit down. |

The map earns attention in the first second. The compaction timeline earns belief.

---

## 2. Live Demo Choreography

Hands stay on the trackpad. No menu diving. Do not expand the map unless it is part of the rehearsed flow.

| Time | Action | Say | Screen expectation |
|---|---|---|---|
| 0:35-0:40 | Click **Replay Scenario** | "This is Raven Gap: three squads, a vehicle, a drone, and a sensor post." | Map/COP centered, mesh hierarchy visible, empty stream/timeline. |
| 0:40-0:55 | Let raw reports arrive | "Raw reports are coming from soldiers, telemetry, sensors, and drone observations." | Map markers pulse; LogStream fills; mesh leaf nodes activate. |
| 0:55-1:10 | Let CompactionTimeline update | "TacNet rolls that up at the squad layer before it reaches the commander." | Timeline visibly collapses ~12 raw events into 3 squad summaries. |
| 1:10-1:25 | Let commander SITREP appear | "The commander gets one picture: what changed, what's at risk, and the next collection action." | SITREP panel fills; delta highlights new risk/recommendation; map zone updates. |
| 1:25-1:35 | Click a SITREP line | "And every claim is explainable." | Evidence drawer opens with contributing raw reports/signals. |
| 1:35-1:55 | Toggle **Bandwidth Degraded** and step once | "Now bandwidth drops by half. Most C2 systems would go blind. TacNet shrinks the summary and keeps the picture." | LogStream/timeline/map detail reduce; shorter SITREP preserves recommendation. Pause five seconds. |
| 1:55-2:05 | Stop touching the laptop | "That is C2 that degrades gracefully instead of going blind." | Final state: map, hierarchy, timeline, SITREP, delta, evidence visible. |

Target spoken words during live demo: ~95. The audience should understand the transformation visually.

---

## 3. Exact Lines To Memorize

Opening:

> "The cloud is the casualty. In Raven Gap, the commander still has reports, telemetry, sensors, and drone observations, but the network cannot carry raw chaos."

Solution:

> "TacNet Edge is semantic compression over a tactical mesh. Edge traffic becomes compact commander intent before it moves."

Hero beat:

> "Now bandwidth drops by half. Most C2 systems would go blind. TacNet shrinks the summary and keeps the picture."

Close:

> "This is C2 that degrades gracefully instead of going blind."

---

## 4. Pitch-Time Decision

Default to the on-device framing sentence, not the phone prop:

> "The compaction you're seeing is deterministic and runs locally; if a hosted model writes the prose summary it falls back to a script. The product architecture targets on-device models on the phones, so the mesh has no cloud dependency."

Only use the MeshNode iPhone prop if someone owns it and it has survived three full rehearsals. If both the prop and the framing sentence cannot fit, cut the prop.

---

## 5. Before Going On Stage

- [ ] Backend running at `http://localhost:8000`.
- [ ] Frontend loaded at the Vite URL.
- [ ] `/state` returns Raven Gap state.
- [ ] Browser zoom set to 110%.
- [ ] Replay Scenario button visible.
- [ ] Map/COP renders or the dark static/vector fallback is active.
- [ ] Mesh hierarchy visible.
- [ ] Compaction timeline visible.
- [ ] Evidence drawer click tested.
- [ ] Bandwidth toggle starts off.
- [ ] Pitch-time decision made: default framing sentence, phone prop only if rehearsed.
- [ ] Notifications silenced.
- [ ] Backup video open in a hidden window.

---

## 6. Failure Moves

| Symptom | Recovery | Words |
|---|---|---|
| Frontend is blank | Refresh once; if still blank, switch to backup video | "For time, here's the same run captured from rehearsal." |
| Backend request fails | Refresh once after checking backend terminal; then backup video | "One moment, restarting the scenario." |
| Map tiles fail | Use the dark vector/static fallback already in the map panel | Do not mention tile loading. |
| Replay button does nothing | Reset scenario and click Replay again once | "Restarting the scenario." |
| Timeline fails but feed works | Continue with map/feed/SITREP | "The feed is the raw edge traffic; the SITREP is the rollup." |
| Evidence drawer fails | Point to contributing rows if visible; otherwise skip | "The underlying reports remain attached to the SITREP." |
| Bandwidth toggle has no effect | Skip to close | "The product goal is graceful degradation: shrink the information before command disappears." |

One recovery attempt maximum. Then backup video.

---

## 7. Q&A Answers

| Question | Answer |
|---|---|
| Does this need internet? | "The demo can run with deterministic local compaction. Product architecture targets on-device models on the phones; hosted prose is optional and not required for the mesh." |
| What did you build? | "A TacNet command view on a FastAPI/React stack: Raven Gap scenario, map state, mesh hierarchy, compaction timeline, traceable SITREP, and bandwidth-degraded behavior." |
| Why is this innovative? | "It compresses tactical information semantically at the edge instead of trying to stream raw data through a broken network." |
| What does the map prove? | "The map is the command picture. The proof is that the picture remains coherent after raw detail gets compressed or degraded." |
| What's the bandwidth assumption? | "The demo simulates a 50% bandwidth drop. The architecture targets long-range LoRa at roughly 0.3-37 kbps; intent tokens fit in 50-100 bytes. Real-world performance characterization is roadmap." |
| Why not just use ATAK? | "ATAK is the eventual operator surface. TacNet is the AI compaction layer that feeds it under bandwidth pressure." |
| How do you handle classified data? | "Phase 1 architecture uses a USB-C dongle: phone stays unclassified hardware, dongle is the security boundary. Pull the dongle, the device is just a phone." |
| Is this targeting or kill-chain automation? | "No. It recommends collection and commander attention, not engagement. Humans stay in the loop." |
| What's next? | "Real LoRa transport, ATAK plugin, multi-phone field test, and STTR Phase I submission with Cornell as research partner." |

---

## 8. Leave On Screen

After the pitch, leave the final state visible:

- Raven Gap map with active risk zone.
- Mesh hierarchy populated.
- Compaction timeline showing raw-to-summary collapse.
- Commander SITREP and delta visible.
- Evidence drawer open.

That final state should read as a working command product from across the room.
