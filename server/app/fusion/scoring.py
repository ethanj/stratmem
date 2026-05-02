# app/fusion/scoring.py

from __future__ import annotations

from typing import Any


CRITICAL_SIGNALS = {
    "network.lateral_movement",
    "identity.privilege_escalation",
    "network.data_exfiltration",
    "physical.drone_recon",
    "osint.ais_anomaly",
}


def score_signals(signals) -> dict[str, Any]:
    """
    Fusion scoring model.

    This is intentionally transparent and explainable:
    - base score comes from rule weights
    - bonuses come from evidence, diversity, escalation, and cross-domain correlation
    """

    if not signals:
        return {
            "confidence": 0,
            "level": "low",
            "breakdown": {
                "base": 0,
                "evidenceBonus": 0,
                "diversityBonus": 0,
                "crossDomainBonus": 0,
                "escalationBonus": 0,
                "raw": 0,
            },
            "explanation": [],
        }

    base = sum(float(signal.weight) for signal in signals)

    total_evidence = sum(len(signal.evidence) for signal in signals)
    evidence_bonus = min(total_evidence * 0.01, 0.08)

    unique_kinds = {signal.kind for signal in signals}
    diversity_bonus = min(len(unique_kinds) * 0.015, 0.08)

    domains = {signal.domain for signal in signals}
    cross_domain_bonus = calculate_cross_domain_bonus(domains)

    escalation_bonus = calculate_escalation_bonus(unique_kinds)

    raw_score = (
        base
        + evidence_bonus
        + diversity_bonus
        + cross_domain_bonus
        + escalation_bonus
    )

    confidence = min(round(raw_score, 2), 1.0)
    level = confidence_to_level(confidence)

    return {
        "confidence": confidence,
        "level": level,
        "breakdown": {
            "base": round(base, 2),
            "evidenceBonus": round(evidence_bonus, 2),
            "diversityBonus": round(diversity_bonus, 2),
            "crossDomainBonus": round(cross_domain_bonus, 2),
            "escalationBonus": round(escalation_bonus, 2),
            "raw": round(raw_score, 2),
        },
        "explanation": build_scoring_explanation(
            signals=signals,
            domains=domains,
            unique_kinds=unique_kinds,
            evidence_count=total_evidence,
            cross_domain_bonus=cross_domain_bonus,
            escalation_bonus=escalation_bonus,
        ),
    }


def calculate_cross_domain_bonus(domains: set[str]) -> float:
    """
    Multi-domain fusion is Sentinel Forge's core differentiator.

    Cyber-only is meaningful.
    Cyber + physical is much more serious.
    Cyber + OSINT is also serious.
    Cyber + physical + OSINT is strongest.
    """

    has_cyber = "cyber" in domains
    has_physical = "physical" in domains
    has_osint = "osint" in domains

    bonus = 0.0

    if has_cyber and has_physical:
        bonus += 0.08

    if has_cyber and has_osint:
        bonus += 0.05

    if has_physical and has_osint:
        bonus += 0.03

    return min(bonus, 0.14)


def calculate_escalation_bonus(unique_kinds: set[str]) -> float:
    active_critical = unique_kinds.intersection(CRITICAL_SIGNALS)

    if not active_critical:
        return 0.0

    # More critical signal categories = stronger escalation pattern.
    return min(len(active_critical) * 0.02, 0.08)


def confidence_to_level(confidence: float) -> str:
    if confidence >= 0.8:
        return "critical"

    if confidence >= 0.6:
        return "high"

    if confidence >= 0.4:
        return "medium"

    return "low"


def build_scoring_explanation(
    *,
    signals,
    domains: set[str],
    unique_kinds: set[str],
    evidence_count: int,
    cross_domain_bonus: float,
    escalation_bonus: float,
) -> list[str]:
    explanation = []

    explanation.append(f"{len(signals)} active signal(s) extracted from normalized events")
    explanation.append(f"{evidence_count} supporting evidence event(s) linked to active signals")

    if len(unique_kinds) > 1:
        explanation.append("Multiple distinct signal categories increase confidence")

    if "cyber" in domains:
        explanation.append("Cyber-domain indicators are active")

    if "physical" in domains:
        explanation.append("Physical-domain indicators are active")

    if "osint" in domains:
        explanation.append("OSINT indicators are active")

    if cross_domain_bonus > 0:
        explanation.append("Cross-domain correlation bonus applied")

    if escalation_bonus > 0:
        explanation.append("Escalation-pattern bonus applied for high-risk signals")

    return explanation