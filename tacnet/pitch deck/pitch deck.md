#startup/tacnet #career/army

# TacNet — Pre-Seed Pitch Deck (B2G)

==Structured for a 12-minute defense-tech investor meeting. Built on the Anduril / Shield AI / Palantir-era B2G deck conventions: problem-first, technical-moat-second, unit-economics-third, ask-last.==

**Companion notes:**
- [[market sizing]] — full TAM/SAM/SOM with sources
- [[competitive landscape]] — primes vs. new defense tech vs. mesh adjacents
- [[business model]] — revenue layers, pricing, comparables

---

## Design system (apply to every slide)

==Theme: **"Warm Stone, light editorial"** — inspired by ElevenLabs / modern dev-tool sites. Light, minimal, technical. A quiet engineering notebook or defense whitepaper, not a neon hacker dashboard. Lots of whitespace, hairline borders, monospace metadata, subtle grid overlays. **No neon, no pure black, no saturated blue.**==

### Color palette (light, warm-neutral)

| Role | Hex | Usage |
|---|---|---|
| Background | `#FFFFFF` | Main slide background |
| Surface (light gray) | `#F5F5F5` | Section bands, alternating sections |
| Elevated (warm stone) | `#F5F2EF` | Featured cards, callouts, accent slides |
| Foreground (near-black) | `#121212` | Primary text, headings |
| Primary / CTA | `#292524` (warm near-black) | Buttons, accents |
| Muted text | `#4E4E4E` | Secondary copy |
| Dim text | `#777169` (warm gray) | Tertiary copy, metadata, eyebrows |
| Border (hairline) | `#E5E5E5` | Dividers, card outlines |
| Signal amber | `#B45309` (muted ochre) | Highlights, status — **use sparingly** |
| Signal red | `#991B1B` (muted maroon) | Alerts, destructive — **rare** |

### Typography

Two fonts, both Google Fonts:

- **DM Sans** — headings + body. Weights: 300, 400, 500, 600, 700. Tight tracking on big headings (`-0.03em`).
- **JetBrains Mono** — all metadata, labels, button text, captions, stats. Usually **UPPERCASE**, 11pt, wide tracking (`0.12em`).

PPT font substitutes if needed: DM Sans → **Inter** or **Helvetica Neue**; JetBrains Mono → **Consolas** or **IBM Plex Mono**.

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Slide / section title | DM Sans | 44pt (clamp 2.5–4.5rem) | 500 | `#121212` |
| Subhead | DM Sans | 24pt | 500 | `#121212` |
| Body | DM Sans | 16pt | 400 | `#4E4E4E` |
| Eyebrow / labels / buttons | JetBrains Mono | 11pt UPPERCASE, wide tracking | 400–500 | `#777169` |
| Stats (big numbers) | JetBrains Mono | ~64pt, tight | 500 | `#121212` |

### Visual motifs

- **Bracketed buttons / chips**: `[ WATCH DEMO → ]` — square brackets around mono UPPERCASE text. **2px corner radius globally** — no rounded pills.
- **Numbered section rails**: every slide opens with `01 / SECTION LABEL` in mono dim text, top-left.
- **Corner dots**: tiny 3px dots in the top corners of each section frame.
- **Hairline dividers**: 1px borders in `#E5E5E5` between every section / between blocks.
- **Grid / dot overlays**: very subtle 48px grid or 16px dot field behind hero / architecture areas, **4–8% opacity**.
- **Topographic contour lines** on any tactical-map imagery — military-map feel, not satellite.
- **Pulsing operational dots** (small, amber `#B45309` with low-alpha glow) for live-status indicators — used max once per slide.

### Layout principles

- Generous vertical rhythm — sections `py-20` to `py-32` equivalent.
- Max container width 1280px, centered, 1.5rem padding.
- **Sharp corners** — 2px radius max on any element.
- Content **left-aligned** — only hero titles and CTAs are centered.
- Lots of negative space — never fill the whole slide.

### PPT translation cheat sheet

| Element | Spec |
|---|---|
| Slide background | `#FFFFFF` (or `#F5F2EF` for accent slides only) |
| Title | DM Sans / Inter, 44pt, weight 500, `#121212` |
| Body | DM Sans / Inter, 16pt, `#4E4E4E` |
| Eyebrow / labels | JetBrains Mono / Consolas, 11pt, UPPERCASE, wide letter-spacing, `#777169` |
| Buttons / chips | Bracketed mono `[ LABEL → ]`, near-black on white or white on `#292524` |
| Dividers | 1px line, `#E5E5E5` |
| Accent color | `#B45309` (amber) — thin borders or single emphasis words only, never a fill |
| Section numbers | `01 /`, `02 /`, etc. in mono, top-left of each slide |

### Usage rules of thumb (for the LLM generating the deck)

1. ==Whitespace > content density.== If a slide feels cramped, cut content, don't shrink margins.
2. **Never** use saturated blues, neon, gradients, drop shadows, or rounded pill shapes.
3. **Never** color-fill a whole element with the amber or red signal — those are stroke / single-word accents only.
4. Every slide must have: a section number top-left (`01 /`), a hairline divider somewhere, and a single dominant headline.
5. Stats and metadata always go in JetBrains Mono UPPERCASE.
6. Body copy is muted gray (`#4E4E4E`), not pure black.

---

## Slide 1 — Title

> **TacNet**
> A decentralized, AI-native communication layer for the Contested Edge.
>
> *Pre-seed · 2026 · Confidential*

**Speaker note**: One-liner over a black screen. Founder name + 2LT MN National Guard credential below. No logos, no clutter — defense-tech buyers respect signal over noise.

---

## Slide 2 — Why now

> **The cloud is the casualty.**
>
> - Russia in Ukraine has demonstrated tactical-scale GPS, drone, and radio jamming.
> - China's PLA invests in A2/AD specifically to deny US C2 in the Pacific.
> - Every legacy radio assumes a working network. None of them work when it's gone.
>
> **The DoD knows.** DARPA's *Mosaic Warfare* doctrine is funded. STTR / SBIR / DIU pathways are open.
>
> **The technology has finally arrived.** Gemma 4 E4B + Cactus + Apple NPU = real on-device inference at 30s audio in ~0.3s. This was impossible 18 months ago.

**Speaker note**: Three converging waves. Adversaries can jam, SLMs fit on phones, DoD wants disaggregation. (See [[why now]] for the long form.)

---

## Slide 3 — The problem

> **Today's tactical comms have three hard failure modes.**
>
> 1. **High RF signature** — current radios are easy targets for EW and direction finding.
> 2. **Bandwidth dependency** — systems collapse below several Mbps.
> 3. **Hardware lock-in** — proprietary boxes that don't interoperate, cost $5–25K per unit.
>
> **And a fourth one nobody fixes:**
>
> 4. **Cognitive overload** — a commander can't listen to 50 simultaneous voice channels. Today, humans manually summarize upward. In a firefight, they don't.

**Speaker note**: First three are hardware/RF problems. Fourth is the cognitive problem that AI uniquely solves. (See [[problem]].)

---

## Slide 4 — The solution

> **TacNet is a software-first, hardware-agnostic mesh with on-device AI — passive, multimodal, always on.**
>
> Every device is an intelligent tile in a self-healing network. Two layers run in parallel:
>
> - **Broadcast layer (passive multimodal capture)** — audio *and* video are captured continuously from whatever the operator is already wearing: a body cam, GoPro, or — if no designated device is issued — the soldier's own phone clipped to their kit. On-device STT + vision pipelines extract semantic intent locally; ==only transcript-level tokens cross the mesh. Raw audio and video never leave the device.==
> - **Compaction layer (AI summarization upward)** — every parent runs Gemma 4 locally to roll up children into a doctrine-formatted summary. The commander sees a real-time SITREP — not 50 voice channels and not 50 video feeds.

```
ROOT (commander)         ──► AI-compacted SITREP of entire net
  L1 (squad leaders)     ──► AI summary per squad (audio + visual fused)
    L2 (squad members)   ──► passive capture: body cam + phone
```

**Speaker note**: The architectural win is moving voice + visuals → semantic intent → tokens → mesh, all on-device. The operator does nothing different — they just wear the same gear they already wear, and the network does the listening, watching, and summarizing for them. (See [[solution]] and [[architecture]].)

---

## Slide 5 — Technical moat

> **Semantic compression at the Shannon limit — on hardware the warfighter already carries.**
>
> Channel capacity: $C = B \log_2(1 + SNR)$
>
> Traditional radios fail when SNR drops below their fixed threshold. ==TacNet's intent tokens are so small that the system stays connected at near-zero $C$ — exactly where the adversary thinks they've won.==
>
> **Why this beats the incumbents on every axis:**
>
> | Axis | Legacy radio | TacNet |
> |---|---|---|
> | Size | 2–5 lb brick | runs on phone in pocket |
> | Cost | $5–25K per unit | software on commodity device |
> | Features | voice + maybe text | voice + video + AI compaction + GPS + maps |
> | RF signature when intercepted | constant carrier, easy DF | tiny bursty tokens, hard to fingerprint |
> | Jam resistance | bandwidth-dependent | survives near-zero $C$ |
> | Bitrate efficiency | lossy voice codec | semantic-lossless intent tokens |
>
> **Build path: prototype → ecosystem.**
>
> - ==**iOS prototype today**== — BLE mesh for rapid development and hackathon demos. Fastest path to prove the architecture on iPhone 15+.
> - ==**Android for the production product**== — to natively integrate with the DoD warfighter ecosystem: **ATAK** (Android Tactical Assault Kit), **Nett Warrior**, **TrellisWare TSM**, and adjacent MANET stacks. Android is where the actual customer already lives.
> - **Attachable hardware module (USB-C)** — a small dongle that snaps onto the phone and carries the operator's classified payload: **rank, clearance level, unit assignment, encryption keys, radio cert chain**. The phone stays unclassified hardware; the dongle is the security boundary. Pull the dongle, the device is just a phone again.
>
> **Underlying primitives (consistent across builds):**
> - Single Gemma 4 E4B handles STT + vision + summarization in one pass (no Whisper, no separate VLM).
> - Cactus runtime, INT4, on NPU (Apple today, Qualcomm/MediaTek next).
> - Protocol-agnostic: BLE (prototype) → long-range radio / ATAK (production) → SDR/FHSS at scale.

**Speaker note**: Don't dwell on the Shannon math — dwell on "we win where physics says current radios lose, and we run on a phone the soldier already owns." The ATAK / Nett Warrior / TSM angle is the ecosystem story: we're not asking the DoD to adopt a new platform, we're slotting into the one they already use. The USB dongle is the answer to "but how do you handle classified material on consumer hardware?" (See [[technical moat]].)

---

## Slide 6 — Product (live demo)

> **Live demo** — *web-app version, runs in the browser during the meeting.*
>
> **Feature list (current build):**
>
> - On-device STT + vision (Gemma 4 E4B via Cactus, INT4)
> - Mesh transport with auto-reparenting (BLE for prototype; long-range radio / ATAK for production)
> - Drag-and-drop tree builder for organiser
> - passive capture modes
> - AI compaction at every parent node (1–2s latency)
> - Real-time SITREP at root commander
> - AES-256 end-to-end encryption, PIN-derived keys
> - GPS auto-embedded in every message
> - Offline-first: zero internet, zero cloud
> - Doctrine-style output (Ranger Handbook fine-tune): SALUTE / SITREP / ACE / LACE / 9-line MEDEVAC

*[placeholder — slide stays light; the demo carries the slide]*

**Speaker note**: This slide is intentionally minimal — the live web demo is the slide. Walk the room through one push-to-talk → transcript → compaction → SITREP cycle. (See [[product spec]] for the full feature spec.)

---

## Slide 7 — Market size

> **TAM** — Global Tactical Communications: ==**$22B (2026) → $38B (2031), ~7% CAGR**==
>
> *Triangulated across Mordor, Polaris, Future Market Insights, Insight Partners, Grand View, Stratview, MarketsandMarkets.*
>
> **SAM** — US DoD + Five Eyes + dual-use, software-defined / AI-native segment: ==**~$6B (2026)**==
>
> - US DoD next-gen tactical comms software: $3–4B
> - Five Eyes equivalents: $1–1.5B
> - Civilian dual-use (first responders, mining, maritime): $1–1.5B
>
> **SOM** — Realistic 5–7 year capture: ==**$30M ARR by Year 5, $80M ARR by Year 7 (~0.5 - 1% of SAM)**==

**Speaker note**: Lead with the multi-source citation list. ==1% capture is not heroic; it's one mid-size POR + a handful of allied + civilian deals.== Investors are tired of fake $1T TAMs — show them the math. (See [[market sizing]] for the full table.)

---

## Slide 8 — Customer / GTM

> **Primary customer: U.S. Department of Defense.**
>
> Funding pathway:
>
> | Stage | Vehicle | Amount | Time |
> |---|---|---|---|
> | Phase I | DARPA STTR (DARPA-PS-26-09, STO) | $250K | 6–12 mo |
> | Phase II | DARPA STTR | $1.8–3M | 24 mo |
> | Phase III / POR | Sole-source DoD contracts | $10M+ | yr 4+ |
>
> **Why we win STTR**:
> - **Founder credibility** — 7+ years in the U.S. Army, including 2 years in an infantry line unit, currently serving as a commissioned officer in **Electronic Warfare**. The buyer profile *is* the founder profile.
> - **Built-in academic partner** — Cornell University as formal R&D collaborator satisfies the STTR institutional requirement out of the box.
> - **Solicitation fit** — DARPA-PS-26-09 (STO) maps directly onto TacNet's architecture; no narrative gymnastics needed.
>
> **Adjacencies**: AFWERX, DIU, xTechSearch, Five Eyes equivalents (e.g., UK DASA).

**Speaker note**: Make the buyer real. ==The EW-officer credential is the credibility unlock most defense-tech founders have to fake.== We are the customer. (See [[market strategy]].)

---

## Slide 9 — Traction

> **Built**:
> - iOS prototype, BLE mesh (prototype transport only), on-device Gemma 4 E4B, ranger-style fine-tune corpus.
> - Demo storyboard (10 shots), landing site spec, dashboard.
>
> **Partnerships**:
> - **Cornell University** — formal R&D collaboration (STTR co-PI).
>
> **Pipeline**:
> - DARPA-PS-26-09 STTR Phase I submission in flight.

**Speaker note**: Pre-seed traction is "we built the thing and we have the right partners." Don't oversell. (See [[ask and roadmap]].)

---

## Slide 10 — Competition

> **Four corners of the market are full. The center is empty.**

```
                  Hardware-first
                        ↑
         L3Harris │ Persistent / Silvus
         RTX      │ TrellisWare / goTenna
                  │
   Cloud ────────┼──────── Edge / offline
                  │
         Palantir │      ★ TacNet ★
                  │
                  │  Anduril / Shield AI
                        ↓
                  Software-first
```

> **Primes** (L3, RTX, GD) won't cannibalize their radio revenue.
> **MANET radios** (Persistent, Silvus, goTenna) have no on-device AI.
> **New defense tech** (Anduril, Shield, Palantir) operates above us — we're the comms substrate they need when the cloud is gone.

**Speaker note**: Frame TacNet as *enabling infrastructure* for the rest of the new-defense-tech wave, not in conflict with them. (See [[competitive landscape]].)

---

## Slide 11 — Business model

> **Three revenue layers.**
>
> 1. **Non-dilutive** — STTR Phase I/II covers ~80% of Year 1–2 payroll. $2–4M.
> 2. **DoD contracts** — pilots → Program of Record. Per-seat licensing at ~$500–2K/operator/year. Replaces $5–25K hardware capex per unit.
> 3. **Allied + dual-use civilian** — Five Eyes ITAR SKU, plus first-responder / mining / maritime SaaS.
>
> **Unit economics target**:
> - Gross margin 75–85% (software-first).
> - NRR 110–130% (DoD contract growth at renewal).
> - Rule of 40 ≥ 50 by Year 5.

**Speaker note**: We sell software margins into a hardware-priced market. (See [[business model]].)

---

## Slide 12 — Comparable valuations

> | Company | Founded | Valuation | Revenue | Multiple |
> |---|---|---|---|---|
> | Anduril | 2017 | $60B (2026) | $1.0B (2024) | ~30–60x |
> | Shield AI | 2015 | $5.6B → $24B target | $300M → $1.2–3B target | ~10–18x |
> | Palantir (public) | 2003 | ~$100B+ | ~$3B | ~30x |
> | Helsing (EU) | 2021 | ~$5B | undisclosed | — |
>
> ==Defense-tech multiples have re-rated to 15–60x revenue for fast-growing private comparables.==
>
> **TacNet base-case implied value**:
> - Year 5: $30M ARR × 15–25x = ==**$450M–$750M**==
> - Year 7: $80M ARR × 12–20x = ==**$1.0–1.6B**==

**Speaker note**: Anchor on Shield AI's trajectory (software-heavy). Anduril is a hardware outlier. (See [[business model]].)

---

## Slide 13 — Team

> **Founder & CEO — Yifu Zuo**
> - 2LT US army 
> - MS Business Analytics, Cornell University.
> - CS specialization, Georgia Tech.

Cornell University (leave blank for now) 

**Speaker note**: Strategic hybridity is the founder thesis. (See [[founder profile]].)

---

## Slide 14 — Use of funds

> **Pre-seed ask: $0.5M – $1.5M**
>
> | Bucket | Allocation | Outcome |
> |---|---|---|
> | Two engineering hires (embedded RF + on-device ML) | 25% | ATAK port + long-range radio transport shipped |
> | Hardware bring-up (LoRa modules + reference SDR) | 25% | First non-iPhone reference node |
> | STTR Phase I prep + Cornell co-PI infra | 30% | DARPA Phase I award won |
> | Field-test budget (multi-phone hardware sets, range tests, EW resilience) | 10% | One signed warfighter pilot |
> | IP filing + reserves | 10% | Patent on semantic-compression-over-mesh |
>
> ==**Milestones the pre-seed buys**: ATAK plugin + long-range radio prototype shipping, one signed STTR Phase I, one NDA'd warfighter pilot, one defensible IP filing.==

**Speaker note**: This is a 12–18 month capital plan. Round is small because non-dilutive STTR carries the rest. (See [[ask and roadmap]].)

---

## Slide 15 — Vision / closing

> **TacNet is the bridge to the next generation of resilient, AI-augmented C2.**
>
> - Today: iOS prototype on BLE (demo only), Gemma 4 E4B on-device.
> - Year 2: STTR Phase II, LoRa transport.
> - Year 5: Program of Record, Five Eyes pilots, civilian dual-use.
> - Year 10: the comms substrate every Anduril / Shield / Palantir system rides on when the cloud is gone.
>
> ==**The cloud is the casualty. We build the network that survives it.**==

**Speaker note**: One-line close. Sit down. Let the room ask questions.

---

## Appendix slides (only if asked)

- A1 — Detailed architecture diagram (see [[architecture]])
- A2 — Message protocol + routing rules (see [[product spec]])
- A3 — Five-milestone build plan
- A4 — Risk register (technical, regulatory, geopolitical)
- A5 — Detailed comparable cap-table walk
- A6 — Cornell research collaboration scope
- A7 — Top 10 DARPA university partners (see [[darpa university partners]])
- A8 — Glossary (see [[glossary]])

---

## Related
- [[tacnet homepage]]
- [[market sizing]]
- [[competitive landscape]]
- [[business model]]
- [[founder profile]]
- [[market strategy]]
- [[ask and roadmap]]
- [[technical moat]]
