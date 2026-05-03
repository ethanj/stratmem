/**
 * Dashboard top command bar for replay controls and comms status.
 *
 * This branch is Raven Gap demo-only on the frontend. The optional scenario
 * selector therefore displays Raven Gap as the sole selectable option, while
 * the selected id itself still comes from backend-applied simulation state.
 */
import { useEffect, useMemo, useState } from "react";
import "../styles/topbar.css";
import DegradedCommsToggle from "./DegradedCommsToggle";
import type { Comms, Compaction, RavenGapEvent } from "../types/ravenGap";

type MaybePromise<T = unknown> = T | Promise<T>;

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

  /** Raven Gap EW-degraded controls. */
  comms?: Comms;
  events?: RavenGapEvent[];
  compactions?: Compaction[];
  onToggleDegraded?: (degraded: boolean) => void | Promise<unknown>;
  /** Hide the scenario selector dropdown for the Raven Gap demo. */
  showScenarioSelector?: boolean;
  /** True when the local Raven Gap engine is driving (no backend). */
  isOffline?: boolean;
};

const DEFAULT_SCENARIO_ID = "raven_gap";
const FALLBACK_SCENARIOS: ScenarioOption[] = [
  {
    id: DEFAULT_SCENARIO_ID,
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
  comms,
  events,
  compactions,
  onToggleDegraded,
  showScenarioSelector = false,
  isOffline = false,
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

  const demoScenarioOptions = useMemo(() => {
    return scenarioOptionsForDemo(scenarios);
  }, [scenarios]);

  const selectedScenario = useMemo(() => {
    return (
      demoScenarioOptions.find((scenario) => scenario.id === selectedScenarioId) ||
      demoScenarioOptions[0] ||
      FALLBACK_SCENARIOS[0]
    );
  }, [demoScenarioOptions, selectedScenarioId]);

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
    const nextScenarioId = demoScenarioId(event.target.value);

    setStartedAt(Date.now());

    if (onScenarioChange) {
      await onScenarioChange(nextScenarioId);
    }
  };

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">♜</div>

        <div>
          <h1>TACNET EDGE</h1>
          <p>Tactical Mesh Compaction &amp; Commander Decision Layer</p>
        </div>
      </div>

      <div className="topbar-controls">
        <button
          type="button"
          className={`control-btn start ${isAutoRunning ? "active" : ""}`}
          onClick={handleRunToggle}
          disabled={isBusy && !isAutoRunning}
        >
          {isAutoRunning ? "Ⅱ PAUSE" : "▶ REPLAY SCENARIO"}
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
        {isOffline && (
          <span
            className="topbar-mock-pill"
            title="Backend unreachable; local Raven Gap engine driving the demo"
          >
            MOCK
          </span>
        )}
      </div>

      {onToggleDegraded && (
        <DegradedCommsToggle
          comms={comms}
          events={events}
          compactions={compactions}
          onChange={onToggleDegraded}
          disabled={isBusy}
        />
      )}

      {showScenarioSelector && (
        <div className="scenario-box">
          <span>SCENARIO</span>

          <select
            className="scenario-select"
            value={selectedScenario.id}
            onChange={handleScenarioChange}
            disabled={isBusy || isAutoRunning}
            title={selectedScenario.description || selectedScenario.name}
          >
            {demoScenarioOptions.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="time-box">
        <span>TIME</span>
        <strong>{utcTime}</strong>
        <small>{utcDate}</small>
      </div>
    </header>
  );
}

function demoScenarioId(scenarioId: string) {
  return scenarioId === DEFAULT_SCENARIO_ID ? scenarioId : DEFAULT_SCENARIO_ID;
}

function scenarioOptionsForDemo(scenarios: ScenarioOption[]) {
  const ravenScenario = scenarios.find((scenario) => scenario.id === DEFAULT_SCENARIO_ID);
  return [ravenScenario || FALLBACK_SCENARIOS[0]];
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
