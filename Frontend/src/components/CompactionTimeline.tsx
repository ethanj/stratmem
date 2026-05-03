/**
 * @file CompactionTimeline — render `state.compactions[]` rows.
 *
 * Each row is a squad-level summary; expanding the row lists the source
 * event ids that rolled into it. Clicking either the summary or a source-id
 * chip emits the row's `source_event_ids` via `onEvidenceClick` so the
 * Dashboard can open the EvidenceDrawer / highlight rows in LogStream.
 */

import { useState } from "react";
import "../styles/compaction.css";
import type { Compaction, RavenGapEvent } from "../types/ravenGap";

type Props = {
  compactions?: Compaction[];
  events?: RavenGapEvent[];
  onEvidenceClick?: (ids: string[]) => void;
};

export default function CompactionTimeline({
  compactions = [],
  events = [],
  onEvidenceClick,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const eventById = new Map<string, RavenGapEvent>();
  for (const evt of events) {
    if (evt?.id) eventById.set(evt.id, evt);
  }

  const sorted = [...compactions].sort((a, b) => a.t_compacted_sec - b.t_compacted_sec);

  return (
    <div className="panel compaction-panel">
      <div className="panel-header">
        <h2>COMPACTION TIMELINE</h2>
        <span className="compaction-count">
          {sorted.length} {sorted.length === 1 ? "SUMMARY" : "SUMMARIES"}
        </span>
      </div>

      <div className="compaction-list">
        {sorted.length === 0 ? (
          <div className="compaction-empty">
            <strong>No compactions yet</strong>
            <span>Source reports will collapse into squad summaries here.</span>
          </div>
        ) : (
          sorted.map((row) => {
            const isOpen = openId === row.id;
            const sourceCount = row.source_event_ids.length;
            return (
              <div key={row.id} className={`compaction-row ${isOpen ? "open" : ""}`}>
                <button
                  type="button"
                  className="compaction-summary"
                  onClick={() => {
                    setOpenId(isOpen ? null : row.id);
                    onEvidenceClick?.(row.source_event_ids);
                  }}
                  title="Click to surface source events"
                >
                  <div className="compaction-summary-head">
                    <span className="compaction-squad">
                      {row.label || row.squad_id}
                    </span>
                    <span className="compaction-meta">
                      t+{row.t_compacted_sec}s · {sourceCount} src
                    </span>
                  </div>
                  <p className="compaction-summary-text">{row.summary}</p>
                </button>

                {isOpen && (
                  <div className="compaction-sources">
                    {row.source_event_ids.map((id) => {
                      const evt = eventById.get(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          className="compaction-source-chip"
                          onClick={() => onEvidenceClick?.([id])}
                          title={evt?.message || id}
                        >
                          <span className="compaction-source-id">{id}</span>
                          {evt?.source && (
                            <span className="compaction-source-callsign">
                              {evt.source}
                            </span>
                          )}
                          {evt?.message && (
                            <span className="compaction-source-message">
                              {evt.message}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
