/**
 * @file EvidenceDrawer — slide-in side panel showing the source events tied
 * to a clicked SITREP evidence line or compaction row.
 *
 * Filters `events` by the supplied `ids` (preserves the order of `ids`).
 * Renders raw callsign, MGRS, unit_label, and message so the operator can
 * trace any commander-facing line back to its source traffic.
 */

import { useEffect } from "react";
import "../styles/evidence.css";
import type { RavenGapEvent } from "../types/ravenGap";

type Props = {
  events?: RavenGapEvent[];
  ids?: string[];
  open: boolean;
  onClose: () => void;
};

export default function EvidenceDrawer({ events = [], ids = [], open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const eventById = new Map<string, RavenGapEvent>();
  for (const evt of events) {
    if (evt?.id) eventById.set(evt.id, evt);
  }

  const matched = ids
    .map((id) => eventById.get(id))
    .filter((evt): evt is RavenGapEvent => Boolean(evt));

  return (
    <div className="evidence-drawer-root" role="dialog" aria-modal="true" aria-label="Evidence drawer">
      <div className="evidence-drawer-backdrop" onClick={onClose} />

      <aside className={`evidence-drawer ${open ? "open" : ""}`}>
        <header className="evidence-drawer-header">
          <div>
            <h2>EVIDENCE</h2>
            <span>
              {matched.length} of {ids.length} source {ids.length === 1 ? "report" : "reports"}
            </span>
          </div>
          <button
            type="button"
            className="evidence-drawer-close"
            onClick={onClose}
            aria-label="Close evidence drawer"
          >
            ×
          </button>
        </header>

        <div className="evidence-drawer-list">
          {matched.length === 0 ? (
            <div className="evidence-drawer-empty">
              No matching events for ids: {ids.join(", ")}
            </div>
          ) : (
            matched.map((evt) => (
              <article key={evt.id} className={`evidence-row severity-${String(evt.severity || "low").toLowerCase()}`}>
                <header>
                  <span className="evidence-id">{evt.id}</span>
                  <span className="evidence-source">{evt.source || evt.metadata?.unit_label || "—"}</span>
                  <span className="evidence-time">
                    {evt.timestamp ? formatTime(evt.timestamp) : "--:--:--"}
                  </span>
                </header>

                <p className="evidence-message">{evt.message}</p>

                <dl className="evidence-meta">
                  {evt.metadata?.report_type && (
                    <>
                      <dt>TYPE</dt>
                      <dd>{String(evt.metadata.report_type).toUpperCase()}</dd>
                    </>
                  )}
                  {evt.metadata?.unit_label && (
                    <>
                      <dt>UNIT</dt>
                      <dd>{evt.metadata.unit_label}</dd>
                    </>
                  )}
                  {evt.metadata?.mgrs && (
                    <>
                      <dt>MGRS</dt>
                      <dd className="mono">{evt.metadata.mgrs}</dd>
                    </>
                  )}
                  {evt.geospatial && (
                    <>
                      <dt>LAT/LON</dt>
                      <dd className="mono">
                        {Number(evt.geospatial.lat).toFixed(4)}, {Number(evt.geospatial.lon).toFixed(4)}
                      </dd>
                    </>
                  )}
                </dl>
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
