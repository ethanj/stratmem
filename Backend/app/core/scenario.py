# app/core/scenario.py
from __future__ import annotations

from copy import deepcopy
from typing import Any


ScenarioId = str


def event(
    *,
    type: str,
    source: str,
    domain: str,
    severity: str,
    message: str,
    metadata: dict[str, Any] | None = None,
    geospatial: dict[str, float] | None = None,
) -> dict[str, Any]:
    payload = {
        "type": type,
        "source": source,
        "domain": domain,
        "severity": severity,
        "message": message,
        "metadata": metadata or {},
    }

    if geospatial:
        payload["geospatial"] = geospatial

    return payload


def build_common_background_prefix() -> list[dict[str, Any]]:
    return [
        event(
            type="auth.success",
            source="AUTH-GW-01",
            domain="cyber",
            severity="low",
            message="Normal user login from known workstation",
            metadata={
                "user": "analyst01",
                "ip": "10.0.1.14",
                "known_source": True,
                "unfamiliar_ip": False,
            },
        ),
        event(
            type="system.heartbeat",
            source="EDR-01",
            domain="cyber",
            severity="low",
            message="Endpoint sensor heartbeat received",
            metadata={
                "host": "node-1",
                "status": "healthy",
            },
        ),
        event(
            type="network.connection",
            source="NET-GW-01",
            domain="cyber",
            severity="low",
            message="Routine internal service connection",
            metadata={
                "src": "node-1",
                "dst": "service-api",
                "port": 443,
                "known_pattern": True,
            },
        ),
    ]


def coordinated_intrusion_events() -> list[dict[str, Any]]:
    return [
        *build_common_background_prefix(),

        event(
            type="auth.failed",
            source="AUTH-GW-01",
            domain="cyber",
            severity="low",
            message="Failed login for admin",
            metadata={"user": "admin", "ip": "185.199.110.12"},
        ),
        event(
            type="auth.failed",
            source="AUTH-GW-01",
            domain="cyber",
            severity="low",
            message="Failed login for admin",
            metadata={"user": "admin", "ip": "185.199.110.12"},
        ),
        event(
            type="auth.failed",
            source="AUTH-GW-01",
            domain="cyber",
            severity="low",
            message="Failed login for admin",
            metadata={"user": "admin", "ip": "185.199.110.12"},
        ),
        event(
            type="file.access",
            source="FILE-SRV-01",
            domain="cyber",
            severity="low",
            message="Routine file access by logistics user",
            metadata={
                "user": "logistics02",
                "path": "/shared/supply_manifest.csv",
                "known_pattern": True,
            },
        ),
        event(
            type="auth.success",
            source="AUTH-GW-01",
            domain="cyber",
            severity="medium",
            message="Successful login from unfamiliar IP",
            metadata={
                "user": "admin",
                "ip": "185.199.110.12",
                "known_source": False,
                "unfamiliar_ip": True,
                "after_failed_attempts": True,
            },
        ),
        event(
            type="system.health",
            source="NET-GW-01",
            domain="cyber",
            severity="low",
            message="Network gateway health check passed",
            metadata={"status": "healthy"},
        ),
        event(
            type="node.access",
            source="EDR-01",
            domain="cyber",
            severity="medium",
            message="Admin session accessed node-1",
            metadata={
                "user": "admin",
                "node": "node-1",
                "rapid_sequence": True,
            },
        ),
        event(
            type="node.access",
            source="EDR-01",
            domain="cyber",
            severity="medium",
            message="Admin session accessed node-2",
            metadata={
                "user": "admin",
                "node": "node-2",
                "rapid_sequence": True,
            },
        ),
        event(
            type="node.access",
            source="EDR-01",
            domain="cyber",
            severity="high",
            message="Admin session accessed node-3 in rapid sequence",
            metadata={
                "user": "admin",
                "node": "node-3",
                "rapid_sequence": True,
            },
        ),
        event(
            type="network.lateral",
            source="EDR-01",
            domain="cyber",
            severity="high",
            message="Lateral movement detected across internal nodes",
            metadata={
                "user": "admin",
                "nodes": ["node-1", "node-2", "node-3"],
                "technique": "rapid_node_access",
            },
        ),
        event(
            type="identity.privilege_escalation",
            source="EDR-01",
            domain="cyber",
            severity="high",
            message="Privilege escalation attempt detected",
            metadata={
                "user": "admin",
                "target_role": "domain_admin",
            },
        ),
        event(
            type="network.exfiltration",
            source="NET-GW-01",
            domain="cyber",
            severity="high",
            message="Unusual outbound data transfer detected",
            metadata={
                "user": "admin",
                "bytes": 84210000,
                "dst_ip": "203.0.113.42",
            },
        ),
        event(
            type="physical.drone",
            source="UAS-SENSOR-01",
            domain="physical",
            severity="high",
            message="Drone detected near protected perimeter Sector B",
            metadata={
                "sector": "Sector B",
                "track_id": "UAS-771",
            },
            geospatial={
                "lat": 37.8258,
                "lon": -122.3134,
                "alt": 180,
            },
        ),
        event(
            type="osint.ais_anomaly",
            source="AIS-FEED-01",
            domain="osint",
            severity="medium",
            message="AIS anomaly detected near restricted maritime corridor",
            metadata={
                "vessel_id": "UNKNOWN-VESSEL-42",
                "behavior": "course deviation",
            },
            geospatial={
                "lat": 37.824,
                "lon": -122.3364,
            },
        ),
    ]


def cyber_breach_events() -> list[dict[str, Any]]:
    return [
        *build_common_background_prefix(),

        event(
            type="auth.failed",
            source="AUTH-GW-01",
            domain="cyber",
            severity="low",
            message="Failed login for admin",
            metadata={"user": "admin", "ip": "198.51.100.23"},
        ),
        event(
            type="auth.failed",
            source="AUTH-GW-01",
            domain="cyber",
            severity="low",
            message="Failed login for admin",
            metadata={"user": "admin", "ip": "198.51.100.23"},
        ),
        event(
            type="auth.failed",
            source="AUTH-GW-01",
            domain="cyber",
            severity="low",
            message="Failed login for admin",
            metadata={"user": "admin", "ip": "198.51.100.23"},
        ),
        event(
            type="auth.success",
            source="AUTH-GW-01",
            domain="cyber",
            severity="medium",
            message="Successful admin login from unfamiliar source",
            metadata={
                "user": "admin",
                "ip": "198.51.100.23",
                "known_source": False,
                "unfamiliar_ip": True,
            },
        ),
        event(
            type="node.access",
            source="EDR-01",
            domain="cyber",
            severity="medium",
            message="Admin session accessed node-1",
            metadata={
                "user": "admin",
                "node": "node-1",
                "rapid_sequence": True,
            },
        ),
        event(
            type="node.access",
            source="EDR-01",
            domain="cyber",
            severity="medium",
            message="Admin session accessed node-2",
            metadata={
                "user": "admin",
                "node": "node-2",
                "rapid_sequence": True,
            },
        ),
        event(
            type="node.access",
            source="EDR-01",
            domain="cyber",
            severity="high",
            message="Admin session accessed node-3 in rapid sequence",
            metadata={
                "user": "admin",
                "node": "node-3",
                "rapid_sequence": True,
            },
        ),
        event(
            type="network.lateral",
            source="EDR-01",
            domain="cyber",
            severity="high",
            message="Lateral movement detected across internal nodes",
            metadata={
                "user": "admin",
                "nodes": ["node-1", "node-2", "node-3"],
            },
        ),
        event(
            type="identity.privilege_escalation",
            source="EDR-01",
            domain="cyber",
            severity="high",
            message="Privilege escalation attempt detected",
            metadata={
                "user": "admin",
                "target_role": "domain_admin",
            },
        ),
        event(
            type="network.exfiltration",
            source="NET-GW-01",
            domain="cyber",
            severity="high",
            message="Unusual outbound data transfer detected",
            metadata={
                "user": "admin",
                "bytes": 126700000,
                "dst_ip": "203.0.113.77",
            },
        ),
    ]


def physical_perimeter_events() -> list[dict[str, Any]]:
    return [
        *build_common_background_prefix(),

        event(
            type="sensor.heartbeat",
            source="UAS-SENSOR-01",
            domain="physical",
            severity="low",
            message="UAS monitoring sensor online near Sector B",
            metadata={
                "sector": "Sector B",
                "status": "online",
            },
        ),
        event(
            type="system.health",
            source="AIS-FEED-01",
            domain="osint",
            severity="low",
            message="AIS feed health check passed",
            metadata={
                "status": "nominal",
            },
        ),
        event(
            type="physical.drone",
            source="UAS-SENSOR-01",
            domain="physical",
            severity="medium",
            message="Drone detected outside restricted perimeter",
            metadata={
                "sector": "Sector B",
                "track_id": "UAS-204",
            },
            geospatial={
                "lat": 37.811,
                "lon": -122.346,
                "alt": 220,
            },
        ),
        event(
            type="physical.drone",
            source="UAS-SENSOR-01",
            domain="physical",
            severity="high",
            message="Drone track approaching protected perimeter Sector B",
            metadata={
                "sector": "Sector B",
                "track_id": "UAS-204",
            },
            geospatial={
                "lat": 37.8258,
                "lon": -122.3134,
                "alt": 185,
            },
        ),
        event(
            type="osint.ais_anomaly",
            source="AIS-FEED-01",
            domain="osint",
            severity="medium",
            message="Unknown vessel deviating toward restricted maritime corridor",
            metadata={
                "vessel_id": "UNKNOWN-VESSEL-17",
                "behavior": "course deviation",
            },
            geospatial={
                "lat": 37.824,
                "lon": -122.3364,
            },
        ),
    ]


SCENARIO_REGISTRY: dict[str, dict[str, Any]] = {
    "coordinated_intrusion": {
        "id": "coordinated_intrusion",
        "name": "Coordinated Intrusion",
        "description": "Cyber, physical, and OSINT indicators converge into a coordinated intrusion pattern.",
        "builder": coordinated_intrusion_events,
    },
    "cyber_breach": {
        "id": "cyber_breach",
        "name": "Cyber-Only Breach",
        "description": "Unauthorized access escalates into lateral movement, privilege escalation, and exfiltration.",
        "builder": cyber_breach_events,
    },
    "physical_perimeter": {
        "id": "physical_perimeter",
        "name": "Physical Perimeter Threat",
        "description": "Drone and maritime anomalies indicate a developing perimeter threat.",
        "builder": physical_perimeter_events,
    },
}


DEFAULT_SCENARIO_ID = "coordinated_intrusion"


def get_scenarios() -> list[dict[str, str]]:
    return [
        {
            "id": scenario["id"],
            "name": scenario["name"],
            "description": scenario["description"],
        }
        for scenario in SCENARIO_REGISTRY.values()
    ]


def get_scenario_metadata(scenario_id: str = DEFAULT_SCENARIO_ID) -> dict[str, str]:
    scenario = SCENARIO_REGISTRY.get(scenario_id) or SCENARIO_REGISTRY[DEFAULT_SCENARIO_ID]

    return {
        "id": scenario["id"],
        "name": scenario["name"],
        "description": scenario["description"],
    }


def build_scenario_events(scenario_id: str = DEFAULT_SCENARIO_ID) -> list[dict]:
    scenario = SCENARIO_REGISTRY.get(scenario_id)

    if not scenario:
        scenario = SCENARIO_REGISTRY[DEFAULT_SCENARIO_ID]

    return deepcopy(scenario["builder"]())


def scenario_exists(scenario_id: str) -> bool:
    return scenario_id in SCENARIO_REGISTRY