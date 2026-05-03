# Team — B. Domain Content + Pitch Lead (TacNet creator) — v2

**Role:** Scenario realism + stage delivery. You built the original TacNet/MeshNode and you're doctrine-fluent; the team needs that voice in the demo and the pitch.
**Cross-cutting reference:** `docs/THEPLAN.md` (full team plan, all roles)
**Pitch script (your working artifact):** `docs/branch-b-sentinel-forge-demo-script.md`
**Branch lock:** Locked at Hour 1. Do not switch implementation paths mid-build.
**v2 judge-feedback change:** make **3 Kbps degraded bandwidth** the proof point. The demo must show raw traffic exceeds the pipe and TacNet compaction still fits.

---

## Read first

**You do not write code.** Your leverage is doctrinal fidelity and pitch delivery — both single-points-of-failure that nobody else can recover. If you write Python, you risk a merge conflict on the events file that everyone else depends on, and you slow A down (the only person who knows Sentinel Forge). You write content as markdown/JSON; A pastes it in.

You operate as content reviewer for task 9 (UI vocabulary), not implementer.

If you're tempted to code: don't. The hackathon's bus factor on doctrine + pitch is too high.

No live iPhone app path is in the demo. Do not ask anyone to modify iOS/MeshNode code for this build. The phone/on-device story is pitch framing only unless a separate non-blocking prop is rehearsed.

---

## Deliverables

### 1. Scenario events table (your top priority — A blocks on this)

12 events for the 90-second window. One row per event. Format:

| t_offset_sec | source | unit_label | sender_id | report_type | mgrs | body | degraded_short |
|---|---|---|---|---|---|---|---|
| 5 | 1/A | 1st Squad / Team A | 1st_squad_team_a | salute | 11SLT 12345 67890 | SALUTE: 1x dismount moving south, light pack, no visible crew-served weapon, last seen near NAI 1... | 1/A: 1x dismount NAI 1 |
| ... | | | | | | | |

**Fields:**
- `source`: callsign as it should appear in the LogStream feed. **"1/A", "RQ-11", "OP-7"** — never "SYS"/"unknown". This is what the audience reads.
- `unit_label`: human-readable unit name.
- `sender_id`: machine id used for compaction grouping. Match the mesh node id A registers (e.g., `1st_squad_team_a`, `weapons_squad`, `jltv_support`, `rq11_team`, `op_lp_sensor`).
- `report_type`: one of `salute`, `ace_lace`, `uas_obs`, `sensor_trigger`, `pli`.
- `mgrs`: military grid reference, format `11SLT 12345 67890` style.
- `body`: doctrinally-correct SALUTE/ACE/LACE/UAS observation/sensor trigger/PLI per **ATP 3-21.8 + Ranger Handbook brevity**.
- `degraded_short`: 8-14 word short form used after the 3 Kbps toggle. Keep it tactical and readable.

**Mix across 12 events:** at least one report from each of: 1st rifle squad, 2nd rifle squad, 3rd rifle squad, weapons squad, JLTV support, RQ-11 UAS, OP/LP sensor. Story should arc — early reports are routine PLI/ACE, mid-window is contact emerging in NAI 1, later beats are UAS confirming, sensor triggering, JLTV repositioning.

**3 Kbps proof requirement:** write enough real report content that the raw source-report envelopes clearly exceed a 3 Kbps / 10-second budget, while the squad summaries and `degraded_short` strings clearly fit. You do not need exact byte math; A computes that. Your job is to make the raw traffic credibly richer than the compacted traffic.

### 2. Map content list (due H3)

For A's `core/map.py`:
- **NAI names + MGRS coordinates**: NAI 1, NAI 2, NAI 3 (or named after terrain features — Ridgeline, Wadi, etc.)
- **Friendly marker positions**: each squad's start position, JLTV start, RQ-11 launch point, OP/LP sensor location
- **Checkpoints**: CP-1, CP-2, CP-3 with MGRS
- **Phase line**: name (e.g., "PL ALPHA") + two endpoint coordinates
- **Risk-zone names**: e.g., "Suspected Approach NAI 1" with center MGRS + radius
- **Asset callsigns**: full list — "1/A", "1/B", "2/A", "2/B", "3/A", "WPNS", "JLTV-1", "RQ-11", "OP-7"

### 3. Vocabulary list for task 9 (due H5)

Two columns: "current copy" → "TacNet copy". Hand to C as a find/replace list.

Examples to seed:
- "incident" → "SITREP" (UI display only; backend keeps `incident`)
- "signals" → "reports"
- "Sentinel Forge" → "TacNet Edge"
- "anomaly" → "indicator"

### 4. Pitch rehearsal (H10–18)

You own `branch-b-sentinel-forge-demo-script.md` execution. **Three clean rehearsals by H14, three more H16:30–18.** Calibrate pace to 2:55–3:05 total runtime.

The two phrases that must land:
- **"Semantic compression over a tactical mesh"** in the solution beat (0:20).
- **"C2 that degrades gracefully instead of going blind"** in the close (2:45).

Pitch-time A/B decision (per demo script §4): default to the on-device framing sentence over the MeshNode iPhone prop. Only use the prop if someone owns it and it has survived three full rehearsals.

**Evidence-beat fallback:** the demo script line at 1:25 says "click any SITREP line → evidence drawer opens." If C ships the H7 inline fallback instead of the full drawer (per `docs/team-c-frontend-components-v2.md` §"H7 hackathon-pragmatism fallback"), reword the narration to *"the source rows highlight under the SITREP"* and adjust the click expectation. Either visual sells the explainability beat — don't insist on the drawer if it didn't ship.

**3 Kbps line to land:** replace any vague "bandwidth drops" wording with: *"Now the tactical link is down to 3 Kbps. Raw platoon traffic no longer fits. TacNet compresses at the squad layer, and the commander picture still fits."*

**Do not say Chrome throttling proves this.** Chrome network throttling is only useful for map fallback rehearsal. The demo proof is the in-app 3 Kbps budget meter.

---

## Hourly schedule

| Hour | Goal | Hand-offs |
|---|---|---|
| **H0–1** | Scenario events table v1 (12 events). Include `body` and `degraded_short` for each event. Use placeholder MGRS grids if needed; A has scaffolded with TBDs. | **→ A**: events table by H1. |
| **H1–3** | NAI/grid content list. Refine event bodies to doctrine standard. | **→ A**: map content list. **H3 mandatory sync with A**: 15-min joint sanity check on rendered map. |
| **H3–5** | Refine event content based on rendered map; finalize MGRS grid + phase line names. Vocabulary list for task 9 ready. | **→ C**: vocabulary list by H5. |
| **H5–7** | Q&A prep: review the 10 anticipated answers in `branch-b-sentinel-forge-demo-script.md` §7. Refine wording for doctrine and the 3 Kbps proof. | |
| **H7–10** | Pitch dry runs against C+D's working build. Time each pass. | |
| **H10–14** | **Three clean rehearsals as pitch lead.** | |
| **H14–15** | Narrate backup video (D records). | |
| **H15–16:30** | Submission text (Devpost README, blurb). | |
| **H16:30–18** | Final rehearsals. **You speak; D operates the laptop.** Do not swap roles mid-pitch. | **D operates the laptop while you speak.** |

---

## Hand-offs

**You receive:**
- A's `/state` shape at H1 (you can sanity-check that your event fields match)
- A's rendered map at H3 (you correct doctrine errors before compaction is built on top)

**You deliver:**
- Scenario events table → A (H1)
- Map content list → A (H3)
- Vocabulary list → C (H5)
- Q&A prep → for your own use during pitch (H7)

**Joint syncs (mandatory):**
- **H3 with A**: 15-min joint sanity check on rendered map
- **H9 with all four**: integration gate

---

## Verification gate (your gate)

- Pitch lead can read scenario content aloud and have it sound like a real soldier wrote it (no copy that breaks doctrine or sounds like generic AI text).
- Pitch lead can explain the 3 Kbps beat in one sentence without overclaiming real networking.
- Vocabulary list for C is complete and unambiguous.
- Three back-to-back 3-minute pitches at 2:55–3:05 each, no mid-sentence pauses to check the slide, no rushed words.

---

## What you're not doing

- Writing Python. Don't.
- Operating the laptop during the pitch. D does that. You're the voice.
- Implementing UI changes. C does relabel from your list.
- Choosing technology stack decisions. Branch B is locked.
- Modifying iOS/MeshNode. Not part of this live demo.

If a teammate asks you to code, point them back to this file's "Read first" section.
