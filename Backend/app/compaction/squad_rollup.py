"""Deterministic squad-level rollups for the Raven Gap demo.

The compaction layer does not call an LLM or add detection rules. It groups
structured physical-domain Raven Gap source reports by derived tactical group
and emits commander-readable summaries. Each summary carries provenance and the same
deterministic 3 Kbps proof fields used by `/state.comms`.
"""

from __future__ import annotations

import json
from typing import Any

from app.state.store import build_comms_proof


GROUP_LABELS = {
    "1st_squad": "1st Squad",
    "2nd_squad": "2nd Squad",
    "3rd_squad": "3rd Squad",
    "support": "Weapons / Mobility Support",
    "recon_command": "Recon / Command",
}


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
        build_rollup(group_id, group_events, comms)
        for group_id, group_events in grouped.items()
    ]


def group_raven_gap_events(
    events: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """Group Raven Gap events by derived squad/support identity."""
    grouped: dict[str, list[dict[str, Any]]] = {}

    for event in events:
        metadata = event.get("metadata", {})
        if metadata.get("scenario") != "raven_gap":
            continue

        group_id = derived_group_id(event)
        if group_id:
            grouped.setdefault(group_id, []).append(event)

    return grouped


def build_rollup(
    group_id: str,
    events: list[dict[str, Any]],
    comms: dict[str, Any] | None,
) -> dict[str, Any]:
    """Build one rollup with source provenance and byte proof."""
    sorted_events = sorted(events, key=event_sequence)
    label = group_label(group_id, sorted_events)
    summary = rollup_summary(
        group_id,
        sorted_events,
        degraded=bool((comms or {}).get("degraded")),
    )
    raw_bytes = byte_count(source_report_envelopes(sorted_events))
    compacted_payload = compacted_wire_payload(group_id, summary, sorted_events)
    compacted_bytes = byte_count(compacted_payload)
    proof = build_comms_proof(raw_bytes, compacted_bytes, (comms or {}).get("kbps"))
    t_compacted_sec = max(t_offset(event) for event in sorted_events)

    return {
        "id": f"comp_{safe_id(group_id)}_t{t_compacted_sec}",
        "squad_id": group_id,
        "label": label,
        "summary": summary,
        "source_event_ids": [event.get("id") for event in sorted_events],
        "t_compacted_sec": t_compacted_sec,
        "unit": label,
        "title": label,
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
    group_id: str,
    summary: str,
    events: list[dict[str, Any]],
) -> dict[str, Any]:
    """Return the compact form that would traverse the degraded link."""
    return {
        "squad_id": group_id,
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


def rollup_summary(group_id: str, events: list[dict[str, Any]], degraded: bool) -> str:
    """Build a deterministic full or reduced summary for one sender."""
    label = group_label(group_id, events)
    types = "/".join(sorted({event.get("metadata", {}).get("report_type", "REPORT") for event in events}))

    if degraded:
        return f"{label}: {types}; {rollup_status(events).upper()}."

    messages = "; ".join(event.get("message", "") for event in events)
    return f"{label}: {messages}"


def derived_group_id(event: dict[str, Any]) -> str:
    """Derive a squad/support group from mesh metadata and callsign."""
    metadata = event.get("metadata", {})
    mesh_node = str(metadata.get("mesh_node") or "").upper()
    source = str(event.get("source") or "").upper()
    sender_id = str(metadata.get("sender_id") or "")
    report_type = str(metadata.get("report_type") or "").lower()

    if mesh_node == "1ST_SQUAD" or source.startswith("1/"):
        return "1st_squad"
    if mesh_node == "2ND_SQUAD" or source.startswith("2/"):
        return "2nd_squad"
    if mesh_node == "3RD_SQUAD" or source.startswith("3/"):
        return "3rd_squad"
    if mesh_node in {"WEAPONS_SQUAD"} or source in {"WPN", "JLTV-1"}:
        return "support"
    if (
        mesh_node in {"UAS_TEAM", "OP_LP", "PL"}
        or source in {"RQ-11", "OP-7", "PL"}
        or report_type in {"uas", "sensor", "sitrep_seed"}
    ):
        return "recon_command"

    return safe_id(sender_id or source or "unknown")


def group_label(group_id: str, events: list[dict[str, Any]]) -> str:
    """Return a stable display label for a derived compaction group."""
    if group_id in GROUP_LABELS:
        return GROUP_LABELS[group_id]

    metadata = events[-1].get("metadata", {}) if events else {}
    return metadata.get("unit_label") or group_id.replace("_", " ").title()


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
