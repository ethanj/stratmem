# app/detection/rules/suspicious_login.py

from app.models.signal import Signal


def detect_suspicious_login(events):
    suspicious_success = [
        e for e in events
        if e["type"] == "auth.success"
        and (
            e.get("metadata", {}).get("unfamiliar_ip") is True
            or e.get("metadata", {}).get("known_source") is False
        )
    ]

    if not suspicious_success:
        return None

    return Signal(
        id="sig-anomalous-login",
        kind="auth.anomalous_login",
        domain="cyber",
        weight=0.22,
        evidence=[e["id"] for e in suspicious_success],
        label="Suspicious Login",
        description="Successful login occurred from an unfamiliar source.",
        source="rule.suspicious_login",
        metadata={
            "count": len(suspicious_success),
        },
    )