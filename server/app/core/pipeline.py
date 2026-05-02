# app/core/pipeline.py
from app.normalization.normalizer import normalize_events
from app.core.detection import detect, serialize_signal
from app.core.correlation import correlate
from app.core.interpreter import interpret
from dataclasses import replace

from app.core.map import build_map_state
from app.response.effects import MITIGATED_WEIGHT_FACTOR, build_mitigation_index


def run_pipeline(events, previous_correlation=None, operator_actions=None, previous_incident=None):
    previous_correlation = previous_correlation or {}
    previous_history = previous_correlation.get("history", [])

    normalized_events = normalize_events(events)

    signals = detect(normalized_events)

    action_status = operator_actions or {}
    mitigated_by_kind = build_mitigation_index(action_status)

    adjusted_signals = []
    for signal in signals:
        mitigated_by = mitigated_by_kind.get(signal.kind)
        if mitigated_by:
            metadata = {**signal.metadata, "status": "mitigated", "mitigated_by": mitigated_by}
            adjusted_signals.append(
                replace(
                    signal,
                    active=False,
                    weight=round(float(signal.weight) * MITIGATED_WEIGHT_FACTOR, 3),
                    metadata=metadata,
                )
            )
            continue

        metadata = {**signal.metadata, "status": "active"}
        adjusted_signals.append(replace(signal, active=True, metadata=metadata))

    correlation = correlate(adjusted_signals, previous_history=previous_history)

    incident = interpret(
        correlation,
        action_status=action_status,
        previous_incident=previous_incident,
    ) if adjusted_signals else None

    map_state = build_map_state(normalized_events, signals=adjusted_signals)

    serialized_signals = [serialize_signal(signal) for signal in adjusted_signals]

    serialized_correlation = {
        "confidence": correlation["confidence"],
        "level": correlation.get("level", "low"),
        "cyberCount": correlation["cyberCount"],
        "physicalCount": correlation["physicalCount"],
        "osintCount": correlation.get("osintCount", 0),
        "signals": [serialize_signal(signal) for signal in correlation["signals"]],
        "history": correlation.get("history", []),
        "explanation": correlation.get("explanation", []),
        "scoreBreakdown": correlation.get(
            "scoreBreakdown",
            {
                "base": 0,
                "evidenceBonus": 0,
                "diversityBonus": 0,
                "crossDomainBonus": 0,
                "escalationBonus": 0,
                "raw": 0,
            },
        ),
    }

    return {
        "events": normalized_events,
        "signals": serialized_signals,
        "correlation": serialized_correlation,
        "incident": incident,
        "map_state": map_state,
    }