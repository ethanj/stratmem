/**
 * @file SitrepDeltaPanel — render `state.sitrep_delta.what_changed`.
 *
 * Sits beneath IncidentCard in the right rail. Each bullet flags what is new
 * since the prior SITREP so the commander knows where to look first.
 */

import "./SitrepDeltaPanel.css";
import type { SitrepDelta } from "../types/ravenGap";

type Props = {
  delta?: SitrepDelta | null;
};

export default function SitrepDeltaPanel({ delta }: Props) {
  const items = Array.isArray(delta?.what_changed) ? delta!.what_changed : [];

  return (
    <div className="panel sitrep-delta-panel">
      <div className="panel-header">
        <h2>SITREP DELTA</h2>
        <span className="sitrep-delta-meta">
          {delta?.since_id ? `since ${delta.since_id}` : "live"}
        </span>
      </div>

      <div className="sitrep-delta-body">
        {items.length === 0 ? (
          <div className="sitrep-delta-empty">No change since last SITREP.</div>
        ) : (
          <ul className="sitrep-delta-list">
            {items.map((line, idx) => (
              <li key={idx} className="sitrep-delta-item">
                <span className="sitrep-delta-badge">NEW</span>
                <span className="sitrep-delta-text">{line}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
