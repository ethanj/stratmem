/**
 * Voice report panel for the Raven Gap v3 compression-switch demo.
 *
 * This component presents the backend's deterministic voice-report contract:
 * raw audio is blocked when semantic compression is off, and the same fixture
 * becomes compact 9-line MEDEVAC metadata when compression is enabled. It performs
 * no live STT or packet simulation; all mutations are delegated to the API
 * actions supplied by `useSimulation`.
 */
import { useMemo, useState } from "react";
import "../styles/voice-report.css";

type MaybePromise<T = void> = T | Promise<T>;
type VoiceReportState = {
  audio_id?: unknown;
  status?: unknown;
  mode?: unknown;
  audio_estimated_bytes?: unknown;
  transmit_bytes?: unknown;
  fits_budget?: unknown;
  blocked_reason?: unknown;
};
type VoiceCommsState = {
  degraded?: unknown;
  source_detail_level?: unknown;
  compression_enabled?: unknown;
  kbps?: unknown;
};

type Props = {
  voiceReport?: VoiceReportState | null;
  comms?: VoiceCommsState | null;
  onSubmit: (audioId?: string) => MaybePromise;
  onCompressionChange: (enabled: boolean) => MaybePromise;
};

const DEFAULT_AUDIO_ID = "raven_gap_nine_line_1";

export default function VoiceReportPanel({
  voiceReport,
  comms,
  onSubmit,
  onCompressionChange,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compressionEnabled = Boolean(comms?.compression_enabled);
  const audioId = typeof voiceReport?.audio_id === "string" ? voiceReport.audio_id : DEFAULT_AUDIO_ID;
  const status = String(voiceReport?.status || "ready");

  const rows = useMemo(() => {
    return [
      ["STATUS", formatValue(status)],
      ["MODE", formatValue(voiceReport?.mode)],
      ["AUDIO BYTES", formatBytes(voiceReport?.audio_estimated_bytes)],
      ["TRANSMIT", formatBytes(voiceReport?.transmit_bytes)],
      ["FITS BUDGET", formatBoolean(voiceReport?.fits_budget)],
      ["BLOCKED", formatValue(voiceReport?.blocked_reason)],
      ["COMPRESSION", compressionEnabled ? "ENABLED" : "DISABLED"],
    ];
  }, [compressionEnabled, status, voiceReport]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(audioId);
    } catch (caught) {
      setError(errorMessage(caught, "Voice report submit failed."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompressionToggle = async () => {
    setIsToggling(true);
    setError(null);

    try {
      await onCompressionChange(!compressionEnabled);
    } catch (caught) {
      setError(errorMessage(caught, "Compression toggle failed."));
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className={`panel voice-report-panel ${status}`}>
      <div className="panel-header">
        <h2>VOICE REPORT</h2>
        <span>{linkLabel(comms?.kbps)}</span>
      </div>

      <div className="voice-report-body">
        <div className="voice-report-actions">
          <button
            type="button"
            className="voice-report-submit"
            onClick={handleSubmit}
            disabled={isSubmitting || isToggling}
          >
            {isSubmitting ? "SUBMITTING..." : "SUBMIT VOICE REPORT"}
          </button>

          <button
            type="button"
            className={`voice-report-toggle ${compressionEnabled ? "on" : "off"}`}
            onClick={handleCompressionToggle}
            disabled={isSubmitting || isToggling}
            aria-pressed={compressionEnabled}
          >
            {isToggling
              ? "UPDATING..."
              : compressionEnabled
                ? "COMPRESSION ON"
                : "COMPRESSION OFF"}
          </button>
        </div>

        <div className="voice-report-grid">
          {rows.map(([label, value]) => (
            <div key={label} className="voice-report-row">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        {error && <div className="voice-report-error">{error}</div>}
      </div>
    </div>
  );
}

function formatBytes(value: unknown) {
  if (typeof value !== "number") return "PENDING";

  return `${value.toLocaleString()} B`;
}

function formatBoolean(value: unknown) {
  if (value === true) return "YES";
  if (value === false) return "NO";

  return "PENDING";
}

function formatValue(value: unknown) {
  const text = String(value || "").trim();

  return text ? text.replace(/_/g, " ").toUpperCase() : "NONE";
}

function linkLabel(value: unknown) {
  if (typeof value === "number" || typeof value === "string") {
    return `${value} KBPS LINK`;
  }

  return "DEGRADED LINK";
}

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}
