# app/detection/rules/ais_anomaly.py

from app.models.signal import Signal


def detect_ais_anomaly(events):
    ais_events = [
        e for e in events
        if e["type"] == "osint.ais_anomaly"
    ]

    if not ais_events:
        return None

    latest = ais_events[-1]
    geo = latest.get("geospatial", {})

    return Signal(
        id="sig-ais-anomaly",
        kind="osint.ais_anomaly",
        domain="osint",
        weight=0.10,
        evidence=[e["id"] for e in ais_events],
        label="AIS Pattern Anomaly",
        description="AIS behavior indicates suspicious vessel activity near a restricted corridor.",
        source="rule.ais_anomaly",
        location={
            "lat": geo.get("lat"),
            "lon": geo.get("lon"),
        },
        metadata={
            "count": len(ais_events),
            "vessel_id": latest.get("metadata", {}).get("vessel_id"),
            "behavior": latest.get("metadata", {}).get("behavior"),
        },
    )