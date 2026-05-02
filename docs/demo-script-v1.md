# TacNet Edge — 3-Minute Demo Script (v1)

**Total runtime:** 3:00. **Live demo window:** ~1:30. **Owner:** pitch lead.

This is the shared timing baseline. It is *not* a build spec — for that, see `unified-plan-v3.md`. Once an implementation path is chosen, the pitch lead rehearses from the path-specific script:

- OLD dashboard: `docs/branch-a-old-dashboard-demo-script.md`
- Sentinel Forge: `docs/branch-b-sentinel-forge-demo-script.md`

This file defines the common 180-second story; the path-specific scripts define the exact on-stage clicks and failure moves.

---

## 1. The 3-minute envelope

| Time | Block | Words / actions |
|---|---|---|
| 0:00–0:20 | **Problem** | "The cloud is the casualty." Frame Raven Gap. |
| 0:20–0:35 | **Solution** | "Semantic compression over a tactical mesh." One sentence: *what TacNet Edge is.* |
| 0:35–2:05 | **Demo** (90s) | Detailed in §2. |
| 2:05–2:25 | **Impact** | Why this matters for the platoon and the program. |
| 2:25–2:45 | **Vision close** | "Today browser. Tomorrow ATAK on LoRa." |
| 2:45–3:00 | **Tagline + sit down** | "C2 that degrades gracefully instead of going blind." |

Total 180 seconds. Every word costs ~0.5 seconds at calm pace. Budget is real.

---

## 2. The 90-second demo storyboard

Hands stay on the laptop trackpad / one click at a time. No menu diving, no scrolling.

| Time | Action | Narration | What's on screen |
|---|---|---|---|
| 0:35–0:40 | Click **Replay Scenario** | *"This is a platoon moving under EW pressure. Three squads, one vehicle, one drone, one sensor post."* | Initial state: mesh hierarchy visible, static Raven Gap COP panel visible, empty event stream. |
| 0:40–0:55 | Watch events arrive | *"Watch the map and the feed. Raw reports flow in from the edge — soldiers, vehicle, sensor, drone."* | Event stream populating top-to-bottom; mesh-hierarchy leaf nodes light up; COP markers pulse as events arrive. |
| 0:55–1:10 | Squad-leader compaction summaries appear in the feed, grouped with their source events | *"In a normal radio workflow, the platoon leader hears all of this. With TacNet, each squad leader's phone compacts before forwarding."* | ~12 raw events get joined by 3 squad-summary entries; marker clusters resolve into a commander-level picture. Branch A: visible in the existing feed plus static COP panel. Branch B: dedicated `CompactionTimeline.tsx` panel plus map surface. |
| 1:10–1:25 | Commander SITREP appears center stage | *"The commander sees one SITREP — what changed, what's at risk, what to look at next."* | SITREP card at center; SITREP-delta panel highlights "what changed since last step"; COP risk zone/recommendation visible. |
| 1:25–1:35 | Click one SITREP line → evidence drawer opens | *"Every line is traceable to the raw reports that produced it. No black box."* | Side drawer slides in showing the contributing raw events. |
| 1:35–1:55 | Toggle **bandwidth degraded** mode → step replay once more | *"Now bandwidth drops by half. Most C2 systems would go blind. TacNet shrinks the summary — keeps the picture."* (Then ~5s of silence so the audience reads the new SITREP next to the old one.) | Bandwidth toggle visibly flips. Raw feed and map markers thin out; SITREP regenerates with smaller text but same recommendation. Hold both versions side by side if the layout supports it. |
| 1:55–2:05 | Hold final composed state; hand off to close | *(brief silence, then:)* *"This is C2 that degrades gracefully instead of going blind."* | Final composed view: Raven Gap COP + mesh hierarchy + raw feed + SITREP + delta panel + evidence drawer all visible. |

**Words spoken during demo:** ~100. **Pace:** ~67 wpm — calm, deliberate. The 5s silence inside the bandwidth-toggle beat is intentional — the hero beat needs a moment to land.

---

## 3. Pitch-time decisions

Both can't fit. Pick one before the dry run, not the day-of.

| | What it costs | What it adds |
|---|---|---|
| **A. Lift the MeshNode iPhone as a prop** at 2:25 ("Today this runs in a browser; *here's a real iPhone running the same agent on Bluetooth, fully offline*") | ~10s of pitch time, ~5% chance the phone misbehaves on stage | Hardware credibility moment. Big payoff if it lands. |
| **B. Deliver the on-device framing sentence** somewhere between 0:35 and 0:50 (*"The compaction you're seeing is deterministic and runs locally; if a hosted model writes the prose summary it falls back to a script. The product architecture is on-device — every soldier's phone runs Gemma 4 locally."*) | ~10s of pitch time, no risk | Defuses the worst Q&A trap: "wait, does this need internet?" |

**Default: B.** A is optional, only if (1) someone owns the prop and (2) it has been rehearsed at least 3 times without fail.

If we pick both: cut 10s elsewhere — the natural cut is shortening problem (0:00–0:20 → 0:00–0:10). Hard to do well.

---

## 4. What got cut from the build because it cannot appear in 90s

These are not "cut from the product" — they are "not visible in the live demo, save for Q&A or backup video":

| Cut | Why | Where it goes instead |
|---|---|---|
| **Reparenting visual** (squad leader times out) | Needs ~15s narration to land; we don't have it | Q&A talking point. Frame as architecture-vs-demo in the branch run sheet — *"Self-healing tree is part of the design; not in the 90 seconds, P1 demo feature."* Do not claim "no message loss" — that's a design property, not a demo result. |
| **LLM streaming animation** | Tokens arriving one at a time = wasted seconds | Brief just appears. Pre-warm the API call so it's <1s. |
| **`soul.md` doctrinal voice** | Judges read the SITREP for ~1 second | Pitch deck appendix; mention in Q&A. |
| **Asset heartbeat color states** (GREEN/AMBER/RED) | No time to narrate the state machine | Cosmetic on screen, not called out. |
| **Tailwind / shadcn migration** | Polish below readability threshold | Skip for hackathon. |
| **NL query box** | Asking + waiting + reading the answer = 20s+ | Cut. Mention in Q&A as next-feature. |
| **Compression-ratio chart** | Not legible at projector distance in 5s | Cut. Verbal: *"summaries are typically 5–10% the size of raw."* |
| **Cyber scenario toggle** | Two demos in 90s = one bad demo | Cut. Verbal: *"the same pipeline runs cyber-physical fusion."* |
| **Real MapLibre / live COP basemap** | Tile loading and real geospatial data add risk | Branch A uses a static Raven Gap COP panel instead: no tiles, no GPS, no map service. |
| **MeshNode live integration (Option A)** | Build risk too high | Decision already made in `meshnode-integration.md`. |
| **Two parallel demos in the live pitch** | 90s only fits one | Backup video is the second demo's home, not the stage. |

---

## 5. Branch Run Sheets

Setup checklists, failure moves, and Q&A live in the selected branch run sheet:

- OLD dashboard: `docs/branch-a-old-dashboard-demo-script.md`
- Sentinel Forge: `docs/branch-b-sentinel-forge-demo-script.md`

Do not rehearse from this shared baseline once an implementation path is selected.

---

## 6. Rehearsal Targets — Hour 16:30–18:00

Three runs, each scored on the same axes:

| Axis | Pass threshold |
|---|---|
| **End-to-end runtime** | 2:55–3:05 (target 3:00) |
| **Demo segment runtime** | 1:25–1:35 (target 1:30) |
| **No live errors** | Zero red-flag console output, zero failed requests in DevTools network tab |
| **Pitch lead reads naturally** | No mid-sentence pauses to check the slide; no rushed words |
| **Backup video plays** | One full playthrough during rehearsal — verify it works |

If three back-to-back runs all clear thresholds, we ship. If any one run blows up, fix the cause and re-run the full sequence.

---

## 7. The Two Phrases Judges Should Remember

If they remember nothing else from the 3 minutes:

- **"Semantic compression over a tactical mesh."**
- **"C2 that degrades gracefully instead of going blind."**

Both phrases appear once in the branch scripts: "semantic compression" lands in the solution beat, and "degrades gracefully" lands in the close. The pitch lead's job is to land each clearly.

---

## 8. After The Pitch — What We Leave On Screen

Before walking away from the laptop, leave the final composed state visible:
- Mesh tree showing the populated platoon
- Map with all markers
- Final SITREP with delta panel populated
- Evidence drawer open

This becomes the photo-op state for the demo table. Anyone who walks up after the pitch sees a working artifact, not a closed laptop.
