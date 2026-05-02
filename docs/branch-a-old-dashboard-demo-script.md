# TacNet Edge — OLD Dashboard Demo Script

**Date:** 2026-05-02
**Build shell:** `../voice-agents-hack/OLD CODE/dashboard/`
**Total runtime:** 3:00
**Live demo window:** 0:35-2:05

This is the pitch lead's run sheet for the OLD dashboard implementation. It assumes a static Raven Gap COP panel, mesh hierarchy, live feed, commander SITREP, evidence highlight, and bandwidth-degraded toggle.

**Branch lock:** Locked at Hour 1. Do not switch implementation paths mid-build.

---

## 1. Three-Minute Envelope

| Time | Block | Words / action |
|---|---|---|
| 0:00-0:20 | Problem | "The cloud is the casualty." Frame Raven Gap: a platoon under EW pressure cannot depend on reach-back, LTE, or infinite bandwidth. |
| 0:20-0:35 | Solution | "TacNet Edge is semantic compression over a tactical mesh: every squad leader's device turns raw reports into intent before forwarding." |
| 0:35-2:05 | Live demo | Follow §2 exactly. |
| 2:05-2:25 | Impact | "The commander keeps the picture when the network gets worse." |
| 2:25-2:45 | Vision close | "Today this is a browser simulator. Tomorrow it is an ATAK plugin over tactical radios." |
| 2:45-3:00 | Tagline | "C2 that degrades gracefully instead of going blind." Sit down. |

Keep the first 35 seconds tight. The live screen should be the proof.

---

## 2. Live Demo Choreography

Hands stay on the trackpad. No scrolling. One deliberate click at a time.

| Time | Action | Say | Screen expectation |
|---|---|---|---|
| 0:35-0:40 | Click **Replay Scenario** | "This is Raven Gap: three squads, one vehicle, one drone, one sensor post." | Static COP, mesh hierarchy, empty feed. |
| 0:40-0:55 | Let raw reports arrive | "Watch the map and the feed. Reports are arriving from the edge." | Feed fills with raw broadcast rows; map markers pulse; leaf nodes light up. |
| 0:55-1:10 | Let squad summaries appear | "Instead of pushing every report upward, squad leaders compact locally." | Three compaction rows appear; related raw rows group/highlight; marker clusters resolve into a clearer picture. |
| 1:10-1:25 | Let commander SITREP appear | "The commander gets one SITREP: what changed, what's at risk, what to look at next." | SITREP card fills; delta line highlights the new risk; COP risk zone appears. |
| 1:25-1:35 | Click one SITREP or compaction line | "Every line is traceable. No black box." | Evidence drawer opens or source rows highlight visibly. |
| 1:35-1:55 | Toggle **Bandwidth Degraded** and step once | "Now bandwidth drops by half. Most C2 systems would go blind. TacNet shrinks the summary and keeps the picture." | Raw feed and map detail thin out; SITREP gets shorter; recommendation stays stable. Pause five seconds. |
| 1:55-2:05 | Stop touching the laptop | "This is C2 that degrades gracefully instead of going blind." | Final composed state: COP, hierarchy, feed, SITREP, delta, evidence visible. |

Target spoken words during live demo: ~90-100. Let the map do some of the talking.

---

## 3. Exact Lines To Memorize

Opening:

> "The cloud is the casualty. In Raven Gap, the platoon still has sensors, soldiers, a vehicle, and a drone, but the network is degraded and nobody has bandwidth for raw chaos."

Solution:

> "TacNet Edge is semantic compression over a tactical mesh. The edge turns reports into intent before forwarding them."

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

- [ ] Server running at `http://localhost:8080`.
- [ ] WebSocket indicator connected.
- [ ] Browser zoom set to 110%.
- [ ] Landing overlay bypassed or ready.
- [ ] Replay Scenario button visible.
- [ ] Static Raven Gap COP visible.
- [ ] Markers pulse on replay.
- [ ] Bandwidth toggle starts off.
- [ ] Evidence click tested.
- [ ] Pitch-time decision made: default framing sentence, phone prop only if rehearsed.
- [ ] Notifications silenced.
- [ ] Backup video open in a hidden window.

---

## 6. Failure Moves

| Symptom | Recovery | Words |
|---|---|---|
| Landing overlay/video is broken | Bypass it before starting | Say nothing. Start on dashboard. |
| Replay button does nothing | Refresh once and click Replay again | "One moment, restarting the scenario." |
| WebSocket disconnects | Refresh once; if still disconnected, switch to backup video | "For time, here's the same run captured from rehearsal." |
| COP markers do not animate | Continue with feed/SITREP | Do not mention the map animation. |
| SITREP does not appear | Wait three seconds; refresh once if needed | "The deterministic fallback should be immediate; let me restart the scenario." |
| Evidence click fails | Point at highlighted feed grouping if visible; otherwise skip | "The source rows are the provenance trail." |
| Bandwidth toggle has no effect | Skip to close | "The key idea is that summaries shrink before the commander picture disappears." |

Never debug on stage. One refresh maximum, then backup video.

---

## 7. Q&A Answers

| Question | Answer |
|---|---|
| Does this need internet? | "The demo path is deterministic and local. Product architecture targets on-device models on the phones, so the mesh does not depend on cloud reach-back." |
| What did you build? | "A browser-based TacNet command simulator: static COP, mesh hierarchy, scripted edge reports, squad compaction, traceable SITREPs, and degraded-bandwidth behavior." |
| Why the map if it is static? | "For the hackathon, the map is a controlled command-picture visual. The product innovation is the compaction and provenance layer, not tile loading." |
| What happens if a squad leader goes down? | "The architecture is a self-healing tree with reparenting on heartbeat timeout. We did not spend demo seconds on that visual." |
| What's the bandwidth assumption? | "The demo simulates a 50% bandwidth drop. The architecture targets long-range LoRa at roughly 0.3-37 kbps; intent tokens fit in 50-100 bytes. Real-world performance characterization is roadmap." |
| Why not just use ATAK? | "ATAK is the eventual surface. TacNet is the semantic compression layer above the radio and below the commander picture." |
| How do you handle classified data? | "Phase 1 architecture uses a USB-C dongle: phone stays unclassified hardware, dongle is the security boundary. Pull the dongle, the device is just a phone." |
| Is this targeting or kill-chain automation? | "No. It recommends collection and commander attention, not engagement. Humans stay in the loop." |
| What's next? | "Real LoRa transport, ATAK plugin, multi-phone field test, and STTR Phase I submission with Cornell as research partner." |

---

## 8. Leave On Screen

After the pitch, leave the final state visible:

- Raven Gap COP with risk overlay.
- Mesh hierarchy populated.
- Feed showing raw and compaction rows.
- SITREP and delta visible.
- Evidence/provenance open.

That final state is the table-demo photo.
