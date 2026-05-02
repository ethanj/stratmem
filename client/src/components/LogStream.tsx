// components/LogStream.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/logstream.css";

type FeedFilter = "all" | "ops" | "anomalies" | "threats" | "incidents";

type Props = {
  events: any[];
  focusedEventIds?: string[];
  focusToken?: number;
};

const FEED_FILTERS: { value: FeedFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ops", label: "Ops" },
  { value: "anomalies", label: "Anomalies" },
  { value: "threats", label: "Threats" },
  { value: "incidents", label: "Incidents" },
];

function formatTime(timestamp: string) {
  if (!timestamp) return "--:--:--";

  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sourceType(source: string) {
  const value = String(source || "").toUpperCase();

  if (value.includes("AUTH")) return "AUTH";
  if (value.includes("EDR")) return "EDR";
  if (value.includes("UAS")) return "UAS";
  if (value.includes("AIS")) return "AIS";
  if (value.includes("SIEM")) return "SIEM";
  if (value.includes("DEFENDER")) return "MDE";
  if (value.includes("NET")) return "NET";
  if (value.includes("FUSION")) return "FUSION";

  return "SYS";
}

function eventTone(event: any) {
  const type = String(event?.type || "").toLowerCase();
  const severity = String(event?.severity || "unknown").toLowerCase();

  const isTelemetry =
    type.includes("heartbeat") ||
    type.includes("health") ||
    type.includes("telemetry") ||
    type.startsWith("adapter.") ||
    type.startsWith("sensor.heartbeat") ||
    event?.metadata?.background === true;

  if (isTelemetry) return "telemetry";

  if (type === "auth.failed") return "auth-failure";

  if (type === "auth.success") {
    const unfamiliar =
      event?.metadata?.unfamiliar_ip === true ||
      event?.metadata?.known_source === false;

    return unfamiliar ? "anomaly" : "normal";
  }

  if (type === "node.access") {
    return event?.metadata?.rapid_sequence === true ? "lateral" : "normal";
  }

  if (type === "network.lateral") return "lateral";
  if (type === "identity.privilege_escalation") return "privilege";
  if (type === "network.exfiltration") return "exfil";
  if (type === "physical.drone") return "drone";
  if (type === "osint.ais_anomaly") return "ais";

  if (severity === "critical" || severity === "high") return "auth-failure";
  if (severity === "medium") return "anomaly";
  if (severity === "low") return "normal";

  return "unknown";
}

function eventClassLabel(event: any) {
  const tone = eventTone(event);

  if (tone === "telemetry") return "TELEMETRY";
  if (tone === "auth-failure") return "THREAT";
  if (tone === "anomaly") return "ANOMALY";
  if (tone === "lateral") return "LATERAL";
  if (tone === "privilege") return "PRIVILEGE";
  if (tone === "exfil") return "EXFIL";
  if (tone === "drone") return "DRONE";
  if (tone === "ais") return "AIS";
  if (tone === "normal") return "NORMAL";

  return "EVENT";
}

function eventFilterClass(event: any): FeedFilter {
  const source = sourceType(event?.source);
  const type = String(event?.type || "").toLowerCase();
  const severity = String(event?.severity || "unknown").toLowerCase();
  const tone = eventTone(event);

  if (
    source === "FUSION" ||
    type.includes("fusion") ||
    type.includes("incident") ||
    type.includes("correlation") ||
    severity === "critical"
  ) {
    return "incidents";
  }

  if (
    tone === "auth-failure" ||
    tone === "lateral" ||
    tone === "privilege" ||
    tone === "exfil" ||
    tone === "drone" ||
    tone === "ais"
  ) {
    return "threats";
  }

  if (tone === "anomaly") {
    return "anomalies";
  }

  if (tone === "telemetry") {
    return "ops";
  }

  return "all";
}

function eventMatchesFilter(event: any, filter: FeedFilter) {
  if (filter === "all") return true;

  const eventClass = eventFilterClass(event);

  if (filter === "ops") return eventClass === "ops";
  if (filter === "anomalies") return eventClass === "anomalies";
  if (filter === "threats") {
    return eventClass === "threats" || eventClass === "incidents";
  }
  if (filter === "incidents") return eventClass === "incidents";

  return true;
}

function formatType(type: string) {
  return String(type || "unknown.event").replace(/_/g, " ");
}

export default function LogStream({
  events,
  focusedEventIds = [],
  focusToken = 0,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>("all");

  const eventListRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const orderedEvents = useMemo(() => {
    return Array.isArray(events) ? events : [];
  }, [events]);

  const focusedIdSet = useMemo(() => {
    return new Set(focusedEventIds);
  }, [focusedEventIds]);

  const filteredEvents = useMemo(() => {
    return orderedEvents.filter((event) => eventMatchesFilter(event, filter));
  }, [orderedEvents, filter]);

  const filterCounts = useMemo(() => {
    return {
      all: orderedEvents.length,
      ops: orderedEvents.filter((event) => eventMatchesFilter(event, "ops"))
        .length,
      anomalies: orderedEvents.filter((event) =>
        eventMatchesFilter(event, "anomalies"),
      ).length,
      threats: orderedEvents.filter((event) =>
        eventMatchesFilter(event, "threats"),
      ).length,
      incidents: orderedEvents.filter((event) =>
        eventMatchesFilter(event, "incidents"),
      ).length,
    };
  }, [orderedEvents]);

  const handleEventListScroll = () => {
    const el = eventListRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 48;
  };

  useEffect(() => {
    if (focusedEventIds.length === 0 || focusToken === 0) return;

    setFilter("all");
    shouldAutoScrollRef.current = false;
  }, [focusedEventIds, focusToken]);

  useEffect(() => {
    if (focusedEventIds.length === 0 || focusToken === 0) return;

    const firstEvidenceId = focusedEventIds[0];
    const row = rowRefs.current[firstEvidenceId];

    if (row) {
      row.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [filteredEvents.length, focusedEventIds, focusToken]);

  useEffect(() => {
    const el = eventListRef.current;
    if (!el) return;

    if (shouldAutoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [filteredEvents.length, filter]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <div className="panel event-stream-panel">
        <div className="panel-header">
          <h2>EVENT STREAM</h2>

          <label className="event-filter-control">
            <span>FILTER</span>

            <select
              value={filter}
              onChange={(event) => {
                shouldAutoScrollRef.current = true;
                setFilter(event.target.value as FeedFilter);
              }}
              aria-label="Filter event stream"
            >
              {FEED_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({filterCounts[option.value]})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="event-table-head">
          <span>TIME</span>
          <span>SOURCE</span>
          <span>EVENT</span>
        </div>

        <div
          ref={eventListRef}
          className="event-list"
          onScroll={handleEventListScroll}
        >
          {filteredEvents.length === 0 ? (
            <div className="event-empty-state">
              <strong>No matching events</strong>
              <span>Change the feed filter to view additional telemetry.</span>
            </div>
          ) : (
            filteredEvents.map((event: any) => {
              const source = sourceType(event.source);
              const tone = eventTone(event);
              const focused = focusedIdSet.has(event.id);

              return (
                <div
                  key={event.id}
                  ref={(node) => {
                    rowRefs.current[event.id] = node;
                  }}
                  className={[
                    "event-row",
                    event.domain || "unknown",
                    tone,
                    `source-${source.toLowerCase()}`,
                    focused ? "focused" : "",
                  ].join(" ")}
                >
                  <span className="event-dot" />

                  <span className="event-time">
                    {formatTime(event.timestamp)}
                  </span>

                  <span className={`source-pill ${source.toLowerCase()}`}>
                    {source}
                  </span>

                  <span className="event-message">{event.message}</span>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          className="view-log-btn"
          onClick={() => setIsOpen(true)}
        >
          ⌘ VIEW FULL LOG
        </button>
      </div>

      {isOpen && (
        <div
          className="log-modal-backdrop"
          role="presentation"
          onMouseDown={() => setIsOpen(false)}
        >
          <section
            className="log-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Full event log"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="log-modal-header">
              <div>
                <h2>FULL EVENT LOG</h2>
                <span>
                  {orderedEvents.length} EVENTS CAPTURED ·{" "}
                  {filteredEvents.length} VISIBLE IN CURRENT FILTER
                </span>
              </div>

              <button
                type="button"
                className="log-modal-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close full event log"
              >
                ×
              </button>
            </header>

            <div className="log-modal-filter-row">
              {FEED_FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`log-filter-chip ${
                    filter === option.value ? "active" : ""
                  }`}
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                  <span>{filterCounts[option.value]}</span>
                </button>
              ))}
            </div>

            <div className="log-modal-table-head">
              <span>TIME</span>
              <span>SOURCE</span>
              <span>CLASS</span>
              <span>TYPE</span>
              <span>EVENT</span>
            </div>

            <div className="log-modal-list">
              {filteredEvents.map((event: any) => {
                const source = sourceType(event.source);
                const tone = eventTone(event);
                const label = eventClassLabel(event);
                const focused = focusedIdSet.has(event.id);

                return (
                  <div
                    key={event.id}
                    className={[
                      "log-modal-row",
                      tone,
                      `source-${source.toLowerCase()}`,
                      focused ? "focused" : "",
                    ].join(" ")}
                  >
                    <span className="log-modal-time">
                      {formatTime(event.timestamp)}
                    </span>

                    <span className={`source-pill ${source.toLowerCase()}`}>
                      {source}
                    </span>

                    <span className={`log-modal-label ${tone}`}>{label}</span>

                    <span className="log-modal-type">
                      {formatType(event.type)}
                    </span>

                    <span className="log-modal-message">{event.message}</span>
                  </div>
                );
              })}

              {filteredEvents.length === 0 && (
                <div className="log-modal-empty">
                  No events match the selected filter.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}