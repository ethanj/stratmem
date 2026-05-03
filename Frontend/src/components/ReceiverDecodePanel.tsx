/**
 * S2 receiver panel for decoded TacNet semantic frames.
 *
 * The panel shows what the receiver recovers from compressed binary: checksum
 * state, byte savings, metadata fields, and reconstructed operational text.
 */
import { useMemo, useState } from "react";
import { decodeReceiverDemoFrame } from "../services/api";
import type { ReceiverDecodeEvent } from "../types/ravenGap";
import "../styles/receiver-decode.css";

type Props = {
  events?: ReceiverDecodeEvent[];
};

export default function ReceiverDecodePanel({ events = [] }: Props) {
  const [isDecoding, setIsDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localEvents, setLocalEvents] = useState<ReceiverDecodeEvent[]>([]);
  const visibleEvents = localEvents.length > 0 ? localEvents : events;
  const latest = visibleEvents[0];
  const metadataRows = useMemo(() => metadataEntries(latest), [latest]);

  const handleDecode = async () => {
    setIsDecoding(true);
    setError(null);

    try {
      const event = await decodeReceiverDemoFrame();
      setLocalEvents((current) => [event, ...current]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Receiver decode failed.");
    } finally {
      setIsDecoding(false);
    }
  };

  return (
    <div className="panel receiver-decode-panel">
      <div className="panel-header">
        <h2>S2 RECEIVER</h2>
        <span>{latest ? statusLabel(latest) : "AWAITING FRAME"}</span>
      </div>

      <div className="receiver-decode-body">
        <button
          type="button"
          className="receiver-decode-button"
          onClick={handleDecode}
          disabled={isDecoding}
        >
          {isDecoding ? "DECODING..." : "DECODE DEMO FRAME"}
        </button>

        <div className="receiver-summary">
          {latest?.reconstructed_text || "No receiver frame decoded yet."}
        </div>

        <div className="receiver-decode-grid">
          {summaryRows(latest).map(([label, value]) => (
            <div key={label} className="receiver-decode-row">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="receiver-metadata">
          {metadataRows.length > 0 ? (
            metadataRows.map(([label, value]) => (
              <div key={label} className="receiver-metadata-row">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))
          ) : (
            <div className="receiver-metadata-empty">Decoded metadata will appear here.</div>
          )}
        </div>

        {error && <div className="receiver-decode-error">{error}</div>}
      </div>
    </div>
  );
}

function summaryRows(event?: ReceiverDecodeEvent): [string, string][] {
  return [
    ["VERIFIED", event?.verified ? "YES" : event ? "NO" : "PENDING"],
    ["FRAME", event?.frame_type?.toUpperCase() || "NONE"],
    ["BINARY", event ? `${event.byte_count.toLocaleString()} B` : "PENDING"],
    ["RAW AUDIO", bytes(event?.compression?.raw_audio_estimated_bytes)],
    ["RATIO", ratio(event?.compression?.ratio)],
    ["SEQUENCE", event?.sequence == null ? "PENDING" : String(event.sequence)],
  ];
}

function metadataEntries(event?: ReceiverDecodeEvent): [string, string][] {
  if (!event?.metadata) return [];
  return Object.entries(event.metadata)
    .filter(([, value]) => value !== "" && value != null)
    .map(([key, value]) => [key.replace(/_/g, " ").toUpperCase(), metadataValue(value)]);
}

function metadataValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
}

function statusLabel(event: ReceiverDecodeEvent) {
  return event.verified ? "VERIFIED" : "CHECKSUM FAIL";
}

function bytes(value?: number) {
  return typeof value === "number" ? `${value.toLocaleString()} B` : "PENDING";
}

function ratio(value?: number | null) {
  return typeof value === "number" ? `${value.toFixed(1)}x` : "PENDING";
}
