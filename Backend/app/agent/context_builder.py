# app/agent/context_builder.py

def build_agent_context(correlation, incident):
    return {
        "incident_type": incident["type"] if incident else None,
        "severity": incident["severity"] if incident else None,
        "confidence": correlation["confidence"],
        "signals": correlation["signals"],
        "explanation": correlation.get("explanation", []),
        "score_breakdown": correlation.get("scoreBreakdown", {}),
        "recommended_actions": incident.get("recommended_actions", []) if incident else [],
    }