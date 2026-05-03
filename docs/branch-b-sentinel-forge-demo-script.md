# TacNet Edge — Sentinel Forge Demo Script

**Date:** 2026-05-02
**Build shell:** `../sentinel-forge/`
**Total runtime:** 3:00
**Live demo window:** 0:35-2:05

This is the pitch lead's run sheet for the Sentinel Forge implementation. It assumes a React dashboard with a Raven Gap map/COP, one prerecorded voice-to-SALUTE report, a compression OFF/ON switch, mesh hierarchy, source report stream, compaction timeline, commander SITREP, evidence drawer, and 3 Kbps degraded-link meter.

**Branch lock:** Locked at Hour 1. Do not switch implementation paths mid-build.

---

## 1. Three-Minute Envelope

| Time | Block | Words / action |
|---|---|---|
| 0:00-0:20 | Problem | "The cloud is the casualty." Frame Raven Gap as a fictional contested border valley/corridor: a platoon under EW pressure still needs command without reach-back. |
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
| 0:35-0:40 | Click **Replay Scenario** | "This is Raven Gap: three rifle squads, one weapons squad, an attached JLTV support vehicle, a small UAS team, and an OP/LP sensor." | COP centered with MGRS grid, unit icons, NAIs, phase line, checkpoints; mesh hierarchy visible; 3 Kbps meter visible; compression OFF. |
| 0:40-0:50 | Click **Voice Report** with compression OFF | "At 3 Kbps, raw voice cannot move. It misses the budget before it reaches command." | Voice panel plays or references audio; raw audio/report bytes exceed budget; status reads blocked; no feed event appears. |
| 0:50-1:02 | Toggle **Compression ON**, click **Voice Report** again | "Turn semantic compression on, and the same report becomes SALUTE JSON that fits." | Voice panel shows transcript, SALUTE JSON, JSON bytes under budget; source-feed event appears from 1/A. |
| 1:02-1:13 | Let reports arrive | "The rest of the edge is sending SALUTE reports, ACE/LACE updates, UAS observations, sensor triggers, and PLI updates." | Map markers pulse; LogStream fills; mesh leaf nodes activate. |
| 1:13-1:25 | Let CompactionTimeline update | "TacNet rolls that up at the squad layer before it reaches the commander." | Timeline visibly collapses source reports into squad summaries. |
| 1:25-1:38 | Let commander SITREP appear | "The commander gets one picture: what changed, what threatens the decision cycle, and whether to retask UAS, request ACE, or confirm contact." | SITREP panel fills; delta highlights new risk/collection recommendation; NAI/risk zone updates. |
| 1:38-1:48 | Click a SITREP line | "And every claim is explainable." | Evidence drawer opens with contributing reports/signals. |
| 1:48-1:55 | Point to 3 Kbps meter | "The commander picture survives because the mesh carries meaning, not raw media." | 3 Kbps meter shows raw over budget and compacted fits. Pause three seconds. |
| 1:55-2:05 | Stop touching the laptop | "That is C2 that degrades gracefully instead of going blind." | Final state: map, hierarchy, timeline, SITREP, delta, evidence visible. |

Target spoken words during live demo: ~95. The audience should understand the transformation visually.

---

## 3. Exact Lines To Memorize

Opening:

> "The cloud is the casualty. Raven Gap is a fictional contested border valley. The commander still has SALUTE reports, ACE/LACE updates, UAS observations, sensor triggers, and PLI updates, but the network cannot carry all source traffic."

Solution:

> "TacNet Edge is semantic compression over a tactical mesh. Edge traffic becomes compact commander intent before it moves."

Voice beat:

> "At 3 Kbps, raw voice cannot move. Turn semantic compression on, and the same report becomes SALUTE JSON that fits."

Hero beat:

> "SATCOM is denied and tactical radio is intermittent. Most C2 systems lose the picture. TacNet carries meaning, not raw media."

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
- [ ] Voice Report panel visible and tested with compression OFF blocked and compression ON fitting; transcript-only fallback is acceptable if audio playback fails.
- [ ] Map/COP renders with MGRS grid, unit icons, NAIs, phase line, and checkpoints; or the dark static/vector fallback is active.
- [ ] Mesh hierarchy visible.
- [ ] Compaction timeline visible.
- [ ] Evidence drawer click tested.
- [ ] Compression switch starts OFF.
- [ ] 3 Kbps meter visible.
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
| Voice report button fails | Skip it and continue with scripted source reports | "The same SALUTE extraction feeds the source stream; continuing with the replay." |
| Compression switch fails | Use the voice panel's JSON display if visible; otherwise skip to replay traffic | "The product proof is payload discipline: raw traffic does not fit, structured meaning does." |
| Timeline fails but feed works | Continue with map/feed/SITREP | "The feed is the source edge traffic; the SITREP is the rollup." |
| Evidence drawer fails | Point to contributing rows if visible; otherwise skip | "The underlying reports remain attached to the SITREP." |
| 3 Kbps meter has no effect | Skip to close | "The product goal is graceful degradation: shrink the information before command disappears." |

One recovery attempt maximum. Then backup video.

---

## 7. Q&A Answers

| Question | Answer |
|---|---|
| Does this need internet? | "The demo can run with deterministic local compaction. Product architecture targets on-device models on the phones; hosted prose is optional and not required for the mesh." |
| What did you build? | "A TacNet command view on a FastAPI/React stack: Raven Gap scenario, one compression OFF/ON voice-to-SALUTE report, map state, mesh hierarchy, compaction timeline, traceable SITREP, and a 3 Kbps degraded-link proof." |
| Is the voice demo live STT? | "No. For demo reliability, it uses one prerecorded report and a stored transcript. The real pipeline starts at transcript to SALUTE JSON, then compaction, byte-budgeting, and SITREP all run through the app." |
| What is the transmit format? | "For this demo, JSON. We demonstrate one SALUTE-style report schema; future schemas can be added without changing the pitch proof." |
| What does the compression switch prove? | "It shows the difference between moving raw media and moving structured meaning. At 3 Kbps, raw voice is over budget; the SALUTE JSON fits and updates the commander picture." |
| Why is this innovative? | "It compresses tactical information semantically at the edge instead of trying to stream every source report through a broken network." |
| What does the map prove? | "The map is the command picture. The proof is that the picture remains coherent after source detail gets compressed or degraded." |
| What's the comms assumption? | "The demo simulates EW degradation: SATCOM denied and tactical radio intermittent. The architecture targets long-range LoRa at roughly 0.3-37 kbps; intent tokens fit in 50-100 bytes. Real-world performance characterization is roadmap." |
| Why not just use ATAK? | "ATAK is the eventual operator surface. TacNet is the AI compaction layer that feeds it under EW pressure." |
| How do you handle classified data? | "Phase 1 architecture uses a USB-C dongle: phone stays unclassified hardware, dongle is the security boundary. Pull the dongle, the device is just a phone." |
| Is this automating the decision cycle? | "No. It supports threat recognition, collection prioritization, and commander attention. It stops at collection and attention recommendations; humans stay in the loop." |
| What doctrine is this grounded in? | "Public U.S. Army doctrine: platoon organization from ATP 3-21.8, mission-command framing from ADP 6-0, IPB/NAI concepts from ATP 2-01.3, and field-report brevity from the Ranger Handbook." |
| What's next? | "Real LoRa transport, ATAK plugin, multi-phone field test, and STTR Phase I submission with Cornell as research partner." |

---

## 8. Leave On Screen

After the pitch, leave the final state visible:

- Raven Gap COP with MGRS grid, unit icons, NAIs, phase line, checkpoints, and active risk zone.
- Voice panel showing compression ON and transcript-to-SALUTE JSON if it does not crowd the final view.
- Mesh hierarchy populated.
- Compaction timeline showing source-to-summary collapse.
- Commander SITREP and delta visible.
- Evidence drawer open.

That final state should read as a working command product from across the room.
