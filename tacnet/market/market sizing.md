#startup/tacnet

# Market Sizing — TAM / SAM / SOM (Multi-Source)

==All figures triangulated across at least 3 independent research firms. Median used when sources diverge >25%.==

## TAM — Total Addressable Market

**Global Tactical Communications Market** (the pool TacNet sells into long-term).

| Source | 2025-2026 | Forecast | CAGR | Notes |
|---|---|---|---|---|
| Mordor Intelligence | $23.05B (2026) | $31.86B (2031) | 6.69% | Includes radios + waveforms + crypto |
| Polaris Market Research | ~$15B (2024) | $21.7B (2032) | 5.1% | Conservative segmentation |
| Future Market Insights | $22.3B (2025) | $39.6B (2035) | 5.9% | 10-yr horizon |
| The Insight Partners | ~$20B (2024) | $44.8B (2031) | 11.0% | Aggressive AI-driven assumption |
| 360iResearch | — | +$20.4B growth by 2030 | 12.6% | Growth-only figure |
| MarketsandMarkets | — | $76.7B (2030) | — | Outlier — broadest definition |
| **Median (consensus)** | **~$22B (2026)** | **~$35–40B (2030–2031)** | **~7%** | TacNet planning number |

**Adjacent / overlapping markets:**

- **Military Tactical Radio** (subset): $7.9B (2025) → $13.8B (2033) — Transpire Insight; Grand View has $5.5B → $7.3B by 2030 (CAGR 4.5%)
- **Software-Defined Radio**: $21.3B (2026) → $29.8B (2031) — Mordor; Grand View $29.5B → $47.7B (CAGR 8.4%)
- **Military Communications (broad)**: $40.3B (2025) → $54.4B (2033) — Straits Research, CAGR 3.8%
- **Defense AI software**: ~$10–15B by 2030 — multiple sources

==**Headline TAM number for the deck**: $22B in 2026, growing to $38B by 2031.==

## SAM — Serviceable Addressable Market

What TacNet can plausibly sell into given its tech (software-first, edge AI, mesh) and pathway (US DoD STTR + Five Eyes + dual-use civilian).

### SAM components
1. **US DoD next-gen tactical comms (software / SDR / AI-native segment)**
   - US share of global tactical comms: ~35–40%.
   - US Military Tactical Radio alone: $1.98B in 2024 → ~$2.5B by 2030 (Grand View).
   - US tactical comms broadly: ~$8–9B in 2026.
   - Software-defined / AI-native subset (TacNet's lane): ~30–40% of that = **~$3–4B**.

2. **Five Eyes (UK, Canada, Australia, New Zealand) addressable**
   - ~25–30% of US spend on equivalent programs.
   - Approx **~$1–1.5B**.

3. **Dual-use civilian (first responders, mining, maritime, disaster relief, construction)**
   - First responder comms market: ~$10B globally (Mordor).
   - Realistic capturable subset for offline edge-AI mesh: ~10–15% = **~$1–1.5B**.

### SAM total
| Slice | Size (2026) |
|---|---|
| US DoD next-gen / software-defined segment | $3–4B |
| Five Eyes equivalents | $1–1.5B |
| Civilian dual-use (first responders, mining, maritime) | $1–1.5B |
| **TacNet SAM (consensus)** | **~$5–7B** |

==**Headline SAM number for the deck**: $6B in 2026 (US DoD + Five Eyes + dual-use, software-defined / AI-native segment).==

## SOM — Serviceable Obtainable Market (5–7 year capture)

Bottom-up, conservative.

### Capture pathway
| Year | Stage | Revenue source | Annual revenue (target) |
|---|---|---|---|
| 1 | STTR Phase I | Direct DARPA contract | $0.25M |
| 2 | STTR Phase II | DARPA + Cornell co-PI | $1.5–2.0M |
| 3 | Phase II ext + 1 unit pilot (MN Guard) | DARPA + first DoD pilot | $3–5M |
| 4 | Multi-unit pilots + first SBIR Phase III sole source | DoD line-item + civilian pilots (SAR/mining) | $8–15M |
| 5 | Program of Record entry + Five Eyes pilot | DoD POR + allied + civilian | $20–35M |
| 7 | Full POR + adjacency expansion | DoD POR + civilian SaaS-style licensing | $60–120M |

### Capture rate sanity check
- Year 5 ARR target: $25–35M.
- Year 5 SAM: ~$7B (assuming 7% CAGR).
- ==Implied capture: **~0.4–0.5% of SAM by year 5**.==
- Year 7 ARR target: $60–120M.
- Year 7 SAM: ~$8B.
- ==Implied capture: **~0.8–1.5% of SAM by year 7**.==

These are conservative numbers vs. Anduril's growth curve (~$1B revenue by year 7) but Anduril is a hardware-heavy outlier with billions of capex. TacNet is software-first, so revenue ramp is gated by contract velocity, not unit production.

### Implied valuation at these ARR ranges
At defense-tech multiples of 12–25x for sub-$100M ARR (Shield AI, early Anduril, early Palantir):
- ==**Year 5 average valuation**: ~**$500–650M** post-money ($25–35M ARR × 12–25x).==
- ==**Year 7 average valuation**: ~**$1.3–1.8B** post-money ($60–120M ARR × 12–25x).==

See [[business model]] for the full multiple bands, scenario tables, and comparable sanity check.

### SOM ranges for the deck
| Scenario      | Year 5 ARR | Year 7 ARR | Capture of SAM |
| ------------- | ---------- | ---------- | -------------- |
| Conservative  | $15M       | $40M       | 0.2–0.5%       |
| **Base case** | **$30M**   | **$80M**   | **0.5–1.0%**   |
| Aggressive    | $50M       | $150M      | 0.75–2.0%      |

==**Headline SOM number for the deck**: $30M ARR by year 5, $80M ARR by year 7 — roughly 1% of SAM.==

## Why these numbers are defensible

- **Multi-source triangulation** — every TAM number comes from 3+ independent firms.
- **Capture rate is intentionally conservative** — 1% of a $6B SAM is not heroic; it's one mid-size POR + a handful of allied + civilian deals.
- **STTR pathway de-risks the early ramp** — non-dilutive funding through Year 2 means we don't burn equity to validate.
- **Comparable sanity check**:
  - Anduril at year 7 (founded 2017, ~$1B revenue 2024) — but capital-intensive hardware.
  - Shield AI at year 8 (~$300M revenue 2025) targeting $1.2–3B by 2028.
  - Software-only defense plays (e.g., older Palantir trajectory) take 7–10 years to hit nine figures.
  - TacNet's $80M-by-year-7 base case sits squarely inside that envelope.

## Source list
- Mordor Intelligence — `mordorintelligence.com/industry-reports/tactical-communication-market`
- Grand View Research — `grandviewresearch.com/industry-analysis/military-tactical-radio-market`
- Polaris Market Research — `polarismarketresearch.com/industry-analysis/tactical-communications-market`
- Future Market Insights — `futuremarketinsights.com/reports/tactical-communications-market`
- The Insight Partners — `theinsightpartners.com/reports/tactical-communications-market`
- 360iResearch — `360iresearch.com/library/intelligence/tactical-communications`
- Transpire Insight — `transpireinsight.com/report/military-tactical-radio-market`
- Stratview Research — `stratviewresearch.com/2778/tactical-radio-market.html`
- Straits Research — `straitsresearch.com/report/military-communication-market`
- Fortune Business Insights — SDR market report
- IMARC, Roots Analysis, Technavio — SDR market reports

## Related
- [[pitch deck]]
- [[business model]]
- [[competitive landscape]]
- [[tacnet homepage]]
