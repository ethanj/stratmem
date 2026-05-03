/**
 * @file Raven Gap state-shape types (Team C contract with Team A).
 *
 * These interfaces define the additive `/state` keys the frontend renders for
 * the Raven Gap demo: mesh hierarchy, compaction timeline, sitrep delta,
 * comms / EW-degraded budget, and incident evidence_lines, plus the
 * Raven-Gap-specific event metadata.
 *
 * The companion stub (`services/ravenGapStub.ts`) and the contract doc
 * (`docs/team-c-state-contract.md`) both reference this file as the
 * authoritative shape. Once Team A's backend produces these keys, the stub
 * is deleted; these types stay.
 */

export type SeverityLevel = "low" | "medium" | "high" | "critical" | string;

export interface MeshNode {
  id: string;
  label: string;
}

export interface MeshEdge {
  parent: string;
  child: string;
}

export interface Mesh {
  root: MeshNode;
  /**
   * Flat edge list. The frontend builds the tree from `root` + `edges`.
   */
  edges: MeshEdge[];
  /**
   * Optional pre-resolved node table for label / kind lookup. Keyed by node id.
   */
  nodes?: Record<string, MeshNode & { kind?: string }>;
}

export interface Compaction {
  id: string;
  /** Mesh node id this compaction summarizes (e.g. `1st_squad`). */
  squad_id: string;
  /** Optional human label (e.g. `1ST SQUAD`). */
  label?: string;
  /** One-line summary surfaced in the compaction timeline. */
  summary: string;
  /** Raw event ids that rolled into this summary; emitted on click. */
  source_event_ids: string[];
  /** Seconds since scenario start; orders the timeline. */
  t_compacted_sec: number;
}

export interface SitrepDelta {
  /** Id of the prior SITREP this delta is computed against. Optional. */
  since_id?: string;
  /** Human-readable bullets describing what changed since the last SITREP. */
  what_changed: string[];
}

/**
 * Minimal comms contract per docs/THEPLAN.md. Backend (A) only ships
 * `degraded` and `source_detail_level`; the bandwidth meter computes
 * raw_bytes / compacted_bytes / budget / ratio locally from `events` and
 * `compactions` so we don't need A to wire byte counters.
 */
export interface Comms {
  degraded: boolean;
  /** "full" | "reduced" — drives source-feed detail when degraded. */
  source_detail_level: "full" | "reduced" | string;
}

/**
 * Locally-derived bandwidth metrics displayed in DegradedCommsToggle. NOT
 * shipped over the wire; computed in the component from events + compactions.
 */
export interface BandwidthMeter {
  /** Link rate in kbps (display-only). */
  kbps: number;
  /** Sliding window in seconds. */
  window_sec: number;
  /** Bytes that fit the link in `window_sec`. */
  budget_bytes: number;
  /** Sum of message lengths across the window. */
  raw_bytes: number;
  /** Sum of compaction summary lengths across the window. */
  compacted_bytes: number;
  /** raw / compacted when both > 0. */
  compression_ratio: number | null;
  /** compacted_bytes ≤ budget_bytes. */
  fits_budget: boolean;
}

export interface EvidenceLine {
  /** Operator-facing line of the SITREP. */
  text: string;
  /** Event ids that support / source this line. */
  evidence_ids: string[];
}

/**
 * Additive event metadata Raven Gap uses on top of the existing event shape.
 * The frontend keys off `sender_id` (mesh leaf lighting), `background`
 * (LogStream filter), and the human label fields for readability.
 */
export interface RavenGapEventMetadata {
  sender_id?: string;
  unit_label?: string;
  mgrs?: string;
  report_type?: "salute" | "ace" | "lace" | "pli" | "spot" | "sitrep" | string;
  /** When true, LogStream filters the event out of the main feed. */
  background?: boolean;
  [key: string]: unknown;
}

/**
 * Request body for POST /comms/degrade. Response is the canonical state dict
 * with `comms` updated.
 */
export interface CommsDegradeRequest {
  degraded: boolean;
  kbps?: number;
}

/**
 * The slice of `state` populated by Raven Gap. Components consume these via
 * `useSimulation().state` after backend Raven Gap selection is applied.
 */
export interface RavenGapStateSlice {
  mesh?: Mesh;
  compactions?: Compaction[];
  sitrep_delta?: SitrepDelta;
  comms?: Comms;
  receiver_events?: ReceiverDecodeEvent[];
}

export interface ReceiverDecodeEvent {
  id: string;
  room: string;
  source: string;
  received_at: string;
  verified: boolean;
  frame_type: string;
  sequence?: number | null;
  byte_count: number;
  checksum?: number | null;
  metadata: Record<string, unknown>;
  reconstructed_text: string;
  compression?: {
    raw_audio_estimated_bytes: number;
    binary_bytes: number;
    ratio: number | null;
  };
}

/**
 * Map state — the geographic command picture. Coordinates are named keys
 * `{lat, lon}` (not positional arrays) per THEPLAN to remove [lon,lat] vs
 * [lat,lon] ambiguity.
 */
export interface LatLon {
  lat: number;
  lon: number;
}

export interface MgrsAnchor {
  easting: number;
  northing: number;
  zone: string;
}

export interface PhaseLine {
  id: string;
  label: string;
  points: LatLon[];
}

export interface Checkpoint extends LatLon {
  id: string;
  label: string;
}

export interface NamedAreaOfInterest {
  id: string;
  label: string;
  polygon: LatLon[];
}

export interface FriendlyMarker extends LatLon {
  id: string;
  label: string;
  kind?: string;
  unit?: string;
  status?: string;
}

export interface ContactConfidence {
  /** "suspected" | "confirmed" | "lost". */
  confidence: "suspected" | "confirmed" | "lost" | string;
}

export interface ContactMarker extends LatLon, ContactConfidence {
  id: string;
  label: string;
  kind?: string;
  severity?: string;
  source_event_id?: string;
  message?: string;
}

export interface RiskZone extends LatLon {
  id: string;
  label?: string;
  /** Radius in meters. */
  radius_m: number;
}

export interface Route {
  id: string;
  label?: string;
  name?: string;
  status?: string;
  points: LatLon[];
}

export interface MapState {
  mgrs_grid_anchor?: MgrsAnchor;
  phase_line?: PhaseLine[];
  checkpoints?: Checkpoint[];
  nais?: NamedAreaOfInterest[];
  friendly_markers?: FriendlyMarker[];
  contact_markers?: ContactMarker[];
  risk_zones?: RiskZone[];
  routes?: Route[];
  entities?: TacticalEntity[];
  /** Existing Sentinel Forge fields preserved for legacy paths. */
  tracks?: unknown[];
  threat_paths?: unknown[];
  assets?: unknown[];
  risk_level?: string;
}

export interface TacticalStatus {
  health?: string;
  readiness?: string;
  ammo?: string;
  comms?: string;
  mobility?: string;
  battery?: string;
  fuel?: string;
  [key: string]: string | undefined;
}

export interface TacticalHistoryItem {
  event_id?: string | null;
  message: string;
}

export interface TacticalTransmission {
  time: string;
  channel: string;
  status: string;
  message: string;
  event_id?: string | null;
}

export interface TacticalEntity extends LatLon {
  id: string;
  parent_id?: string | null;
  label: string;
  callsign: string;
  entity_type: "platoon" | "squad" | "personnel" | "vehicle" | "drone" | "sensor" | "contact" | string;
  affiliation: "friend" | "hostile" | "neutral" | "unknown" | string;
  nationality: string;
  sidc: string;
  echelon?: string | null;
  mgrs?: string;
  status: TacticalStatus;
  history: TacticalHistoryItem[];
  role?: string;
  activity?: string;
  demo_role?: "nine_line_sender" | "nine_line_subject" | string;
  report_status?: string;
  linked_event_ids?: string[];
  transmissions?: TacticalTransmission[];
  detail_locked?: boolean;
  personnel_available?: number;
  personnel_total?: number;
}

/**
 * Loose event shape consumed by Raven Gap components (MeshTree,
 * CompactionTimeline, EvidenceDrawer). Backend emits a richer shape; only
 * these fields are read here.
 */
export interface RavenGapEvent {
  id?: string;
  type?: string;
  source?: string;
  domain?: string;
  severity?: string;
  timestamp?: string;
  message?: string;
  metadata?: RavenGapEventMetadata;
  geospatial?: { lat: number; lon: number };
  [key: string]: unknown;
}
