// hooks/useSimulation.ts
import { useEffect, useRef, useState } from "react";
import {
  getScenarios,
  selectScenario,
  startSimulation,
  stepSimulation,
  resetSimulation,
  getState,
  setCommsDegraded,
} from "../services/api";
import { mergeRavenGapStub, ravenGapCommsFull } from "../services/ravenGapStub";
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

const INITIAL_STATE: SimulationState = {
  events: [],
  signals: [],
  correlation: null,
  incident: null,
  map_state: null,
  comms: ravenGapCommsFull,
  scenario: {
    id: "raven_gap",
    name: "Raven Gap",
    description: "Platoon under EW degradation.",
  },
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
  const [isBusy, setIsBusy] = useState(false);
  /**
   * True when the most recent backend call failed and we fell back to the
   * local Raven Gap engine. Surfaced in TopBar as a "MOCK" pill so you can
   * tell at-a-glance whether the demo is driven by the real backend or the
   * local stub.
   */
  const [isOffline, setIsOffline] = useState(false);

  const stateRef = useRef<SimulationState>(INITIAL_STATE);
  const stepInFlightRef = useRef(false);

  const applyState = (nextState: SimulationState) => {
    const merged = mergeRavenGapStub(nextState) as SimulationState;
    stateRef.current = merged;
    setState(merged);
  };

  const refresh = async () => {
    try {
      const data = await getState();
      setIsOffline(false);
      applyState(data);
      return data;
    } catch {
      setIsOffline(true);
      return stateRef.current;
    }
  };

  const loadScenarios = async () => {
    try {
      const data = await getScenarios();
      setIsOffline(false);
      setScenarios(data.scenarios || []);
      return data;
    } catch {
      setIsOffline(true);
      const fallback = [
        {
          id: "raven_gap",
          name: "Raven Gap",
          description: "Platoon under EW degradation (local engine).",
        },
      ];
      setScenarios(fallback);
      return { scenarios: fallback };
    }
  };

  const changeScenario = async (scenarioId: string) => {
    setIsBusy(true);
    setIsAutoRunning(false);

    try {
      try {
        const data = await selectScenario(scenarioId);
        setIsOffline(false);
        applyState(data);
        return data;
      } catch {
        setIsOffline(true);
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
        const data = await startSimulation();
        setIsOffline(false);
        applyState(data);
        setIsAutoRunning(true);
        return data;
      } catch {
        setIsOffline(true);
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
      let data: SimulationState;
      try {
        data = await stepSimulation();
        setIsOffline(false);
      } catch {
        setIsOffline(true);
        data = localStep(stateRef.current as never) as unknown as SimulationState;
      }
      applyState(data);

      if (data?.meta?.status === "complete") {
        setIsAutoRunning(false);
      }

      return data;
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
        const data = await resetSimulation();
        setIsOffline(false);
        applyState(data);
        return data;
      } catch {
        setIsOffline(true);
        const data = localReset() as unknown as SimulationState;
        applyState(data);
        return data;
      }
    } finally {
      setIsBusy(false);
    }
  };

  const toggleRun = async () => {
    if (isAutoRunning) {
      pause();
      return;
    }

    const currentStatus = stateRef.current?.meta?.status;

    if (currentStatus === "running") {
      setIsAutoRunning(true);
      return;
    }

    await start();
  };

  const toggleDegraded = async (degraded: boolean) => {
    setIsBusy(true);
    try {
      const data = await setCommsDegraded(degraded);
      const current = stateRef.current;

      // setCommsDegraded falls back to a local stub when the endpoint 404s,
      // which only carries `comms`. If we have local-engine state (no
      // backend at all), apply the comms swap on top of the current step.
      if (data && typeof data === "object" && "events" in data) {
        setIsOffline(false);
        applyState(data as SimulationState);
      } else {
        setIsOffline(true);
        const next = localToggleDegraded(current as never, degraded) as unknown as SimulationState;
        applyState(next);
      }
      return stateRef.current;
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    const boot = async () => {
      setIsBusy(true);

      try {
        await loadScenarios();

        // Prefer raven_gap when the backend has it. If the call fails
        // (no backend, scenario not registered), drop to the local engine
        // so the demo still runs end-to-end.
        try {
          const data = await selectScenario("raven_gap");
          applyState(data);
        } catch {
          try {
            await refresh();
            // refresh swallows backend errors silently; if state is still
            // the empty INITIAL_STATE, hand off to local boot.
            if ((stateRef.current?.events?.length ?? 0) === 0) {
              applyState(localBoot() as unknown as SimulationState);
            }
          } catch {
            applyState(localBoot() as unknown as SimulationState);
          }
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
  const selectedScenarioId = state?.scenario?.id ?? "raven_gap";

  return {
    state,
    scenarios,
    selectedScenarioId,
    start,
    step,
    reset,
    toggleRun,
    changeScenario,
    toggleDegraded,
    isAutoRunning,
    isSystemRunning,
    isBusy,
    isOffline,
    refresh,
  };
}
