#startup/tacnet

# Business Model & Unit Economics

==Three revenue layers: non-dilutive STTR funding (years 1–2), DoD pilots → Program of Record (years 3–7), allied + dual-use civilian licensing (years 4+).==

## Revenue model

### Layer 1 — Non-dilutive STTR / SBIR (Years 1–2)
- **Phase I**: $250K, 6–12 months, feasibility.
- **Phase II**: $1.8M base (extendable to ~$3M), 24 months, prototype.
- **Phase II Direct / Phase IIE**: additional $0.5–1M for transition partners.
- ==Goal: cover ~80% of payroll through Year 2 with non-dilutive cash.==

### Layer 2 — DoD pilots → Program of Record (Years 2–7)
- **Pilot contracts**: $0.5–3M each, 3–12 months, paid per unit deployed + integration services.
- **Program of Record (POR)**: line-item DoD funding. Sole-source pathway via SBIR Phase III.
- **Per-seat / per-node licensing model**: aim for ~$500–2,000 per soldier/operator/year (vs. $5–20K hardware-radio capex they replace).
- **Service revenue**: integration with existing radios, custom waveform work — 20–30% margin booster.

### Layer 3 — Allied + dual-use civilian (Years 4+)
- **Five Eyes allied sales**: ITAR-cleared SKU, follow US doctrine alignment.
- **Civilian dual-use SaaS**:
  - First responders / SAR teams — $200–500/team/month.
  - Mining ops — per-site licenses.
  - Maritime / offshore — per-vessel licenses.
  - Construction / large events — per-job.

## Pricing power

| Replacement target | Their price | TacNet price | Margin headroom |
|---|---|---|---|
| L3Harris AN/PRC-163 radio | $8–12K capex per unit | ~$1K/seat/year on commodity phone | ~10x cheaper, ~80% gross margin |
| RTX MAINGATE | $15–25K per unit | Same as above | Same |
| Persistent / Silvus MANET | $5–8K per node | Same as above | Same |

==TacNet captures most of the value differential because we run on hardware the customer already owns (or buys at consumer prices).==

## Unit economics (steady-state)

Software-first defense play targets:

| Metric | Target | Notes |
|---|---|---|
| Gross margin | 75–85% | Software + light services |
| Net revenue retention (NRR) | 110–130% | DoD contracts grow per renewal cycle |
| CAC payback | 12–18 months | Sales cycle is contract length, not customer-acquisition |
| Rule of 40 | 50+ by year 5 | Healthy SaaS-style trajectory |

## Comparable valuations (private + public)

| Company | Year founded | Latest valuation | Latest revenue | Multiple |
|---|---|---|---|---|
| **Anduril** | 2017 | $60B (2026, Bloomberg / TechCrunch) | $1.0B (2024, Sacra/Acquinox) | ~60x rev (frothy) → ~30x rev fair |
| **Shield AI** | 2015 | $5.6B (2025) → targeting $24B (2028) | ~$300M (2025) → $1.2–3B target (2028) | ~18x → ~10x rev |
| **Palantir** (public) | 2003 | ~$100B+ market cap (2026) | ~$3B (2025) | ~30x rev |
| **Helsing** (EU) | 2021 | ~$5B (2025) | undisclosed | early-stage |

==Defense-tech multiples have re-rated in 2024–2026: 25–60x revenue for fast-growing private comparables.==

## Implied valuation walk for TacNet

### Multiple bands (defense-tech, software-first)

| Stage | Revenue multiple | Reference |
|---|---|---|
| Public defense primes (RTX, GD) | 1–2x | floor — not comparable |
| Mature defense software (Palantir public) | ~30x | upper public reference |
| Private defense-tech growth (Anduril 2024) | ~30x | $1B rev → $30B val (base) |
| Private defense-tech frothy (Anduril 2026) | ~60x | $1B rev → $60B val (aggressive ceiling) |
| Private defense-tech mid (Shield AI 2025) | ~18x | $300M rev → $5.6B (base for software-heavy) |
| Early-growth defense-tech (sub-$100M ARR) | 12–20x | conservative for our stage |

==**Working band**: 12–25x for sub-$100M ARR defense-tech, 15–30x once $100M+ is in sight.==

### Year 5 valuation (ARR $25–35M)

| Multiple | $25M ARR | $30M ARR | $35M ARR |
|---|---|---|---|
| 12x (conservative) | $300M | $360M | $420M |
| 18x (base) | $450M | $540M | $630M |
| 25x (bull) | $625M | $750M | $875M |

==**Year 5 average: ~$500–650M post-money.**==

### Year 7 valuation (ARR $60–120M)

| Multiple | $60M ARR | $90M ARR | $120M ARR |
|---|---|---|---|
| 12x (conservative) | $720M | $1.08B | $1.44B |
| 18x (base) | $1.08B | $1.62B | $2.16B |
| 25x (bull) | $1.50B | $2.25B | $3.00B |

==**Year 7 average: ~$1.3–1.8B post-money.**==

### Sanity check vs. comparables at similar revenue scale

| Company | Revenue (~year 7 stage) | Valuation | Multiple |
|---|---|---|---|
| Anduril | ~$300M (2022) | ~$8.5B | ~28x |
| Shield AI | ~$300M (2025) | $5.6B | ~18x |
| Palantir | ~$200M (2010) | ~$2.5B | ~12x |
| Helsing | undisclosed (2025, year 4) | ~$5B | n/a |

==Year 7 base-case TacNet at $1.3–1.8B sits **below** Anduril ($8.5B) and Shield AI ($5.6B) at comparable revenue — i.e., the math is conservative.== Bull-case $120M ARR × 18x (Shield AI multiple) pushes year 7 to **~$2.2B**.

### Investor return potential

==Pre-seed entry at $10–20M post-money implies 50–80x return potential at year 7 in the base case. Aggressive case (matching Shield AI multiples on bull-case ARR) is **100x+**.==

## Why this works as a business (not just a research project)
1. **Non-dilutive runway** through STTR — no equity burn during the first 24 months.
2. **Software margins** on a hardware-incumbent market — pricing power is structural.
3. **Dual-use** absorbs civilian downside if defense procurement slows.
4. **Mosaic Warfare alignment** is a multi-decade DoD doctrinal tailwind.
5. **Edge AI inflection** is happening once — first mover in tactical-comms-as-software wins the category.

## Related
- [[pitch deck]]
- [[market sizing]]
- [[competitive landscape]]
- [[ask and roadmap]]
- [[tacnet homepage]]
