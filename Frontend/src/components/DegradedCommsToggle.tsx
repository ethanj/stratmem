/**
 * @file DegradedCommsToggle — EW-degraded toggle + bandwidth meter.
 *
 * Demo-script hero beat (1:35-1:55): operator flips the toggle, the link
 * shrinks to 3 KBPS, raw source traffic blows the budget (red), but the
 * compacted feed fits (green). Compression ratio is the punch line.
 *
 * Per docs/THEPLAN.md, backend ships only `comms.{degraded, source_detail_level}`.
 * Bandwidth metrics (raw_bytes / compacted_bytes / budget / ratio) are
 * computed here from `events` and `compactions` so we don't need A to wire
 * byte counters. Kbps and window are display constants.
 */

import { useMemo } from "react";
import "./DegradedCommsToggle.css";
import type { BandwidthMeter, Comms, Compaction, RavenGapEvent } from "../types/ravenGap";

type Props = {
  comms?: Comms;
  events?: RavenGapEvent[];
  compactions?: Compaction[];
  onChange: (degraded: boolean) => void | Promise<unknown>;
  disabled?: boolean;
  /** Display-only link rate. Default 3 kbps for the Raven Gap demo. */
  kbps?: number;
  /** Sliding window in seconds. Default 10s per THEPLAN. */
  windowSec?: number;
};

export default function DegradedCommsToggle({
  comms,
  events = [],
  compactions = [],
  onChange,
  disabled = false,
  kbps = 3,
  windowSec = 10,
}: Props) {
  const degraded = Boolean(comms?.degraded);

  const meter = useMemo<BandwidthMeter>(() => {
    const budget = Math.round((kbps * 1000 * windowSec) / 8);
    const rawBytes = events.reduce((sum, evt) => {
      const message = typeof evt?.message === "string" ? evt.message : "";
      return sum + byteLength(message);
    }, 0);
    const compactedBytes = compactions.reduce((sum, row) => {
      return sum + byteLength(row?.summary || "");
    }, 0);
    const ratio = compactedBytes > 0
      ? Number((rawBytes / compactedBytes).toFixed(2))
      : null;
    return {
      kbps,
      window_sec: windowSec,
      budget_bytes: budget,
      raw_bytes: rawBytes,
      compacted_bytes: compactedBytes,
      compression_ratio: ratio,
      fits_budget: compactedBytes <= budget,
    };
  }, [events, compactions, kbps, windowSec]);

  const rawOverBudget = meter.raw_bytes > meter.budget_bytes;
  const compactedFits = meter.compacted_bytes <= meter.budget_bytes;

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
          {degraded ? `${meter.kbps} KBPS DEGRADED LINK` : "FULL LINK"}
        </span>
      </div>

      {degraded && (
        <div className="degraded-meter">
          <div className={`degraded-meter-row ${rawOverBudget ? "over" : ""}`}>
            <span className="degraded-meter-label">RAW</span>
            <span className="degraded-meter-value">{meter.raw_bytes.toLocaleString()} B</span>
            <span className="degraded-meter-vs">
              {rawOverBudget ? ">" : "≤"} BUDGET
            </span>
            <span className="degraded-meter-budget">
              {meter.budget_bytes.toLocaleString()} B
            </span>
          </div>

          <div className={`degraded-meter-row ${compactedFits ? "fits" : "over"}`}>
            <span className="degraded-meter-label">COMPACTED</span>
            <span className="degraded-meter-value">{meter.compacted_bytes.toLocaleString()} B</span>
            <span className="degraded-meter-vs">{compactedFits ? "FITS" : "OVER"}</span>
            <span className="degraded-meter-budget">
              {meter.budget_bytes.toLocaleString()} B
            </span>
          </div>

          {meter.compression_ratio !== null && (
            <div className="degraded-meter-ratio">
              <span>COMPRESSION</span>
              <strong>{meter.compression_ratio.toFixed(2)}×</strong>
              <span className={meter.fits_budget ? "ok" : "warn"}>
                {meter.fits_budget ? "PICTURE PRESERVED" : "OVERFLOW"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Approximate byte length of a UTF-8 string. The exact byte count would need
 * TextEncoder; for the bandwidth meter, a quick proxy that counts
 * non-ASCII as 2 bytes is plenty accurate for demo display.
 */
function byteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes += code > 0x7f ? 2 : 1;
  }
  return bytes;
}
