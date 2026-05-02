# app/detection/rules/failed_logins.py

from app.models.signal import Signal


def detect_failed_logins(events):
    failed = [
        e for e in events
        if e["type"] == "auth.failed"
        and e.get("metadata", {}).get("user") == "admin"
    ]

    if len(failed) < 3:
        return None

    return Signal(
        id="sig-failed-burst",
        kind="auth.failed_burst",
        domain="cyber",
        weight=0.18,
        evidence=[e["id"] for e in failed],
        label="Failed Authentication Burst",
        description="Multiple failed admin authentication attempts observed in the event window.",
        source="rule.failed_logins",
        metadata={
            "count": len(failed),
            "threshold": 3,
            "user": "admin",
        },
    )