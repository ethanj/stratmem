#startup/tacnet

# Glossary — TacNet & Defense-Tech Terminology

## C2 / comms
- **C2** — Command and Control. The doctrine and tooling for directing forces.
- **C4ISR** — Command, Control, Communications, Computers, Intelligence, Surveillance, Reconnaissance.
- **PACE** — Primary, Alternate, Contingency, Emergency comms plan.
- **Reach-back** — pulling on rear-area / cloud resources from the field.
- **Mesh network** — peer-to-peer topology where every node forwards messages.
- **BLE** — Bluetooth Low Energy. Prototype transport for iOS development and hackathon demos only. Production transport is long-range radio (LoRa/SDR) and ATAK.
- **LoRa** — Long Range, low-power sub-GHz radio. Future TacNet transport.
- **SDR** — Software Defined Radio. Programmable RF front-end.
- **FHSS** — Frequency-Hopping Spread Spectrum. EW-resistant modulation.

## EW / threat
- **EW** — Electronic Warfare. Jamming, spoofing, and DF.
- **DF** — Direction Finding. Locating an emitter from its RF signature.
- **A2/AD** — Anti-Access / Area Denial. Adversary doctrine to keep U.S. forces out.
- **SNR** — Signal-to-Noise Ratio. Drives Shannon channel capacity (see [[technical moat]]).
- **Near-peer adversary** — China, Russia. The reason A2/AD matters.

## Doctrine / formats
- **Mosaic Warfare** — DARPA's disaggregated, attritable-systems doctrine.
- **Attritable** — cheap enough to be lost without breaking the mission.
- **SALUTE** — Size / Activity / Location / Unit / Time / Equipment report.
- **SITREP** — Situation Report.
- **ACE** — Ammo / Casualty / Equipment status.
- **LACE** — Liquid / Ammo / Casualty / Equipment status.
- **9-line MEDEVAC** — standardized casualty evacuation request.
- **OPORD / FRAGORD / WARNORD** — Operation / Fragmentary / Warning Order.
- **EKIA / WIA** — Enemy Killed In Action / Wounded In Action.
- **CASEVAC** — Casualty Evacuation.
- **SITREP**, **SPOTREP**, **TRP**, **PL**, **LD**, **LZ/PZ** — see Ranger Handbook (TC 3-21.76).

## Acquisition / programs
- **DoD** — Department of Defense.
- **DARPA** — Defense Advanced Research Projects Agency.
- **STO** — DARPA's Strategic Technology Office. Owns DARPA-PS-26-09.
- **SBIR** — Small Business Innovation Research grant program.
- **STTR** — Small Business Technology Transfer. Requires academic partner. TacNet's lane.
- **AFWERX / DIU / xTechSearch** — additional DoD innovation pathways.
- **POR** — Program of Record. Sustainable, line-itemed DoD funding.

## AI / ML
- **SLM** — Small Language Model. The on-device kind.
- **Gemma 4 E4B** — Google DeepMind's edge-4B multimodal model with native audio conformer.
- **Cactus** — INT4-on-Apple-NPU runtime that hosts Gemma 4 in TacNet.
- **NPU** — Neural Processing Unit. Edge hardware for ML inference.
- **LoRA** — Low-Rank Adaptation. Cheap fine-tuning method (used for Ranger style transfer).
- **Semantic compression** — encode the *meaning* of a message instead of its bytes.

## Related
- [[tacnet homepage]]
- [[architecture]]
- [[technical moat]]
