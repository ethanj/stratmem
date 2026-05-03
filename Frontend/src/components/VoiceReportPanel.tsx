/**
 * Voice report panel for the Raven Gap v3 compression-switch demo.
 *
 * This component merges sender-side voice compression and receiver-side binary
 * decode into one operator flow: raw audio fails the constrained link, semantic
 * compression fits, and the receiver reconstructs the 9-line CASEVAC message.
 */
import { useMemo, useState } from "react";
import { decodeReceiverDemoFrame } from "../services/api";
import type { ReceiverDecodeEvent } from "../types/ravenGap";
import "../styles/voice-report.css";

type MaybePromise<T = void> = T | Promise<T>;
type VoiceReportState = {
  audio_id?: unknown;
  status?: unknown;
  mode?: unknown;
  audio_estimated_bytes?: unknown;
  json_bytes?: unknown;
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
  receiverEvents?: ReceiverDecodeEvent[];
  onSubmit: (audioId?: string) => MaybePromise;
  onCompressionChange: (enabled: boolean) => MaybePromise;
  onDecoded?: (event: ReceiverDecodeEvent) => MaybePromise;
};

const DEFAULT_AUDIO_ID = "raven_gap_nine_line_1";
const LINK_BUDGET_BYTES = 3750;

export default function VoiceReportPanel({
  voiceReport,
  comms,
  receiverEvents = [],
  onSubmit,
  onCompressionChange,
  onDecoded,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localEvents, setLocalEvents] = useState<ReceiverDecodeEvent[]>([]);

  const compressionEnabled = Boolean(comms?.compression_enabled);
  const audioId = typeof voiceReport?.audio_id === "string" ? voiceReport.audio_id : DEFAULT_AUDIO_ID;
  const status = String(voiceReport?.status || "ready");
  const visibleEvents = localEvents.length > 0 ? localEvents : receiverEvents;
  const latest = visibleEvents[0];
  const receiveStatus = latest?.verified ? "RECEIVED / VERIFIED" : "AWAITING FRAME";

  const rows = useMemo(() => {
    return [
      ["STATUS", formatValue(status)],
      ["LINK BUDGET", formatBytes(LINK_BUDGET_BYTES)],
      ["RAW AUDIO", formatBytes(voiceReport?.audio_estimated_bytes)],
      ["METADATA", formatBytes(voiceReport?.json_bytes)],
      ["TRANSMIT", formatTransmit(voiceReport, latest)],
      ["FITS BUDGET", formatBoolean(voiceReport?.fits_budget)],
      ["RECEIVER", receiveStatus],
      ["RATIO", receiverRatio(latest, voiceReport)],
      ["COMPRESSION", compressionEnabled ? "ENABLED" : "DISABLED"],
    ];
  }, [compressionEnabled, latest, receiveStatus, status, voiceReport]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(audioId);
      if (compressionEnabled) {
        const event = await decodeReceiverDemoFrame();
        setLocalEvents((current) => [event, ...current]);
        await onDecoded?.(event);
      }
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
        <h2>VOICE LINK</h2>
        <span>{compressionEnabled ? "SEMANTIC COMPRESSED" : "RAW AUDIO PATH"}</span>
      </div>

      <div className="voice-report-body">
        <div className={`voice-link-story ${compressionEnabled ? "enabled" : "blocked"}`}>
          <strong>{compressionEnabled ? "Compressed 9-line will fit and decode." : "Raw 9-line audio exceeds the link budget."}</strong>
          <span>3 Kbps / 10 sec link budget: {LINK_BUDGET_BYTES.toLocaleString()} B</span>
        </div>

        <div className="voice-report-actions">
          <button
            type="button"
            className="voice-report-submit"
            onClick={handleSubmit}
            disabled={isSubmitting || isToggling}
          >
            {isSubmitting ? "TRANSMITTING..." : "SEND 9-LINE"}
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

        <ReceiverSummary event={latest} />

        {error && <div className="voice-report-error">{error}</div>}
      </div>
    </div>
  );
}

function ReceiverSummary({ event }: { event?: ReceiverDecodeEvent }) {
  const rows = metadataEntries(event);

  return (
    <div className="voice-receiver">
      <div className="voice-receiver-summary">
        {event?.reconstructed_text || "Receiver has no decoded 9-line frame yet."}
      </div>

      <div className="voice-receiver-metadata">
        {rows.length > 0 ? rows.map(([label, value]) => (
          <div key={label} className="voice-receiver-row">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        )) : (
          <div className="voice-receiver-empty">Decoded metadata appears after compressed send.</div>
        )}
      </div>
    </div>
  );
}

function metadataEntries(event?: ReceiverDecodeEvent): [string, string][] {
  if (!event?.metadata) return [];
  return Object.entries(event.metadata)
    .filter(([, value]) => value !== "" && value != null)
    .map(([key, value]) => [key.replace(/_/g, " ").toUpperCase(), metadataValue(value)]);
}

function metadataValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function formatTransmit(
  voiceReport?: VoiceReportState | null,
  event?: ReceiverDecodeEvent,
) {
  if (event) return `${event.byte_count.toLocaleString()} B BINARY`;
  return formatBytes(voiceReport?.transmit_bytes);
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

function receiverRatio(
  event?: ReceiverDecodeEvent,
  voiceReport?: VoiceReportState | null,
) {
  if (typeof event?.compression?.ratio === "number") {
    return `${event.compression.ratio.toFixed(1)}x`;
  }

  const rawBytes = voiceReport?.audio_estimated_bytes;
  const transmitBytes = voiceReport?.transmit_bytes;
  if (typeof rawBytes === "number" && typeof transmitBytes === "number" && transmitBytes > 0) {
    return `${(rawBytes / transmitBytes).toFixed(1)}x`;
  }

  return "PENDING";
}

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}
