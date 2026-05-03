# Branch Analysis - origin/James-research-raven-gap-attempt - 20260502-203936 PDT

## Snapshot

Ref: `origin/James-research-raven-gap-attempt`  
SHA: `651b9e572c12`

This is the frontend-heavy Raven Gap branch with a local fallback engine.

## What Is Done

New frontend files include:

- `Frontend/src/components/MeshTree.tsx`
- `Frontend/src/components/CompactionTimeline.tsx`
- `Frontend/src/components/EvidenceDrawer.tsx`
- `Frontend/src/components/DegradedCommsToggle.tsx`
- `Frontend/src/components/SitrepDeltaPanel.tsx`
- `Frontend/src/services/ravenGapEngine.ts`
- `Frontend/src/services/ravenGapStub.ts`
- `Frontend/src/types/ravenGap.ts`
- related CSS files

Modified frontend files include:

- `Frontend/src/pages/Dashboard.tsx`
- `Frontend/src/hooks/useSimulation.ts`
- `Frontend/src/services/api.ts`
- `Frontend/src/components/IncidentCard.tsx`
- `Frontend/src/components/LogStream.tsx`
- `Frontend/src/components/MapView.tsx`
- `Frontend/src/components/TopBar.tsx`
- `Frontend/src/components/AssetStatus.tsx`
- `Frontend/src/components/SignalBreakdown.tsx`

Implemented frontend capabilities:

- Dashboard layout is retargeted around the Raven Gap command picture.
- Mesh hierarchy renders from `state.mesh`.
- Compaction timeline renders `state.compactions`.
- Evidence drawer opens from SITREP evidence lines and compaction source IDs.
- `IncidentCard` renders clickable `incident.evidence_lines`.
- `useSimulation` tries to select `raven_gap` on boot.
- Local fallback engine lets the frontend demo continue if backend is missing.
- `DegradedCommsToggle` shows a 3 Kbps meter and computes raw/compacted byte metrics locally.
- TopBar mounts the degraded-comms component and exposes an offline/mock pill.

## What Still Needs To Be Done For v3

The branch is mostly v2. It does not implement the current compression OFF/ON voice-report flow.

Missing frontend pieces:

- `Frontend/src/components/VoiceReportPanel.tsx`
- `Frontend/src/styles/voice-report.css`
- `setCompressionEnabled(enabled)` in `services/api.ts`
- `submitVoiceReport(audioId)` in `services/api.ts`
- `setCompressionEnabled` action in `useSimulation.ts`
- `submitVoiceReport` action in `useSimulation.ts`
- Dashboard mount for `VoiceReportPanel`
- Operator-visible flow:
  - compression starts OFF;
  - first voice click shows blocked raw payload;
  - compression ON;
  - second voice click shows transcript, SALUTE JSON, bytes fitting, and source-feed event.

## Contract Risks

### Backend Mesh Mismatch

This branch expects:

```ts
mesh.root.id
mesh.edges[]
mesh.nodes?: Record<string, MeshNode>
```

The backend branch currently emits:

```json
"root": "PLT",
"nodes": [],
"links": []
```

If merged as-is, `MeshTree` will not consume the backend branch cleanly.

### Comms Contract Is v2

`Frontend/src/types/ravenGap.ts` says the backend only ships:

```ts
{
  degraded: boolean;
  source_detail_level: string;
}
```

Current v3 docs require comms fields such as:

- `kbps`
- `window_sec`
- `budget_bytes`
- `raw_bytes`
- `compacted_bytes`
- `compression_ratio`
- `fits_budget`
- `compression_enabled`

For v3, the frontend should prefer backend-provided proof fields if present, and only compute local metrics as a fallback.

### Degraded Toggle Is Still The Stage Switch

`DegradedCommsToggle.tsx` is a button that toggles EW degraded mode. In v3, degraded mode is the starting environment. The stage switch is semantic compression OFF/ON in `VoiceReportPanel`.

Keep the meter. Remove or de-emphasize the degraded-mode toggle during the live pitch.

### Local Fallback Can Mask Real Contract Bugs

The fallback engine is useful for demo resilience. It is also risky during integration because the UI can appear to work while the real backend state is malformed or missing.

Recommendation: keep the fallback, but add a visible `MOCK` or `LOCAL` indicator and run final rehearsal against the real backend state.

## Practical Integration Work

Before merging with backend:

1. Agree on final v3 `/state` shape.
2. Update `Frontend/src/types/ravenGap.ts` to match that shape.
3. Add `VoiceReportPanel`.
4. Add API wrappers for:
   - `/compression/toggle`
   - `/voice/report`
5. Update `useSimulation` to expose those actions.
6. Update Dashboard to mount:
   - 3 Kbps meter as readout;
   - voice panel near source feed;
   - evidence drawer or row highlight.
7. Decide whether `DegradedCommsToggle` remains a read-only meter or gets renamed later. For hackathon speed, keep the filename and change behavior.

## Build/Verification Needed

Run after integration:

```bash
cd Frontend
npm run build
npm run lint
```

Then click through the operator script:

1. App loads `raven_gap`.
2. Replay Scenario is visible.
3. Compression starts OFF.
4. Voice Report OFF blocks.
5. Compression ON succeeds.
6. Source feed includes the `1/A` SALUTE event.
7. Compaction timeline updates.
8. Commander SITREP has evidence lines.
9. Evidence click opens drawer or highlights source rows.
10. 3 Kbps meter remains visible.

## Merge Recommendation

Use this branch for frontend scaffolding and demo visuals, but do not merge blindly. It must be patched from v2 degraded-toggle behavior to v3 compression-switch behavior.

The map, layout, evidence, compaction, and local fallback work are valuable. The comms and voice surface need v3 updates.
