# app/detection/rules/data_exfiltration.py

from app.models.signal import Signal


def detect_data_exfiltration(events):
    exfil_events = [
        e for e in events
        if e["type"] == "network.exfiltration"
    ]

    if not exfil_events:
        return None

    total_bytes = sum(
        int(e.get("metadata", {}).get("bytes", 0))
        for e in exfil_events
    )

    return Signal(
        id="sig-data-exfiltration",
        kind="network.data_exfiltration",
        domain="cyber",
        weight=0.16,
        evidence=[e["id"] for e in exfil_events],
        label="Potential Data Exfiltration",
        description="Unusual outbound transfer volume suggests possible data exfiltration.",
        source="rule.data_exfiltration",
        metadata={
            "count": len(exfil_events),
            "total_bytes": total_bytes,
            "dst_ip": exfil_events[-1].get("metadata", {}).get("dst_ip"),
        },
    )