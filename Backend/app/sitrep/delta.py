"""SITREP delta generation for the TacNet Edge commander view.

The frontend still consumes the legacy `incident` object, so the delta helper
keeps a separate `sitrep_delta` field. It compares stable, compact fields from
successive commander SITREPs and turns them into a short "what changed" payload.
"""

from __future__ import annotations

from typing import Any


def build_sitrep_delta(
    previous_incident: dict[str, Any] | None,
    current_incident: dict[str, Any] | None,
    compactions: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compare two incident-shaped commander SITREPs.

    Args:
        previous_incident: Prior incident/SITREP, if one exists.
        current_incident: Current synthesized or interpreted incident.
        compactions: Current squad rollups that support the SITREP.

    Returns:
        A compact delta payload for `/state.sitrep_delta`.
    """
    if not current_incident:
        return empty_delta()

    added, removed = signal_changes(previous_incident, current_incident)
    risk_changed = active_risk(previous_incident) != active_risk(current_incident)
    what_changed = build_changed_lines(added, removed, risk_changed, compactions)
    summary = summarize_delta(previous_incident, what_changed)

    return {
        "since_id": (previous_incident or {}).get("id"),
        "what_changed": what_changed,
        "summary": summary,
        "changed": what_changed,
    }


def empty_delta() -> dict[str, Any]:
    """Return an empty delta for states without a commander SITREP."""
    return {
        "since_id": None,
        "what_changed": [],
        "summary": "No commander SITREP yet.",
        "changed": [],
    }


def signal_changes(
    previous_incident: dict[str, Any] | None,
    current_incident: dict[str, Any],
) -> tuple[list[str], list[str]]:
    """Return added and removed signal labels."""
    previous = set((previous_incident or {}).get("signals") or [])
    current = set(current_incident.get("signals") or [])

    return sorted(current - previous), sorted(previous - current)


def active_risk(incident: dict[str, Any] | None) -> float | None:
    """Read active risk rounded for stable comparisons."""
    if not incident:
        return None

    return round(float(incident.get("active_risk") or 0), 2)


def build_changed_lines(
    added: list[str],
    removed: list[str],
    risk_changed: bool,
    compactions: list[dict[str, Any]],
) -> list[str]:
    """Build human-readable delta lines."""
    changed = [f"New: {item}" for item in added]
    changed.extend(f"Cleared: {item}" for item in removed)

    if risk_changed:
        changed.append("Active risk changed")

    red_rollups = [item["title"] for item in compactions if item.get("status") == "red"]
    changed.extend(f"Priority rollup: {title}" for title in red_rollups)

    return changed


def summarize_delta(
    previous_incident: dict[str, Any] | None,
    changed: list[str],
) -> str:
    """Build one-line delta copy for the commander view."""
    if not previous_incident:
        return "Initial commander SITREP established from squad rollups."

    if not changed:
        return "No material change since last commander SITREP."

    return changed[0]
