# app/detection/rules/privilege_escalation.py

from app.models.signal import Signal


def detect_privilege_escalation(events):
    escalations = [
        e for e in events
        if e["type"] == "identity.privilege_escalation"
    ]

    if not escalations:
        return None

    return Signal(
        id="sig-privilege-escalation",
        kind="identity.privilege_escalation",
        domain="cyber",
        weight=0.12,
        evidence=[e["id"] for e in escalations],
        label="Privilege Escalation Attempt",
        description="Identity activity suggests attempted privilege escalation.",
        source="rule.privilege_escalation",
        metadata={
            "count": len(escalations),
            "target_role": escalations[-1].get("metadata", {}).get("target_role"),
        },
    )