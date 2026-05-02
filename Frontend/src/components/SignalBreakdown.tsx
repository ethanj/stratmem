// components/SignalBreakdown.tsx

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
    kind: "auth.failed_burst",
    label: "Failed Auth Burst",
    description: "Multiple failed admin authentication attempts observed",
    tone: "auth",
    icon: "▣",
  },
  {
    kind: "auth.anomalous_login",
    label: "Anomalous Login",
    description: "Successful login occurred from an unfamiliar source",
    tone: "anomaly",
    icon: "●",
  },
  {
    kind: "network.lateral_movement",
    label: "Lateral Movement",
    description: "Rapid access across internal nodes suggests active intrusion",
    tone: "lateral",
    icon: "⌬",
  },
  {
    kind: "identity.privilege_escalation",
    label: "Privilege Escalation",
    description: "Identity activity suggests attempted privilege escalation",
    tone: "privilege",
    icon: "✦",
  },
  {
    kind: "network.data_exfiltration",
    label: "Data Exfiltration",
    description: "Unusual outbound transfer suggests possible exfiltration",
    tone: "exfil",
    icon: "☁",
  },
  {
    kind: "physical.drone_recon",
    label: "Drone Activity",
    description: "Drone activity detected near protected perimeter",
    tone: "drone",
    icon: "⌁",
  },
  {
    kind: "osint.ais_anomaly",
    label: "AIS Anomaly",
    description: "AIS behavior indicates suspicious vessel activity",
    tone: "ais",
    icon: "◈",
  },
  {
    kind: "malware.signature",
    label: "Malware Signature",
    description: "No matching malware signatures detected",
    tone: "inactive",
    icon: "⌘",
  },
  {
    kind: "network.port_scan",
    label: "Port Scan",
    description: "No port scanning detected",
    tone: "inactive",
    icon: "⌗",
  },
  {
    kind: "network.beaconing",
    label: "Beaconing Activity",
    description: "No beaconing detected",
    tone: "inactive",
    icon: "⌁",
  },
  {
    kind: "insider.threat",
    label: "Insider Threat",
    description: "No insider threat indicators detected",
    tone: "inactive",
    icon: "◌",
  },
  {
    kind: "physical.breach",
    label: "Physical Breach",
    description: "No physical breach detected",
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
        <h2>SIGNAL BREAKDOWN</h2>
        <span className="active-count">{activeSignals.length} / 12 ACTIVE</span>
      </div>

      <div className="signal-table-head">
        <span>SIGNAL</span>
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