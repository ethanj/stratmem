// components/IncidentCard.tsx
import { useEffect, useMemo, useState } from "react";
import { analyzeIncident, resolveIncident, updateIncidentAction } from "../services/api";
import "../styles/incident.css";

type AnalystOutput = {
  assessment: string;
  priority: string;
  threat_summary: string;
  why_it_matters: string;
  next_steps: string[];
  operator_note: string;
  confidence_rationale: string;
  decision_window: string;
  provider: string;
};

type Props = {
  incident: any;
  correlation?: any;
  onIncidentUpdated?: () => Promise<any>;
};

export default function IncidentCard({ incident, correlation, onIncidentUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [analyst, setAnalyst] = useState<AnalystOutput | null>(null);
  const [analystLoading, setAnalystLoading] = useState(false);
  const [analystError, setAnalystError] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  const analystContextKey = useMemo(() => {
    if (!incident || !correlation) return "no-active-context";

    const signalKinds = Array.isArray(correlation?.signals)
      ? correlation.signals
          .map((signal: any) => signal?.kind || "")
          .filter(Boolean)
          .sort()
          .join("|")
      : "";

    const evidenceCount = Array.isArray(correlation?.signals)
      ? correlation.signals.reduce((total: number, signal: any) => {
          return total + (Array.isArray(signal?.evidence) ? signal.evidence.length : 0);
        }, 0)
      : 0;

    const actions = Array.isArray(incident?.recommended_actions)
      ? incident.recommended_actions.join("|")
      : "";

    return [
      incident.type,
      incident.severity,
      Number(incident.confidence || 0).toFixed(2),
      Number(correlation?.confidence || 0).toFixed(2),
      correlation?.level || "low",
      evidenceCount,
      signalKinds,
      actions,
    ].join("::");
  }, [
    incident?.type,
    incident?.severity,
    incident?.confidence,
    incident?.recommended_actions,
    correlation?.confidence,
    correlation?.level,
    correlation?.signals,
  ]);

  useEffect(() => {
    setAnalyst(null);
    setAnalystError(null);
    setAnalystLoading(false);
  }, [analystContextKey]);


  if (!incident) {
    return (
      <div className="panel incident-panel empty">
        <div className="panel-header">
          <h2>INCIDENT ASSESSMENT</h2>
        </div>

        <div className="incident-empty-body">
          <h3>No active incident</h3>
          <p>System is monitoring incoming signals.</p>
        </div>
      </div>
    );
  }

  const riskPercent = Math.round(((incident.active_risk ?? incident.confidence) || 0) * 100);
  const detectionPercent = Math.round(((incident.detection_confidence ?? incident.confidence) || 0) * 100);
  const severity = String(incident.severity || "low").toLowerCase();
  const incidentStatus = String(incident.status || "active").replaceAll("_", " ").toUpperCase();

  const keyFactors = Array.isArray(incident.why) ? incident.why : [];

  const recommendedActions = Array.isArray(incident.recommended_actions)
    ? incident.recommended_actions
    : [];
  const incidentActionStatus =
    incident && typeof incident.operator_actions === "object"
      ? incident.operator_actions
      : completedActions;
  const totalActions = recommendedActions.length;
  const completedCount = recommendedActions.filter(
    (action: string) => incidentActionStatus[action],
  ).length;
  const progressPercent = totalActions
    ? Math.round((completedCount / totalActions) * 100)
    : 0;

  const contributingSignals = Array.isArray(incident.signals)
    ? incident.signals
    : [];


  const resolutionReady = Boolean(incident.resolution_ready);

  const handleResolveIncident = async () => {
    if (!incident?.id || !resolutionReady) return;
    try {
      await resolveIncident({ incident_id: incident.id });
      if (onIncidentUpdated) await onIncidentUpdated();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAskAnalyst = async () => {
    if (!incident || !correlation) {
      setAnalystError("No active incident context is available for analyst review.");
      return;
    }

    setAnalystLoading(true);
    setAnalystError(null);

    try {
      const response = await analyzeIncident({
        incident,
        correlation,
      });

      setAnalyst(response.agent);
    } catch (error) {
      console.error(error);
      setAnalystError("Analyst request failed. Confirm the API server is running.");
    } finally {
      setAnalystLoading(false);
    }
  };

  const analystButtonLabel = analystLoading
    ? "ANALYZING..."
    : analyst
      ? "REFRESH ANALYST"
      : "ASK ANALYST";

  const handleActionToggle = async (action: string) => {
    if (!incident?.id) return;

    const next = {
      ...completedActions,
      [action]: !incidentActionStatus[action],
    };

    setCompletedActions(next);

    try {
      await updateIncidentAction({
        incident_id: incident.id,
        action,
        completed: Boolean(next[action]),
      });

      if (onIncidentUpdated) {
        await onIncidentUpdated();
      }
    } catch (error) {
      console.error(error);
      setCompletedActions((current) => ({
        ...current,
        [action]: Boolean(incidentActionStatus[action]),
      }));
    }
  };

  return (
    <>
      <button
        type="button"
        className={`panel incident-panel incident-clickable ${severity}`}
        onClick={() => setOpen(true)}
      >
        <div className="panel-header">
          <h2>INCIDENT ASSESSMENT</h2>
          <span className="incident-status">STATUS: {incidentStatus}</span>
        </div>

        <div className="incident-hero">
          <div className="alert-icon">⚠</div>

          <div className="incident-main">
            <h3>
              {severity.toUpperCase()} —{" "}
              {String(incident.type || "Incident").toUpperCase()}
            </h3>
            <p>{incident.summary}</p>
          </div>

          <div className="incident-confidence">
            <span>CURRENT RISK</span>
            <strong>{riskPercent}%</strong>
          </div>
        </div>

        <div className="incident-details">
          <section>
            <h4>KEY FACTORS</h4>
            <ul>
              {keyFactors.map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4>RECOMMENDED ACTIONS</h4>
            <div className="incident-actions-progress-inline">
              <span>{completedCount}/{totalActions} completed</span>
              <span>{progressPercent}%</span>
            </div>
            <ul>
              {recommendedActions.map((item: string, index: number) => (
                <li key={index} className={incidentActionStatus[item] ? "action-completed" : ""}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </button>

      {open && (
        <div
          className="incident-modal-backdrop"
          onClick={() => setOpen(false)}
        >
          <div
            className={`incident-modal ${severity}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="incident-modal-header">
              <div>
                <span>INCIDENT ID: {incident.id}</span>
                <h2>
                  {severity.toUpperCase()} —{" "}
                  {String(incident.type || "Incident").toUpperCase()}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close incident modal"
              >
                ×
              </button>
            </div>

            <div className="incident-modal-body">
              <section className="incident-modal-summary">
                <p>{incident.summary}</p>

                <div className="incident-modal-confidence">
                  <span>DETECTION CONFIDENCE</span>
                  <strong>{detectionPercent}%</strong>
                </div>
              </section>

              <section className="incident-modal-grid">
                <div className="incident-modal-card">
                  <h4>KEY FACTORS</h4>
                  <ul>
                    {keyFactors.map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="incident-modal-card">
                  <h4>RECOMMENDED ACTIONS</h4>
                  <div className="incident-actions-progress">
                    <span>
                      Action completion: {completedCount}/{totalActions} completed
                    </span>
                    <div className="incident-actions-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                      <div className="incident-actions-progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                  <ul className="incident-action-checklist">
                    {recommendedActions.map((item: string, index: number) => (
                      <li key={index} className={incidentActionStatus[item] ? "action-completed" : ""}>
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(incidentActionStatus[item])}
                            onChange={() => handleActionToggle(item)}
                          />
                          <span>{item}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="incident-modal-card">
                  <h4>CONTRIBUTING SIGNALS</h4>
                  <ul>
                    {contributingSignals.map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="incident-modal-card">
                  <h4>OPERATOR SUMMARY</h4>
                  <p>
                    {incident.narrative ||
                      "Sentinel Forge correlated the available signals into a staged threat assessment. The current classification reflects signal confidence, domain coverage, and escalation pattern."}
                  </p>
                </div>

                
                <div className="incident-modal-card">
                  <h4>RESOLUTION CONTROL</h4>
                  <button type="button" onClick={handleResolveIncident} disabled={!resolutionReady || incident.status === "resolved"}>
                    {incident.status === "resolved" ? "RESOLVED" : (resolutionReady ? "MARK RESOLVED" : "RESOLUTION BLOCKED")}
                  </button>
                  {!resolutionReady && incident.status !== "resolved" && (
                    <p>Resolution blocked: active risk remains elevated.</p>
                  )}
                </div>

                <div className="incident-modal-card">
                  <h4>INCIDENT ACTION REPORT</h4>
                  <p>
                    {incident?.operator_report?.summary ||
                      "No operator action report available yet for this incident."}
                  </p>
                </div>
              </section>

              <section className="analyst-panel">
                <div className="analyst-panel-header">
                  <div>
                    <h4>SENTINEL ANALYST</h4>
                    <p>
                      Operator-invoked decision support. AI does not block
                      real-time detection.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="analyst-btn"
                    onClick={handleAskAnalyst}
                    disabled={analystLoading}
                  >
                    {analystButtonLabel}
                  </button>
                </div>

                {analystError && (
                  <div className="analyst-error">{analystError}</div>
                )}

                {analystLoading && (
                  <div className="analyst-loading">
                    Sentinel Analyst is reviewing the current fused incident context...
                  </div>
                )}

                {!analyst && !analystLoading && !analystError && (
                  <div className="analyst-placeholder">
                    Analyst output will appear here after operator request.
                  </div>
                )}

                {analyst && (
                  <div className="analyst-output">
                    <div className="analyst-meta">
                      <span>PROVIDER: {analyst.provider}</span>
                      <span>PRIORITY: {analyst.priority}</span>
                      <span>WINDOW: {analyst.decision_window}</span>
                    </div>

                    <h5>{analyst.assessment}</h5>

                    <p>
                      <strong>Threat summary:</strong> {analyst.threat_summary}
                    </p>

                    <p>
                      <strong>Why it matters:</strong> {analyst.why_it_matters}
                    </p>

                    <p>
                      <strong>Operator note:</strong> {analyst.operator_note}
                    </p>

                    <p>
                      <strong>Confidence rationale:</strong>{" "}
                      {analyst.confidence_rationale}
                    </p>

                    <div>
                      <strong>Next steps:</strong>
                      <ul>
                        {analyst.next_steps?.map((step: string, index: number) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
