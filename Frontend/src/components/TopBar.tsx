/**
 * Top-level control bar for the Raven Gap demo console.
 *
 * This component owns the visible replay controls, runtime clock, scenario
 * selector, and UTC time readout. On the v3 demo branch it intentionally
 * narrows scenario display to Raven Gap so legacy Sentinel Forge scenarios do
 * not surface in the operator UI while backend defaults remain unchanged.
 */
import { useEffect, useMemo, useState } from "react";
import "../styles/topbar.css";

type MaybePromise<T = void> = T | Promise<T>;

type ScenarioOption = {
  id: string;
  name: string;
  description?: string;
};

type Props = {
  onRunToggle: () => MaybePromise;
  onStep: () => MaybePromise;
  onReset: () => MaybePromise;
  isAutoRunning: boolean;
  isSystemRunning: boolean;
  isBusy?: boolean;

  scenarios?: ScenarioOption[];
  selectedScenarioId?: string;
  onScenarioChange?: (scenarioId: string) => MaybePromise;
};

const DEMO_SCENARIO_ID = "raven_gap";

const FALLBACK_SCENARIOS: ScenarioOption[] = [
  {
    id: DEMO_SCENARIO_ID,
    name: "Raven Gap",
    description: "TacNet Edge platoon movement under EW degradation.",
  },
];

export default function TopBar({
  onRunToggle,
  onStep,
  onReset,
  isAutoRunning,
  isSystemRunning,
  isBusy = false,
  scenarios = FALLBACK_SCENARIOS,
  selectedScenarioId,
  onScenarioChange,
}: Props) {
  const [now, setNow] = useState(() => new Date());
  const [startedAt, setStartedAt] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const runtime = useMemo(() => {
    const elapsedMs = Math.max(0, now.getTime() - startedAt);
    return formatDuration(elapsedMs);
  }, [now, startedAt]);

  const utcTime = useMemo(() => {
    return `${now.toISOString().slice(11, 19)} Z`;
  }, [now]);

  const utcDate = useMemo(() => {
    return now.toISOString().slice(0, 10).toUpperCase();
  }, [now]);

  const demoScenarios = useMemo(() => {
    const ravenScenario = scenarios.find(
      (scenario) => scenario.id === DEMO_SCENARIO_ID
    );

    return [ravenScenario || FALLBACK_SCENARIOS[0]];
  }, [scenarios]);

  const selectedScenario = useMemo(() => {
    return (
      demoScenarios.find((scenario) => scenario.id === selectedScenarioId) ||
      demoScenarios[0]
    );
  }, [demoScenarios, selectedScenarioId]);

  const handleRunToggle = async () => {
    if (!isAutoRunning) {
      setStartedAt(Date.now());
    }

    await onRunToggle();
  };

  const handleStep = async () => {
    await onStep();
  };

  const handleReset = async () => {
    setStartedAt(Date.now());
    await onReset();
  };

  const handleScenarioChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const nextScenarioId = event.target.value;

    setStartedAt(Date.now());

    if (onScenarioChange) {
      await onScenarioChange(
        nextScenarioId === DEMO_SCENARIO_ID ? nextScenarioId : DEMO_SCENARIO_ID
      );
    }
  };

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">♜</div>

        <div>
          <h1>SENTINEL FORGE</h1>
          <p>Multi-Domain Threat Fusion &amp; Decision Engine</p>
        </div>
      </div>

      <div className="topbar-controls">
        <button
          type="button"
          className={`control-btn start ${isAutoRunning ? "active" : ""}`}
          onClick={handleRunToggle}
          disabled={isBusy && !isAutoRunning}
        >
          {isAutoRunning ? "Ⅱ PAUSE" : "▶ START"}
        </button>

        <button
          type="button"
          className="control-btn"
          onClick={handleStep}
          disabled={isBusy || isAutoRunning}
        >
          » STEP
        </button>

        <button
          type="button"
          className="control-btn"
          onClick={handleReset}
          disabled={isBusy}
        >
          ↻ RESET
        </button>
      </div>

      <div className="runtime-status">
        <span className={`live-dot ${isSystemRunning ? "active" : ""}`} />
        <strong>{isSystemRunning ? "LIVE" : "READY"}</strong>
        <span className="runtime-clock">{runtime}</span>
      </div>

      <div className="scenario-box">
        <span>SCENARIO</span>

        <select
          className="scenario-select"
          value={selectedScenario.id}
          onChange={handleScenarioChange}
          disabled={isBusy || isAutoRunning}
          title={selectedScenario.description || selectedScenario.name}
        >
          {demoScenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
      </div>

      <div className="time-box">
        <span>TIME</span>
        <strong>{utcTime}</strong>
        <small>{utcDate}</small>
      </div>
    </header>
  );
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}
