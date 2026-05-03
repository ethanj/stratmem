/**
 * @file DegradedCommsToggle — EW-degraded toggle + bandwidth meter.
 *
 * Demo-script hero beat (1:35-1:55): operator flips the toggle, the link
 * shrinks to 3 KBPS, raw source traffic blows the budget (red), but the
 * compacted feed fits (green). Compression ratio is the punch line.
 */

import "../styles/degraded.css";
import type { Comms } from "../types/ravenGap";

type Props = {
  comms?: Comms;
  onChange: (degraded: boolean) => void | Promise<unknown>;
  disabled?: boolean;
};

export default function DegradedCommsToggle({ comms, onChange, disabled = false }: Props) {
  const degraded = Boolean(comms?.degraded);
  const kbps = comms?.kbps ?? 3;
  const rawBytes = comms?.raw_bytes ?? 0;
  const compactedBytes = comms?.compacted_bytes ?? 0;
  const budgetBytes = comms?.budget_bytes ?? null;
  const ratio = comms?.compression_ratio ?? null;
  const fitsBudget = comms?.fits_budget ?? true;

  const rawOverBudget = budgetBytes !== null && rawBytes > budgetBytes;
  const compactedFits = budgetBytes === null ? true : compactedBytes <= budgetBytes;

  return (
    <div className={`degraded-toggle ${degraded ? "on" : "off"}`}>
      <div className="degraded-toggle-row">
        <button
          type="button"
          className={`degraded-switch ${degraded ? "on" : "off"}`}
          onClick={() => onChange(!degraded)}
          disabled={disabled}
          aria-pressed={degraded}
          aria-label={degraded ? "Disable EW degraded mode" : "Enable EW degraded mode"}
        >
          <span className="degraded-switch-knob" />
        </button>

        <span className="degraded-label">
          EW DEGRADED
        </span>

        <span className={`degraded-link ${degraded ? "on" : "off"}`}>
          {degraded ? `${kbps} KBPS DEGRADED LINK` : "FULL LINK"}
        </span>
      </div>

      {degraded && (
        <div className="degraded-meter">
          <div className={`degraded-meter-row ${rawOverBudget ? "over" : ""}`}>
            <span className="degraded-meter-label">RAW</span>
            <span className="degraded-meter-value">{rawBytes.toLocaleString()} B</span>
            <span className="degraded-meter-vs">
              {rawOverBudget ? ">" : "≤"} BUDGET
            </span>
            <span className="degraded-meter-budget">
              {budgetBytes !== null ? `${budgetBytes.toLocaleString()} B` : "—"}
            </span>
          </div>

          <div className={`degraded-meter-row ${compactedFits ? "fits" : "over"}`}>
            <span className="degraded-meter-label">COMPACTED</span>
            <span className="degraded-meter-value">{compactedBytes.toLocaleString()} B</span>
            <span className="degraded-meter-vs">{compactedFits ? "FITS" : "OVER"}</span>
            <span className="degraded-meter-budget">
              {budgetBytes !== null ? `${budgetBytes.toLocaleString()} B` : "—"}
            </span>
          </div>

          {ratio !== null && (
            <div className="degraded-meter-ratio">
              <span>COMPRESSION</span>
              <strong>{ratio.toFixed(2)}×</strong>
              <span className={fitsBudget ? "ok" : "warn"}>
                {fitsBudget ? "PICTURE PRESERVED" : "OVERFLOW"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
