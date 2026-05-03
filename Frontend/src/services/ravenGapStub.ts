/**
 * @file Raven Gap stub fixture (Team C local fake until A's backend ships).
 *
 * Mirrors the demo-script beats in docs/branch-b-sentinel-forge-demo-script.md:
 *   0:35-0:40  Replay Scenario clicked (mesh + empty stream visible).
 *   0:40-0:55  ~12 source reports (SALUTE / ACE / LACE / UAS / sensor / PLI).
 *   0:55-1:10  CompactionTimeline collapses reports into 3 squad summaries.
 *   1:10-1:25  Commander SITREP with evidence_lines populated.
 *   1:25-1:35  Click an evidence line -> drawer surfaces source events.
 *   1:35-1:55  EW-degraded toggle: 3 KBPS budget; raw > budget, compacted fits.
 *
 * `mergeRavenGapStub(state)` fills only the keys the backend hasn't shipped
 * yet — when A's response contains a real value, the merge is a no-op.
 * Always-on; delete the import + call site in useSimulation when A is done.
 */

import type {
  Comms,
  Compaction,
  EvidenceLine,
  MapState,
  Mesh,
  RavenGapEventMetadata,
  SitrepDelta,
} from "../types/ravenGap";

type StubEvent = {
  id: string;
  type: string;
  source: string;
  domain: "physical" | "cyber" | "osint" | "signals" | "fusion";
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  message: string;
  metadata: RavenGapEventMetadata;
  geospatial?: { lat: number; lon: number };
};

const T0 = "2026-05-02T14:30:00Z";
const minute = (n: number) => {
  const d = new Date(T0);
  d.setUTCSeconds(d.getUTCSeconds() + n);
  return d.toISOString();
};

export const ravenGapMesh: Mesh = {
  root: { id: "PL", label: "Platoon Leader" },
  edges: [
    { parent: "PL", child: "1st_squad" },
    { parent: "PL", child: "2nd_squad" },
    { parent: "PL", child: "3rd_squad" },
    { parent: "PL", child: "weapons_squad" },
    { parent: "PL", child: "uas_team" },
    { parent: "PL", child: "op_lp" },
    { parent: "1st_squad", child: "1st_squad_team_a" },
    { parent: "1st_squad", child: "1st_squad_team_b" },
    { parent: "2nd_squad", child: "2nd_squad_team_a" },
    { parent: "2nd_squad", child: "2nd_squad_team_b" },
    { parent: "3rd_squad", child: "3rd_squad_team_a" },
    { parent: "weapons_squad", child: "jltv_v1" },
    { parent: "uas_team", child: "rq_11" },
    { parent: "op_lp", child: "sensor_s7" },
  ],
  nodes: {
    PL: { id: "PL", label: "PL" },
    "1st_squad": { id: "1st_squad", label: "1ST SQUAD" },
    "2nd_squad": { id: "2nd_squad", label: "2ND SQUAD" },
    "3rd_squad": { id: "3rd_squad", label: "3RD SQUAD" },
    weapons_squad: { id: "weapons_squad", label: "WPNS SQUAD" },
    uas_team: { id: "uas_team", label: "UAS TEAM" },
    op_lp: { id: "op_lp", label: "OP/LP" },
    "1st_squad_team_a": { id: "1st_squad_team_a", label: "1/A" },
    "1st_squad_team_b": { id: "1st_squad_team_b", label: "1/B" },
    "2nd_squad_team_a": { id: "2nd_squad_team_a", label: "2/A" },
    "2nd_squad_team_b": { id: "2nd_squad_team_b", label: "2/B" },
    "3rd_squad_team_a": { id: "3rd_squad_team_a", label: "3/A" },
    jltv_v1: { id: "jltv_v1", label: "V1 (JLTV)", kind: "vehicle" },
    rq_11: { id: "rq_11", label: "RQ-11", kind: "drone" },
    sensor_s7: { id: "sensor_s7", label: "S7", kind: "sensor" },
  },
};

export const ravenGapEvents: StubEvent[] = [
  {
    id: "rg_001",
    type: "salute",
    source: "1/A",
    domain: "physical",
    severity: "low",
    timestamp: minute(40),
    message: "1x dismount moving south, NAI 1, light pack, IR signature normal.",
    metadata: {
      sender_id: "1st_squad_team_a",
      unit_label: "1st Squad / Team A",
      mgrs: "11SLT 12345 67890",
      report_type: "salute",
      background: false,
    },
    geospatial: { lat: 36.123, lon: -115.456 },
  },
  {
    id: "rg_002",
    type: "ace",
    source: "1/B",
    domain: "physical",
    severity: "low",
    timestamp: minute(48),
    message: "ACE: ammo green, casualties zero, equipment green.",
    metadata: {
      sender_id: "1st_squad_team_b",
      unit_label: "1st Squad / Team B",
      report_type: "ace",
      background: false,
    },
  },
  {
    id: "rg_003",
    type: "spot",
    source: "RQ-11",
    domain: "physical",
    severity: "medium",
    timestamp: minute(55),
    message: "UAS spot: 2x dismounts NAI 2, 11SLT 12450 67950, moving NW.",
    metadata: {
      sender_id: "rq_11",
      unit_label: "RQ-11",
      mgrs: "11SLT 12450 67950",
      report_type: "spot",
      background: false,
    },
    geospatial: { lat: 36.131, lon: -115.451 },
  },
  {
    id: "rg_004",
    type: "salute",
    source: "2/A",
    domain: "physical",
    severity: "medium",
    timestamp: minute(62),
    message: "2x dismounts confirmed NAI 1, weapons observed, range 220m.",
    metadata: {
      sender_id: "2nd_squad_team_a",
      unit_label: "2nd Squad / Team A",
      mgrs: "11SLT 12345 67890",
      report_type: "salute",
      background: false,
    },
    geospatial: { lat: 36.123, lon: -115.456 },
  },
  {
    id: "rg_005",
    type: "telemetry.ping",
    source: "MESH",
    domain: "signals",
    severity: "low",
    timestamp: minute(64),
    message: "Mesh heartbeat: all leaves green.",
    metadata: { sender_id: "PL", background: true },
  },
  {
    id: "rg_006",
    type: "trigger",
    source: "S7",
    domain: "physical",
    severity: "medium",
    timestamp: minute(68),
    message: "Sensor trigger: motion at OP/LP picket line.",
    metadata: {
      sender_id: "sensor_s7",
      unit_label: "OP/LP S7",
      report_type: "spot",
      background: false,
    },
  },
  {
    id: "rg_007",
    type: "lace",
    source: "2/B",
    domain: "physical",
    severity: "low",
    timestamp: minute(72),
    message: "LACE: liquids amber, ammo green, casualties zero, equipment green.",
    metadata: {
      sender_id: "2nd_squad_team_b",
      unit_label: "2nd Squad / Team B",
      report_type: "lace",
      background: false,
    },
  },
  {
    id: "rg_008",
    type: "pli",
    source: "V1",
    domain: "physical",
    severity: "low",
    timestamp: minute(78),
    message: "JLTV PLI: 11SLT 12100 67700, fuel 78%, crew 4.",
    metadata: {
      sender_id: "jltv_v1",
      unit_label: "V1 (JLTV)",
      mgrs: "11SLT 12100 67700",
      report_type: "pli",
      background: false,
    },
  },
  {
    id: "rg_009",
    type: "spot",
    source: "RQ-11",
    domain: "physical",
    severity: "high",
    timestamp: minute(85),
    message: "UAS spot: vehicle dust trail vic NAI 2, possible technical.",
    metadata: {
      sender_id: "rq_11",
      report_type: "spot",
      background: false,
    },
    geospatial: { lat: 36.135, lon: -115.448 },
  },
  {
    id: "rg_010",
    type: "salute",
    source: "3/A",
    domain: "physical",
    severity: "medium",
    timestamp: minute(92),
    message: "3x dismounts NAI 3 dispersing, no contact.",
    metadata: {
      sender_id: "3rd_squad_team_a",
      unit_label: "3rd Squad / Team A",
      report_type: "salute",
      background: false,
    },
  },
  {
    id: "rg_011",
    type: "telemetry.ping",
    source: "MESH",
    domain: "signals",
    severity: "low",
    timestamp: minute(94),
    message: "Mesh heartbeat: all leaves green.",
    metadata: { sender_id: "PL", background: true },
  },
  {
    id: "rg_012",
    type: "ew_alert",
    source: "RQ-11",
    domain: "signals",
    severity: "high",
    timestamp: minute(100),
    message: "RQ-11 link degraded, SATCOM denied, falling back to LoRa.",
    metadata: {
      sender_id: "rq_11",
      report_type: "spot",
      background: false,
    },
  },
];

export const ravenGapCompactions: Compaction[] = [
  {
    id: "comp_1st_squad_t60",
    squad_id: "1st_squad",
    label: "1ST SQUAD",
    summary: "1st Squad: 1x contact NAI 1 confirmed, ammo green, casualties zero.",
    source_event_ids: ["rg_001", "rg_002"],
    t_compacted_sec: 60,
  },
  {
    id: "comp_2nd_squad_t75",
    squad_id: "2nd_squad",
    label: "2ND SQUAD",
    summary: "2nd Squad: 2x dismounts confirmed NAI 1, weapons observed, LACE green.",
    source_event_ids: ["rg_004", "rg_007"],
    t_compacted_sec: 75,
  },
  {
    id: "comp_uas_t90",
    squad_id: "uas_team",
    label: "UAS TEAM",
    summary: "UAS: NAI 2 contact + vehicle dust trail, link now LoRa-only.",
    source_event_ids: ["rg_003", "rg_009", "rg_012"],
    t_compacted_sec: 90,
  },
];

export const ravenGapSitrepDelta: SitrepDelta = {
  since_id: "sitrep_001",
  what_changed: [
    "NAI 1 contact upgraded from suspected to confirmed (2/A SALUTE).",
    "Vehicle activity new at NAI 2; recommend retask UAS-02.",
    "RQ-11 link degraded to LoRa; collection plan should fall back to OP/LP.",
  ],
};

export const ravenGapEvidenceLines: EvidenceLine[] = [
  {
    text: "Contact: 2x dismounts NAI 1, weapons observed",
    evidence_ids: ["rg_001", "rg_004"],
  },
  {
    text: "Vehicle activity vic NAI 2, possible technical",
    evidence_ids: ["rg_003", "rg_009"],
  },
  {
    text: "Sensor S7 trigger at OP/LP picket line",
    evidence_ids: ["rg_006"],
  },
  {
    text: "RQ-11 SATCOM denied; LoRa fallback active",
    evidence_ids: ["rg_012"],
  },
];

const ravenGapIncident = {
  id: "sitrep_002",
  type: "Commander SITREP",
  severity: "medium",
  status: "active",
  /** THEPLAN-style elapsed-seconds-from-replay-start label. */
  timestamp: "T+75",
  summary:
    "Platoon under observation pressure at NAI 1 / NAI 2. Confirmed dismount contact and unidentified vehicle activity. Mesh link to RQ-11 degraded.",
  narrative:
    "TacNet Edge fused 12 source reports across three squads, the UAS team, and the OP/LP sensor. Confirmed contact at NAI 1 and emerging vehicle threat at NAI 2 drive a recommendation to retask UAS-02 and stage QRF.",
  active_risk: 0.72,
  confidence: 0.74,
  detection_confidence: 0.78,
  why: [
    "2x SALUTE corroboration at NAI 1 (1/A + 2/A)",
    "UAS spot of vehicle dust trail at NAI 2",
    "OP/LP sensor S7 motion trigger inside picket line",
  ],
  recommended_actions: [
    "Retask RQ-11 to NAI 2",
    "Stage QRF behind Phase Line BLUE",
    "Confirm S7 trigger with 3/A patrol",
    "Push compacted SITREP to higher",
  ],
  signals: [],
  evidence_lines: ravenGapEvidenceLines,
};

/**
 * Raven Gap map state — geographic command picture per docs/THEPLAN.md.
 * Coordinates are named keys {lat, lon}, never positional arrays. Centered on
 * Nevada training-area-style terrain to match MGRS 11SLT prefix used by event
 * stubs. Real demo content comes from B's NAI/grid list when delivered.
 */
export const ravenGapMapState: MapState = {
  mgrs_grid_anchor: { easting: 12000, northing: 67000, zone: "11SLT" },
  phase_line: [
    {
      id: "pl_blue",
      label: "PHASE LINE BLUE",
      points: [
        { lat: 36.108, lon: -115.430 },
        { lat: 36.150, lon: -115.430 },
        { lat: 36.180, lon: -115.430 },
      ],
    },
  ],
  checkpoints: [
    { id: "cp_1", label: "CP-1", lat: 36.118, lon: -115.460 },
    { id: "cp_2", label: "CP-2", lat: 36.140, lon: -115.450 },
  ],
  nais: [
    {
      id: "nai_1",
      label: "NAI 1",
      polygon: [
        { lat: 36.119, lon: -115.460 },
        { lat: 36.119, lon: -115.452 },
        { lat: 36.127, lon: -115.452 },
        { lat: 36.127, lon: -115.460 },
      ],
    },
    {
      id: "nai_2",
      label: "NAI 2",
      polygon: [
        { lat: 36.130, lon: -115.454 },
        { lat: 36.130, lon: -115.444 },
        { lat: 36.140, lon: -115.444 },
        { lat: 36.140, lon: -115.454 },
      ],
    },
  ],
  friendly_markers: [
    { id: "1st_squad_team_a", label: "1/A", lat: 36.118, lon: -115.461, kind: "infantry" },
    { id: "1st_squad_team_b", label: "1/B", lat: 36.116, lon: -115.463, kind: "infantry" },
    { id: "2nd_squad_team_a", label: "2/A", lat: 36.122, lon: -115.458, kind: "infantry" },
    { id: "2nd_squad_team_b", label: "2/B", lat: 36.124, lon: -115.457, kind: "infantry" },
    { id: "3rd_squad_team_a", label: "3/A", lat: 36.126, lon: -115.461, kind: "infantry" },
    { id: "weapons_squad", label: "WPNS", lat: 36.115, lon: -115.464, kind: "weapons" },
    { id: "uas_team", label: "UAS", lat: 36.116, lon: -115.462, kind: "uas_team" },
    { id: "op_lp", label: "OP/LP", lat: 36.130, lon: -115.455, kind: "sensor" },
    { id: "rq_11", label: "RQ-11", lat: 36.131, lon: -115.451, kind: "drone" },
    { id: "jltv_v1", label: "V1", lat: 36.114, lon: -115.466, kind: "vehicle" },
    { id: "sensor_s7", label: "S7", lat: 36.130, lon: -115.455, kind: "sensor" },
  ],
  contact_markers: [
    { id: "ctc_nai1_1", label: "?", lat: 36.123, lon: -115.456, confidence: "confirmed" },
    { id: "ctc_nai2_1", label: "?", lat: 36.135, lon: -115.448, confidence: "suspected" },
  ],
  risk_zones: [
    { id: "rz_nai1", label: "NAI 1 RISK", lat: 36.123, lon: -115.456, radius_m: 250 },
    { id: "rz_nai2", label: "NAI 2 RISK", lat: 36.135, lon: -115.448, radius_m: 350 },
  ],
  routes: [],
};

/** Minimal comms shape per docs/THEPLAN.md. Bandwidth metrics are computed
 * locally in DegradedCommsToggle from events + compactions; backend only
 * ships these two fields. */
export const ravenGapCommsFull: Comms = {
  degraded: false,
  source_detail_level: "full",
};

export function buildDegradedComms(): Comms {
  return {
    degraded: true,
    source_detail_level: "reduced",
  };
}

export const ravenGapStubState = {
  events: ravenGapEvents,
  mesh: ravenGapMesh,
  compactions: ravenGapCompactions,
  sitrep_delta: ravenGapSitrepDelta,
  comms: ravenGapCommsFull,
  incident: ravenGapIncident,
  map_state: ravenGapMapState,
};

/**
 * Deep-merge stub fields onto whatever the backend currently returns.
 * Real backend wins by truthy check — when A produces a key, the stub is a
 * no-op for that key. For `incident.evidence_lines`, only filled if the
 * backend already produced an incident but didn't supply evidence_lines.
 */
type MergeableState = Record<string, unknown> & {
  events?: unknown;
  mesh?: unknown;
  compactions?: unknown;
  sitrep_delta?: unknown;
  comms?: unknown;
  incident?: Record<string, unknown> | null;
  map_state?: Record<string, unknown> | null;
};

export function mergeRavenGapStub<T>(state: T): T {
  if (!state || typeof state !== "object") return state;

  const next = { ...(state as MergeableState) };

  if (!Array.isArray(next.events) || next.events.length === 0) {
    next.events = ravenGapStubState.events;
  }

  if (!next.mesh) next.mesh = ravenGapStubState.mesh;
  if (!Array.isArray(next.compactions) || next.compactions.length === 0) {
    next.compactions = ravenGapStubState.compactions;
  }
  if (!next.sitrep_delta) next.sitrep_delta = ravenGapStubState.sitrep_delta;
  if (!next.comms) next.comms = ravenGapStubState.comms;

  // map_state merge: fill any missing Raven Gap key on top of whatever the
  // backend currently produces. This preserves legacy Sentinel Forge fields
  // (tracks, threat_paths, assets) when present.
  const stubMap = ravenGapStubState.map_state as Record<string, unknown>;
  const currentMap = (next.map_state ?? null) as Record<string, unknown> | null;
  const ravenGapKeys = [
    "mgrs_grid_anchor",
    "phase_line",
    "checkpoints",
    "nais",
    "friendly_markers",
    "contact_markers",
    "risk_zones",
    "routes",
  ] as const;
  const mergedMap: Record<string, unknown> = { ...(currentMap ?? {}) };
  for (const key of ravenGapKeys) {
    const existing = mergedMap[key];
    const isEmpty =
      existing === undefined || existing === null ||
      (Array.isArray(existing) && existing.length === 0);
    if (isEmpty) mergedMap[key] = stubMap[key];
  }
  next.map_state = mergedMap;

  if (!next.incident) {
    next.incident = ravenGapStubState.incident as unknown as Record<string, unknown>;
  } else {
    const evidenceLines = (next.incident as Record<string, unknown>).evidence_lines;
    if (!Array.isArray(evidenceLines) || evidenceLines.length === 0) {
      next.incident = {
        ...(next.incident as Record<string, unknown>),
        evidence_lines: ravenGapStubState.incident.evidence_lines,
      };
    }
  }

  return next as T;
}
