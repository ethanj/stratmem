// pages/Dashboard.tsx
import { useState } from "react";

import TopBar from "../components/TopBar";
import LogStream from "../components/LogStream";
import SignalBreakdown from "../components/SignalBreakdown";
import CorrelationScore from "../components/CorrelationScore";
import IncidentCard from "../components/IncidentCard";
import MapView from "../components/MapView";
import AssetStatus from "../components/AssetStatus";

import { useSimulation } from "../hooks/useSimulation";

type FocusedSignal = {
  kind: string;
  evidenceIds: string[];
  token: number;
} | null;

export default function Dashboard() {
  const {
    state,
    scenarios,
    selectedScenarioId,
    step,
    reset,
    toggleRun,
    changeScenario,
    isAutoRunning,
    isSystemRunning,
    isBusy,
    refresh,
  } = useSimulation();

  const [focusedSignal, setFocusedSignal] = useState<FocusedSignal>(null);

  const handleScenarioChange = async (scenarioId: string) => {
    setFocusedSignal(null);
    await changeScenario(scenarioId);
  };

  const handleReset = async () => {
    setFocusedSignal(null);
    await reset();
  };

  return (
    <div className="dashboard-shell">
      <TopBar
        onRunToggle={toggleRun}
        onStep={step}
        onReset={handleReset}
        isAutoRunning={isAutoRunning}
        isSystemRunning={isSystemRunning}
        isBusy={isBusy}
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onScenarioChange={handleScenarioChange}
      />

      <main className="dashboard-grid">
        <section className="dashboard-area event-area">
          <LogStream
            events={state.events}
            focusedEventIds={focusedSignal?.evidenceIds ?? []}
            focusToken={focusedSignal?.token ?? 0}
          />
        </section>

        <section className="dashboard-area signal-area">
          <SignalBreakdown
            signals={state.signals}
            selectedSignalKind={focusedSignal?.kind ?? null}
            onSignalSelect={(signal) => {
              setFocusedSignal((current) => {
                if (current?.kind === signal.kind) {
                  return null;
                }

                return {
                  kind: signal.kind,
                  evidenceIds: signal.evidence ?? [],
                  token: Date.now(),
                };
              });
            }}
          />
        </section>

        <section className="dashboard-area right-top-area">
          <CorrelationScore correlation={state.correlation} />

          <IncidentCard
            incident={state.incident}
            correlation={state.correlation}
            onIncidentUpdated={refresh}
          />
        </section>

        <section className="dashboard-area map-area">
          <MapView map={state.map_state} />
        </section>

        <section className="dashboard-area asset-area">
          <AssetStatus assets={state.map_state?.assets} />
        </section>
      </main>
    </div>
  );
}
