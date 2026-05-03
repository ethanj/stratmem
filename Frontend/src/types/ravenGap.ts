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

export interface Comms {
  degraded: boolean;
  /** Link budget in kbps when degraded; null when full link. */
  kbps: number | null;
  /** Sliding window the budget is computed over. */
  window_sec: number;
  /** Bytes that fit the current link in `window_sec`; null when not degraded. */
  budget_bytes: number | null;
  /** Raw source-traffic bytes in the window. */
  raw_bytes: number;
  /** Compacted bytes (post squad-summary) in the window. */
  compacted_bytes: number;
  /** raw_bytes / compacted_bytes when both > 0; null otherwise. */
  compression_ratio: number | null;
  /** True iff compacted_bytes <= budget_bytes (or not degraded). */
  fits_budget: boolean;
  /** Detail level the source feed renders at: "full" | "compact" | etc. */
  source_detail_level: "full" | "compact" | string;
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
 * `useSimulation().state` (after `mergeRavenGapStub` fills missing keys).
 */
export interface RavenGapStateSlice {
  mesh?: Mesh;
  compactions?: Compaction[];
  sitrep_delta?: SitrepDelta;
  comms?: Comms;
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
