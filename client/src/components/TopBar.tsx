// components/TopBar.tsx
import { useEffect, useMemo, useState } from "react";
import "../styles/topbar.css";

type MaybePromise<T = void> = T | Promise<T>;

export type ScenarioOption = {
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

const FALLBACK_SCENARIOS: ScenarioOption[] = [
  {
    id: "coordinated_intrusion",
    name: "Coordinated Intrusion",
    description:
      "Cyber, physical, and OSINT indicators converge into a coordinated intrusion pattern.",
  },
  {
    id: "cyber_breach",
    name: "Cyber-Only Breach",
    description:
      "Unauthorized access escalates into lateral movement, privilege escalation, and exfiltration.",
  },
  {
    id: "physical_perimeter",
    name: "Physical Perimeter Threat",
    description:
      "Drone and maritime anomalies indicate a developing perimeter threat.",
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
  selectedScenarioId = "coordinated_intrusion",
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

  const selectedScenario = useMemo(() => {
    return (
      scenarios.find((scenario) => scenario.id === selectedScenarioId) ||
      scenarios[0] ||
      FALLBACK_SCENARIOS[0]
    );
  }, [scenarios, selectedScenarioId]);

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
      await onScenarioChange(nextScenarioId);
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
          {scenarios.map((scenario) => (
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