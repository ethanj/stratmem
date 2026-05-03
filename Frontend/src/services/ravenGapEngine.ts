/**
 * @file Raven Gap local scenario engine — runs the full demo loop without
 * backend.
 *
 * Treats `ravenGapStubState.events` as the authoritative 12-event script.
 * `buildScenarioState(stepIndex, comms)` returns a `/state`-shaped object
 * with progressive reveals:
 *
 *   - `events`            : first `stepIndex` items from the script.
 *   - `compactions`       : a stub compaction is visible once *all* of its
 *                           `source_event_ids` have been revealed.
 *   - `incident`          : SITREP appears once stepIndex ≥ INCIDENT_AT.
 *   - `sitrep_delta`      : delta panel appears once stepIndex ≥ DELTA_AT.
 *   - `map_state`         : full from boot (NAIs / phase line / friendlies);
 *                           contact markers reveal once their NAI's first
 *                           event is in `events`.
 *   - `meta.step / status`: drives the existing autoRun loop.
 *
 * Used by `useSimulation` as a fallback when backend calls fail. Identical
 * shape to backend response, so components don't know the difference.
 *
 * Once Team A's backend ships, the catch-blocks in `useSimulation` stop
 * firing and this module idles.
 */

import {
  ravenGapCommsFull,
  ravenGapStubState,
} from "./ravenGapStub";
import type { Comms } from "../types/ravenGap";

/** Step counts after which derived artifacts become visible. */
const INCIDENT_AT = 8;
const DELTA_AT = 10;
export const TOTAL_STEPS = ravenGapStubState.events.length;

const RAVEN_GAP_SCENARIO = {
  id: "raven_gap",
  name: "Raven Gap",
  description:
    "Platoon under EW degradation; semantic compaction over a tactical mesh.",
};

type StepState = {
  events: typeof ravenGapStubState.events;
  signals: unknown[];
  correlation: null;
  incident: typeof ravenGapStubState.incident | null;
  sitrep_delta: typeof ravenGapStubState.sitrep_delta | null;
  mesh: typeof ravenGapStubState.mesh;
  compactions: typeof ravenGapStubState.compactions;
  map_state: typeof ravenGapStubState.map_state;
  comms: Comms;
  scenario: typeof RAVEN_GAP_SCENARIO;
  meta: {
    mode: string;
    step: number;
    status: "idle" | "running" | "complete";
  };
  operator_actions: Record<string, unknown>;
  resolved_incidents: unknown[];
};

/**
 * Build a `/state` slice for a given `stepIndex` (0..TOTAL_STEPS). Pure;
 * no side effects.
 */
export function buildScenarioState(
  stepIndex: number,
  comms: Comms = ravenGapCommsFull,
  status: "idle" | "running" | "complete" | null = null,
): StepState {
  const clamped = Math.max(0, Math.min(TOTAL_STEPS, stepIndex));

  const visibleEvents = ravenGapStubState.events.slice(0, clamped);
  const visibleIds = new Set(visibleEvents.map((e) => e.id));

  const compactions = ravenGapStubState.compactions.filter((c) =>
    c.source_event_ids.every((id) => visibleIds.has(id)),
  );

  const showIncident = clamped >= INCIDENT_AT;
  const showDelta = clamped >= DELTA_AT;

  // Keep map_state structure but conditionally hide contact markers whose
  // first contributing event hasn't been revealed yet. Friendly / phase /
  // NAI / risk-zone elements stay constant from boot.
  const naiContactWindow: Record<string, number> = {
    ctc_nai1_1: 4, // 2/A SALUTE confirms NAI 1 contact at step 4
    ctc_nai2_1: 9, // RQ-11 vehicle dust spot at step 9
  };
  const visibleContacts = (ravenGapStubState.map_state.contact_markers ?? [])
    .filter((c) => clamped >= (naiContactWindow[c.id] ?? 0));

  const map_state = {
    ...ravenGapStubState.map_state,
    contact_markers: visibleContacts,
  };

  const computedStatus: "idle" | "running" | "complete" =
    status ??
    (clamped === 0
      ? "idle"
      : clamped >= TOTAL_STEPS
        ? "complete"
        : "running");

  return {
    events: visibleEvents,
    signals: [],
    correlation: null,
    incident: showIncident ? ravenGapStubState.incident : null,
    sitrep_delta: showDelta ? ravenGapStubState.sitrep_delta : null,
    mesh: ravenGapStubState.mesh,
    compactions,
    map_state,
    comms,
    scenario: RAVEN_GAP_SCENARIO,
    meta: {
      mode: "demo",
      step: clamped,
      status: computedStatus,
    },
    operator_actions: {},
    resolved_incidents: [],
  };
}

/** Boot state — empty, status "idle". */
export function localBoot(comms: Comms = ravenGapCommsFull): StepState {
  return buildScenarioState(0, comms, "idle");
}

/** Start state — first event revealed, status "running". */
export function localStart(comms: Comms = ravenGapCommsFull): StepState {
  return buildScenarioState(1, comms, "running");
}

/** Advance one step from the given state. */
export function localStep(current: StepState | null | undefined): StepState {
  const currentStep = current?.meta?.step ?? 0;
  const comms = current?.comms ?? ravenGapCommsFull;
  return buildScenarioState(currentStep + 1, comms);
}

/** Reset to step 0, status "idle". */
export function localReset(): StepState {
  return buildScenarioState(0, ravenGapCommsFull, "idle");
}

/** Flip degraded mode without changing step. Returns full state slice. */
export function localToggleDegraded(
  current: StepState | null | undefined,
  degraded: boolean,
): StepState {
  const currentStep = current?.meta?.step ?? 0;
  const comms: Comms = degraded
    ? { degraded: true, source_detail_level: "reduced" }
    : { degraded: false, source_detail_level: "full" };
  const status = current?.meta?.status ?? null;
  return buildScenarioState(currentStep, comms, status);
}
