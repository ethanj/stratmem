"""Deterministic squad-level rollups for the Raven Gap demo.

The compaction layer does not call an LLM or add detection rules. It groups
structured physical-domain Raven Gap source reports by `metadata.sender_id` and
emits commander-readable summaries. Each summary carries provenance and the same
deterministic 3 Kbps proof fields used by `/state.comms`.
"""

from __future__ import annotations

import json
from typing import Any

from app.state.store import build_comms_proof


def build_squad_rollups(
    events: list[dict[str, Any]],
    comms: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Create deterministic compactions from Raven Gap source reports.

    Args:
        events: Normalized event stream.
        comms: Current comms state with `kbps` and degraded flag.

    Returns:
        Ordered squad rollups with provenance and bandwidth proof fields.
    """
    grouped = group_raven_gap_events(events)
    return [
        build_rollup(sender_id, sender_events, comms)
        for sender_id, sender_events in grouped.items()
    ]


def group_raven_gap_events(
    events: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """Group Raven Gap events by the sender ID stored in metadata."""
    grouped: dict[str, list[dict[str, Any]]] = {}

    for event in events:
        metadata = event.get("metadata", {})
        if metadata.get("scenario") != "raven_gap":
            continue

        sender_id = metadata.get("sender_id")
        if sender_id:
            grouped.setdefault(sender_id, []).append(event)

    return grouped


def build_rollup(
    sender_id: str,
    events: list[dict[str, Any]],
    comms: dict[str, Any] | None,
) -> dict[str, Any]:
    """Build one rollup with source provenance and byte proof."""
    sorted_events = sorted(events, key=event_sequence)
    summary = rollup_summary(sorted_events, degraded=bool((comms or {}).get("degraded")))
    raw_bytes = byte_count(source_report_envelopes(sorted_events))
    compacted_payload = compacted_wire_payload(sender_id, summary, sorted_events)
    compacted_bytes = byte_count(compacted_payload)
    proof = build_comms_proof(raw_bytes, compacted_bytes, (comms or {}).get("kbps"))
    t_compacted_sec = max(t_offset(event) for event in sorted_events)

    return {
        "id": f"comp_{safe_id(sender_id)}_t{t_compacted_sec}",
        "squad_id": sender_id,
        "summary": summary,
        "source_event_ids": [event.get("id") for event in sorted_events],
        "t_compacted_sec": t_compacted_sec,
        "unit": unit_label(sorted_events),
        "title": unit_label(sorted_events),
        "status": rollup_status(sorted_events),
        "tags": rollup_tags(sorted_events),
        "source_count": len(sorted_events),
        "latest_sequence": max(event_sequence(event) for event in sorted_events),
        "timestamp": sorted_events[-1].get("timestamp"),
        "location": latest_location(sorted_events),
        "degraded": bool((comms or {}).get("degraded")),
        **proof,
    }


def compacted_wire_payload(
    sender_id: str,
    summary: str,
    events: list[dict[str, Any]],
) -> dict[str, Any]:
    """Return the compact form that would traverse the degraded link."""
    return {
        "squad_id": sender_id,
        "summary": summary,
        "source_count": len(events),
        "source_event_ids": [event.get("id") for event in events],
    }


def source_report_envelopes(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return the report envelope fields used for raw byte counts."""
    envelope_keys = ("id", "type", "source", "domain", "severity", "message", "metadata", "geospatial")
    return [
        {key: event[key] for key in envelope_keys if key in event}
        for event in events
    ]


def rollup_summary(events: list[dict[str, Any]], degraded: bool) -> str:
    """Build a deterministic full or reduced summary for one sender."""
    label = unit_label(events)
    types = "/".join(sorted({event.get("metadata", {}).get("report_type", "REPORT") for event in events}))

    if degraded:
        return f"{label}: {types}; {rollup_status(events).upper()}."

    messages = "; ".join(event.get("message", "") for event in events)
    return f"{label}: {messages}"


def unit_label(events: list[dict[str, Any]]) -> str:
    """Return the sender display label for a rollup."""
    metadata = events[-1].get("metadata", {})
    return metadata.get("unit_label") or events[-1].get("source", "Unknown")


def rollup_status(events: list[dict[str, Any]]) -> str:
    """Summarize sender status from event severities."""
    severities = {event.get("severity") for event in events}
    if "high" in severities:
        return "red"
    if "medium" in severities:
        return "amber"
    return "green"


def rollup_tags(events: list[dict[str, Any]]) -> list[str]:
    """Return lowercase report-type tags for compatibility consumers."""
    return sorted({
        str(event.get("metadata", {}).get("report_type", "report")).lower()
        for event in events
    })


def byte_count(value: Any) -> int:
    """Count deterministic UTF-8 bytes for a JSON-compatible value."""
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"))
    return len(encoded.encode("utf-8"))


def event_sequence(event: dict[str, Any]) -> int:
    """Read Raven Gap sequence from event metadata."""
    return int(event.get("metadata", {}).get("sequence", 0))


def t_offset(event: dict[str, Any]) -> int:
    """Read Raven Gap offset seconds from event metadata."""
    return int(event.get("metadata", {}).get("t_offset_sec", 0))


def safe_id(value: str) -> str:
    """Normalize a sender ID for a stable compaction ID."""
    return value.replace("/", "_").replace(" ", "_")


def latest_location(events: list[dict[str, Any]]) -> dict[str, float] | None:
    """Return the latest `{lat, lon}` point available in a rollup."""
    for event in reversed(events):
        geospatial = event.get("geospatial") or {}
        lat = geospatial.get("lat")
        lon = geospatial.get("lon")
        if lat is not None and lon is not None:
            return {"lat": lat, "lon": lon}

    return None
