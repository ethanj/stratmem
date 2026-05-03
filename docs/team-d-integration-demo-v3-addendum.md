# Team D v3 Addendum — Compression Switch Delta

**Applies to:** `docs/team-d-integration-demo-v3.md`

## End-to-end demo intention

The operator flow should prove the product in under 25 seconds: start on a **3 Kbps** link with compression OFF, click the voice report and show it is blocked, flip compression ON, click the same report again, and show it fits as SALUTE JSON.

After that, the rest of the replay shows the command picture: map, mesh, source feed, compaction, SITREP, and evidence.

## What changed

- v2's main hero click was the degraded-link toggle.
- v3's main hero click is the compression OFF/ON switch.
- The 3 Kbps meter should already be visible before the voice report is clicked.
- The demo should not depend on Chrome throttling or network settings.

## Integration delta in v3

- Mount the 3 Kbps meter where judges can see `RAW > BUDGET` and `COMPACTED FITS`.
- Mount `VoiceReportPanel` where the blocked/fits transition is visible without scrolling.
- Wire `onCompressionChange` to C's `setCompressionEnabled`.
- Wire `onSubmit` to C's `submitVoiceReport`.
- Runbook must verify:
  - compression starts OFF.
  - first voice attempt is blocked.
  - compression ON changes the same report to fits.
  - the successful report creates a feed event and contributes to compaction/SITREP.

## Do not expand

Do not add extra operator clicks, devtools steps, Wi-Fi toggles, live mic setup, or a second demo path. If the switch fails in rehearsal, use the backup video.
