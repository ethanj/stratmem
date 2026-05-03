# TacNet Edge Pitch v2 — Degraded C2

**Purpose:** 3-minute judge pitch centered on decision latency under degraded bandwidth.
**Demo proof:** 3 Kbps simulated tactical link; compression OFF makes raw voice/report traffic fail the pipe; compression ON sends structured SALUTE JSON and the commander picture fits.
**Active demo:** `docs/branch-b-sentinel-forge-demo-script.md`

---

## Core Framing

Current command and control takes too long to turn raw field reports into commander understanding.

That delay gets worse in low-bandwidth and jammed-signal environments. The commander still needs SALUTE reports, ACE/LACE updates, UAS observations, sensor triggers, and PLI updates, but the link cannot carry every source report fast enough.

TacNet Edge solves the bandwidth and latency problem by compressing meaning before it moves.

---

## Mesh Hypothesis

Judges may know that tactical mesh/MANET work has struggled in the field. Do not argue that TacNet "solves mesh networking." That is too broad and too easy to challenge.

Our hypothesis is narrower:

> Mesh networks fail in the field partly because we keep asking them to carry low-semantic-density traffic: voice, raw chat, repeated position updates, verbose reports, attachments, and broadband-style app state.
>
> TacNet changes the payload. It turns raw field traffic into sparse, mission-prioritized semantic state before transmission.

Important distinction:

- Weak claim: "We compress data into binary."
- Strong claim: "We convert raw reports into structured operational meaning, then transmit only the mission-critical state changes."

Everything on a radio is already binary. The innovation is increasing **semantic signal per transmitted byte**.

Demo transmit format:

> For this demo, the transmit object is JSON. TacNet will eventually support many report schemas that can be identified by their contained fields, but we only need one for the live demo.

Implementation boundary:

> Use SALUTE for the demo unless the team decides 9-line is easier on the day. Do not build a schema registry or support thousands of formats. Show one clear voice/raw report becoming one compact structured JSON event.

Use this line when challenged on prior mesh failures:

> We are not betting that a new mesh suddenly creates bandwidth. We are betting that the bytes crossing the mesh should carry more command value.

Future-state framing:

> As mesh technology improves, TacNet is the payload and protocol layer designed to exploit it. Better radios give us more paths; semantic compression makes those paths useful sooner.

Current demo boundary:

> Today we simulate the constrained link and prove the payload discipline. The future fielded system rides whatever mesh, MANET, LoRa, tactical radio, or ATAK transport the unit can actually sustain.

---

## Impact Claim

In command and control, one minute matters. If a commander gets the right information one minute sooner, that can be the difference between redirecting a patrol, retasking UAS, confirming contact, or letting a threat develop unseen.

Use this as the impact frame:

> In this environment, saving a minute is not convenience. It can change casualty outcomes.

Avoid an unsupported hard claim like "this saves hundreds of lives" unless the team has a sourced scenario or casualty model. In the live pitch, use:

> When information moves one minute sooner, commanders can act before the situation compounds.

---

## Opening

> The problem is not that platoon leaders lack data. It is that command and control takes too long to turn raw reports into a usable picture.
>
> And when bandwidth collapses, especially under jamming, the commander gets the worst of both worlds: too much fragmented information and too little pipe to move it.

---

## One-Liner

> TacNet Edge is semantic compression for command and control under degraded communications.

Alternate, if the judge is focused on mesh:

> TacNet Edge makes every byte over the tactical mesh carry more command value.

---

## Solution

> TacNet Edge compresses meaning before it moves. Squad-level devices roll raw reports into traceable commander SITREPs, so the platoon keeps command even when the link degrades.

Longer version:

> Instead of pushing raw voice, chat, telemetry, and repeated reports through a fragile mesh, TacNet extracts structured operational meaning at the edge, prioritizes it, and transmits compact state changes the commander can act on.

Future-state version:

> TacNet is designed as the semantic layer above tactical transport. If future mesh networks provide enough connectivity, TacNet makes that connectivity more valuable by sending mission-prioritized meaning instead of raw traffic.

Demo implementation version:

> In the demo, the semantic payload is a compact JSON SALUTE event. The future system can add other schemas, but the proof is one report format moving from raw speech to structured operational meaning.

Avoid saying "AI summarization" as the main concept. Use:

- semantic compression
- commander picture
- traceable SITREP
- 3 Kbps link budget
- degraded C2
- semantic signal per byte
- sparse state replication

---

## Demo Setup

> This is Raven Gap: a fictional contested border valley. We have three rifle squads, one weapons squad, an attached JLTV support vehicle, a small UAS team, and an OP/LP sensor.
>
> Reports are arriving from the edge: SALUTE, ACE/LACE, UAS observations, sensor triggers, and PLI updates.

Screen should show:

- Raven Gap COP/map
- MGRS grid
- unit icons
- NAIs
- phase line
- checkpoints
- source report stream
- mesh hierarchy

---

## Voice To JSON Beat

P0 demo version:

1. Play a prerecorded voice report.
2. Keep compression OFF and show raw audio/report bytes exceed the 3 Kbps budget.
3. Toggle semantic compression ON.
4. Show the stored transcript and deterministically extract one structured JSON report.
5. Inject that JSON event into the Raven Gap stream.
6. Let the existing compaction/SITREP pipeline consume it.

Scope guard: do not make live mic or live STT part of the critical path. The pitch can say "speech to structured report" because the demo plays the recorded report and the pipeline handles transcript → JSON → compaction for real.

Use SALUTE because it is easy to explain:

```json
{
  "type": "salute",
  "source": "1/A",
  "size": "1 dismount",
  "activity": "moving south",
  "location": "11SLT 12345 67890",
  "unit": "unknown dismount",
  "time": "T+45",
  "equipment": "light pack; no visible crew-served weapon",
  "request": "uas_confirm"
}
```

Narration:

> At 3 Kbps, raw voice cannot move. Turn semantic compression on, and TacNet extracts the SALUTE fields and sends the structured JSON report, not the audio. The future system can support many schemas, but this demo proves the pipeline with one.

---

## 3 Kbps Proof Beat

> The tactical link is down to 3 Kbps. With compression off, raw platoon traffic does not fit.
>
> Turn compression on, and TacNet sends structured meaning. The commander picture still fits.

Screen should show:

- `3 KBPS DEGRADED LINK`
- compression OFF: raw voice/report over budget
- compression ON: SALUTE JSON fits
- compacted traffic fits
- compression ratio
- feed/timeline detail reduced
- SITREP still coherent
- map still useful

This is the central proof point. Do not describe it as browser throttling. It is an in-app tactical-link budget simulation.

---

## Evidence Beat

> Every claim is traceable.

Preferred screen behavior:

- click a SITREP line
- evidence drawer opens with source reports

Fallback screen behavior:

- source rows highlight under the SITREP

Either is acceptable. The point is traceability, not the drawer itself.

---

## Closing

> The commander keeps the picture, and every recommendation is traceable.
>
> When information moves one minute sooner, commanders can act before the situation compounds.
>
> Today this runs as a browser demo. Tomorrow it feeds ATAK over tactical radios.
>
> TacNet Edge is C2 that degrades gracefully instead of going blind.

---

## Q&A Anchors

**Does this need internet?**

> The demo can run deterministic local compaction. Product architecture targets on-device models on phones; hosted prose is optional and not required for the mesh.

**What did you build?**

> A TacNet command view on FastAPI and React: Raven Gap scenario, compression OFF/ON voice-to-SALUTE proof, map state, mesh hierarchy, compaction timeline, traceable SITREP, and a 3 Kbps degraded-link proof.

**What is the transmit format?**

> For this demo, JSON. The system is designed around many possible structured report schemas, but we only demonstrate one: a SALUTE-style report extracted from voice and transmitted as compact mission state.

**What does the compression switch prove?**

> It makes the counterfactual visible. With compression off, the raw voice/report payload exceeds the 3 Kbps link budget and cannot enter the command picture. With compression on, the SALUTE JSON fits and updates the SITREP.

**Is the voice demo live STT?**

> No. For demo reliability, it uses one prerecorded report and a stored transcript. The real pipeline starts at transcript to SALUTE JSON, then compaction, byte-budgeting, and SITREP all run through the app.

**Why is this innovative?**

> It compresses tactical meaning at the edge instead of trying to stream every source report through a broken network.

**Mesh networks have been tried before. Why will this work?**

> We are not claiming to solve RF, terrain, jamming, routing, or antennas. The insight is payload discipline: under degraded links, the mesh should carry sparse mission state, not broadband-style traffic. TacNet increases semantic signal per byte and prioritizes the updates that matter.

**What if mesh technology gets better?**

> That is exactly the future state we are designing for. TacNet is transport-agnostic: better mesh gives us more capacity and path diversity; TacNet makes that capacity carry commander-relevant state instead of raw noise.

**What does 3 Kbps prove?**

> It makes the constraint visible. Raw platoon reports exceed the link budget; semantic compression fits while preserving the commander picture and evidence trail.

**Is this automating decisions?**

> No. It supports threat recognition, collection prioritization, and commander attention. It stops at collection and attention recommendations; humans stay in the loop.

---

## Phrases To Keep

- "The cloud is the casualty."
- "Too much fragmented information and too little pipe."
- "Semantic compression before transmission."
- "Semantic signal per byte."
- "For this demo, the transmit object is JSON."
- "Compression off: raw voice fails. Compression on: SALUTE JSON fits."
- "The bytes crossing the mesh should carry more command value."
- "Better radios give us more paths; semantic compression makes those paths useful sooner."
- "Raw platoon traffic no longer fits."
- "The commander picture still fits."
- "Saving a minute is not convenience. It can change casualty outcomes."
- "Every claim is traceable."
- "C2 that degrades gracefully instead of going blind."
