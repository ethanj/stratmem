# Team A v3 Addendum — Compression Switch Delta

**Applies to:** `docs/team-a-backend-v3.md`

## End-to-end demo intention

The v3 demo should make the counterfactual visible. The link is already degraded to **3 Kbps**. Compression starts **OFF**. A prerecorded voice report is attempted and cannot be transmitted as raw payload. Then compression turns **ON**, the same report becomes compact SALUTE JSON, fits the budget, enters the event stream, and updates compaction/SITREP.

This is the core proof: TacNet does not make the radio better; it makes the payload worth sending.

## What changed

- v2 showed a degraded-link meter where raw traffic exceeded budget and compacted summaries fit.
- v3 adds a visible compression OFF/ON switch before the main replay traffic.
- The 3 Kbps condition is now the environment, not the stage toggle.
- The first voice-report attempt is intentionally blocked.
- The second voice-report attempt succeeds only after semantic compression is enabled.

## Backend delta in v3

- Default `state.comms` starts as `degraded: true`, `kbps: 3`, `budget_bytes: 3750`, and `compression_enabled: false`.
- Add `POST /compression/toggle { enabled: bool }`.
- `POST /voice/report` has two branches:
  - compression OFF: return `voice_report.status = "blocked_raw"`, set `transmit_bytes = audio_estimated_bytes`, set `fits_budget = false`, and append no event.
  - compression ON: return `voice_report.status = "processed"`, set `transmit_bytes = json_bytes`, set `fits_budget = true`, append one SALUTE event, then rerun compaction/SITREP.
- Add `voice_report.mode`, `transmit_bytes`, `fits_budget`, and `blocked_reason` fields.
- Integration gate now tests OFF failure, ON success, then normal replay/compaction.

## Do not expand

No live STT, packet simulation, iPhone path, LoRa transport, or multi-schema registry. One prerecorded SALUTE report is enough.
