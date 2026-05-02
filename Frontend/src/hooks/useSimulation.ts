// hooks/useSimulation.ts
import { useEffect, useRef, useState } from "react";
import {
  getScenarios,
  selectScenario,
  startSimulation,
  stepSimulation,
  resetSimulation,
  getState,
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
  scenario: {
    id: "coordinated_intrusion",
    name: "Coordinated Intrusion",
    description: "Cyber, physical, and OSINT indicators converge.",
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

  const stateRef = useRef<SimulationState>(INITIAL_STATE);
  const stepInFlightRef = useRef(false);

  const applyState = (nextState: SimulationState) => {
    stateRef.current = nextState;
    setState(nextState);
  };

  const refresh = async () => {
    const data = await getState();
    applyState(data);
    return data;
  };

  const loadScenarios = async () => {
    const data = await getScenarios();
    setScenarios(data.scenarios || []);
    return data;
  };

  const changeScenario = async (scenarioId: string) => {
    setIsBusy(true);
    setIsAutoRunning(false);

    try {
      const data = await selectScenario(scenarioId);
      applyState(data);
      return data;
    } finally {
      setIsBusy(false);
    }
  };

  const start = async () => {
    setIsBusy(true);

    try {
      const data = await startSimulation();
      applyState(data);
      setIsAutoRunning(true);
      return data;
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
      const data = await stepSimulation();
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
      const data = await resetSimulation();
      applyState(data);
      return data;
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

  useEffect(() => {
    const boot = async () => {
      setIsBusy(true);

      try {
        await Promise.all([refresh(), loadScenarios()]);
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
  const selectedScenarioId = state?.scenario?.id ?? "coordinated_intrusion";

  return {
    state,
    scenarios,
    selectedScenarioId,
    start,
    step,
    reset,
    toggleRun,
    changeScenario,
    isAutoRunning,
    isSystemRunning,
    isBusy,
    refresh,
  };
}
