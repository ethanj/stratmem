# TacNet Edge Presenter Script Source

**Purpose:** source material for the presenter. This owns the words and message.
**Operator script:** `docs/operator-script.md`
**First-pass speech:** `docs/presenter-script.md`
**Domain source:** `docs/team-b-domain-pitch-v3.md`
**Do not use as the click run sheet.**

## Core Message

In contested comms, the commander is not starved for information. The commander is starved for usable meaning that can fit through the link.

Platoons generate reports constantly: SALUTE reports, ACE/LACE updates, UAS observations, sensor triggers, and PLI. Under jamming and intermittent radio, that raw traffic cannot move fast enough to give the commander a coherent picture.

TacNet Edge compresses meaning before it moves.

## Main Thesis

TacNet Edge is semantic compression for command and control under degraded communications.

Alternate if judges focus on mesh:

TacNet Edge makes every byte over the tactical mesh carry more command value.

## Mesh Hypothesis

Do not claim TacNet solves mesh networking. Judges may know that tactical mesh/MANET systems have struggled in the field.

The narrower claim:

- Mesh networks struggle partly because we ask them to carry low-semantic-density traffic: voice, raw chat, repeated position updates, verbose reports, attachments, and broadband-style app state.
- TacNet changes the payload. It turns raw field traffic into sparse, mission-prioritized semantic state before transmission.
- Everything on a radio is already binary. The innovation is increasing semantic signal per byte.

Use this line when challenged:

> We are not betting that a new mesh suddenly creates bandwidth. We are betting that the bytes crossing the mesh should carry more command value.

## Demo Proof

The live proof is the compression switch:

1. The link is already constrained to 3 Kbps.
2. Compression starts OFF.
3. One prerecorded voice report is attempted as raw payload.
4. Raw voice/report bytes exceed the 3 Kbps budget and do not enter the command picture.
5. Compression turns ON.
6. The same report becomes SALUTE JSON.
7. The JSON fits and updates the source feed, compaction, SITREP, and evidence trail.

This proves payload discipline, not RF performance.

Team B's required line:

> At 3 Kbps, raw voice does not fit. Turn semantic compression on, and the same report becomes SALUTE JSON that fits and updates the commander picture.

## Demo Boundary

- For the demo, the transmit object is JSON.
- The demonstrated schema is one SALUTE-style report.
- The audio is prerecorded.
- The transcript is stored for reliability.
- The real app pipeline starts at transcript to JSON, then compaction, byte-budgeting, SITREP, and evidence.
- No live STT, live mic, schema registry, iPhone path, or real packet simulation is in the live demo.

## Voice Fixture

Voice script to record:

> One Alpha reports one dismount moving south near NAI 1, grid 11 Sierra Lima Tango 12345 67890. Unknown unit, light pack, no visible crew-served weapon. Request UAS confirm.

Stored transcript:

> One Alpha reports one dismount moving south near NAI 1, grid 11SLT 12345 67890. Unknown unit, light pack, no visible crew-served weapon. Request UAS confirm.

Expected JSON:

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

## Raven Gap Setup

Raven Gap is a fictional contested border valley/corridor.

Use the doctrinal framing:

- three rifle squads
- one weapons squad
- attached JLTV support vehicle
- small UAS team
- OP/LP sensor
- SALUTE reports
- ACE/LACE updates
- UAS observations
- sensor triggers
- PLI updates
- MGRS grid, unit icons, NAIs, phase line, checkpoints

Calls that should appear in UI copy and spoken references:

- `1/A`, `1/B`, `2/A`, `2/B`, `3/A`
- `WPNS`
- `JLTV-1`
- `RQ-11`
- `OP-7`

Use "reports" instead of "signals", "SITREP" instead of "incident" in presenter language, and "indicator" instead of "anomaly".

## Required Lines

- "The cloud is the casualty."
- "TacNet Edge is semantic compression over a tactical mesh."
- "At 3 Kbps, raw voice cannot move."
- "At 3 Kbps, raw voice does not fit."
- "Turn semantic compression on, and the same report becomes SALUTE JSON that fits."
- "The commander picture survives because the mesh carries meaning, not raw media."
- "Every claim is traceable."
- "C2 that degrades gracefully instead of going blind."

## Impact Framing

Use:

> When information moves one minute sooner, commanders can act before the situation compounds.

Avoid:

> This saves hundreds of lives.

That needs a sourced casualty model. Keep the claim defensible.

## Q&A Anchors

**Does this need internet?**

The demo can run deterministic local compaction. Product architecture targets on-device models on phones; hosted prose is optional and not required for the mesh.

**Is the voice demo live STT?**

No. For demo reliability, it uses one prerecorded report and a stored transcript. The real pipeline starts at transcript to SALUTE JSON, then compaction, byte-budgeting, and SITREP all run through the app.

**What is the transmit format?**

For this demo, JSON. We demonstrate one SALUTE-style report schema; future schemas can be added without changing the proof.

**What does the compression switch prove?**

It makes the counterfactual visible. With compression off, the raw voice/report payload exceeds the 3 Kbps link budget and cannot enter the command picture. With compression on, the SALUTE JSON fits and updates the SITREP.

**Mesh networks have been tried before. Why will this work?**

We are not claiming to solve RF, terrain, jamming, routing, or antennas. The insight is payload discipline: under degraded links, the mesh should carry sparse mission state, not broadband-style traffic.

**Is this automating decisions?**

No. It supports threat recognition, collection prioritization, and commander attention. It stops at collection and attention recommendations; humans stay in the loop.
