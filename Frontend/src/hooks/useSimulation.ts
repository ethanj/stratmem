/**
 * React state orchestrator for the backend-owned simulation contract.
 *
 * The hook owns polling-free state application, scenario selection, replay
 * controls, and v3 Raven Gap actions such as compression toggling, degraded
 * comms updates, and deterministic voice-report submission. Every backend
 * response flows through `applyState` so panels observe one consistent state
 * shape.
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
  voice_report: any;
  comms: any;
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
  comms: null,
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

  const stateRef = useRef<SimulationState>(INITIAL_STATE);
  const stepInFlightRef = useRef(false);

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
    }

    applyState(ravenState);
    return ravenState;
  };

  const applyRavenResponse = async (nextState: SimulationState, source: string) => {
    if (isRavenGapState(nextState)) {
      applyState(nextState);
      return nextState;
    }

    warnNonRavenResponse(source, nextState);
    return selectAndApplyRavenGap(`${source}:fallback_select`);
  };

  const ensureRavenGapSelected = async () => {
    if (stateRef.current?.scenario?.id === DEFAULT_SCENARIO_ID) {
      return stateRef.current;
    }

    return selectAndApplyRavenGap("ensureRavenGapSelected");
  };

  const refresh = async () => {
    const data = await getState();
    return applyRavenResponse(data, "refresh");
  };

  const loadScenarios = async () => {
    const data = await getScenarios();
    setScenarios(demoScenarios(data.scenarios));
    return data;
  };

  const changeScenario = async (scenarioId: string) => {
    setIsBusy(true);
    setIsAutoRunning(false);

    try {
      const data = await selectScenario(demoScenarioId(scenarioId));
      return applyRavenResponse(data, "scenario/select");
    } finally {
      setIsBusy(false);
    }
  };

  const start = async () => {
    setIsBusy(true);

    try {
      await ensureRavenGapSelected();
      const data = await startSimulation();
      const appliedState = await applyRavenResponse(data, "simulate/start");
      setIsAutoRunning(appliedState?.meta?.status === "running");
      return appliedState;
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
      await ensureRavenGapSelected();
      const data = await stepSimulation();
      const appliedState = await applyRavenResponse(data, "simulate/step");

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
      await ensureRavenGapSelected();
      const data = await resetSimulation();
      return applyRavenResponse(data, "reset");
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
    } finally {
      setIsBusy(false);
    }
  };

  const setCommsDegraded = async (degraded: boolean, kbps?: number) => {
    setIsBusy(true);

    try {
      await ensureRavenGapSelected();
      const data = await apiSetCommsDegraded(degraded, kbps);
      return applyRavenResponse(data, "comms/degrade");
    } finally {
      setIsBusy(false);
    }
  };

  const toggleRun = async () => {
    if (isAutoRunning) {
      pause();
      return;
    }

    const ravenState = await ensureRavenGapSelected();
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
        const stateData = await getState();

        if (stateData?.scenario?.id !== DEFAULT_SCENARIO_ID) {
          warnNonRavenResponse("boot/state", stateData);
          await selectAndApplyRavenGap("boot/select");
          return;
        }

        applyState(stateData);
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
    setCompressionEnabled,
    submitVoiceReport,
    setCommsDegraded,
    isAutoRunning,
    isSystemRunning,
    isBusy,
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

function isRavenGapState(state: SimulationState) {
  return state?.scenario?.id === DEFAULT_SCENARIO_ID;
}

function warnNonRavenResponse(source: string, state: SimulationState) {
  console.warn(
    `[Raven Gap demo] ${source} returned non-Raven state:`,
    state?.scenario?.id || "missing scenario"
  );
}
