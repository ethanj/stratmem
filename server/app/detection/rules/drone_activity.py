# app/detection/rules/drone_activity.py

from app.models.signal import Signal


def detect_drone_activity(events):
    drone_events = [
        e for e in events
        if e["type"] == "physical.drone"
    ]

    if not drone_events:
        return None

    latest = drone_events[-1]
    geo = latest.get("geospatial", {})

    return Signal(
        id="sig-drone",
        kind="physical.drone_recon",
        domain="physical",
        weight=0.25,
        evidence=[e["id"] for e in drone_events],
        label="Physical Drone Activity",
        description="Drone activity detected near protected perimeter.",
        source="rule.drone_activity",
        location={
            "lat": geo.get("lat"),
            "lon": geo.get("lon"),
        },
        metadata={
            "count": len(drone_events),
            "sector": latest.get("metadata", {}).get("sector"),
            "track_id": latest.get("metadata", {}).get("track_id"),
        },
    )