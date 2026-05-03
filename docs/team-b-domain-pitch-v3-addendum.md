# Team B v3 Addendum — Compression Switch Delta

**Applies to:** `docs/team-b-domain-pitch-v3.md`

## End-to-end demo intention

The audience should see the problem and solution in one small before/after: at **3 Kbps**, raw voice cannot move; when TacNet compression turns on, the same soldier report becomes compact SALUTE JSON and updates the command picture.

The point is not "we played audio." The point is "we changed what the mesh has to carry."

## What changed

- v2 emphasized degraded bandwidth and semantic compaction across the replay.
- v3 adds a live counterfactual before the replay: compression OFF fails, compression ON works.
- The voice report is now the simplest proof of semantic compression.
- The map/replay still matters, but the pitch should land the compression switch first.

## Pitch/content delta in v3

- Keep the single prerecorded SALUTE report fixture.
- Keep the stored transcript and expected JSON fields.
- Rehearse this line: "At 3 Kbps, raw voice does not fit. Turn semantic compression on, and the same report becomes SALUTE JSON that fits and updates the commander picture."
- In Q&A, say this is not live STT. The reliable demo path is prerecorded audio plus stored transcript; the real app pipeline is transcript to JSON to compaction to SITREP.
- Do not claim thousands of schemas are implemented. The future architecture may support many schemas; the demo proves one.

## Do not expand

Do not add another report type, another scenario, live microphone capture, targeting language, or extra doctrine references during the final build. Keep the explanation short enough to fit the 3-minute pitch.
