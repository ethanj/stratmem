#startup/tacnet

# Competitive Landscape

==Three layers of competition: incumbents (primes), new defense-tech (Anduril/Shield/Palantir), and adjacent edge-AI plays. TacNet sits in a gap none of them are in.==

## Layer 1 — Primes (the incumbents)

| Company | What they sell | Why they don't fit the gap |
|---|---|---|
| **L3Harris** | Falcon family tactical radios | Hardware-locked, RF-loud, expensive ($5–20K/radio), zero on-device AI |
| **RTX (Raytheon)** | Multi-band radios, EW systems | Closed waveforms, prime contracts only, slow iteration |
| **General Dynamics** | Type-1 secure radios | Same — hardware-led, no software-first comms substrate |
| **Thales** | SquadNet, IP-mesh radios | European focus, hardware-led |
| **BAE Systems** | Tactical comms suite | Same |

==Primes will not cannibalize their own radio revenue with software-first mesh. That's our wedge.==

## Layer 2 — New defense tech (Series B+)

| Company | Focus | Overlap with TacNet |
|---|---|---|
| **Anduril** | Autonomy, counter-drone, comms (Lattice OS) | Adjacent — they sell autonomy + C2 OS, not the comms substrate |
| **Shield AI** | Autonomous flight (V-BAT, Hivemind) | Adjacent — autonomy, not comms |
| **Palantir** | Data fusion, C2 software (Maven, AIP) | Adjacent — cloud-side fusion, not edge / mesh |
| **Helsing** | EU defense AI | Adjacent — sensors / autonomy, not tactical comms |
| **Saronic** | Maritime autonomous | Different domain |
| **Apex** | Space tech | Different domain |
| **Vannevar Labs** | Linguistics / OSINT | Different domain |

==The new-defense-tech wave has not built the comms layer. TacNet is the comms substrate that Anduril/Shield's autonomy actually rides on when the cloud is gone.==

## Layer 3 — Edge AI / mesh adjacents (smaller, partial overlap)

| Company | What they do | Why it's not the same |
|---|---|---|
| **goTenna Pro** | Sub-GHz mesh comms (text only, no AI) | No on-device AI, no semantic compression, hardware required |
| **Sonim / Beartooth** | Off-grid voice/text | No tactical hierarchy, no AI compaction |
| **Persistent Systems** | MANET radios (Wave Relay) | Hardware-only, no edge AI |
| **TrellisWare** | TSM tactical mesh | Same — hardware-only mesh |
| **Silvus Technologies** | StreamCaster MANET | Same |
| **Soldier Strong / Bittium** | Soldier comms hardware | Same |

==These are mesh-radio companies. None has on-device SLM-driven semantic compression. That's the technical moat.==

## TacNet's differentiated position

```
                  Hardware-first
                        ↑
                        │
         Primes         │     MANET radios
       (L3, RTX, GD)    │   (Persistent, TrellisWare,
                        │      Silvus, goTenna)
                        │
   Cloud-tethered ──────┼────── Edge / offline
                        │
                        │       ★ TacNet ★
         Palantir       │   (software + on-device AI
        (data fusion)   │    + protocol-agnostic mesh)
                        │
                        │     Anduril / Shield AI
                        │     (autonomy, adjacent)
                        ↓
                   Software-first
```

==TacNet is the only player at "software-first × edge / offline × AI-native". The four corners around us are filled. The center is empty.==

## Defensibility / moat

1. **On-device SLM optimization** — Cactus + Gemma 4 E4B INT4 on Apple NPU is a real engineering moat. Competitors would need ~12 months to catch up.
2. **Ranger Handbook fine-tune** — proprietary doctrine-style training corpus. Style-locked output that primes can't easily replicate.
3. **Protocol-agnostic transport** — same software runs over BLE (prototype), long-range radio / ATAK (production), SDR/FHSS at scale. Primes are vertically integrated; we're horizontally portable.
4. **STTR + Cornell partnership** — academic IP pipeline that compounds.
5. **Founder credibility** — 2LT National Guard inside the actual customer.

## Why we win an STTR / DoD evaluation

- ==**Resilience**: we work when the cloud and the radios are gone. Nothing else in the market does.==
- **Cost**: software-defined, runs on commodity phones today, cheap edge nodes tomorrow. 10–100x cheaper per node than current radios.
- **Interoperability**: hardware-agnostic by design — fits any service, any allied force.
- **Aligned with Mosaic Warfare**: textbook attritable / disaggregated design.

## Related
- [[pitch deck]]
- [[business model]]
- [[market sizing]]
- [[technical moat]]
- [[tacnet homepage]]
