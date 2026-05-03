// components/SignalBreakdown.tsx
// Repurposed for Raven Gap per docs/THEPLAN.md. SIGNAL_DEFINITIONS now models
// platoon-relevant indicators (Confirmed Contact, Vehicle Activity, EW
// Degradation, Mesh Partition, Sensor Trigger, ACE/PLI status, etc.) instead
// of the legacy cyber set.
//
// TODO(team-b): refine wording / icons against B's full vocabulary list when
// delivered. The `kind` keys are display-bound here (Raven Gap doesn't run
// the cyber correlation engine), so renaming them is a vocab-only change.

import "./SignalBreakdown.css";

type Signal = {
  id: string;
  kind: string;
  domain: string;
  weight?: number;
  evidence?: string[];
  label?: string;
  description?: string;
  active?: boolean;
  status?: string;
  mitigated_by?: string | null;
};

type SignalDefinition = {
  kind: string;
  label: string;
  description: string;
  tone: string;
  icon: string;
};

type Props = {
  signals?: Signal[];
  selectedSignalKind?: string | null;
  onSignalSelect?: (signal: Signal) => void;
};

const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    kind: "contact.confirmed",
    label: "Confirmed Contact",
    description: "Two or more SALUTE reports corroborate at a single NAI",
    tone: "auth-failure",
    icon: "✕",
  },
  {
    kind: "contact.suspected",
    label: "Suspected Contact",
    description: "Single source report indicates possible contact",
    tone: "anomaly",
    icon: "●",
  },
  {
    kind: "vehicle.activity",
    label: "Vehicle Activity",
    description: "UAS or sensor indicates vehicle movement near AO",
    tone: "lateral",
    icon: "▭",
  },
  {
    kind: "uas.observation",
    label: "UAS Observation",
    description: "RQ-11 spot of activity in a NAI of interest",
    tone: "drone",
    icon: "◉",
  },
  {
    kind: "sensor.trigger",
    label: "Sensor Trigger",
    description: "OP/LP ground sensor S7 motion trigger",
    tone: "privilege",
    icon: "✦",
  },
  {
    kind: "ew.degradation",
    label: "EW Degradation",
    description: "SATCOM denied or radio intermittent; mesh on LoRa fallback",
    tone: "exfil",
    icon: "⌁",
  },
  {
    kind: "mesh.partition",
    label: "Mesh Partition",
    description: "Mesh leaf unreachable from PL for > 60s",
    tone: "ais",
    icon: "◈",
  },
  {
    kind: "ace.amber",
    label: "ACE Amber/Red",
    description: "ACE/LACE report indicates ammo, casualty, or equipment shortfall",
    tone: "inactive",
    icon: "◐",
  },
  {
    kind: "pli.stale",
    label: "Stale PLI",
    description: "Position-location-info gap exceeds threshold",
    tone: "inactive",
    icon: "◌",
  },
  {
    kind: "comms.loss",
    label: "Comms Loss",
    description: "Specific unit unreachable; mesh routes around it",
    tone: "inactive",
    icon: "⌗",
  },
  {
    kind: "indirect.fire",
    label: "Indirect Fire",
    description: "Pattern indicates incoming or registered indirect fire",
    tone: "inactive",
    icon: "✷",
  },
  {
    kind: "perimeter.breach",
    label: "Perimeter Breach",
    description: "Friendly perimeter or OP/LP picket line broken",
    tone: "inactive",
    icon: "◇",
  },
];

export default function SignalBreakdown({
  signals,
  selectedSignalKind,
  onSignalSelect,
}: Props) {
  const activeSignals = Array.isArray(signals) ? signals : [];
  const activeByKind = new Map(activeSignals.map((signal) => [signal.kind, signal]));

  const rows = SIGNAL_DEFINITIONS.map((definition) => {
    const activeSignal = activeByKind.get(definition.kind);

    if (activeSignal) {
      return {
        definition,
        signal: activeSignal,
        active: true,
      };
    }

    return {
      definition,
      signal: {
        id: `inactive-${definition.kind}`,
        kind: definition.kind,
        domain: "unknown",
        evidence: [],
        label: definition.label,
        description: definition.description,
        active: false,
      } satisfies Signal,
      active: false,
    };
  });

  return (
    <div className="panel signal-panel">
      <div className="panel-header">
        <h2>TACNET INDICATORS</h2>
        <span className="active-count">{activeSignals.length} / 12 ACTIVE</span>
      </div>

      <div className="signal-table-head">
        <span>INDICATOR</span>
        <span>STATUS</span>
        <span>EVIDENCE</span>
      </div>

      <div className="signal-list">
        {rows.map(({ definition, signal, active }) => {
          const evidenceCount = signal.evidence?.length || 0;
          const width = active
            ? Math.min(100, Math.max(12, evidenceCount * 28))
            : 0;

          const selected = selectedSignalKind === signal.kind;

          return (
            <button
              key={definition.kind}
              type="button"
              className={[
                "signal-row",
                active ? "active" : "inactive",
                active ? definition.tone : "inactive",
                selected ? "selected" : "",
              ].join(" ")}
              onClick={() => {
                if ((active || signal.status === "mitigated") && onSignalSelect) {
                  onSignalSelect(signal);
                }
              }}
              disabled={!active && signal.status !== "mitigated"}
              title={
                active
                  ? `Show ${definition.label} evidence in Event Stream`
                  : `${definition.label} inactive`
              }
            >
              <div className="signal-icon">{definition.icon}</div>

              <div className="signal-main">
                <strong>{definition.label}</strong>
                <span>{signal.description || definition.description}</span>
              </div>

              <div className="signal-status">
                {String(signal.status || (active ? "ACTIVE" : "INACTIVE")).toUpperCase()}
              </div>

              <div className="signal-evidence">
                <span>{evidenceCount}</span>
                <div className="evidence-bar">
                  <div style={{ width: `${width}%` }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}