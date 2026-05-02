#startup/tacnet #career/army

# TacNet — Pre-Seed Pitch Deck (YC Seed Template)

==Rebuilt against the YC seed deck template by Aaron Harris (`ycombinator.com/library/2u-how-to-build-your-seed-round-pitch-deck`). Strict 9-slide order: Title → Problem → Solution → Traction → Insights → Business Model → Market → Team → Ask. Everything else moves to the appendix.==

**Source deck**: [[pitch deck]] (the 15-slide B2G version — kept as the long-form companion).

**YC's core thesis**: clarity and concision. Focus on narrative; the rest is commentary. There isn't much meaningful detail to explore at seed stage — pretending otherwise muddles the story.

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

- **DM Sans** — headings + body. Weights: 300, 400, 500, 600, 700. Tight tracking on big headings (`-0.03em`).
- **JetBrains Mono** — all metadata, labels, button text, captions, stats. Usually **UPPERCASE**, 11pt, wide tracking (`0.12em`).
- PPT substitutes: DM Sans → Inter / Helvetica Neue. JetBrains Mono → Consolas / IBM Plex Mono.

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Slide / section title | DM Sans | 44pt | 500 | `#121212` |
| Subhead | DM Sans | 24pt | 500 | `#121212` |
| Body | DM Sans | 16pt | 400 | `#4E4E4E` |
| Eyebrow / labels / buttons | JetBrains Mono | 11pt UPPERCASE, wide tracking | 400–500 | `#777169` |
| Stats (big numbers) | JetBrains Mono | ~64pt, tight | 500 | `#121212` |

### Visual motifs

- **Bracketed buttons / chips**: `[ WATCH DEMO → ]`. 2px corner radius globally — no pills.
- **Numbered section rails**: every slide opens with `01 / SECTION LABEL` mono dim, top-left.
- **Corner dots**: 3px, top corners.
- **Hairline dividers**: 1px `#E5E5E5`.
- **Grid / dot overlays**: 48px grid or 16px dot field, 4–8% opacity.
- **Pulsing operational dot** (amber, low-alpha glow) — max once per slide.

### Layout rules

- Sections feel like `py-20`–`py-32`. Max width 1280px.
- Sharp corners (2px max). Content left-aligned. Hero/CTAs centered.
- Whitespace > density. If cramped, cut copy, don't shrink margins.
- Mono UPPERCASE for stats/metadata. Body in muted gray, never pure black.
- Amber/red are stroke or single-word accents only — never fills.

---

## Slide 1 — Title

> **TacNet**
>
> Decentralized, AI-native communication for the contested edge.
>
> *Pre-seed · 2026 · Confidential*

**Speaker note**: One slide. One line. Founder name + EW-officer credential below the title in mono dim. ==This is the only slide YC says must be exactly one slide; every other slide can be a set of up to 3 if needed.==

---

## Slide 2 — Problem

> **The cloud is the casualty.**
>
> Every modern tactical comms system assumes a working network. Cut the satellite, jam the radio, knock out the cell tower — the unit goes blind. This is happening *today*:
>
> - Russia in Ukraine has demonstrated tactical-scale GPS, drone, and radio jamming.
> - China's PLA invests in A2/AD specifically to deny U.S. C2 in the Pacific.
> - Legacy radios cost $5–25K per unit, lock the customer in, and emit RF signatures that get operators direction-found and killed.
>
> **And there's a fourth problem nobody fixes:**
>
> - A commander with 50 subordinates **cannot listen to 50 voice channels**. Today, humans manually summarize upward — and in a firefight, they don't.

**Speaker note**: ==YC: "particulars of how this problem impacts real people/businesses are valuable."== Lead with the operator pain. The fourth problem (cognitive overload) is the one only AI can fix — that's our wedge. (See [[problem]] and [[why now]] for long form.)

---

## Slide 3 — Solution

> **TacNet is a phone app that keeps soldiers connected when GPS, radios, and the cloud are gone.**
>
> Every device — phone, body cam, GoPro — is an intelligent tile in a self-healing mesh. Two layers run in parallel:
>
> - **Passive multimodal capture** — audio + video stream from gear the operator already wears (or their own phone if no body cam is issued). On-device AI extracts the *intent*; **only transcript-level tokens cross the mesh. Raw audio and video never leave the device.**
> - **AI summarization upward** — every parent node runs Gemma 4 locally to roll up children into a doctrine-formatted SITREP. The commander sees a real-time picture of the whole net, not 50 voice channels.

```
ROOT (commander)         ──► AI-compacted SITREP of entire net
  L1 (squad leaders)     ──► AI summary per squad (audio + visual fused)
    L2 (squad members)   ──► passive capture: body cam + phone
```

**Speaker note**: ==YC: "explain what you do very clearly, in as few words as possible. Describe the concrete benefits."== The operator does nothing different — wears the same gear, the network does the listening, watching, and summarizing. (See [[solution]] and [[architecture]].)

---

## Slide 4 — Traction

> **Built**
>
> - Working iOS prototype on iPhone 15+: Cactus + Gemma 4 E4B (~6.7 GB INT4) running fully on-device.
> - BLE mesh transport (prototype only; production is ATAK + long-range radio), drag-and-drop tree builder, push-to-talk, AES-256 E2E, GPS auto-embed.
> - Web-app demo build for live investor walkthroughs.
>
> **Partnerships**
>
> - **Cornell University** — formal R&D collaboration (STTR co-PI).
>
> **Pipeline — DARPA STTR (DARPA-PS-26-09, STO)**
>
> | Stage | Award amount | Duration | Status |
> |---|---|---|---|
> | **Phase I** | ==**$250,000** (fixed)== | 6 months | submission in flight |
> | **Phase II** | ==**$1,800,000** base, up to **$2,000,000**== | 24 months | unlocked by Phase I completion |
>
> Phase I → Phase II transition rate is **~50%** for awarded programs.
>
> ==**DARPA is a grant, not equity.**== Funds are awarded as non-dilutive contracts/cooperative agreements scoped to specific program goals. We are explicitly **allowed and encouraged to raise outside capital alongside DARPA awards** — DARPA's Phase II Enhancement program even **matches up to $500K of outside investment 1:1**. That's why we're raising this round: VC + DARPA stack, they don't compete.

**Speaker note**: ==YC: "show off your traction. Make the numbers clear and meaningful."== Three angles to land:
1. ==**B2G distribution is solved by the contract**== — once we land Phase I, every DoD program office is a warm lead, sole-source Phase III is a real pathway, no CAC, no funnel.
2. ==**DARPA is a grant, so VC stacks on top, not against**== — disclosure rules apply (Current & Pending Support), but DARPA Phase II Enhancement *matches* up to $500K of outside dollars. Many DARPA-funded companies raise meaningful VC in parallel because the award itself is the validation signal.
3. ==**One customer, one front door**== — the DoD is the customer; DARPA is the front door. We don't need a sales org, we need a program manager who believes the thesis.

(See [[product spec]], [[ask and roadmap]], and [[darpa funding mechanics]].)

---

## Slide 5 — Insights / Why this works

> **Semantic compression at the Shannon limit — on hardware the warfighter already carries.**
>
> Channel capacity: $C = B \log_2(1 + SNR)$. Traditional radios fail when SNR drops below their fixed threshold. ==TacNet's intent tokens are so small that the system stays connected at near-zero $C$ — exactly where the adversary thinks they've won.==
>
> **Why we beat the incumbents on every dimension that matters to a warfighter:**
>
> | Dimension | Legacy tactical radio (L3Harris, RTX, etc.) | TacNet | Why it matters to the operator |
> |---|---|---|---|
> | **Form factor** | 2–5 lb brick + spare batteries + cables | runs on the phone the soldier already carries | one less device to issue, charge, lose, or break |
> | **Per-unit cost** | $5–25K of hardware per soldier | $500–2K per soldier per year (software) | ~10x cheaper to outfit a unit |
> | **What it carries** | voice (and sometimes short text) | voice + video + AI-generated summary + GPS + maps | one device replaces three |
> | **RF footprint when transmitting** | constant high-power carrier — easy to direction-find | small, bursty tokens that look like noise | harder for the enemy to locate = harder to target |
> | **Behavior under jamming** | needs several Mbps to function; below that, dead | keeps routing at near-zero throughput | survives the electronic-warfare environment current radios can't |
> | **Information preserved per bit** | voice codec throws away tone, context, and detail | semantic tokens preserve *meaning* at any bitrate | the message still gets through when the channel is brutal |
>
> **Build path: prototype → ecosystem.**
>
> - ==**iOS prototype today**== — BLE mesh for rapid development and hackathon demos. Fastest path to prove the architecture on iPhone 15+.
> - ==**ATAK for the production product**== — the DoD warfighter ecosystem runs on **Android Tactical Assault Kit**, **Nett Warrior**, **TrellisWare TSM**. Vehicle crews and drone operators run TacNet on ATAK tablets; dismounted soldiers run it on ATAK-enabled devices or long-range radio rigs. Android is where the actual customer lives.
> - **USB-C dongle** — small attachable hardware module that carries the operator's classified payload (rank, clearance, unit, encryption keys, radio cert chain). Device stays unclassified hardware; the dongle is the security boundary. Pull the dongle, the device is just a phone/tablet again.
>
> **Underlying primitives** (consistent across builds): single Gemma 4 E4B for STT + vision + summarization (no Whisper, no separate VLM). Cactus runtime, INT4, on NPU. Protocol-agnostic: BLE (prototype) → long-range radio / ATAK (production) → SDR/FHSS at scale.

---

## Slide 6 — Business model

> **Funding stack + three revenue layers — they run in parallel, not in sequence.**
>
> **Capital stack (Years 1–2):**
>
> | Source | Amount | What it covers | Dilution |
> |---|---|---|---|
> | DARPA STTR Phase I | $250K | feasibility, payroll | none (grant) |
> | DARPA STTR Phase II | $1.8–2M | prototype, payroll | none (grant) |
> | **VC pre-seed (this round)** | **$0.5–1.5M** | 
> | DARPA Phase II Enhancement | up to **$500K matching 1:1** on the VC raise | extends Phase II runway | none (grant) |
>
> ==The DARPA grant covers ~80% of payroll. The VC round funds everything DARPA's scope explicitly excludes — and DARPA *matches* VC dollars 1:1 up to $500K. They stack, they don't compete.==
>
> **Three revenue layers (post-validation):**
>
> 1. **DoD contracts (Years 2–7)** — STTR Phase III / Program of Record. Per-seat licensing at **$500–2K per operator/year**, replacing $5–25K hardware capex per radio.
> 2. **Allied (Years 4+)** — Five Eyes ITAR-cleared SKU, follow US doctrine alignment.
> 3. **Dual-use civilian (Years 4+)** — first responders / SAR / mining / maritime SaaS.
>
> **Pricing power**:
>
> | Replacement target | Their price | TacNet | Headroom |
> |---|---|---|---|
> | L3Harris AN/PRC-163 | $8–12K capex | ~$1K/seat/yr | 10x cheaper, ~80% gross margin |
> | RTX MAINGATE | $15–25K capex | same | same |
> | Persistent / Silvus MANET | $5–8K/node | same | same |
>
> **Unit economics target**:
> - **75–85% gross margin** — software-first, light services
> - **110–130% net revenue retention (NRR)** — DoD contracts grow per renewal
> - **Rule of 40 ≥ 50 by Year 5** — i.e., revenue growth % + profit margin % ≥ 50

**Speaker note**: ==YC: "you probably don't know all the details yet, but you should know a lot of them. Lay it out."== Two things to land:
1. ==**The capital stack is the model.**== DARPA grant + VC equity + Phase II Enhancement match = three sources, fully compatible, mutually reinforcing. The VC isn't an alternative to DARPA — it's the leverage that turns DARPA into a 1:1 match.
2. ==We sell **software margins into a hardware-priced market**.== That's the structural pricing power. Rule of 40 ≥ 50 is the SaaS-quality bar — "growth + margin = 50+" — and we hit it because gross margins are high and DoD revenue is sticky.

(See [[business model]] and [[darpa funding mechanics]].)

---

## Slide 7 — Market

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
> **SOM** — Realistic 5–7 year capture: ==**$30M ARR by Year 5, $80M ARR by Year 7 (~0.5–1% of SAM)**==
>
> **Implied valuation at those ARRs** (defense-tech multiples 12–25x for sub-$100M ARR — anchored on Anduril, Shield AI, Palantir):
> - Year 5: ~**$500–650M post-money**
> - Year 7: ~**$1.3–1.8B post-money**

**Speaker note**: ==YC: "is it going to be big? Will you make it big? How much money are you going to make? Convince the investor they're going to make lots of money with you."== ==1% capture is not heroic; it's one mid-size POR + a handful of allied + civilian deals.== Lead with the multi-source citation list — investors are tired of fake $1T TAMs. (See [[market sizing]] and [[business model]] for the full tables.)

---

## Slide 8 — Team

> **Founder & CEO — Yifu Zuo**
>
> - **7+ years U.S. Army**, 2 years infantry line unit, currently serving as a commissioned officer in **Electronic Warfare**. ==The buyer profile *is* the founder profile.==
> - **MS Business Analytics** — Cornell University (also TacNet's STTR co-PI institution).
> - **CS specialization** — Georgia Institute of Technology.
> - **BS Applied Math** — University of Minnesota.
>
> **Why this combo wins at the customer**: defense buyers reward founders who speak both *operator* and *engineer* without translation. The EW-officer credential is the credibility unlock most defense-tech founders have to fake.

**Speaker note**: ==YC: "team is so important at seed. Talk about what makes your team particularly well suited to the problem. This should be about founders. Nobody cares about your advisors."== One person, one slide, no advisor logos. (See [[founder profile]].)

---

## Slide 9 — Ask

> ==**Raising $1.0M pre-seed**== · SAFE · closes alongside DARPA STTR Phase I submission.
>
> | Bucket | $ | Use |
> |---|---|---|
> | Engineering (2 hires) | $400K | LoRa transport + Android/ATAK port |
> | Hardware bring-up | $200K | LoRa, SDR rig, USB-C dongle, test fleet |
> | STTR Phase I + Cornell co-PI | $150K | Proposal, sponsored-research, CAGE/SAM |
> | Field-test + EW trials | $100K | MN Guard pilot, range, jamming |
> | IP + legal + ITAR/EAR | $100K | Patent, regulatory, cap table |
> | Reserve | $50K | Hardware iteration buffer |
>
> **Burn**: ~$50K/month · ==**~20 mo baseline runway, ~24 mo with Phase I ($250K) awarded.**==
>
> **12 months → Series A ready**: LoRa shipping on real hardware · Phase I awarded + Phase II in flight · Android/ATAK alpha · USB-C dongle demoed · MN Guard pilot signed · patent filed.
>
> ==**Series A target: $5–8M on $25–40M post-money.**== (Shield Capital, Razor's Edge, 8VC, Founders Fund defense, Lux.)

**Speaker note**: ==YC: "tell the investor how much money you need, and what it gets you. Lay out where you'll be in a year."== Round is small on purpose — non-dilutive STTR + Phase II Enhancement 1:1 match means we don't need to over-raise. ~$50K/mo burn, ~24 months effective runway, six concrete milestones to Series A. (See [[ask and roadmap]] and [[darpa funding mechanics]].)

---

## Closing line (verbal, no slide)

> ==**The cloud is the casualty. We build the primary C2 operating system for the contested edge.**==

---

## Appendix (only if asked — not part of the YC 9-slide flow)

These slides existed in the long-form 15-slide B2G version of the deck. YC's seed template intentionally cuts them. Keep them in reserve to answer specific investor questions.

- **A1 — Why now** — EW + A2/AD + SLM-on-phone inflection (folded into Slide 2 as backdrop)
- **A2 — Competition / 4-corner map** — primes vs. new defense tech vs. MANET adjacents (see [[competitive landscape]])
- **A3 — Comparable valuations table** — Anduril / Shield AI / Palantir / Helsing multiples (see [[business model]])
- **A4 — Detailed product feature list** — full feature roster behind the live demo (see [[product spec]])
- **A5 — Architecture diagram** — mesh + 2-layer comms detail (see [[architecture]])
- **A6 — Message protocol + routing rules** — envelope structure, BROADCAST vs. COMPACTION (see [[product spec]])
- **A7 — Five-milestone build plan** — Foundation → Tree & Roles → Comms Core → Full UX → Resilience
- **A8 — Risk register** — technical, regulatory, geopolitical
- **A9 — Cornell research collab scope**
- **A10 — Top 10 DARPA university partners** (see [[darpa university partners]])
- **A11 — Glossary** (see [[glossary]])

---

## What changed vs. [[pitch deck|long-form deck]]

| Long-form slide | YC slide | Change |
|---|---|---|
| 1 Title | 1 Title | unchanged |
| 2 Why now | folded into 2 Problem | YC: state problem with concrete impact |
| 3 Problem | 2 Problem | merged with why-now context |
| 4 Solution | 3 Solution | unchanged |
| 5 Tech moat | 5 Insights | reordered (after traction, per YC) |
| 6 Product / demo | merged into 4 Traction | demo *is* traction at pre-seed |
| 7 Market | 7 Market | reordered (after business model, per YC) |
| 8 Customer / GTM | folded into 9 Ask + 6 Business model | STTR funding pathway split between business model and ask |
| 9 Traction | 4 Traction | **moved up — biggest YC restructure** |
| 10 Competition | Appendix A2 | YC seed template doesn't include competition |
| 11 Business model | 6 Business model | unchanged |
| 12 Comparable valuations | Appendix A3 | YC: don't anchor seed on exit comps |
| 13 Team | 8 Team | unchanged, founder-only per YC |
| 14 Use of funds | 9 Ask | unchanged |
| 15 Vision / closing | verbal closing line | YC: end on the ask, not the vision |

==Net effect: 15 slides → 9 slides. Tighter narrative, same content available in appendix.==

---

## Related
- [[pitch deck]] — long-form 15-slide B2G companion
- [[tacnet homepage]]
- [[market sizing]]
- [[competitive landscape]]
- [[business model]]
- [[founder profile]]
- [[market strategy]]
- [[ask and roadmap]]
- [[technical moat]]
