#startup/tacnet #career/army

# NatSec Hackathon 3 — Mission C2 Assessment

==3rd Annual NatSec Hackathon (cerebralvalley.ai) — Problem Statement 3: Mission Command and Control. How much of TacNet hits their ask, what we miss, and whether we should apply.==

## The prompt

> How can we integrate sensor feeds, intelligence, and unit positions into a unified interface that accelerates the kill chain and decision-making?

Example projects:
- Battlefield command dashboard with live feeds, unified operational picture, natural language querying
- Kill-chain automation (detect → identify → engage) with human-in-the-loop
- Operational report ingestion → knowledge graph → emerging threat surfacing

## Checkbox score: ~5/10 hit

| Hackathon ask | TacNet status | Notes |
|---|---|---|
| **Unified operational interface with visualization** | ✅ **Hit** | iOS mesh graph + MASH web demo. UI pattern matches; our graph is comms topology, not battlespace. |
| **Live feeds from unit positions** | ✅ **Hit** | GPS auto-embed, real-time slot/presence tracking. We track *people*, not vehicles or ISR. |
| **Natural language querying** | ✅ **Hit** | Voice ask ("what does CreeperWatch think?"), SLM responds on-device, no cloud dependency. |
| **Human-in-the-loop oversight** | ✅ **Hit by design** | Push-to-talk, operator-initiated. No autonomous engagement — actually a strength here. |
| **Explainable rationale** | ✅ **Hit** | `askTrace` / broker trace shows routing + reasoning chain. Not "why this target," but "how this message flowed." |
| **Sensor tracks, vehicle locations** | ❌ **Miss** | No radar, EO/IR, drone feeds, or blue-force tracker vehicle data. |
| **Kill chain automation** | ❌ **Miss** | We compress and summarize. No target ID, no engagement recommendation, no weapons touch. |
| **Ingest operational reports, build knowledge graph** | ❌ **Miss** | No entity extraction, no graph DB of people/units/locations/events, no report parsing. |
| **Surface emerging patterns/threats** | ❌ **Miss** | SLM summarizes operator speech. No anomaly detection across intel feeds, no predictive enemy movement. |
| **Communications as a feed source** | ⚠️ **Partial** | Voice, video, text, GPS. No formal military data messages (VMF, Link-16, JREAP). |

## What we are (and what we aren't)

TacNet is **the primary command-and-control operating system for platoon and company-level operations in contested environments**.

- **We are**: the mesh that every soldier, vehicle crew, and drone operator runs on — fully off-grid, with AI-synthesized summaries and a local-first COP.
- **We aren't**: the system that fuses ISR from external feeds, recommends targets, or runs the kill chain above company level.

## Honest framing for an application

> "TacNet is the primary C2 operating system for the platoon and company edge. Every soldier, vehicle crew, and drone operator is a node in a self-healing mesh on ATAK and long-range radio. The commander sees the full picture — positions, AI-synthesized summaries, natural-language answers — fully off-grid, even when satellites and higher HQ are blacked out."

That is **primary C2 at the tactical edge** — not a fallback dashboard, but the operating system that replaces legacy C2 for the echelon that needs it most.

## What we haven't been thinking about (and shouldn't, yet)

| Expansion area | Why it's a pre-seed scope dilution |
|---|---|
| ISR/sensor feed ingestion (drones, radar, SIGINT) | Needs clearances, proprietary formats, hardware integration. |
| Vehicle / platform tracking (FBCB2/JBCB-P) | Different customer (mechanized/armor vs. dismounted infantry). |
| Kill chain / targeting workflow | Weapons-system integration, ROE logic, legal/policy review. Makes TacNet a weapons system. |
| Knowledge graph + entity linking from reports | Needs backend NLP pipeline, graph DB, report parsing. Not Phase I. |
| Battalion/brigade echelon C2 | Different user (staff sections S2/S3), different sale cycle. |
| Military data standards (Link-16, VMF, Cursor-on-Target) | Bridge to formal C2 systems is a Phase III+ problem. |

## Should we apply?

**Yes — with the micro-C2 framing.**

The hackathon is a credible venue (Cerebral Valley, defense-tech focused), and the application itself forces a clarity exercise: "what are we actually building vs. what we could theoretically build." The honest framing above is a stronger pitch than stretching into full C2.

If we advance, the demo is the MASH web app showing multi-user mesh + voice query + AI summary trace — exactly what we'd show an investor, just framed to a military audience.

## Related
- [[tacnet homepage]]
- [[product spec]] — what TacNet actually builds
- [[architecture]] — comms topology, not battlespace fusion
- [[market strategy]] — B2G pathway, STTR positioning
- [[pitch deck]] — investor-facing framing
