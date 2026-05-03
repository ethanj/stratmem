# TacNet Edge Backend State Contract

This contract defines the backend-owned JSON shape consumed by the Branch B
frontend and integration work. The backend keeps the existing Sentinel Forge
`incident` field internally; Raven Gap commander SITREPs render through that
legacy field.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/scenario/select` | Selects a scenario, including `{ "scenario_id": "raven_gap" }`. |
| `POST` | `/simulate/start` | Resets the active scenario and emits one background telemetry event. |
| `POST` | `/simulate/step` | Advances one scenario event. |
| `GET` | `/state` | Returns the full state shape below. |
| `POST` | `/compression/toggle` | Sets `{ "enabled": bool }` for semantic compression. |
| `POST` | `/voice/report` | Processes `{ "audio_id": "raven_gap_salute_1" }` through the deterministic voice fixture. |
| `POST` | `/comms/degrade` | Sets EW-degraded mode. Body: `{ "degraded": bool, "kbps"?: 3 }`. |
| `POST` | `/reset` | Clears current state for the active scenario. |

## `/state`

```jsonc
{
  "events": [
    {
      "id": "rg_001",
      "type": "physical.salute",
      "source": "1/A",
      "domain": "physical",
      "severity": "low",
      "message": "Source report text",
      "metadata": {
        "sender_id": "mesh-1a",
        "unit_label": "1st Squad Alpha Team",
        "mesh_node": "SQD-1",
        "mgrs": "11S LV 42181 49118",
        "t_offset_sec": 0,
        "report_type": "SALUTE",
        "background": false,
        "scenario": "raven_gap"
      },
      "geospatial": { "lat": 37.4718, "lon": -118.6821 }
    }
  ],
  "voice_report": {
    "audio_id": "raven_gap_salute_1",
    "status": "ready",
    "mode": "raw_audio",
    "transcript": "One Alpha reports one dismount moving south near NAI 1...",
    "structured_event_id": "rg_voice_001",
    "schema": "salute",
    "structured_event": {
      "type": "salute",
      "source": "1/A",
      "size": "1 dismount",
      "activity": "moving south near NAI-1",
      "location": "11S LV 42210 49170",
      "unit": "unknown dismount",
      "time": "T+45",
      "equipment": "light pack; no visible crew-served weapon",
      "request": "uas_confirm"
    },
    "audio_estimated_bytes": 64000,
    "transcript_bytes": 146,
    "json_bytes": 241,
    "transmit_bytes": null,
    "fits_budget": null,
    "blocked_reason": null
  },
  "mesh": {
    "root": { "id": "PL", "label": "Platoon Leader" },
    "edges": [
      { "parent": "PL", "child": "1st_squad" },
      { "parent": "1st_squad", "child": "1st_squad_team_a" }
    ],
    "legacy_root": "PLT",
    "nodes": [],
    "links": []
  },
  "compactions": [
    {
      "id": "comp_mesh-1a_t150",
      "squad_id": "mesh-1a",
      "summary": "1st Squad Alpha Team: PLI/ACE updates; mission capable.",
      "source_event_ids": ["rg_001", "rg_011"],
      "t_compacted_sec": 150
    }
  ],
  "incident": {
    "id": "SITREP-ABC123",
    "type": "Commander SITREP",
    "severity": "high",
    "status": "active",
    "summary": "Commander SITREP text",
    "narrative": "Traceable commander narrative",
    "recommended_actions": [],
    "evidence_lines": [
      { "text": "Evidence text", "evidence_ids": ["rg_001"] }
    ],
    "timestamp": "2026-05-03T00:00:00+00:00",
    "active_risk": 0.72,
    "confidence": 0.72,
    "detection_confidence": 0.72,
    "why": [],
    "signals": []
  },
  "sitrep_delta": {
    "since_id": "SITREP-ABC122",
    "what_changed": ["NAI-2 risk upgraded"],
    "summary": "NAI-2 risk upgraded",
    "changed": ["NAI-2 risk upgraded"]
  },
  "map_state": {
    "mgrs_grid_anchor": { "easting": 42820, "northing": 49210, "zone": "11S LV" },
    "phase_line": [
      {
        "id": "pl_raven",
        "label": "PL Raven",
        "points": [
          { "lat": 37.4662, "lon": -118.6788 },
          { "lat": 37.4825, "lon": -118.6762 }
        ]
      }
    ],
    "checkpoints": [{ "id": "cp1", "label": "CP1", "lat": 37.4718, "lon": -118.6821 }],
    "nais": [
      {
        "id": "nai_2",
        "label": "NAI-2 East Ridge",
        "polygon": [
          { "lat": 37.4772, "lon": -118.6758 },
          { "lat": 37.4772, "lon": -118.6718 },
          { "lat": 37.4812, "lon": -118.6718 },
          { "lat": 37.4812, "lon": -118.6758 }
        ]
      }
    ],
    "friendly_markers": [{ "id": "sqd-1", "label": "1/A", "lat": 37.4718, "lon": -118.6821 }],
    "contact_markers": [{ "id": "ctc_rg_010", "label": "?", "lat": 37.4792, "lon": -118.6738, "confidence": "confirmed" }],
    "risk_zones": [{ "id": "rz_nai_2", "lat": 37.4792, "lon": -118.6738, "radius_m": 520 }],
    "routes": []
  },
  "comms": {
    "degraded": true,
    "kbps": 3,
    "window_sec": 10,
    "budget_bytes": 3750,
    "raw_bytes": 0,
    "compacted_bytes": 0,
    "compression_ratio": null,
    "fits_budget": true,
    "source_detail_level": "full",
    "compression_enabled": false
  },
  "scenario": { "id": "raven_gap", "name": "Raven Gap", "description": "..." },
  "meta": { "step": 0, "status": "running", "mode": "demo" }
}
```

`mesh.root = { id, label }` and `mesh.edges = [{ parent, child }]` are the
current frontend contract. `mesh.nodes` and `mesh.links` are legacy
backward-compatible fields that may still be emitted for older Sentinel Forge
components during the transition.

The v3 demo starts on a constrained `3` Kbps link over a `10` second window.
The backend computes
`budget_bytes = kbps * 1000 / 8 * window_sec`, source report envelope bytes, and
compacted summary bytes. In the Raven Gap demo state, raw source traffic exceeds
the 3 Kbps budget while compacted summaries fit.

When compression is off, `POST /voice/report` returns `voice_report.status =
"blocked_raw"`, `mode = "raw_audio"`, `transmit_bytes = 64000`,
`fits_budget = false`, and appends no event. After
`POST /compression/toggle { "enabled": true }`, the same voice report returns
`status = "processed"`, `mode = "compressed_json"`, `transmit_bytes = json_bytes`,
`fits_budget = true`, appends `rg_voice_001` exactly once, and reruns the
pipeline.
