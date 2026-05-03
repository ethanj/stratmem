# app/core/pipeline.py
"""Pipeline orchestration for normalization, fusion, SITREP, and map state.

The pipeline keeps the original Sentinel Forge path intact while adding a
TacNet Edge branch for Raven Gap. Detection still runs first; compaction and
SITREP synthesis are deterministic post-processing layers, not new detection
rules or hosted LLM calls.
"""

from __future__ import annotations

from dataclasses import replace
from typing import Any

from app.compaction.squad_rollup import build_squad_rollups
from app.core.correlation import correlate
from app.core.detection import detect, serialize_signal
from app.core.interpreter import interpret
from app.core.map import build_map_state
from app.normalization.normalizer import normalize_events
from app.response.effects import MITIGATED_WEIGHT_FACTOR, build_mitigation_index
from app.sitrep.delta import build_sitrep_delta
from app.sitrep.synthesizer import synthesize_sitrep
from app.state.store import (
    COMMS_WINDOW_SECONDS,
    DEGRADED_COMMS_KBPS,
    build_comms_proof,
)


def run_pipeline(
    events: list[dict[str, Any]],
    previous_correlation: dict[str, Any] | None = None,
    operator_actions: dict[str, Any] | None = None,
    previous_incident: dict[str, Any] | None = None,
    comms: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run the backend analysis pipeline for the current state."""
    previous_correlation = previous_correlation or {}
    previous_history = previous_correlation.get("history", [])
    normalized_events = normalize_events(events)
    signals = detect(normalized_events)
    adjusted_signals = apply_mitigation(signals, operator_actions or {})
    correlation = correlate(adjusted_signals, previous_history=previous_history)
    pipeline_comms = normalize_comms(comms)
    full_compactions = build_squad_rollups(normalized_events, comms={**pipeline_comms, "degraded": False})
    display_compactions = build_squad_rollups(normalized_events, comms=pipeline_comms)
    comms_state = build_comms_state(pipeline_comms, display_compactions)
    incident = build_incident(correlation, adjusted_signals, full_compactions, operator_actions, previous_incident, normalized_events, comms_state)
    sitrep_delta = build_sitrep_delta(previous_incident, incident, full_compactions)
    display_events = apply_degraded_event_detail(normalized_events, comms_state)
    map_state = build_map_state(display_events, signals=adjusted_signals, compactions=display_compactions, comms=comms_state)

    return pipeline_result(display_events, adjusted_signals, correlation, incident, map_state, display_compactions, sitrep_delta, comms_state)


def pipeline_result(
    events: list[dict[str, Any]],
    signals: list[Any],
    correlation: dict[str, Any],
    incident: dict[str, Any] | None,
    map_state: dict[str, Any],
    compactions: list[dict[str, Any]],
    sitrep_delta: dict[str, Any],
    comms: dict[str, Any],
) -> dict[str, Any]:
    """Build the final pipeline payload."""
    return {
        "events": events,
        "signals": [serialize_signal(signal) for signal in signals],
        "correlation": serialize_correlation(correlation),
        "incident": incident,
        "map_state": map_state,
        "compactions": compactions,
        "sitrep_delta": sitrep_delta,
        "comms": comms,
    }


def apply_mitigation(signals: list[Any], action_status: dict[str, Any]) -> list[Any]:
    """Apply operator mitigations to detected signals."""
    mitigated_by_kind = build_mitigation_index(action_status)
    return [
        mitigate_signal(signal, mitigated_by_kind.get(signal.kind))
        for signal in signals
    ]


def mitigate_signal(signal: Any, mitigated_by: str | None) -> Any:
    """Return a signal annotated with active or mitigated status."""
    if not mitigated_by:
        metadata = {**signal.metadata, "status": "active"}
        return replace(signal, active=True, metadata=metadata)

    metadata = {**signal.metadata, "status": "mitigated", "mitigated_by": mitigated_by}
    return replace(
        signal,
        active=False,
        weight=round(float(signal.weight) * MITIGATED_WEIGHT_FACTOR, 3),
        metadata=metadata,
    )


def build_incident(
    correlation: dict[str, Any],
    adjusted_signals: list[Any],
    compactions: list[dict[str, Any]],
    operator_actions: dict[str, Any] | None,
    previous_incident: dict[str, Any] | None,
    events: list[dict[str, Any]],
    comms: dict[str, Any],
) -> dict[str, Any] | None:
    """Build the legacy incident object from signals or TacNet compactions."""
    if compactions:
        return synthesize_sitrep(
            compactions,
            events=events,
            previous_incident=previous_incident,
            comms=comms,
        )

    if not adjusted_signals:
        return None

    return interpret(
        correlation,
        action_status=operator_actions or {},
        previous_incident=previous_incident,
    )


def build_comms_state(
    comms: dict[str, Any] | None,
    compactions: list[dict[str, Any]],
) -> dict[str, Any]:
    """Attach aggregate 3 Kbps proof fields to current comms state."""
    comms_state = normalize_comms(comms)
    kbps = comms_state.get("kbps")
    raw_bytes = sum(int(item.get("raw_bytes") or 0) for item in compactions)
    compacted_bytes = sum(int(item.get("compacted_bytes") or 0) for item in compactions)

    return {
        **comms_state,
        **build_comms_proof(raw_bytes, compacted_bytes, kbps),
    }


def normalize_comms(comms: dict[str, Any] | None) -> dict[str, Any]:
    """Normalize comms input to the v2 state contract."""
    comms_state = dict(comms or {})
    degraded = bool(comms_state.get("degraded"))
    kbps = comms_state.get("kbps")
    source_detail_level = comms_state.get("source_detail_level")

    if degraded and kbps is None:
        kbps = DEGRADED_COMMS_KBPS
    elif not degraded:
        kbps = None

    if not source_detail_level:
        source_detail_level = "reduced" if degraded else "full"

    return {
        "degraded": degraded,
        "kbps": kbps,
        "window_sec": int(comms_state.get("window_sec") or COMMS_WINDOW_SECONDS),
        "source_detail_level": source_detail_level,
        "compression_enabled": bool(comms_state.get("compression_enabled")),
    }


def apply_degraded_event_detail(
    events: list[dict[str, Any]],
    comms: dict[str, Any],
) -> list[dict[str, Any]]:
    """Trim event messages when degraded mode is active."""
    if comms.get("source_detail_level") != "reduced":
        return events

    return [
        {**event, "message": short_event_message(event)}
        for event in events
    ]


def short_event_message(event: dict[str, Any]) -> str:
    """Build a deterministic reduced source-report message."""
    metadata = event.get("metadata", {})
    if metadata.get("scenario") == "raven_gap":
        return " ".join(
            item for item in [
                str(event.get("source", "")),
                str(metadata.get("report_type", "")),
                str(metadata.get("mgrs", "")),
            ] if item
        )

    return f"{event.get('source', 'SRC')} {event.get('type', 'event')}"


def serialize_correlation(correlation: dict[str, Any]) -> dict[str, Any]:
    """Serialize correlation and signal dataclasses for `/state`."""
    return {
        "confidence": correlation["confidence"],
        "level": correlation.get("level", "low"),
        "cyberCount": correlation["cyberCount"],
        "physicalCount": correlation["physicalCount"],
        "osintCount": correlation.get("osintCount", 0),
        "signals": [serialize_signal(signal) for signal in correlation["signals"]],
        "history": correlation.get("history", []),
        "explanation": correlation.get("explanation", []),
        "scoreBreakdown": score_breakdown(correlation),
    }


def score_breakdown(correlation: dict[str, Any]) -> dict[str, float]:
    """Return correlation score fields with a stable fallback."""
    return correlation.get(
        "scoreBreakdown",
        {
            "base": 0,
            "evidenceBonus": 0,
            "diversityBonus": 0,
            "crossDomainBonus": 0,
            "escalationBonus": 0,
            "raw": 0,
        },
    )
