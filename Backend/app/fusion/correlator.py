# app/fusion/correlator.py

from __future__ import annotations

from datetime import datetime, timezone

from app.fusion.scoring import score_signals


def now():
    return datetime.now(timezone.utc).isoformat()


def correlate_signals(signals, previous_history=None) -> dict:
    """
    Correlate active signals into a frontend-safe correlation object.

    This is the core fusion layer:
    - scores signals
    - counts domains
    - generates explanation
    - maintains confidence history
    """

    previous_history = previous_history or []

    if not signals:
        return {
            "confidence": 0,
            "level": "low",
            "cyberCount": 0,
            "physicalCount": 0,
            "osintCount": 0,
            "signals": [],
            "history": previous_history,
            "explanation": [],
            "scoreBreakdown": {
                "base": 0,
                "evidenceBonus": 0,
                "diversityBonus": 0,
                "crossDomainBonus": 0,
                "escalationBonus": 0,
                "raw": 0,
            },
        }

    scoring = score_signals(signals)
    confidence = scoring["confidence"]

    cyber_count = sum(1 for signal in signals if signal.domain == "cyber")
    physical_count = sum(1 for signal in signals if signal.domain == "physical")
    osint_count = sum(1 for signal in signals if signal.domain == "osint")

    history = update_history(
        previous_history=previous_history,
        confidence=confidence,
        level=scoring["level"],
    )

    return {
        "confidence": confidence,
        "level": scoring["level"],
        "cyberCount": cyber_count,
        "physicalCount": physical_count,
        "osintCount": osint_count,
        "signals": signals,
        "history": history,
        "explanation": scoring["explanation"],
        "scoreBreakdown": scoring["breakdown"],
    }


def update_history(previous_history, confidence: float, level: str) -> list[dict]:
    last = previous_history[-1] if previous_history else None

    if last and last.get("confidence") == confidence:
        return previous_history

    return [
        *previous_history,
        {
            "timestamp": now(),
            "confidence": confidence,
            "level": level,
        },
    ][-16:]


# Backward-compatible name.
def correlate(signals):
    result = correlate_signals(signals)
    return "COORDINATED_INTRUSION" if result["confidence"] >= 0.7 else None