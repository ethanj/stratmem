# TacNet Scenario Book - 90-Second Readiness Demo

**Purpose:** This scenario book defines the story the UI should play during the 90-second demo. It is not an implementation spec. It is the operational narrative, event order, report content, and expected dashboard impact.

**Scenario name:** Raven Gap - Platoon Readiness Under EW Pressure

**Demo thesis:** A platoon is operating under restricted low bandwidth while personnel casualties, equipment degradation, and UAS/sensor reports arrive from the edge. TacNet turns voice and field reports into compact metadata and binary frames, then keeps the platoon and battalion/S2 picture current without streaming raw audio or full source traffic.

**Safety boundary:** The scenario supports readiness, casualty evacuation, collection prioritization, and commander awareness. It does not automate fires, targeting, or engagement.

---

## 1. Operational Setup

Raven Gap is a fictional contested valley corridor with degraded SATCOM and intermittent tactical radio. First Platoon is moving from Checkpoint Aspen toward Checkpoint Bravo while maintaining contact with a battalion watch floor.

The battalion S2 dashboard is not controlling the platoon. It is receiving a compact live picture: personnel availability, unit status, asset health, last known locations, contact indicators, and the evidence trail behind each summary.

### Friendly Elements

| Element | Demo role | Initial readiness | Notes |
|---|---|---:|---|
| Platoon HQ | Command node | GREEN | Platoon leader, platoon sergeant, RTO, attached medic. |
| Alpha Squad | Forward rifle squad | GREEN | Primary element moving toward Checkpoint Bravo. |
| Bravo Squad | Left flank rifle squad | GREEN | Reports first SALUTE observation. |
| Charlie Squad | Rear security rifle squad | GREEN | Provides security and casualty support. |
| Weapons Squad | Support-by-fire / overwatch | AMBER | One crew-served optic intermittently offline. |
| JLTV-2 | Support vehicle | GREEN | Carries spare batteries, water, and aid bag. |
| Raven-11 UAS | Small drone team | GREEN | Battery starts at 54%, drops during scenario. |
| OP/LP Sensor 4 | Static observation sensor | GREEN | Low-bandwidth trigger source near NAI-2. |

### Starting Dashboard State

| Metric | Initial value |
|---|---:|
| Platoon readiness | GREEN |
| Personnel available | 38 / 39 |
| Casualties | 0 urgent, 0 routine |
| Squad availability | Alpha 9/9, Bravo 9/9, Charlie 9/9, Weapons 7/8 |
| Mobility | GREEN |
| UAS availability | GREEN, 54% battery |
| Comms state | DEGRADED but stable |
| Battalion/S2 confidence | MEDIUM |

---

## 2. Ninety-Second Storyboard

| Demo time | Event | What happened in the story | What the UI should show |
|---:|---|---|---|
| 0-8s | Scenario starts | First Platoon is already inside Raven Gap with low-bandwidth mesh active. | Map centers on Raven Gap. Platoon hierarchy is GREEN/AMBER. Link panel shows restricted bandwidth. |
| 8-16s | OP/LP trigger | Sensor 4 reports movement near NAI-2 but cannot classify it. | Sensor icon pulses. S2 dashboard adds "unconfirmed movement near NAI-2." Confidence stays MEDIUM. |
| 16-26s | Bravo SALUTE voice report | Bravo Squad sees two unknown dismounts moving south near grid 22334455. | Voice report becomes transcript, metadata JSON, binary frame. S2 map adds a contact marker and evidence link. |
| 26-36s | UAS confirms pattern | Raven-11 observes the same movement but battery drops to 31%. | Drone node turns AMBER. Dashboard shows UAS available but endurance limited. |
| 36-48s | Alpha casualty and low ammo | Alpha Squad reports one urgent casualty and low ammo after a fall while moving under cover. | Personnel availability drops. Alpha readiness turns RED/AMBER. Platoon readiness turns AMBER. |
| 48-62s | 9-line MEDEVAC voice report | Alpha Two sends a formatted 9-line MEDEVAC report by voice. | The demo hero moment: audio estimate vs metadata JSON vs CBOR binary. Receiver reconstructs casualty request. |
| 62-72s | JLTV mobility degraded | JLTV-2 reports tire damage and can move only at reduced speed. | Mobility moves GREEN to AMBER. CASEVAC route confidence drops. |
| 72-82s | Bandwidth worsens | EW pressure increases. The link drops to 3 Kbps with jitter. | Raw event feed thins. Compacted summaries continue. Compression ratio remains visible. |
| 82-90s | Battalion/S2 live reflection | Battalion dashboard receives compact platoon rollup: casualty, readiness, UAS, mobility, and risk. | Final state: readiness AMBER, Alpha RED/AMBER, UAS AMBER, JLTV AMBER, one urgent casualty, evidence drawer open. |

---

## 3. The Hero Voice Report

This is the report that should occur during the demo because it cleanly proves the whole TacNet pipeline:

**Operator speech:**

> "Alpha Two, nine-line MEDEVAC. Line one, pickup grid 12345678. Line two, call sign Alpha Two. Line three, one urgent casualty. Line four, no special equipment. Line five, one litter. Line six, pickup site security unknown. Line seven, mark with orange smoke. Line eight, U.S. military. Line nine, no CBRN."

### Why This Report Works

| Demo need | Why this report fits |
|---|---|
| Voice input | It is naturally spoken and recognizable as a military field report. |
| Structured metadata | Each line maps cleanly into JSON fields. |
| Compression proof | The raw audio estimate is much larger than the metadata/binary frame. |
| Readiness impact | It changes personnel availability, casualty count, and platoon readiness. |
| Battalion/S2 value | It gives higher HQ a live casualty and route-support picture without full audio. |
| Explainability | Each dashboard claim points back to a specific line in the report. |

### Expected UI Transformation

| Stage | What appears |
|---|---|
| Raw audio estimate | "About 7.5 KB for 10 seconds at 6 kbit/s" or duration-adjusted equivalent. |
| Transcript | Full 9-line report text. |
| Metadata JSON | `report_type: "nine_line_medevac"`, `unit: "Alpha Two"`, `location: "grid 12345678"`, `priority: "urgent"`, `casualties: 1`. |
| Binary frame | CBOR/binary byte count and hex preview. |
| Receiver reconstruction | "Alpha Two requests urgent MEDEVAC at grid 12345678: one litter casualty, orange smoke, pickup security unknown." |
| Dashboard impact | Alpha readiness reduced, personnel availability reduced, CASEVAC requirement created, battalion/S2 alert raised. |

---

## 4. Secondary Formatted Report: SALUTE

The SALUTE report should happen earlier than the MEDEVAC report. It proves the same pipeline can handle intelligence/contact reports, not only medical reports.

**Operator speech:**

> "Bravo One SALUTE report. Size two personnel. Activity moving south. Location grid 22334455. Unit unknown. Time now. Equipment light packs, no vehicle observed."

### Expected S2 Impact

| Field | Dashboard effect |
|---|---|
| Size | Contact marker shows "2 personnel." |
| Activity | Movement arrow points south. |
| Location | Contact plotted near grid 22334455. |
| Unit | Classified as unknown, not confirmed hostile. |
| Time | Event appears as current. |
| Equipment | Notes light packs, no vehicle. |

The dashboard should phrase this carefully: "Unconfirmed movement observed" rather than an engagement or targeting recommendation.

---

## 5. Readiness State Changes

The demo should visibly tie field reports to readiness outcomes.

| Trigger | Personnel effect | Asset effect | Dashboard readiness effect |
|---|---|---|---|
| Alpha casualty | Alpha available strength drops from 9/9 to 8/9. | Medic tasking begins. | Alpha turns RED/AMBER; platoon turns AMBER. |
| Alpha low ammo | Alpha remains available but degraded. | Resupply task opens. | Sustainment risk increases. |
| Raven-11 battery 31% | No personnel loss. | UAS turns AMBER. | Collection confidence drops after 12 minutes projected endurance. |
| JLTV tire damage | No direct casualty. | Mobility turns AMBER. | CASEVAC route support risk increases. |
| Weapons optic intermittent | No personnel loss. | Weapons squad stays AMBER. | Overwatch confidence reduced. |
| EW degradation | No personnel loss. | Network throughput drops. | Source feed thins, compact rollup continues. |

---

## 6. Final Dashboard Picture

At the end of the 90-second demo, the screen should read as a real command product from across the room.

### Final Readiness Panel

| Metric | Final value |
|---|---:|
| Platoon readiness | AMBER |
| Personnel available | 37 / 39 |
| Casualties | 1 urgent |
| Alpha Squad | RED/AMBER, 8/9 available, low ammo |
| Bravo Squad | GREEN, contact report submitted |
| Charlie Squad | GREEN, available for security support |
| Weapons Squad | AMBER, optic intermittent |
| JLTV-2 | AMBER, reduced mobility |
| Raven-11 UAS | AMBER, 31% battery |
| Comms | RED/AMBER, restricted low bandwidth |
| Battalion/S2 confidence | MEDIUM-HIGH because reports are linked to evidence |

### Final Commander/S2 Summary

> "First Platoon remains mission-capable but degraded. Alpha has one urgent casualty and low ammo near grid 12345678. Bravo reports two unknown personnel moving south near grid 22334455. UAS confirms movement but battery is AMBER. JLTV support mobility is degraded. Recommend prioritizing casualty evacuation coordination, Alpha resupply, and UAS retask before battery loss."

### Evidence Drawer Should Show

- Bravo SALUTE report.
- Raven-11 UAS observation.
- Alpha casualty/low-ammo status.
- Alpha nine-line MEDEVAC report.
- JLTV mobility report.
- OP/LP Sensor 4 trigger.

---

## 7. Presenter Language

Use short, factual narration.

| Beat | Line |
|---|---|
| Start | "This is First Platoon inside Raven Gap under restricted bandwidth." |
| SALUTE | "A spoken SALUTE report becomes metadata and a tiny binary frame." |
| Casualty | "Now readiness changes: Alpha has one urgent casualty and low ammo." |
| MEDEVAC | "The nine-line is the proof point: audio is local, meaning crosses the link." |
| Degradation | "When bandwidth drops, TacNet sends the command picture, not raw chaos." |
| Final | "Battalion sees personnel availability, asset health, and evidence in one live picture." |

---

## 8. Feature Coverage Checklist

This scenario should demonstrate:

- [ ] Voice input from a platoon element.
- [ ] Formatted SALUTE report.
- [ ] Formatted 9-line MEDEVAC report.
- [ ] Transcript to structured metadata.
- [ ] Metadata to binary frame.
- [ ] Raw audio estimate versus compressed binary size.
- [ ] Restricted low-bandwidth transmission.
- [ ] Personnel casualty reflected in availability.
- [ ] Equipment degradation reflected in asset health.
- [ ] UAS battery/status reflected in collection confidence.
- [ ] Platoon readiness rollup.
- [ ] Battalion/S2 dashboard update.
- [ ] Evidence trace from dashboard claim back to original reports.
