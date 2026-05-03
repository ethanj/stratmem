# TacNet Scenario Book - Report And Dashboard Packets

**Purpose:** This file defines the scenario events and report packets that support the 90-second readiness demo. It is intentionally implementation-neutral: use it as a shared source of truth for UI state, backend scenario playback, pitch rehearsal, and QA.

Related scenario narrative: `docs/scenario-book-90-second-readiness-demo.md`

---

## 1. Scenario Rules

The scenario should feel like a live platoon command picture, not a scripted slideshow.

1. Every dashboard change must come from a visible report, signal, or asset update.
2. Every generated summary must link back to evidence.
3. Reports should degrade gracefully under bandwidth pressure: fewer raw details cross the link, but the battalion/S2 picture remains coherent.
4. The system should never recommend engagement. It should recommend attention, collection, casualty evacuation coordination, and resupply.
5. The scenario should use fictional grids, call signs, and locations.

---

## 2. Entity Baseline

| Entity ID | Display name | Type | Parent | Initial status |
|---|---|---|---|---|
| PLT-1 | First Platoon | Platoon | Battalion | GREEN |
| HQ-1 | Platoon HQ | Command | PLT-1 | GREEN |
| SQD-A | Alpha Squad | Rifle squad | PLT-1 | GREEN |
| SQD-B | Bravo Squad | Rifle squad | PLT-1 | GREEN |
| SQD-C | Charlie Squad | Rifle squad | PLT-1 | GREEN |
| SQD-W | Weapons Squad | Weapons squad | PLT-1 | AMBER |
| VEH-2 | JLTV-2 | Vehicle | PLT-1 | GREEN |
| UAS-11 | Raven-11 UAS | Drone | PLT-1 | GREEN |
| SNS-4 | OP/LP Sensor 4 | Sensor | PLT-1 | GREEN |

### Personnel Baseline

| Element | Authorized | Available | Notes |
|---|---:|---:|---|
| Platoon HQ | 4 | 4 | Includes attached medic for demo simplicity. |
| Alpha Squad | 9 | 9 | Forward element. |
| Bravo Squad | 9 | 9 | Left flank observation. |
| Charlie Squad | 9 | 9 | Rear security. |
| Weapons Squad | 8 | 7 | One operator temporarily assigned to battery carry / maintenance. |
| Total | 39 | 38 | Demo starts slightly degraded but mission-capable. |

---

## 3. Event Timeline

| Event ID | Demo time | Source | Event type | Short description | Dashboard impact |
|---|---:|---|---|---|---|
| E-00 | 0s | System | scenario_start | Raven Gap scenario begins. | All baseline entities appear. |
| E-01 | 8s | SNS-4 | sensor_trigger | Movement near NAI-2. | Adds unconfirmed movement indicator. |
| E-02 | 16s | SQD-B | SALUTE_voice | Bravo SALUTE report. | Adds contact marker and S2 note. |
| E-03 | 26s | UAS-11 | uas_observation | UAS observes same movement, battery 31%. | UAS turns AMBER; confidence increases. |
| E-04 | 36s | SQD-A | lace_update | Alpha reports one urgent casualty and low ammo. | Alpha availability drops; platoon AMBER. |
| E-05 | 48s | SQD-A | nine_line_medevac_voice | Alpha sends formatted MEDEVAC report. | CASEVAC requirement appears. |
| E-06 | 62s | VEH-2 | vehicle_status | JLTV-2 tire damage, reduced mobility. | Mobility turns AMBER. |
| E-07 | 72s | Network | bandwidth_degraded | Link constrained to 3 Kbps plus jitter. | Raw feed thins; summaries continue. |
| E-08 | 82s | System | battalion_rollup | Compacted platoon state reaches battalion/S2 view. | Final readiness and evidence drawer populate. |

---

## 4. Report Packet Examples

These examples are written as conceptual packets, not code contracts.

### E-01 OP/LP Sensor Trigger

| Field | Value |
|---|---|
| Source | OP/LP Sensor 4 |
| Type | sensor_trigger |
| Location | NAI-2, near grid 22334455 |
| Confidence | low |
| Message | "Motion trigger near NAI-2. Classification unavailable." |
| Dashboard effect | Add gray/unconfirmed marker. Do not change readiness. |

### E-02 SALUTE Voice Report

**Spoken report:**

> "Bravo One SALUTE report. Size two personnel. Activity moving south. Location grid 22334455. Unit unknown. Time now. Equipment light packs, no vehicle observed."

**Metadata fields:**

| Field | Value |
|---|---|
| report_type | salute |
| speaker | Bravo One |
| size | two personnel |
| activity | moving south |
| location | grid 22334455 |
| unit | unknown |
| time | now |
| equipment | light packs, no vehicle observed |
| confidence | medium |

**Dashboard effect:**

- Add contact marker near grid 22334455.
- Add southbound movement arrow.
- Increase S2 confidence from LOW to MEDIUM for NAI-2.
- Evidence drawer links to Bravo voice transcript and Sensor 4 trigger.

### E-03 UAS Observation

| Field | Value |
|---|---|
| Source | Raven-11 UAS |
| Type | uas_observation |
| Location | NAI-2 |
| Observation | "Two dismount-sized heat signatures moving south." |
| Battery | 31% |
| Status | AMBER |
| Dashboard effect | UAS asset turns AMBER; contact confidence increases to MEDIUM-HIGH. |

### E-04 Alpha LACE / Status Update

**Spoken report:**

> "Alpha Two LACE update. One urgent casualty, low ammo, equipment otherwise green. We are at grid 12345678 and need resupply and medic support."

**Metadata fields:**

| Field | Value |
|---|---|
| report_type | ace_lace |
| speaker | Alpha Two |
| location | grid 12345678 |
| casualties | one urgent |
| ammo | low |
| equipment | green |
| request | resupply, medic support |
| priority | urgent |

**Dashboard effect:**

- Alpha Squad availability drops from 9/9 to 8/9.
- Platoon personnel available drops from 38/39 to 37/39.
- Alpha readiness changes to RED/AMBER.
- Platoon readiness changes to AMBER.
- Sustainment risk increases.

### E-05 Nine-Line MEDEVAC Voice Report

**Spoken report:**

> "Alpha Two, nine-line MEDEVAC. Line one, pickup grid 12345678. Line two, call sign Alpha Two. Line three, one urgent casualty. Line four, no special equipment. Line five, one litter. Line six, pickup site security unknown. Line seven, mark with orange smoke. Line eight, U.S. military. Line nine, no CBRN."

**Metadata fields:**

| Field | Value |
|---|---|
| report_type | nine_line_medevac |
| unit | Alpha Two |
| pickup_location | grid 12345678 |
| contact | Alpha Two |
| precedence | urgent |
| casualty_count | 1 |
| special_equipment | none |
| patient_type | litter |
| pickup_security | unknown |
| marking | orange smoke |
| nationality | U.S. military |
| cbrn | none |
| priority | urgent |

**Compression display:**

| Stage | Example display |
|---|---|
| Raw audio estimate | 7,500 B for 10 seconds at 6 kbit/s |
| Transcript | Local only |
| Metadata JSON | Roughly 250-500 B for debug view |
| Binary frame | Roughly 100-200 B |
| Compression ratio | About 40x-75x smaller than raw compressed speech |

**Dashboard effect:**

- CASEVAC requirement appears.
- Alpha casualty evidence becomes traceable to a formatted report.
- Battalion/S2 alert changes from "readiness degraded" to "urgent casualty requiring evacuation coordination."
- The summary stays advisory: coordinate evacuation and support, not engagement.

### E-06 JLTV-2 Mobility Status

**Report:**

> "JLTV-2 reports tire damage. Mobility reduced. Can reach Checkpoint Bravo but not off-road pickup without delay."

**Dashboard effect:**

- JLTV-2 turns AMBER.
- Mobility risk appears under CASEVAC route support.
- Final rollup says evacuation support is available but degraded.

### E-07 Network Degradation

| Field | Value |
|---|---|
| Trigger | EW pressure increases |
| Link | 3 Kbps, jitter visible |
| Raw feed behavior | Fewer raw events shown crossing the link |
| Summary behavior | Compacted readiness rollup still arrives |
| Dashboard effect | Comms status RED/AMBER, command picture remains readable |

---

## 5. Readiness Rollup Logic

Use these as story rules. They are not implementation formulas.

| Input | Rollup effect |
|---|---|
| One urgent casualty in Alpha | Alpha readiness cannot remain GREEN. |
| Low ammo in Alpha | Alpha sustainment status becomes AMBER or worse. |
| UAS battery below 35% | UAS status becomes AMBER. |
| Vehicle mobility reduced | Mobility status becomes AMBER. |
| Network constrained to 3 Kbps | Comms status becomes RED/AMBER. |
| Evidence from at least two independent sources | S2 confidence can rise from MEDIUM to MEDIUM-HIGH. |
| Personnel loss plus mobility issue | Battalion dashboard should call out evacuation-support risk. |

### Final Rollup Packet

| Field | Value |
|---|---|
| unit | First Platoon |
| readiness | AMBER |
| personnel_available | 37 / 39 |
| urgent_casualties | 1 |
| degraded_elements | Alpha Squad, Weapons Squad, JLTV-2, Raven-11 UAS, network |
| key_risk | urgent casualty with degraded mobility support |
| s2_note | unconfirmed two-person movement near NAI-2, observed by sensor and UAS |
| recommended_attention | CASEVAC coordination, Alpha resupply, UAS retask before battery loss |
| evidence_count | 6 source reports/signals |

---

## 6. UI Panels This Scenario Should Drive

| UI panel | What it should show |
|---|---|
| Map / COP | Platoon elements, NAI-2 marker, contact movement, pickup grid, route/checkpoints. |
| Mesh / unit tree | Platoon HQ, squads, JLTV, UAS, sensor nodes with GREEN/AMBER/RED status. |
| Voice pipeline | Audio to transcript to metadata JSON to binary. |
| Compression panel | Raw audio estimate versus CBOR frame size and compression ratio. |
| Event stream | Source reports arriving over time. |
| Compaction timeline | Many source reports collapsing into one platoon rollup. |
| Readiness dashboard | Personnel availability, squad status, asset health, comms state. |
| Battalion/S2 dashboard | Contact observation, readiness rollup, evidence links, collection confidence. |
| Evidence drawer | Exact reports that produced the final readiness/S2 claims. |

---

## 7. Acceptance Criteria For The Story

- [ ] The audience can tell that personnel availability changed because of a casualty report.
- [ ] The audience can tell that equipment health changed because of UAS/JLTV reports.
- [ ] The audience can see low bandwidth as an active constraint, not just a label.
- [ ] The audience can see raw audio is larger than the compressed binary frame.
- [ ] The audience can see at least one formatted report transformed into metadata.
- [ ] The audience can see the battalion/S2 picture update live.
- [ ] The final dashboard is explainable by source reports, not opaque AI prose.
- [ ] The story remains focused on care, readiness, collection, and command awareness.
