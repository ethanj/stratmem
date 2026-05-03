# Team C v3 Addendum — Compression Switch Delta

**Applies to:** `docs/team-c-frontend-components-v3.md`

## End-to-end demo intention

The UI should make one idea obvious from across the room: compression OFF means the raw voice/report payload is over the **3 Kbps** budget; compression ON means the SALUTE JSON fits and enters the command picture.

This is a before/after UI state, not a networking simulation.

## What changed

- v2 treated the degraded-comms control as the main visible toggle.
- v3 makes the 3 Kbps link a persistent meter/readout.
- The stage switch is now inside or next to `VoiceReportPanel`: compression OFF/ON.
- The first `Voice Report` click should show blocked raw payload and no feed event.
- The second `Voice Report` click after compression ON should show SALUTE JSON fits and a feed event appears.

## Frontend delta in v3

- `DegradedCommsToggle` can remain the component name, but in v3 it behaves as a 3 Kbps budget meter.
- `VoiceReportPanel` owns the visible compression switch.
- Add `setCompressionEnabled(enabled)` in `services/api.ts` and `useSimulation.ts`.
- `VoiceReportPanel` consumes `voice_report.status`, `mode`, `audio_estimated_bytes`, `json_bytes`, `transmit_bytes`, `fits_budget`, and `blocked_reason`.
- Required states:
  - ready: compression OFF, no attempt yet.
  - blocked: raw payload over budget, no event in feed.
  - processed: compressed JSON under budget, event visible in feed.

## Do not expand

No live audio capture, streaming transcription UI, complex charts, or schema selector. One switch, one report, one clear before/after.
