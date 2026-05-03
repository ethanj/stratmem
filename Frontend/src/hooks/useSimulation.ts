/**
 * React state orchestrator for the backend-owned Raven Gap demo.
 *
 * The James UI branch keeps its dashboard panels and local fallback engine,
 * while this hook treats the backend as the source of truth whenever it is
 * reachable. Boot and replay controls first ensure the active backend scenario
 * is `raven_gap`, then apply only Raven Gap responses so legacy Sentinel Forge
 * state never drives the demo surface.
 */
import { useEffect, useRef, useState } from "react";
import {
  getScenarios,
  selectScenario,
  startSimulation,
  stepSimulation,
  resetSimulation,
  getState,
  setCompressionEnabled as apiSetCompressionEnabled,
  setCommsDegraded as apiSetCommsDegraded,
  submitVoiceReport as apiSubmitVoiceReport,
} from "../services/api";
import { ravenGapCommsFull } from "../services/ravenGapStub";
import {
  localBoot,
  localReset,
  localStart,
  localStep,
  localToggleDegraded,
} from "../services/ravenGapEngine";
import type { Comms, Compaction, Mesh, SitrepDelta } from "../types/ravenGap";

type ScenarioOption = {
  id: string;
  name: string;
  description: string;
};

type SimulationState = {
  events: any[];
  signals: any[];
  correlation: any;
  incident: any;
  map_state: any;
  voice_report?: any;
  mesh?: Mesh;
  compactions?: Compaction[];
  sitrep_delta?: SitrepDelta | null;
  comms?: Comms;
  scenario?: ScenarioOption;
  meta?: {
    mode?: string;
    step?: number;
    status?: "idle" | "running" | "complete" | string;
  };
};

const DEFAULT_SCENARIO_ID = "raven_gap";
const DEFAULT_SCENARIO: ScenarioOption = {
  id: DEFAULT_SCENARIO_ID,
  name: "Raven Gap",
  description: "TacNet Edge platoon movement under EW degradation.",
};

const EMPTY_RAVEN_MAP_STATE = {
  mgrs_grid_anchor: {},
  phase_line: [],
  checkpoints: [],
  nais: [],
  friendly_markers: [],
  contact_markers: [],
  risk_zones: [],
  routes: [],
};

const INITIAL_STATE: SimulationState = {
  events: [],
  signals: [],
  correlation: null,
  incident: null,
  map_state: EMPTY_RAVEN_MAP_STATE,
  voice_report: null,
  comms: ravenGapCommsFull,
  meta: {
    mode: "demo",
    step: 0,
    status: "idle",
  },
};

const AUTO_STEP_MS = 900;

export function useSimulation() {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([]);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [isBusy, setIsBusy] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const stateRef = useRef<SimulationState>(INITIAL_STATE);
  const isOfflineRef = useRef(false);
  const stepInFlightRef = useRef(false);

  const setOfflineStatus = (offline: boolean) => {
    isOfflineRef.current = offline;
    setIsOffline(offline);
  };

  const applyState = (nextState: SimulationState) => {
    stateRef.current = nextState;
    setState(nextState);
  };

  const selectAndApplyRavenGap = async (source: string, retry = true) => {
    const ravenState = await selectScenario(DEFAULT_SCENARIO_ID);

    if (!isRavenGapState(ravenState)) {
      warnNonRavenResponse(source, ravenState);

      if (retry) {
        return selectAndApplyRavenGap(`${source}:retry`, false);
      }

      throw new Error("Backend did not return Raven Gap state after selection.");
    }

    setOfflineStatus(false);
    applyState(ravenState);
    return ravenState;
  };

  const applyRavenResponse = async (nextState: SimulationState, source: string) => {
    if (isRavenGapState(nextState)) {
      setOfflineStatus(false);
      applyState(nextState);
      return nextState;
    }

    warnNonRavenResponse(source, nextState);
    return selectAndApplyRavenGap(`${source}:fallback_select`);
  };

  const ensureRavenGapSelected = async () => {
    const currentScenarioId = stateRef.current?.scenario?.id;

    if (currentScenarioId === DEFAULT_SCENARIO_ID && !isOfflineRef.current) {
      return stateRef.current;
    }

    return selectAndApplyRavenGap("ensureRavenGapSelected");
  };

  const refresh = async () => {
    try {
      const data = await getState();
      return applyRavenResponse(data, "refresh");
    } catch {
      setOfflineStatus(true);
      return stateRef.current;
    }
  };

  const loadScenarios = async () => {
    try {
      const data = await getScenarios();
      setOfflineStatus(false);
      setScenarios(demoScenarios(data.scenarios));
      return data;
    } catch {
      setOfflineStatus(true);
      const fallback = { scenarios: [DEFAULT_SCENARIO] };
      setScenarios(fallback.scenarios);
      return fallback;
    }
  };

  const changeScenario = async (scenarioId: string) => {
    setIsBusy(true);
    setIsAutoRunning(false);

    try {
      try {
        const data = await selectScenario(demoScenarioId(scenarioId));
        return applyRavenResponse(data, "scenario/select");
      } catch {
        setOfflineStatus(true);
        const data = localReset() as unknown as SimulationState;
        applyState(data);
        return data;
      }
    } finally {
      setIsBusy(false);
    }
  };

  const start = async () => {
    setIsBusy(true);

    try {
      try {
        await ensureRavenGapSelected();
        const data = await startSimulation();
        const appliedState = await applyRavenResponse(data, "simulate/start");
        setIsAutoRunning(appliedState?.meta?.status === "running");
        return appliedState;
      } catch {
        setOfflineStatus(true);
        const data = localStart(stateRef.current.comms ?? ravenGapCommsFull) as unknown as SimulationState;
        applyState(data);
        setIsAutoRunning(true);
        return data;
      }
    } finally {
      setIsBusy(false);
    }
  };

  const pause = () => {
    setIsAutoRunning(false);
  };

  const step = async () => {
    if (stepInFlightRef.current) return stateRef.current;

    stepInFlightRef.current = true;
    setIsBusy(true);

    try {
      let appliedState: SimulationState;

      try {
        await ensureRavenGapSelected();
        const data = await stepSimulation();
        appliedState = await applyRavenResponse(data, "simulate/step");
      } catch {
        setOfflineStatus(true);
        appliedState = localStep(stateRef.current as never) as unknown as SimulationState;
        applyState(appliedState);
      }

      if (appliedState?.meta?.status === "complete") {
        setIsAutoRunning(false);
      }

      return appliedState;
    } finally {
      stepInFlightRef.current = false;
      setIsBusy(false);
    }
  };

  const reset = async () => {
    setIsBusy(true);

    try {
      setIsAutoRunning(false);

      try {
        await ensureRavenGapSelected();
        const data = await resetSimulation();
        return applyRavenResponse(data, "reset");
      } catch {
        setOfflineStatus(true);
        const data = localReset() as unknown as SimulationState;
        applyState(data);
        return data;
      }
    } finally {
      setIsBusy(false);
    }
  };

  const setCompressionEnabled = async (enabled: boolean) => {
    setIsBusy(true);

    try {
      await ensureRavenGapSelected();
      const data = await apiSetCompressionEnabled(enabled);
      return applyRavenResponse(data, "compression/toggle");
    } catch (error) {
      setOfflineStatus(true);
      throw error;
    } finally {
      setIsBusy(false);
    }
  };

  const submitVoiceReport = async (audioId?: string) => {
    setIsBusy(true);

    try {
      await ensureRavenGapSelected();
      const data = await apiSubmitVoiceReport(audioId);
      return applyRavenResponse(data, "voice/report");
    } catch (error) {
      setOfflineStatus(true);
      throw error;
    } finally {
      setIsBusy(false);
    }
  };

  const setCommsDegraded = async (degraded: boolean, kbps?: number) => {
    setIsBusy(true);

    try {
      await ensureRavenGapSelected();
      const data = await apiSetCommsDegraded(degraded, kbps);

      if (isBackendState(data)) {
        return applyRavenResponse(data, "comms/degrade");
      }

      setOfflineStatus(true);
      const next = localToggleDegraded(stateRef.current as never, degraded) as unknown as SimulationState;
      applyState(next);
      return next;
    } finally {
      setIsBusy(false);
    }
  };

  const toggleRun = async () => {
    if (isAutoRunning) {
      pause();
      return;
    }

    let ravenState: SimulationState;

    try {
      ravenState = await ensureRavenGapSelected();
    } catch {
      await start();
      return;
    }

    const currentStatus = ravenState?.meta?.status;

    if (currentStatus === "running") {
      setIsAutoRunning(true);
      return;
    }

    await start();
  };

  useEffect(() => {
    const boot = async () => {
      setIsBusy(true);

      try {
        await loadScenarios();

        try {
          const stateData = await getState();

          if (!isRavenGapState(stateData)) {
            warnNonRavenResponse("boot/state", stateData);
            await selectAndApplyRavenGap("boot/select");
            return;
          }

          setOfflineStatus(false);
          applyState(stateData);
        } catch {
          setOfflineStatus(true);
          applyState(localBoot() as unknown as SimulationState);
        }
      } finally {
        setIsBusy(false);
      }
    };

    boot();
  }, []);

  useEffect(() => {
    if (!isAutoRunning) return;

    const interval = window.setInterval(async () => {
      const currentStatus = stateRef.current?.meta?.status;

      if (currentStatus === "complete") {
        setIsAutoRunning(false);
        return;
      }

      await step();
    }, AUTO_STEP_MS);

    return () => window.clearInterval(interval);
  }, [isAutoRunning]);

  const systemStatus = state?.meta?.status ?? "idle";
  const isSystemRunning = systemStatus === "running";
  const selectedScenarioId = state?.scenario?.id;

  return {
    state,
    scenarios,
    selectedScenarioId,
    start,
    step,
    reset,
    toggleRun,
    changeScenario,
    toggleDegraded: setCommsDegraded,
    setCommsDegraded,
    setCompressionEnabled,
    submitVoiceReport,
    isAutoRunning,
    isSystemRunning,
    isBusy,
    isOffline,
    refresh,
  };
}

function demoScenarioId(scenarioId: string) {
  return scenarioId === DEFAULT_SCENARIO_ID ? scenarioId : DEFAULT_SCENARIO_ID;
}

function demoScenarios(scenarios: ScenarioOption[] = []) {
  const ravenScenario = scenarios.find((scenario) => scenario.id === DEFAULT_SCENARIO_ID);
  return [ravenScenario || DEFAULT_SCENARIO];
}

function isRavenGapState(state: SimulationState | null | undefined) {
  return state?.scenario?.id === DEFAULT_SCENARIO_ID;
}

function isBackendState(state: unknown): state is SimulationState {
  return Boolean(state && typeof state === "object" && "scenario" in state);
}

function warnNonRavenResponse(source: string, state: SimulationState | null | undefined) {
  console.warn(
    `[Raven Gap demo] ${source} returned non-Raven state:`,
    state?.scenario?.id || "missing scenario",
  );
}
