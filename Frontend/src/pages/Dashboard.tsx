// pages/Dashboard.tsx
import { useState } from "react";

import TopBar from "../components/TopBar";
import LogStream from "../components/LogStream";
import SignalBreakdown from "../components/SignalBreakdown";
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

/**
 * Dashboard layout follows docs/THEPLAN.md "what done looks like":
 *   "the four-panel command picture (mesh tree top, source-report feed left,
 *    map center, SITREP+delta right) holds the final state for the
 *    post-pitch photo."
 *
 * Plus a bottom compaction timeline strip and a small aside for
 * SignalBreakdown / AssetStatus.
 */
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
    isOffline,
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
        events={state.events}
        compactions={state.compactions}
        onToggleDegraded={toggleDegraded}
        isOffline={isOffline}
      />

      <main className="dashboard-grid raven-gap">
        <section className="dashboard-area mesh-area">
          <MeshTree mesh={state.mesh} events={state.events} />
        </section>

        <section className="dashboard-area feed-area">
          <LogStream
            events={state.events}
            focusedEventIds={focusedSignal?.evidenceIds ?? []}
            focusToken={focusedSignal?.token ?? 0}
          />
        </section>

        <section className="dashboard-area map-area">
          <MapView map={state.map_state} />
        </section>

        <section className="dashboard-area sitrep-area">
          <IncidentCard
            incident={state.incident}
            correlation={state.correlation}
            onIncidentUpdated={refresh}
            onEvidenceClick={openEvidence}
          />
          <SitrepDeltaPanel delta={state.sitrep_delta} />
        </section>

        <section className="dashboard-area signals-area">
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

        <section className="dashboard-area timeline-area">
          <CompactionTimeline
            compactions={state.compactions}
            events={state.events}
            onEvidenceClick={openEvidence}
          />
        </section>

        <section className="dashboard-area aside-area">
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
