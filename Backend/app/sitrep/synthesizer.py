"""Commander SITREP synthesis from deterministic squad compactions.

This module is intentionally independent of detection rules and hosted LLMs. If
Raven Gap source reports create compactions, the backend can populate the legacy
`incident` field as a commander SITREP even when the detection signal list is
empty. That preserves the existing IncidentCard contract while shifting the demo
copy to TacNet Edge vocabulary.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any


def synthesize_sitrep(
    compactions: list[dict[str, Any]],
    events: list[dict[str, Any]] | None = None,
    previous_incident: dict[str, Any] | None = None,
    comms: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Create an incident-shaped Commander SITREP from squad rollups.

    Args:
        compactions: Current deterministic squad rollups.
        events: Current normalized events for future evidence enrichment.
        previous_incident: Existing incident/SITREP for ID and confidence carryover.
        comms: Current comms state. The SITREP remains complete in degraded mode.

    Returns:
        A legacy incident payload or `None` when no compactions exist.
    """
    if not compactions:
        return None

    active_risk = calculate_active_risk(compactions)
    detection_confidence = max(active_risk, previous_detection(previous_incident))
    incident_id = incident_identifier(previous_incident)

    return sitrep_payload(
        incident_id,
        active_risk,
        detection_confidence,
        compactions,
    )


def sitrep_payload(
    incident_id: str,
    active_risk: float,
    detection_confidence: float,
    compactions: list[dict[str, Any]],
) -> dict[str, Any]:
    """Build the legacy IncidentCard payload."""
    return {
        "id": incident_id,
        "type": "Commander SITREP",
        "severity": severity_for_risk(active_risk),
        "confidence": active_risk,
        "detection_confidence": detection_confidence,
        "active_risk": active_risk,
        "summary": commander_summary(compactions),
        "narrative": commander_narrative(compactions),
        "evidence_lines": evidence_lines(compactions),
        "signals": compaction_signals(compactions),
        "recommended_actions": recommended_actions(compactions),
        "timestamp": now(),
        "why": why_lines(compactions),
        "status": "active",
        "resolution_ready": False,
        "manually_resolved": False,
        "resolved_at": None,
    }


def calculate_active_risk(compactions: list[dict[str, Any]]) -> float:
    """Calculate deterministic residual risk from rollup statuses."""
    has_red = any(compaction.get("status") == "red" for compaction in compactions)
    has_amber = any(compaction.get("status") == "amber" for compaction in compactions)
    source_count = sum(int(item.get("source_count") or 0) for item in compactions)

    if has_red and source_count >= 8:
        return 0.82

    if has_red:
        return 0.72

    if has_amber:
        return 0.48

    return 0.22


def previous_detection(previous_incident: dict[str, Any] | None) -> float:
    """Carry forward the highest prior confidence for legacy UI semantics."""
    if not previous_incident:
        return 0

    return float(previous_incident.get("detection_confidence") or 0)


def incident_identifier(previous_incident: dict[str, Any] | None) -> str:
    """Reuse the existing incident ID unless this is the first SITREP."""
    if previous_incident and previous_incident.get("id"):
        return previous_incident["id"]

    return f"SITREP-{uuid.uuid4().hex[:6].upper()}"


def severity_for_risk(active_risk: float) -> str:
    """Map active risk to legacy IncidentCard severity."""
    if active_risk >= 0.75:
        return "critical"

    if active_risk >= 0.65:
        return "high"

    if active_risk >= 0.35:
        return "medium"

    return "low"


def commander_summary(compactions: list[dict[str, Any]]) -> str:
    """Build the top-line commander SITREP summary."""
    if any("contact" in compaction.get("tags", []) for compaction in compactions):
        return "Commander SITREP: NAI-2 contact likely; movement continues slow west of PL Raven."

    return "Commander SITREP: Raven Gap movement in progress; no confirmed contact."


def commander_narrative(compactions: list[dict[str, Any]]) -> str:
    """Build a traceable commander narrative from rollup titles."""
    titles = ", ".join(compaction["title"] for compaction in compactions)
    source_count = sum(int(item.get("source_count") or 0) for item in compactions)

    return (
        f"TacNet compacted {source_count} Raven Gap source reports into "
        f"{len(compactions)} rollups: {titles}."
    )


def compaction_signals(compactions: list[dict[str, Any]]) -> list[str]:
    """Translate rollup tags into legacy signal labels."""
    tags = {
        f"raven_gap.{tag}"
        for compaction in compactions
        for tag in compaction.get("tags", [])
    }
    return sorted(tags)


def recommended_actions(compactions: list[dict[str, Any]]) -> list[str]:
    """Build commander recommendations without adding targeting logic."""
    actions = ["Maintain Raven-2 collection on NAI-2"]

    if any(compaction.get("status") == "red" for compaction in compactions):
        actions.append("Keep squads west of PL Raven")

    if any("mobility" in compaction.get("tags", []) for compaction in compactions):
        actions.append("Update JLTV support route status")

    return actions


def why_lines(compactions: list[dict[str, Any]]) -> list[str]:
    """Explain why the commander SITREP exists."""
    return [
        f"{compaction['title']} compacted {compaction['source_count']} source reports"
        for compaction in compactions
    ]


def evidence_lines(compactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build IncidentCard evidence rows from compaction provenance."""
    return [
        {
            "text": compaction.get("summary", compaction.get("title", "Compaction")),
            "evidence_ids": compaction.get("source_event_ids", []),
        }
        for compaction in compactions
    ]


def now() -> str:
    """Return current UTC timestamp in RFC3339 form."""
    return datetime.now(timezone.utc).isoformat()
