#app/agent/schemas.py

from __future__ import annotations

from typing import Any, Literal, TypedDict


Priority = Literal["low", "medium", "high", "critical"]


class AgentOutput(TypedDict):
    assessment: str
    priority: Priority
    threat_summary: str
    why_it_matters: str
    next_steps: list[str]
    operator_note: str
    confidence_rationale: str
    decision_window: str
    provider: str


def validate_agent_output(value: Any, provider: str = "unknown") -> AgentOutput | None:
    """
    Runtime guard for LLM/provider responses.
    Keeps frontend contract stable even if a model returns malformed JSON.
    """
    if not isinstance(value, dict):
        return None

    required = [
        "assessment",
        "priority",
        "threat_summary",
        "why_it_matters",
        "next_steps",
        "operator_note",
        "confidence_rationale",
        "decision_window",
    ]

    for key in required:
        if key not in value:
            return None

    if value["priority"] not in {"low", "medium", "high", "critical"}:
        return None

    if not isinstance(value["next_steps"], list):
        return None

    return {
        "assessment": str(value["assessment"]),
        "priority": value["priority"],
        "threat_summary": str(value["threat_summary"]),
        "why_it_matters": str(value["why_it_matters"]),
        "next_steps": [str(step) for step in value["next_steps"]],
        "operator_note": str(value["operator_note"]),
        "confidence_rationale": str(value["confidence_rationale"]),
        "decision_window": str(value["decision_window"]),
        "provider": provider,
    }