# TacNet Edge Presenter Script

**Purpose:** first-pass read-aloud script for the presenter.
**Operator script:** `docs/operator-script.md`
**Source notes:** `docs/presenter-script-source.md`
**Domain source:** `docs/team-b-domain-pitch-v3.md`
**Target runtime:** 2:55-3:05

## Script

### 0:00-0:20 - Problem

In Raven Gap, a fictional contested border valley, a battalion commander still has to command through EW pressure: SATCOM denied, tactical radio intermittent, and too much field traffic for the pipe.

In contested comms, the commander is not starved for information. The commander is starved for up to date, usable meaning that can fit through the link.

### 0:20-0:35 - Solution

TacNet Edge is semantic compression over a tactical mesh.

Instead of pushing raw voice, chat, telemetry, and repeated reports through a fragile network, TacNet converts field traffic into structured operational meaning before it moves.

Every byte crossing the mesh carries more command value.

We have implemented semantic compression on edge devices using the latest small language models, which allow 25 to 100X compression ratios.

### 0:35-0:40 - Demo Setup

This is Raven Gap: three rifle squads, one weapons squad, an attached JLTV support vehicle, a small UAS team, and an OP/LP sensor.

The link is already constrained to 3 Kbps, and compression starts off.

### 0:40-0:50 - Compression Off

Here is one spoken SALUTE report from One Alpha: one dismount moving south near NAI 1, grid 11SLT 12345 67890.

At 3 Kbps, raw voice does not fit. It misses the budget before it reaches command, so no new report enters the commander picture.

### 0:50-1:02 - Compression On

Now we turn semantic compression on and send the same report again.

TacNet analyzes the audio and extracts a 9-line report, and then compresses it into a metadata format, and then send it as compressed binary.

Same tactical meaning, radically fewer bytes.

Now it fits, and the report enters the source feed.



### 1:02-1:13 - Reports Arrive

the reports arrive.

the map is going to show status readiness for your unit, your sister units, and enemy forces, live updates based on the current operation.


### 1:13-1:25 - Squad Compaction

TacNet rolls that up at the squad layer before it reaches the commander.

That is the key: not more bandwidth, better payload discipline. The mesh carries meaning, not raw media.

### 1:25-1:38 - Commander SITREP

The commander gets one picture: what changed, what threatens the decision cycle, and whether to retask UAS, request ACE, or confirm contact.

The system is not making the decision. It is preserving commander attention under degraded communications.

### 1:38-1:48 - Evidence

And every claim is explainable.

This SITREP line links back to the source reports that created it, so compression does not become a black box.

### 1:48-2:05 - Hero Beat

This is the core proof.

Raw traffic is over budget. The compacted commander picture fits. The platoon does not go blind just because the link degrades.

TacNet Edge is C2 that degrades gracefully instead of going blind.

### 2:05-2:25 - Impact

In command and control, one minute matters.

When information moves one minute sooner, commanders can act before the situation compounds: redirect a patrol, retask UAS, confirm contact, or close an intelligence gap.

Saving time here is not convenience. It can change casualty outcomes.

### 2:25-2:45 - Vision

Today this is a browser demo proving the payload discipline.

Tomorrow, the same semantic layer can feed ATAK over tactical radios, LoRa, MANET, or whatever transport the unit can actually sustain.

As mesh technology improves, TacNet makes that connectivity more valuable.

### 2:45-3:00 - Close

We are not claiming to solve RF, terrain, jamming, routing, or antennas.

We are changing what the network has to carry.

TacNet Edge makes every byte over the tactical mesh carry more command value.
