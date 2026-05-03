// pages/Dashboard.tsx
import { useState } from "react";

import TopBar from "../components/TopBar";
import LogStream from "../components/LogStream";
import SignalBreakdown from "../components/SignalBreakdown";
import CorrelationScore from "../components/CorrelationScore";
import IncidentCard from "../components/IncidentCard";
import MapView from "../components/MapView";
import AssetStatus from "../components/AssetStatus";
import MeshTree from "../components/MeshTree";
import CompactionTimeline from "../components/CompactionTimeline";
import SitrepDeltaPanel from "../components/SitrepDeltaPanel";
import EvidenceDrawer from "../components/EvidenceDrawer";

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
    toggleDegraded,
    isAutoRunning,
    isSystemRunning,
    isBusy,
    refresh,
  } = useSimulation();

  const [focusedSignal, setFocusedSignal] = useState<FocusedSignal>(null);
  const [drawerIds, setDrawerIds] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleScenarioChange = async (scenarioId: string) => {
    setFocusedSignal(null);
    await changeScenario(scenarioId);
  };

  const handleReset = async () => {
    setFocusedSignal(null);
    setDrawerOpen(false);
    setDrawerIds([]);
    await reset();
  };

  const openEvidence = (ids: string[]) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    setDrawerIds(ids);
    setDrawerOpen(true);
    setFocusedSignal({
      kind: "evidence",
      evidenceIds: ids,
      token: Date.now(),
    });
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
        comms={state.comms}
        onToggleDegraded={toggleDegraded}
      />

      <main className="dashboard-grid">
        <section className="dashboard-area event-area">
          <div className="event-area-stack">
            <MeshTree mesh={state.mesh} events={state.events} />
            <LogStream
              events={state.events}
              focusedEventIds={focusedSignal?.evidenceIds ?? []}
              focusToken={focusedSignal?.token ?? 0}
            />
          </div>
        </section>

        <section className="dashboard-area signal-area">
          <div className="signal-area-stack">
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
            <CompactionTimeline
              compactions={state.compactions}
              events={state.events}
              onEvidenceClick={openEvidence}
            />
          </div>
        </section>

        <section className="dashboard-area right-top-area">
          <CorrelationScore correlation={state.correlation} />

          <IncidentCard
            incident={state.incident}
            correlation={state.correlation}
            onIncidentUpdated={refresh}
            onEvidenceClick={openEvidence}
          />

          <SitrepDeltaPanel delta={state.sitrep_delta} />
        </section>

        <section className="dashboard-area map-area">
          <MapView map={state.map_state} />
        </section>

        <section className="dashboard-area asset-area">
          <AssetStatus assets={state.map_state?.assets} />
        </section>
      </main>

      <EvidenceDrawer
        events={state.events}
        ids={drawerIds}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
