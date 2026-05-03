# Team C → Team A — Raven Gap state contract

This document captures the additive `/state` shape Team C's frontend renders for the Raven Gap demo. It is the implementation target for Team A: when the backend produces these keys, Team C deletes the local stub (`Frontend/src/services/ravenGapStub.ts`) and the components keep working unchanged.

The authoritative TS shape lives in `Frontend/src/types/ravenGap.ts`. This doc is the prose mirror.

## What's additive

All keys below are additive on top of the existing `/state` response. Nothing in the current contract changes; missing keys cause the frontend to fall back to its local stub.

| Key | Type | Frontend consumer |
|---|---|---|
| `mesh` | `Mesh` | `MeshTree.tsx` |
| `compactions` | `Compaction[]` | `CompactionTimeline.tsx` |
| `sitrep_delta` | `SitrepDelta` | `SitrepDeltaPanel.tsx` |
| `comms` | `{ degraded, source_detail_level }` | `DegradedCommsToggle.tsx` (bandwidth meter is computed locally) |
| `map_state` | `MapState` | `MapView.tsx` (NAIs, phase line, checkpoints, friendly/contact/risk markers) |
| `incident.evidence_lines` | `EvidenceLine[]` | `IncidentCard.tsx` (clickable rows) → `EvidenceDrawer.tsx` |
| `incident.timestamp` | `"T+NN"` string | `IncidentCard.tsx` |
| `events[].metadata.sender_id` | `string` | `MeshTree` (leaf lighting), `LogStream` |
| `events[].metadata.background` | `boolean` | `LogStream` (filter telemetry out of main feed) |
| `events[].metadata.unit_label` | `string` | `LogStream` (display) |
| `events[].metadata.mgrs` | `string` | `LogStream` (display) |
| `events[].metadata.report_type` | `"salute" \| "ace" \| "lace" \| "pli" \| "spot" \| "sitrep"` | `LogStream` (display) |

## Mesh

```jsonc
{
  "mesh": {
    "root": { "id": "PL", "label": "Platoon Leader" },
    "edges": [
      { "parent": "PL", "child": "1st_squad" },
      { "parent": "1st_squad", "child": "1st_squad_team_a" }
    ],
    "nodes": {
      "PL": { "id": "PL", "label": "PL" },
      "1st_squad_team_a": { "id": "1st_squad_team_a", "label": "1/A" }
    }
  }
}
```

`nodes` is optional; the frontend falls back to `child` ids as labels if missing.

## Compactions

```jsonc
{
  "compactions": [
    {
      "id": "comp_1st_squad_t60",
      "squad_id": "1st_squad",
      "label": "1ST SQUAD",
      "summary": "1st Squad: 1x contact NAI 1, ammo green, casualties zero.",
      "source_event_ids": ["rg_001", "rg_002"],
      "t_compacted_sec": 60
    }
  ]
}
```

`source_event_ids` must reference ids present in `events[]`. Click-through emits these ids via `onEvidenceClick` to open the evidence drawer.

## SITREP delta

```jsonc
{
  "sitrep_delta": {
    "since_id": "sitrep_001",
    "what_changed": [
      "NAI 1 contact upgraded from suspected to confirmed.",
      "Recommend retask UAS-02 to NAI 2."
    ]
  }
}
```

## Comms (EW-degraded mode)

Per `docs/THEPLAN.md`, the backend ships only two fields:

```jsonc
{
  "comms": {
    "degraded": false,
    "source_detail_level": "full"
  }
}
```

When `degraded === true`, `source_detail_level` switches to `"reduced"` and A trims `events[*].message` and `compactions[*].summary` to short forms (per THEPLAN §State Contract / "Degraded behavior"). `incident` (SITREP) and `sitrep_delta` remain fully populated.

The bandwidth meter visible in `DegradedCommsToggle` (raw vs compacted vs 3 kbps budget, compression ratio) is **computed locally on the frontend** from `state.events` and `state.compactions` — A does not need to wire byte counters.

## Incident.evidence_lines

```jsonc
{
  "incident": {
    "id": "sitrep_002",
    "type": "Commander SITREP",
    "timestamp": "T+75",
    "evidence_lines": [
      { "text": "Contact: 2x dismounts NAI 1, weapons observed", "evidence_ids": ["rg_001", "rg_004"] },
      { "text": "RQ-11 SATCOM denied; LoRa fallback active", "evidence_ids": ["rg_012"] }
    ]
  }
}
```

Each `evidence_ids` entry must reference an id in `events[]`. Clicking a line in `IncidentCard` emits the line's `evidence_ids` to `EvidenceDrawer`.

`incident.timestamp` is a relative-elapsed string (`"T+75"` = 75 seconds since the start of the replay), per THEPLAN. Existing legacy fields (`active_risk`, `confidence`, `detection_confidence`, `why`, `signals`) must also be populated by the synthesizer or `IncidentCard` shows zeros.

## Map state

`MapView` renders the geographic command picture entirely from `state.map_state`. Coordinates are named keys `{lat, lon}`, never positional arrays.

```jsonc
{
  "map_state": {
    "mgrs_grid_anchor": { "easting": 12000, "northing": 67000, "zone": "11SLT" },
    "phase_line": [
      { "id": "pl_blue", "label": "PHASE LINE BLUE",
        "points": [{ "lat": 36.108, "lon": -115.430 }, { "lat": 36.180, "lon": -115.430 }] }
    ],
    "checkpoints": [{ "id": "cp_1", "label": "CP-1", "lat": 36.118, "lon": -115.460 }],
    "nais": [
      { "id": "nai_1", "label": "NAI 1",
        "polygon": [
          { "lat": 36.119, "lon": -115.460 },
          { "lat": 36.119, "lon": -115.452 },
          { "lat": 36.127, "lon": -115.452 },
          { "lat": 36.127, "lon": -115.460 }
        ] }
    ],
    "friendly_markers": [
      { "id": "1st_squad_team_a", "label": "1/A", "lat": 36.118, "lon": -115.461, "kind": "infantry" },
      { "id": "rq_11", "label": "RQ-11", "lat": 36.131, "lon": -115.451, "kind": "drone" }
    ],
    "contact_markers": [
      { "id": "ctc_nai1_1", "label": "?", "lat": 36.123, "lon": -115.456, "confidence": "confirmed" }
    ],
    "risk_zones": [
      { "id": "rz_nai1", "label": "NAI 1 RISK", "lat": 36.123, "lon": -115.456, "radius_m": 250 }
    ]
  }
}
```

`friendly_markers[*].kind` shapes the marker icon: `"drone"`, `"vehicle"`, `"sensor"`, `"weapons"`, `"uas_team"`, or `"infantry"` (default). `contact_markers[*].confidence` is `"suspected" | "confirmed" | "lost"` and shapes opacity / border style.

When `comms.degraded === true`, A may drop low-confidence contact markers (per THEPLAN §State Contract / "Degraded behavior") to reflect reduced collection. The frontend handles missing keys gracefully — drop the array entirely rather than sending `null` per element.

## Event metadata extensions

```jsonc
{
  "id": "rg_004",
  "type": "salute",
  "source": "2/A",
  "domain": "physical",
  "severity": "medium",
  "timestamp": "2026-05-02T14:31:02Z",
  "message": "2x dismounts confirmed NAI 1, weapons observed.",
  "metadata": {
    "sender_id": "2nd_squad_team_a",
    "unit_label": "2nd Squad / Team A",
    "mgrs": "11SLT 12345 67890",
    "report_type": "salute",
    "background": false
  },
  "geospatial": { "lat": 36.123, "lon": -115.456 }
}
```

Notes:

- `sender_id` should match a `mesh.nodes` key when possible. When it doesn't, `MeshTree` ignores it.
- `background: true` is the LogStream filter signal — telemetry pings should set this so they don't pollute the source-report feed.
- `source` should be the raw callsign (`1/A`, `RQ-11`, `S7`, …); `LogStream` renders it directly.

## POST /comms/degrade

Request:

```jsonc
{ "degraded": true }
```

Response: the canonical state dict with `comms` updated. Frontend falls back to a local stub if this endpoint 404s, so partial implementation is OK during integration.

## Raven Gap scenario registration

The frontend boots with `selectScenario("raven_gap")`. Until A registers `raven_gap` in `Backend/app/core/scenario.py`, the call is wrapped in try/catch and falls through to whatever scenario the backend defaults to.

## Stub fixture

For reference while implementing, the local stub fixture mirroring this contract lives at `Frontend/src/services/ravenGapStub.ts` and the demo beats are in `docs/branch-b-sentinel-forge-demo-script.md`. Once A's backend produces these keys, the stub becomes a no-op (its merge only fills missing fields).
