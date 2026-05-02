# Stratmem

## TacNet Edge Build Checklist

This README is the working build checklist for TacNet Edge.

Source of truth:

- `docs/unified-plan-v3.md` is the canonical hackathon scope.
- `docs/demo-script-v1.md` is the canonical 90-second demo acceptance script.
- `docs/unified-plan-v2.md`, `docs/tacnet-pivot-analysis.md`, and
  `tacnet/HACKATHON_README.md` inform the P1/P2 backlog only.
- `tacnet/business/ask and roadmap.md` and `tacnet/product/*` inform the
  longer-term field and acquisition roadmap.

Rules:

- P0 means visible in the 90-second demo or required to make that demo reliable.
- If a P0 feature is not in the 90-second demo, it is not P0.
- Branch A is preferred: OLD dashboard as the demo shell.
- Branch B is fallback: Sentinel Forge backend and frontend, only if Branch A
  fails the Hour-0 boot gate.
- Do not start P1 until every P0 checklist item needed for the chosen branch is
  checked.

## P0 - Must Ship for the 90-Second Demo

### Branch Gate and Demo Shell

- [ ] Boot the OLD dashboard from `../voice-agents-hack/OLD CODE/dashboard/`.
- [ ] Confirm the dashboard renders hierarchy, live feed, and demo-mode controls.
- [ ] Verify demo mode emits timed messages and compaction rows.
- [ ] Verify the dashboard is readable at 110% browser zoom from projector
      distance.
- [ ] In parallel, boot Sentinel Forge as the safety net.
- [ ] Lock Branch A or Branch B by Hour 1 and do not oscillate.

### Deterministic Raven Gap Replay

- [ ] Replace random demo transcripts with a deterministic Raven Gap event
      script.
- [ ] Include squad, vehicle, drone, and sensor reports in the replay.
- [ ] Add a Replay control that advances the scenario predictably.
- [ ] Add an optional auto-advance mode for backup-video capture.
- [ ] Add Reset so the scenario returns to the exact initial state.
- [ ] Verify one full replay matches the 90-second storyboard in
      `docs/demo-script-v1.md`.

### Mesh Hierarchy View

- [ ] Show a platoon leader root node.
- [ ] Show three squad or section leader nodes below the root.
- [ ] Show leaf participants for soldiers, vehicle, drone, and sensor post.
- [ ] Highlight nodes as their reports enter the replay.
- [ ] Keep hierarchy labels in platoon-leader vocabulary.
- [ ] Verify the hierarchy remains legible at demo zoom.

### Raw Report Stream

- [ ] Show raw reports as they arrive from leaf nodes.
- [ ] Preserve source node, timestamp or sequence, and short report text.
- [ ] Distinguish raw reports from compactions visually.
- [ ] Support degraded-mode behavior where selected raw reports are greyed,
      dropped, or withheld.
- [ ] Verify reports arrive in the same order on every replay.

### Squad-Level Compaction

- [ ] Collapse roughly 12 raw reports into about 3 squad summaries.
- [ ] Generate deterministic summary text, with no LLM on the critical path.
- [ ] Prioritize contact, sensor triggers, asset amber or red status, and low
      drone battery over routine status.
- [ ] Link each compaction to its contributing raw reports.
- [ ] Cap each summary to one short SITREP-style statement.
- [ ] Verify compactions appear before the commander SITREP beat.

### Commander SITREP Panel

- [ ] Show one commander-facing SITREP after squad compactions complete.
- [ ] Use display copy such as "SITREP" and "Commander Situation."
- [ ] Keep backend field names unchanged if using Branch B.
- [ ] Include the risk, current picture, and recommended next collection step.
- [ ] Keep text short enough to read during the 90-second demo.
- [ ] Verify a deterministic fallback always produces the SITREP.

### SITREP Delta: What Changed

- [ ] Compare the latest commander SITREP against the previous state.
- [ ] Highlight only the material change the commander should notice.
- [ ] Use plain language instead of internal state-machine vocabulary.
- [ ] Keep the delta visible during the commander SITREP beat.
- [ ] Verify the delta updates after the bandwidth-degraded step.

### Threat Recognition and Engagement-State Awareness

- [ ] Detect contact, movement, sensor trigger, degraded comms, or low asset status.
- [ ] Mark affected unit, such as 2nd Squad, as commander priority.
- [ ] Add a short threat assessment to the commander SITREP.
- [ ] Cite P4 report, S7 trigger, D1 observation, and SL-2 compaction.
- [ ] Recommend collection/support only: retask drone or request ACE.
- [ ] Avoid engagement, targeting, fire mission, or weapons language.

### Evidence Trace and Provenance

- [ ] Make at least one SITREP line clickable.
- [ ] On click, show the raw reports and squad summaries that support that line.
- [ ] Highlight source events in the raw stream or evidence drawer.
- [ ] Preserve the trace from raw report to squad compaction to commander SITREP.
- [ ] Verify the trace works without network or LLM dependencies.

### Mock Commander Q&A

- [ ] Show 3-5 predefined commander questions over Raven Gap mock data.
- [ ] Include "Which element needs support first?" and "What changed since last
      SITREP?"
- [ ] Answer deterministically from current replay state, not open-ended chat.
- [ ] Cite raw reports, sensor triggers, drone status, and squad compactions.
- [ ] Update answers after bandwidth-degraded mode.
- [ ] Keep recommendations to collection/support, not engagement or targeting.

### Bandwidth-Degraded Mode

- [ ] Add a visible bandwidth-degraded toggle.
- [ ] Reduce or grey out about half of the raw events when degraded mode is on.
- [ ] Shrink compaction text while preserving the same operational picture.
- [ ] Make the commander recommendation stable across full and degraded modes.
- [ ] Verify the hero beat reads as graceful degradation, not data loss chaos.

### Copy and Visual Tuning

- [ ] Replace generic tactical or SOC language with platoon-leader language.
- [ ] Remove judge-facing "Sentinel Forge", "incident", and cyber-first copy.
- [ ] Use the phrases "semantic compression over a tactical mesh" and "C2 that
      degrades gracefully instead of going blind."
- [ ] Keep the UI dense, readable, and intentional at 110% zoom.
- [ ] Verify no landing overlay or missing video asset blocks the live demo.

### Branch A Implementation Checklist

- [ ] Update `server.py` demo data to emit deterministic Raven Gap events.
- [ ] Update dashboard JS so Replay can step through the script.
- [ ] Add compaction row styling and provenance highlighting.
- [ ] Add bandwidth toggle behavior in the existing vanilla JS UI.
- [ ] Add SITREP delta text without migrating frameworks.
- [ ] Keep BLE, Cactus, MeshNode, and phone integration out of the live data path.

### Branch B Fallback Implementation Checklist

- [ ] Add `server/app/scenarios/raven_gap.py`.
- [ ] Add `server/app/compaction/squad_rollup.py`.
- [ ] Add `server/app/sitrep/delta.py`.
- [ ] Add or update `agent/prompts.py` with `soul.md`-derived rules only.
- [ ] Add `MeshTree.tsx`.
- [ ] Add `SitrepDeltaPanel.tsx`.
- [ ] Add `CompactionTimeline.tsx`.
- [ ] Add `BandwidthToggle.tsx`.
- [ ] Add `EvidenceDrawer.tsx`.
- [ ] Relabel UI copy only; do not rename backend routes or domain objects.

### Demo Reliability Package

- [ ] Follow the setup checklist in `docs/demo-script-v1.md`.
- [ ] Confirm the live demo reaches the final composed state in 90 seconds.
- [ ] Record a 60-90 second backup video by Hour 14.
- [ ] Verify backup video playback before rehearsal.
- [ ] Rehearse three clean runs after the final build lock.
- [ ] Cut unstable P1/P2 work immediately if P0 is not stable by the gate.

## P1 - Should Ship Only After P0 Is Stable

### Hosted LLM Commander Brief

- [ ] Add a hosted LLM call only after deterministic SITREP generation is stable.
- [ ] Use deterministic text as the fallback path.
- [ ] Keep the LLM responsible for prose only, not scenario state.
- [ ] Time out quickly enough that the demo never waits on the LLM.
- [ ] Verify the pitch explains that production runs on-device.

### Open-Ended Commander Querying

- [ ] Expand beyond the P0 mock questions only after the demo is stable.
- [ ] Keep answers grounded in local state with evidence citations.
- [ ] Use an LLM only to rewrite verified facts, never to invent them.

### Compression-Ratio Chart

- [ ] Track approximate raw payload size.
- [ ] Track compacted payload size.
- [ ] Show raw-to-compacted ratio as a simple, legible chart.
- [ ] Keep the chart readable at projector distance.
- [ ] Verify the ratio supports the verbal "5-10% of raw" claim before using it.

### Node Detail Drawer

- [ ] Open a drawer or panel from any mesh node.
- [ ] Show node role, recent reports, status, and parent relationship.
- [ ] Show degraded or dropped-event state when applicable.
- [ ] Avoid adding controls that are not used in the demo.
- [ ] Verify drawer content does not obscure the commander SITREP.

### Reparenting Visual

- [ ] Show one squad leader timing out.
- [ ] Move children to the nearest live ancestor or fallback parent visually.
- [ ] Keep this as a visual demo feature, not full auto-promotion logic.
- [ ] Add Q&A language for "what happens when a leader is hit?"
- [ ] Verify it can be disabled if it costs too much narration time.

### Belief Lifecycle

- [ ] Add ACTIVE, WEAKENED, and SUPERSEDED states only after SITREP delta works.
- [ ] Record `why_changed` for each state transition.
- [ ] Surface lifecycle state as supporting context, not the hero feature.
- [ ] Ensure lifecycle labels do not confuse the platoon-leader UI.
- [ ] Verify lifecycle state is derived from evidence, not free text.

### Cyber Scenario Toggle

- [ ] Reuse the existing Sentinel Forge `coordinated_intrusion` scenario if on
      Branch B.
- [ ] Keep cyber as proof of generality, not the live pitch path.
- [ ] Reuse the same event-stream, compaction, and evidence-trace UI.
- [ ] Verify switching scenarios resets state cleanly.
- [ ] Cut this immediately if it threatens P0 polish.

### MeshNode iPhone Prop

- [ ] Use the phone only as a prop unless live integration is explicitly scoped.
- [ ] Confirm MeshNode runs offline on the phone before rehearsal.
- [ ] Rehearse the prop pickup at least three times if used.
- [ ] Keep the laptop demo independent of the phone.
- [ ] Skip the prop silently if it misbehaves.

### Conditional UI Migration

- [ ] Attempt Tailwind or shadcn only if a frontend owner can do it without
      blocking P0.
- [ ] Preserve all existing demo behavior during migration.
- [ ] Keep component styling readable and dense.
- [ ] Verify no migration-generated churn touches backend behavior.
- [ ] Abandon the migration if it is not clearly improving the demo.

## P2 - Stretch Prototype Work

### Real Microphone Transcription

- [ ] Capture voice locally.
- [ ] Transcribe into text before anything crosses the mesh.
- [ ] Keep audio off the network.
- [ ] Provide scripted events as fallback.
- [ ] Verify transcription latency is acceptable for a live demo.

### Real Local LLM Compaction

- [ ] Run Gemma through Cactus or the chosen on-device runtime.
- [ ] Keep deterministic compaction available as fallback.
- [ ] Measure summary latency on target devices.
- [ ] Enforce SITREP, SALUTE, ACE, and LACE output constraints.
- [ ] Verify no cloud dependency is required for the local path.

### Multi-Device or Multi-Tab Mesh Simulation

- [ ] Simulate separate nodes across browser tabs or devices.
- [ ] Preserve the same tree and routing semantics as the single-screen demo.
- [ ] Show store-and-forward behavior when a node is unavailable.
- [ ] Verify replay remains deterministic enough for demos.
- [ ] Keep real RF out of scope unless the team separately approves it.

### ATAK or Meshtastic Concept Import/Export

- [ ] Define a minimal import shape for node and track data.
- [ ] Define a minimal export shape for SITREP or COP deltas.
- [ ] Map fields to the TacNet message envelope.
- [ ] Build sample files before live integrations.
- [ ] Verify this remains concept-level unless promoted to a funded milestone.

### Vehicle, Drone, and Sensor Mock Nodes

- [ ] Add vehicle telemetry events.
- [ ] Add drone observation and battery events.
- [ ] Add unattended sensor trigger events.
- [ ] Treat each asset as a regular mesh participant where possible.
- [ ] Verify asset events compact into the same SITREP format as voice reports.

### Advanced Visualization

- [ ] Explore a richer tactical board only after the core UI is stable.
- [ ] Keep map or board visuals supporting, not central, unless the branch already
      has a working map.
- [ ] Avoid Squad-game or 3D visualization work until the demo is locked.
- [ ] Verify any new visualization remains readable at projector distance.
- [ ] Cut immediately if it introduces setup risk.

## P3 - Field Feasibility and STTR Phase I

### iOS Field Prototype

- [ ] Build or stabilize the native iOS app.
- [ ] Run Cactus plus Gemma on-device.
- [ ] Support BLE mesh for prototype transport.
- [ ] Add drag-and-drop tree building for the organiser.
- [ ] Store message history with search.
- [ ] Verify at least a multi-phone field test.

### Long-Range Transport Feasibility

- [ ] Prototype LoRa, SDR, or FHSS transport for dismounted nodes.
- [ ] Measure usable bandwidth and latency for intent tokens.
- [ ] Test multi-hop message delivery.
- [ ] Test degraded-link behavior.

### ATAK Plugin Feasibility

- [ ] Define the commander tablet workflow.
- [ ] Render the COP inside or alongside ATAK.
- [ ] Map TacNet summaries to ATAK-compatible objects or overlays.
- [ ] Keep TacNet as the AI compaction layer above the radio.

### Security Boundary Prototype

- [ ] Define PIN-gated network join.
- [ ] Define pre-shared key handling.
- [ ] Prototype encrypted message envelopes.
- [ ] Evaluate USB-C dongle security-boundary concept.

### STTR Phase I Package

- [ ] Prepare DARPA-PS-26-09 submission.
- [ ] Lock Cornell or other university research partner structure.
- [ ] Define feasibility experiments for ATAK and long-range transport.
- [ ] Budget hardware, range testing, and EW resilience trials.

## P4 - Productization and Phase II

### Production Transport

- [ ] Build production-grade long-range radio transport.
- [ ] Support dismounted, vehicle, drone, and commander node types.
- [ ] Validate LoRa, SDR, and FHSS tradeoffs.
- [ ] Add robust queueing and retry semantics.

### Full ATAK Integration

- [ ] Deliver an ATAK plugin alpha.
- [ ] Support vehicle-mounted and commander tablet workflows.
- [ ] Sync compacted SITREPs and COP deltas into the commander view.
- [ ] Keep raw audio off the transport.

### NPU-Optimized On-Device AI

- [ ] Optimize Gemma or equivalent SLM for target NPUs.
- [ ] Support first-launch model download.
- [ ] Measure memory, power, and latency on target devices.
- [ ] Maintain deterministic fallback modes.

### Higher-HQ Bridge

- [ ] Build an opportunistic satellite or higher-HQ bridge.
- [ ] Parse at least one external data standard, starting with Cursor-on-Target.
- [ ] Normalize external tracks into TacNet asset tuples.
- [ ] Emit HOP_ACK when higher-HQ delivery succeeds.

### Civilian Dual-Use Pilots

- [ ] Define search-and-rescue pilot workflow.
- [ ] Define mining or remote-industrial pilot workflow.
- [ ] Reuse the same compaction-over-mesh architecture.
- [ ] Remove military-only labels where inappropriate.

## P5 - Acquisition and Scale

### Program of Record Path

- [ ] Use Phase III pathway planning for sole-source DoD contracts.
- [ ] Package Phase I and Phase II evidence into acquisition artifacts.
- [ ] Document technical moat around semantic compression over mesh.
- [ ] Prepare security and compliance roadmap.
- [ ] Identify adjacent commands and allied military expansion paths.

### Defensible IP

- [ ] File around semantic compression over tactical mesh.
- [ ] Document routing, compaction, and provenance claims.
- [ ] Preserve dated demo evidence and architecture docs.
- [ ] Avoid over-claiming features not yet implemented.
- [ ] Revisit IP filings after field-test results.

## Do Not Build for the Hackathon

- [ ] Real RF, LoRa, SDR, FHSS, or ATAK plugin.
- [ ] Live MeshNode bridge into the laptop demo.
- [ ] Squad-game integration.
- [ ] S2 burst-sync uplink.
- [ ] Real AES-256, dongle, or classified-data workflow.
- [ ] Auto-promotion or pre-sealed succession envelopes.
- [ ] Heartbeat state machine beyond cosmetic status.
- [ ] Live audio recording for the core demo.
- [ ] Kill-chain, targeting, or weapons logic.
- [ ] Backend rename from `incident` to `sitrep`.
