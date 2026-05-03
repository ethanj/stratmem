// pages/Dashboard.tsx
import { useState } from "react";
import "./Dashboard.css";

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
import VoiceReportPanel from "../components/VoiceReportPanel";
import ReceiverDecodePanel from "../components/ReceiverDecodePanel";
import TacticalEntityDrawer from "../components/map/TacticalEntityDrawer";

import { useSimulation } from "../hooks/useSimulation";
import type {
  Compaction,
  MapState,
  Mesh,
  RavenGapEvent,
  ReceiverDecodeEvent,
  SitrepDelta,
  TacticalEntity,
} from "../types/ravenGap";

type FocusedSignal = {
  kind: string;
  evidenceIds: string[];
  token: number;
} | null;

type OverlayKey = "reports" | "mesh" | "sitrep" | "timeline" | "voice" | "receiver" | "assets" | "signals";
type SignalRows = Parameters<typeof SignalBreakdown>[0]["signals"];
type SignalLike = NonNullable<SignalRows>[number];
type AssetRows = Parameters<typeof AssetStatus>[0]["assets"];
type VoiceReportProps = Parameters<typeof VoiceReportPanel>[0];
type DashboardState = {
  events?: RavenGapEvent[];
  signals?: SignalRows;
  correlation?: unknown;
  incident?: unknown;
  map_state?: MapState;
  voice_report?: VoiceReportProps["voiceReport"];
  mesh?: Mesh;
  compactions?: Compaction[];
  sitrep_delta?: SitrepDelta | null;
  comms?: VoiceReportProps["comms"];
};

const OVERLAY_TABS: { key: OverlayKey; label: string }[] = [
  { key: "reports", label: "REPORTS" },
  { key: "mesh", label: "MESH" },
  { key: "sitrep", label: "SITREP" },
  { key: "timeline", label: "TIMELINE" },
  { key: "voice", label: "VOICE" },
  { key: "receiver", label: "RX" },
  { key: "assets", label: "ASSETS" },
  { key: "signals", label: "INDICATORS" },
];

/**
 * Dashboard layout for the S2 readiness demo.
 *
 * The primary view is map-first, with selected-unit readiness in the right rail
 * and supporting reports, mesh, SITREP, receiver, and voice controls hidden in
 * operator-opened overlay tabs.
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
    setCompressionEnabled,
    submitVoiceReport,
    isAutoRunning,
    isSystemRunning,
    isBusy,
    isOffline,
    refresh,
  } = useSimulation();

  const [focusedSignal, setFocusedSignal] = useState<FocusedSignal>(null);
  const [drawerIds, setDrawerIds] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>("plt-raven");
  const [expandedEntityIds, setExpandedEntityIds] = useState<string[]>([]);
  const [openOverlay, setOpenOverlay] = useState<OverlayKey | null>(null);
  const receiverEvents = (state as { receiver_events?: ReceiverDecodeEvent[] }).receiver_events;
  const entities = (state.map_state?.entities || []) as TacticalEntity[];
  const selectedEntity = selectedEntityId
    ? entities.find((entity) => entity.id === selectedEntityId) || null
    : null;
  const parentEntity = selectedEntity?.parent_id
    ? entities.find((entity) => entity.id === selectedEntity.parent_id) || null
    : null;
  const rosterChildren = selectedEntity ? childEntities(entities, selectedEntity.id) : [];
  const rosterExpanded = selectedEntity ? expandedEntityIds.includes(selectedEntity.id) : false;

  const handleScenarioChange = async (scenarioId: string) => {
    setFocusedSignal(null);
    await changeScenario(scenarioId);
  };

  const handleReset = async () => {
    setFocusedSignal(null);
    setDrawerOpen(false);
    setDrawerIds([]);
    setSelectedEntityId("plt-raven");
    setExpandedEntityIds([]);
    setOpenOverlay(null);
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

  const expandEntity = (entity: TacticalEntity) => {
    setExpandedEntityIds((current) => (
      current.includes(entity.id) ? current : [...current, entity.id]
    ));
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
        <section className="dashboard-area map-area">
          <MapView
            map={state.map_state}
            selectedEntityId={selectedEntityId}
            expandedEntityIds={expandedEntityIds}
            onSelectEntity={setSelectedEntityId}
          />
          <OverlayTabs openOverlay={openOverlay} onToggle={setOpenOverlay} />
          <OverlayPanel
            openOverlay={openOverlay}
            state={state}
            focusedSignal={focusedSignal}
            receiverEvents={receiverEvents}
            openEvidence={openEvidence}
            refresh={refresh}
            setFocusedSignal={setFocusedSignal}
            submitVoiceReport={submitVoiceReport}
            setCompressionEnabled={setCompressionEnabled}
            onClose={() => setOpenOverlay(null)}
          />
        </section>

        <section className="dashboard-area readiness-area">
          {selectedEntity ? (
            <TacticalEntityDrawer
              entity={selectedEntity}
              roster={rosterChildren}
              rosterExpanded={rosterExpanded}
              parentLabel={parentEntity?.label}
              onBack={parentEntity ? () => setSelectedEntityId(parentEntity.id) : undefined}
              onClose={() => setSelectedEntityId(null)}
              onExpandParent={expandEntity}
              onSelectEntity={setSelectedEntityId}
            />
          ) : (
            <div className="readiness-empty panel">
              <span>READINESS</span>
              <strong>SELECT SYMBOL</strong>
              <p>Click a platoon, squad, soldier, asset, or contact for detail.</p>
            </div>
          )}
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

function OverlayTabs({
  openOverlay,
  onToggle,
}: {
  openOverlay: OverlayKey | null;
  onToggle: (key: OverlayKey | null) => void;
}) {
  return (
    <nav className="overlay-tabs" aria-label="Dashboard overlays">
      {OVERLAY_TABS.map((tab) => (
        <button
          type="button"
          key={tab.key}
          className={openOverlay === tab.key ? "active" : ""}
          onClick={() => onToggle(openOverlay === tab.key ? null : tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function OverlayPanel(props: {
  openOverlay: OverlayKey | null;
  state: DashboardState;
  focusedSignal: FocusedSignal;
  receiverEvents?: ReceiverDecodeEvent[];
  openEvidence: (ids: string[]) => void;
  refresh: () => Promise<unknown>;
  setFocusedSignal: (signal: FocusedSignal | ((current: FocusedSignal) => FocusedSignal)) => void;
  submitVoiceReport: (audioId?: string) => Promise<unknown>;
  setCompressionEnabled: (enabled: boolean) => Promise<unknown>;
  onClose: () => void;
}) {
  if (!props.openOverlay) return null;

  return (
    <section className={`overlay-panel ${props.openOverlay}`}>
      <header>
        <strong>{overlayTitle(props.openOverlay)}</strong>
        <button type="button" onClick={props.onClose}>CLOSE</button>
      </header>
      <div className="overlay-panel-body">
        {overlayContent(props)}
      </div>
    </section>
  );
}

function overlayContent(props: Parameters<typeof OverlayPanel>[0]) {
  const { state, focusedSignal } = props;

  if (props.openOverlay === "reports") {
    return <LogStream events={state.events ?? []} focusedEventIds={focusedSignal?.evidenceIds ?? []} focusToken={focusedSignal?.token ?? 0} />;
  }
  if (props.openOverlay === "mesh") {
    return <MeshTree mesh={state.mesh} events={state.events} />;
  }
  if (props.openOverlay === "sitrep") {
    return (
      <>
        <IncidentCard incident={state.incident} correlation={state.correlation} onIncidentUpdated={props.refresh} onEvidenceClick={props.openEvidence} />
        <SitrepDeltaPanel delta={state.sitrep_delta} />
      </>
    );
  }
  if (props.openOverlay === "timeline") {
    return <CompactionTimeline compactions={state.compactions} events={state.events ?? []} onEvidenceClick={props.openEvidence} />;
  }
  if (props.openOverlay === "voice") {
    return (
      <VoiceReportPanel
        voiceReport={state.voice_report}
        comms={state.comms}
        onSubmit={async (audioId) => { await props.submitVoiceReport(audioId); }}
        onCompressionChange={async (enabled) => { await props.setCompressionEnabled(enabled); }}
      />
    );
  }
  if (props.openOverlay === "receiver") {
    return <ReceiverDecodePanel events={props.receiverEvents} onDecoded={async () => { await props.refresh(); }} />;
  }
  if (props.openOverlay === "assets") {
    return <AssetStatus assets={assetRows(state.map_state?.assets)} />;
  }
  return (
    <SignalBreakdown
      signals={state.signals}
      selectedSignalKind={focusedSignal?.kind ?? null}
      onSignalSelect={(signal) => props.setFocusedSignal(signalSelection(signal, focusedSignal))}
    />
  );
}

function signalSelection(signal: SignalLike, current: FocusedSignal): FocusedSignal {
  if (current?.kind === signal.kind) return null;
  return { kind: signal.kind, evidenceIds: signal.evidence ?? [], token: Date.now() };
}

function overlayTitle(key: OverlayKey) {
  return OVERLAY_TABS.find((tab) => tab.key === key)?.label || key.toUpperCase();
}

function childEntities(entities: TacticalEntity[], parentId: string) {
  return entities.filter((entity) => entity.parent_id === parentId);
}

function assetRows(value: unknown): AssetRows {
  return Array.isArray(value) ? value as AssetRows : undefined;
}
