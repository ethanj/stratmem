# app/core/map.py

from __future__ import annotations

from typing import Any


# Keep these coordinates aligned with components/MapView.tsx.
# Frontend uses [lon, lat]. Backend uses {"lat": ..., "lon": ...}.
SECTOR_A_CENTER = {"lat": 37.776, "lon": -122.392}
SECTOR_B_CENTER = {"lat": 37.8258, "lon": -122.3134}
SECTOR_C_CENTER = {"lat": 37.835, "lon": -122.456}

GATEWAY_CENTER = {"lat": 37.7794, "lon": -122.4108}
HQ_NODE_CENTER = {"lat": 37.7936, "lon": -122.3694}

CYBER_NODE_CENTERS = {
    "node-1": {"lat": 37.8052, "lon": -122.3532},
    "node-2": {"lat": 37.8148, "lon": -122.3387},
    "node-3": {"lat": 37.8214, "lon": -122.3248},
}

MARITIME_CORRIDOR_CENTER = {"lat": 37.824, "lon": -122.3364}


def build_map_state(events: list[dict[str, Any]], signals=None) -> dict[str, Any]:
    """
    Builds the map-specific operational picture consumed by the frontend.

    Output contract:
    {
        "tracks": list[track],
        "assets": list[asset],
        "zones": list[zone],
        "threat_paths": list[path],
        "risk_level": str,
        "phase": str
    }
    """
    signals = signals or []

    signal_kinds = extract_signal_kinds(signals)
    event_types = {event.get("type") for event in events if event.get("type")}

    tracks = build_tracks(events)
    assets = build_assets(signal_kinds, event_types)
    zones = build_zones(signal_kinds, tracks)
    threat_paths = build_threat_paths(signal_kinds, events, tracks)
    risk_level = calculate_map_risk(signal_kinds)
    phase = determine_map_phase(signal_kinds)

    return {
        "tracks": tracks,
        "assets": assets,
        "zones": zones,
        "threat_paths": threat_paths,
        "risk_level": risk_level,
        "phase": phase,
    }


def extract_signal_kinds(signals: list[Any]) -> set[str]:
    """
    Supports both Signal dataclass objects and dict-like signal payloads.

    Existing code often passes Signal objects with .kind.
    This fallback makes the map layer resilient if later API serialization
    starts passing dictionaries instead.
    """
    kinds: set[str] = set()

    for signal in signals:
        if hasattr(signal, "kind"):
            kind = getattr(signal, "kind")
        elif isinstance(signal, dict):
            kind = signal.get("kind")
        else:
            kind = None

        if kind:
            kinds.add(str(kind))

    return kinds


def build_tracks(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Converts geospatial events into frontend map tracks.

    Any event with:
    {
        "geospatial": {"lat": ..., "lon": ..., "alt": optional}
    }

    becomes a track.
    """
    tracks: list[dict[str, Any]] = []

    for event in events:
        geo = event.get("geospatial")

        if not geo:
            continue

        lat = geo.get("lat")
        lon = geo.get("lon")

        if lat is None or lon is None:
            continue

        tracks.append(
            {
                "id": event.get("id") or stable_track_id(event),
                "kind": event.get("type", "unknown"),
                "lat": lat,
                "lon": lon,
                "alt": geo.get("alt"),
                "confidence": confidence_for_track(event),
                "source": event.get("source"),
                "timestamp": event.get("timestamp"),
                "label": label_for_track(event),
                "severity": event.get("severity", "unknown"),
                "metadata": event.get("metadata", {}),
            }
        )

    return tracks


def build_assets(signal_kinds: set[str], event_types: set[str]) -> list[dict[str, Any]]:
    """
    Asset/adaptor status model.

    Important semantics:
    - OPERATIONAL: no current event stream yet.
    - STREAMING: adapter/feed is live and ingesting.
    - ACTIVE: physical/OSINT sensor is live and monitoring.
    - SUSPECT: asset/account path is involved in suspicious behavior.
    - ALERTING: monitoring system raised an alert condition.
    - LIVE: fusion core is running.
    """
    system_live = len(event_types) > 0

    cyber_status = "streaming" if system_live else "operational"
    physical_status = "active" if system_live else "operational"
    osint_status = "active" if system_live else "operational"

    auth_status = cyber_status
    if has_auth_threat(signal_kinds):
        auth_status = "suspect"

    edr_status = cyber_status
    if (
        "network.lateral_movement" in signal_kinds
        or "identity.privilege_escalation" in signal_kinds
    ):
        edr_status = "alerting"

    network_status = cyber_status
    if "network.data_exfiltration" in signal_kinds:
        network_status = "alerting"
    elif "network.lateral_movement" in signal_kinds:
        network_status = "suspect"

    uas_status = physical_status
    if "physical.drone_recon" in signal_kinds:
        uas_status = "alerting"

    ais_status = osint_status
    if "osint.ais_anomaly" in signal_kinds:
        ais_status = "alerting"

    fusion_status = "live" if system_live else "standby"
    if is_multi_domain(signal_kinds):
        fusion_status = "alerting"

    return [
        {
            "id": "asset-auth-gw-01",
            "name": "AUTH SERVER",
            "kind": "auth_gateway",
            "domain": "cyber",
            "status": auth_status,
            "location": GATEWAY_CENTER,
        },
        {
            "id": "asset-edr-network",
            "name": "EDR SENSOR NETWORK",
            "kind": "endpoint_detection",
            "domain": "cyber",
            "status": edr_status,
            "location": HQ_NODE_CENTER,
        },
        {
            "id": "asset-network-gateway",
            "name": "NETWORK GATEWAY",
            "kind": "network_gateway",
            "domain": "cyber",
            "status": network_status,
            "location": GATEWAY_CENTER,
        },
        {
            "id": "asset-uas-monitoring",
            "name": "UAS MONITORING",
            "kind": "uas_sensor",
            "domain": "physical",
            "status": uas_status,
            "location": SECTOR_B_CENTER,
        },
        {
            "id": "asset-ais-monitoring",
            "name": "AIS MONITORING",
            "kind": "ais_feed",
            "domain": "osint",
            "status": ais_status,
            "location": MARITIME_CORRIDOR_CENTER,
        },
        {
            "id": "asset-fusion-core",
            "name": "FUSION CORE",
            "kind": "fusion_engine",
            "domain": "fusion",
            "status": fusion_status,
            "location": HQ_NODE_CENTER,
        },
    ]


def build_zones(
    signal_kinds: set[str],
    tracks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Builds operational zones for the map.

    Sector B is the protected/high-interest zone in the current demo.
    It should line up with frontend SECTOR_B and with scenario drone tracks.
    """
    sector_b_active = (
        "physical.drone_recon" in signal_kinds
        or any(track.get("kind") == "physical.drone" for track in tracks)
    )

    maritime_active = (
        "osint.ais_anomaly" in signal_kinds
        or any(track.get("kind") == "osint.ais_anomaly" for track in tracks)
    )

    cyber_active = any(
        kind in signal_kinds
        for kind in {
            "auth.failed_burst",
            "auth.anomalous_login",
            "network.lateral_movement",
            "identity.privilege_escalation",
            "network.data_exfiltration",
        }
    )

    return [
        {
            "id": "zone-sector-a",
            "name": "Sector A",
            "risk": "normal",
            "active": False,
            "center": SECTOR_A_CENTER,
            "radius_m": 700,
            "domain": "physical",
            "status": "secure",
        },
        {
            "id": "zone-sector-b",
            "name": "Sector B",
            "risk": "critical" if sector_b_active else "normal",
            "active": sector_b_active,
            "center": SECTOR_B_CENTER,
            "radius_m": 900,
            "domain": "physical",
            "status": "at_risk" if sector_b_active else "watch",
        },
        {
            "id": "zone-sector-c",
            "name": "Sector C",
            "risk": "normal",
            "active": False,
            "center": SECTOR_C_CENTER,
            "radius_m": 700,
            "domain": "physical",
            "status": "monitor",
        },
        {
            "id": "zone-maritime-corridor",
            "name": "Restricted Maritime Corridor",
            "risk": "medium" if maritime_active else "normal",
            "active": maritime_active,
            "center": MARITIME_CORRIDOR_CENTER,
            "radius_m": 1100,
            "domain": "osint",
            "status": "anomaly" if maritime_active else "clear",
        },
        {
            "id": "zone-cyber-core",
            "name": "Cyber Core",
            "risk": "high" if cyber_active else "normal",
            "active": cyber_active,
            "center": HQ_NODE_CENTER,
            "radius_m": 650,
            "domain": "cyber",
            "status": "active" if cyber_active else "quiet",
        },
    ]


def build_threat_paths(
    signal_kinds: set[str],
    events: list[dict[str, Any]],
    tracks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Builds semantic paths for the frontend.

    These are not raw geometry. They describe mission relationships:
    - auth -> gateway
    - gateway -> HQ
    - UAS -> Sector B
    - vessel -> restricted corridor
    """
    paths: list[dict[str, Any]] = []

    if "auth.failed_burst" in signal_kinds or "auth.anomalous_login" in signal_kinds:
        paths.append(
            {
                "id": "path-auth-to-gateway",
                "kind": "cyber_path",
                "from": "AUTH SERVER",
                "to": "NETWORK GATEWAY",
                "active": True,
                "severity": "medium",
                "label": "Suspicious authentication path",
                "from_location": GATEWAY_CENTER,
                "to_location": HQ_NODE_CENTER,
            }
        )

    if "network.lateral_movement" in signal_kinds:
        paths.append(
            {
                "id": "path-gateway-to-hq",
                "kind": "cyber_path",
                "from": "NETWORK GATEWAY",
                "to": "HQ NODE",
                "active": True,
                "severity": "high",
                "label": "Lateral movement path",
                "from_location": GATEWAY_CENTER,
                "to_location": HQ_NODE_CENTER,
                "nodes": [
                    CYBER_NODE_CENTERS["node-1"],
                    CYBER_NODE_CENTERS["node-2"],
                    CYBER_NODE_CENTERS["node-3"],
                ],
            }
        )

    if "identity.privilege_escalation" in signal_kinds:
        paths.append(
            {
                "id": "path-privilege-escalation",
                "kind": "cyber_path",
                "from": "COMPROMISED ADMIN SESSION",
                "to": "DOMAIN ADMIN ROLE",
                "active": True,
                "severity": "high",
                "label": "Privilege escalation attempt",
                "from_location": HQ_NODE_CENTER,
                "to_location": CYBER_NODE_CENTERS["node-3"],
            }
        )

    if "network.data_exfiltration" in signal_kinds:
        paths.append(
            {
                "id": "path-data-exfiltration",
                "kind": "cyber_path",
                "from": "NETWORK GATEWAY",
                "to": "EXTERNAL DESTINATION",
                "active": True,
                "severity": "critical",
                "label": "Outbound data exfiltration path",
                "from_location": GATEWAY_CENTER,
                "to_location": {"lat": 37.818, "lon": -122.303},
            }
        )

    if "physical.drone_recon" in signal_kinds or has_track_kind(tracks, "physical.drone"):
        drone_track = latest_track_by_kind(tracks, "physical.drone")

        paths.append(
            {
                "id": "path-uas-to-sector-b",
                "kind": "physical_path",
                "from": "UAS TRACK",
                "to": "Sector B",
                "active": True,
                "severity": "critical",
                "label": "Drone approach path",
                "from_location": track_location(drone_track) or {"lat": 37.7654, "lon": -122.3382},
                "to_location": SECTOR_B_CENTER,
            }
        )

    if "osint.ais_anomaly" in signal_kinds or has_track_kind(tracks, "osint.ais_anomaly"):
        vessel_track = latest_track_by_kind(tracks, "osint.ais_anomaly")

        paths.append(
            {
                "id": "path-vessel-to-corridor",
                "kind": "osint_path",
                "from": "UNKNOWN VESSEL",
                "to": "Restricted Corridor",
                "active": True,
                "severity": "medium",
                "label": "AIS anomaly path",
                "from_location": track_location(vessel_track) or MARITIME_CORRIDOR_CENTER,
                "to_location": MARITIME_CORRIDOR_CENTER,
            }
        )

    return paths


def calculate_map_risk(signal_kinds: set[str]) -> str:
    """
    Map-level risk should reflect mission picture severity.
    This intentionally differs slightly from individual event severity.
    """
    if "network.data_exfiltration" in signal_kinds and "physical.drone_recon" in signal_kinds:
        return "critical"

    if "physical.drone_recon" in signal_kinds and "network.lateral_movement" in signal_kinds:
        return "critical"

    if "network.data_exfiltration" in signal_kinds:
        return "critical"

    if "identity.privilege_escalation" in signal_kinds:
        return "high"

    if "network.lateral_movement" in signal_kinds:
        return "high"

    if "physical.drone_recon" in signal_kinds:
        return "high"

    if "osint.ais_anomaly" in signal_kinds:
        return "medium"

    if "auth.anomalous_login" in signal_kinds:
        return "medium"

    if "auth.failed_burst" in signal_kinds:
        return "low"

    return "normal"


def determine_map_phase(signal_kinds: set[str]) -> str:
    """
    Mission phase for frontend storytelling.

    This lets the UI communicate progression instead of only showing raw risk.
    """
    if "physical.drone_recon" in signal_kinds and (
        "network.lateral_movement" in signal_kinds
        or "network.data_exfiltration" in signal_kinds
    ):
        return "multi_domain_convergence"

    if "network.data_exfiltration" in signal_kinds:
        return "exfiltration"

    if "identity.privilege_escalation" in signal_kinds:
        return "privilege_escalation"

    if "network.lateral_movement" in signal_kinds:
        return "lateral_movement"

    if "auth.anomalous_login" in signal_kinds:
        return "compromise"

    if "auth.failed_burst" in signal_kinds:
        return "probing"

    if "physical.drone_recon" in signal_kinds:
        return "perimeter_contact"

    if "osint.ais_anomaly" in signal_kinds:
        return "maritime_anomaly"

    return "baseline"


def has_auth_threat(signal_kinds: set[str]) -> bool:
    return (
        "auth.failed_burst" in signal_kinds
        or "auth.anomalous_login" in signal_kinds
    )


def is_multi_domain(signal_kinds: set[str]) -> bool:
    has_cyber = any(
        kind in signal_kinds
        for kind in {
            "auth.failed_burst",
            "auth.anomalous_login",
            "network.lateral_movement",
            "identity.privilege_escalation",
            "network.data_exfiltration",
        }
    )

    has_physical_or_osint = (
        "physical.drone_recon" in signal_kinds
        or "osint.ais_anomaly" in signal_kinds
    )

    return has_cyber and has_physical_or_osint


def confidence_for_track(event: dict[str, Any]) -> float:
    event_type = event.get("type")

    if event_type == "physical.drone":
        return 0.86

    if event_type == "osint.ais_anomaly":
        return 0.72

    return 0.6


def label_for_track(event: dict[str, Any]) -> str:
    event_type = event.get("type")
    metadata = event.get("metadata", {})

    if event_type == "physical.drone":
        return metadata.get("track_id") or "UAS"

    if event_type == "osint.ais_anomaly":
        return metadata.get("vessel_id") or "UNKNOWN VESSEL"

    return event.get("source", "TRACK")


def stable_track_id(event: dict[str, Any]) -> str:
    event_type = str(event.get("type", "unknown")).replace(".", "-")
    source = str(event.get("source", "source")).replace(".", "-")
    timestamp = str(event.get("timestamp", "no-time")).replace(":", "-")

    return f"track-{event_type}-{source}-{timestamp}"


def has_track_kind(tracks: list[dict[str, Any]], kind: str) -> bool:
    return any(track.get("kind") == kind for track in tracks)


def latest_track_by_kind(
    tracks: list[dict[str, Any]],
    kind: str,
) -> dict[str, Any] | None:
    matching = [track for track in tracks if track.get("kind") == kind]

    if not matching:
        return None

    return matching[-1]


def track_location(track: dict[str, Any] | None) -> dict[str, float] | None:
    if not track:
        return None

    lat = track.get("lat")
    lon = track.get("lon")

    if lat is None or lon is None:
        return None

    return {"lat": lat, "lon": lon}