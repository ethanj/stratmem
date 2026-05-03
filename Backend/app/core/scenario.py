"""Scenario registry for deterministic Sentinel Forge demo traffic.

This module owns the public scenario API used by FastAPI and tests:
`get_scenarios`, `get_scenario_metadata`, `build_scenario_events`, and
`scenario_exists`. Scenario templates intentionally stay plain dictionaries so
the mock adapter and normalizer can treat them like external adapter payloads.

Raven Gap is added as a selectable Branch B scenario without changing
`DEFAULT_SCENARIO_ID`. Its custom tactical fields are kept in `metadata`, and
all Raven Gap events use the `physical` domain so no new detection rules are
introduced.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any


ScenarioId = str
DEFAULT_SCENARIO_ID = "coordinated_intrusion"


def event(
    *,
    id: str | None = None,
    type: str,
    source: str,
    domain: str,
    severity: str,
    message: str,
    metadata: dict[str, Any] | None = None,
    geospatial: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Build one adapter-like event template.

    Args:
        id: Optional stable scenario event identifier.
        type: Canonical event type.
        source: Sensor, adapter, or mesh node name.
        domain: Normalized domain consumed by detection.
        severity: Event severity before correlation.
        message: Operator-readable report text.
        metadata: Scenario-specific structured fields.
        geospatial: Optional `{lat, lon}` coordinate payload.

    Returns:
        A dictionary suitable for the mock adapter.
    """
    payload = {
        "type": type,
        "source": source,
        "domain": domain,
        "severity": severity,
        "message": message,
        "metadata": metadata or {},
    }

    if id:
        payload["id"] = id

    if geospatial:
        payload["geospatial"] = geospatial

    return payload


COMMON_BACKGROUND_EVENTS = [
    event(
        type="auth.success",
        source="AUTH-GW-01",
        domain="cyber",
        severity="low",
        message="Normal user login from known workstation",
        metadata={"user": "analyst01", "ip": "10.0.1.14", "known_source": True},
    ),
    event(
        type="system.heartbeat",
        source="EDR-01",
        domain="cyber",
        severity="low",
        message="Endpoint sensor heartbeat received",
        metadata={"host": "node-1", "status": "healthy"},
    ),
    event(
        type="network.connection",
        source="NET-GW-01",
        domain="cyber",
        severity="low",
        message="Routine internal service connection",
        metadata={"src": "node-1", "dst": "service-api", "port": 443},
    ),
]


COORDINATED_INTRUSION_EVENTS = [
    *COMMON_BACKGROUND_EVENTS,
    event(type="auth.failed", source="AUTH-GW-01", domain="cyber", severity="low", message="Failed login for admin", metadata={"user": "admin", "ip": "185.199.110.12"}),
    event(type="auth.failed", source="AUTH-GW-01", domain="cyber", severity="low", message="Failed login for admin", metadata={"user": "admin", "ip": "185.199.110.12"}),
    event(type="auth.failed", source="AUTH-GW-01", domain="cyber", severity="low", message="Failed login for admin", metadata={"user": "admin", "ip": "185.199.110.12"}),
    event(type="file.access", source="FILE-SRV-01", domain="cyber", severity="low", message="Routine file access by logistics user", metadata={"user": "logistics02", "path": "/shared/supply_manifest.csv"}),
    event(type="auth.success", source="AUTH-GW-01", domain="cyber", severity="medium", message="Successful login from unfamiliar IP", metadata={"user": "admin", "ip": "185.199.110.12", "known_source": False, "unfamiliar_ip": True, "after_failed_attempts": True}),
    event(type="system.health", source="NET-GW-01", domain="cyber", severity="low", message="Network gateway health check passed", metadata={"status": "healthy"}),
    event(type="node.access", source="EDR-01", domain="cyber", severity="medium", message="Admin session accessed node-1", metadata={"user": "admin", "node": "node-1", "rapid_sequence": True}),
    event(type="node.access", source="EDR-01", domain="cyber", severity="medium", message="Admin session accessed node-2", metadata={"user": "admin", "node": "node-2", "rapid_sequence": True}),
    event(type="node.access", source="EDR-01", domain="cyber", severity="high", message="Admin session accessed node-3 in rapid sequence", metadata={"user": "admin", "node": "node-3", "rapid_sequence": True}),
    event(type="network.lateral", source="EDR-01", domain="cyber", severity="high", message="Lateral movement detected across internal nodes", metadata={"user": "admin", "nodes": ["node-1", "node-2", "node-3"], "technique": "rapid_node_access"}),
    event(type="identity.privilege_escalation", source="EDR-01", domain="cyber", severity="high", message="Privilege escalation attempt detected", metadata={"user": "admin", "target_role": "domain_admin"}),
    event(type="network.exfiltration", source="NET-GW-01", domain="cyber", severity="high", message="Unusual outbound data transfer detected", metadata={"user": "admin", "bytes": 84210000, "dst_ip": "203.0.113.42"}),
    event(type="physical.drone", source="UAS-SENSOR-01", domain="physical", severity="high", message="Drone detected near protected perimeter Sector B", metadata={"sector": "Sector B", "track_id": "UAS-771"}, geospatial={"lat": 37.8258, "lon": -122.3134, "alt": 180}),
    event(type="osint.ais_anomaly", source="AIS-FEED-01", domain="osint", severity="medium", message="AIS anomaly detected near restricted maritime corridor", metadata={"vessel_id": "UNKNOWN-VESSEL-42", "behavior": "course deviation"}, geospatial={"lat": 37.824, "lon": -122.3364}),
]


CYBER_BREACH_EVENTS = [
    *COMMON_BACKGROUND_EVENTS,
    event(type="auth.failed", source="AUTH-GW-01", domain="cyber", severity="low", message="Failed login for admin", metadata={"user": "admin", "ip": "198.51.100.23"}),
    event(type="auth.failed", source="AUTH-GW-01", domain="cyber", severity="low", message="Failed login for admin", metadata={"user": "admin", "ip": "198.51.100.23"}),
    event(type="auth.failed", source="AUTH-GW-01", domain="cyber", severity="low", message="Failed login for admin", metadata={"user": "admin", "ip": "198.51.100.23"}),
    event(type="auth.success", source="AUTH-GW-01", domain="cyber", severity="medium", message="Successful admin login from unfamiliar source", metadata={"user": "admin", "ip": "198.51.100.23", "known_source": False, "unfamiliar_ip": True}),
    event(type="node.access", source="EDR-01", domain="cyber", severity="medium", message="Admin session accessed node-1", metadata={"user": "admin", "node": "node-1", "rapid_sequence": True}),
    event(type="node.access", source="EDR-01", domain="cyber", severity="medium", message="Admin session accessed node-2", metadata={"user": "admin", "node": "node-2", "rapid_sequence": True}),
    event(type="node.access", source="EDR-01", domain="cyber", severity="high", message="Admin session accessed node-3 in rapid sequence", metadata={"user": "admin", "node": "node-3", "rapid_sequence": True}),
    event(type="network.lateral", source="EDR-01", domain="cyber", severity="high", message="Lateral movement detected across internal nodes", metadata={"user": "admin", "nodes": ["node-1", "node-2", "node-3"]}),
    event(type="identity.privilege_escalation", source="EDR-01", domain="cyber", severity="high", message="Privilege escalation attempt detected", metadata={"user": "admin", "target_role": "domain_admin"}),
    event(type="network.exfiltration", source="NET-GW-01", domain="cyber", severity="high", message="Unusual outbound data transfer detected", metadata={"user": "admin", "bytes": 126700000, "dst_ip": "203.0.113.77"}),
]


PHYSICAL_PERIMETER_EVENTS = [
    *COMMON_BACKGROUND_EVENTS,
    event(type="sensor.heartbeat", source="UAS-SENSOR-01", domain="physical", severity="low", message="UAS monitoring sensor online near Sector B", metadata={"sector": "Sector B", "status": "online"}),
    event(type="system.health", source="AIS-FEED-01", domain="osint", severity="low", message="AIS feed health check passed", metadata={"status": "nominal"}),
    event(type="physical.drone", source="UAS-SENSOR-01", domain="physical", severity="medium", message="Drone detected outside restricted perimeter", metadata={"sector": "Sector B", "track_id": "UAS-204"}, geospatial={"lat": 37.811, "lon": -122.346, "alt": 220}),
    event(type="physical.drone", source="UAS-SENSOR-01", domain="physical", severity="high", message="Drone track approaching protected perimeter Sector B", metadata={"sector": "Sector B", "track_id": "UAS-204"}, geospatial={"lat": 37.8258, "lon": -122.3134, "alt": 185}),
    event(type="osint.ais_anomaly", source="AIS-FEED-01", domain="osint", severity="medium", message="Unknown vessel deviating toward restricted maritime corridor", metadata={"vessel_id": "UNKNOWN-VESSEL-17", "behavior": "course deviation"}, geospatial={"lat": 37.824, "lon": -122.3364}),
]


def raven_metadata(
    *,
    sender_id: str,
    unit_label: str,
    mesh_node: str,
    mgrs: str,
    t_offset_sec: int,
    report_type: str,
    rollup_id: str,
    sequence: int,
    **extra: Any,
) -> dict[str, Any]:
    """Build the required Raven Gap metadata envelope."""
    return {
        "sender_id": sender_id,
        "unit_label": unit_label,
        "unit": unit_label,
        "mesh_node": mesh_node,
        "mgrs": mgrs,
        "t_offset_sec": t_offset_sec,
        "report_type": report_type,
        "background": False,
        "scenario": "raven_gap",
        "rollup_id": rollup_id,
        "sequence": sequence,
        **extra,
    }


RAVEN_GAP_EVENTS = [
    event(id="rg_001", type="physical.pli", source="1/A", domain="physical", severity="low", message="1/A crosses CP1; moving north on Route Finch.", metadata=raven_metadata(sender_id="mesh-1a", unit_label="1st Squad Alpha Team", mesh_node="SQD-1", mgrs="11S LV 42181 49118", t_offset_sec=0, report_type="PLI", rollup_id="alpha", sequence=1, checkpoint="CP1", route="Route Finch", posture="moving"), geospatial={"lat": 37.4718, "lon": -118.6821}),
    event(id="rg_002", type="physical.lace", source="1/B", domain="physical", severity="medium", message="1/B LACE: leaders up, ammo amber, comms intermittent.", metadata=raven_metadata(sender_id="mesh-1b", unit_label="1st Squad Bravo Team", mesh_node="SQD-1", mgrs="11S LV 42192 49142", t_offset_sec=15, report_type="LACE", rollup_id="alpha", sequence=2, leaders="green", ammo="amber", casualties="green", equipment="amber"), geospatial={"lat": 37.474, "lon": -118.6815}),
    event(id="rg_003", type="physical.salute", source="2/A", domain="physical", severity="medium", message="2/A SALUTE: two possible dismounts east ridge near NAI-2.", metadata=raven_metadata(sender_id="mesh-2a", unit_label="2nd Squad Alpha Team", mesh_node="SQD-2", mgrs="11S LV 42274 49188", t_offset_sec=30, report_type="SALUTE", rollup_id="bravo", sequence=3, size="2 PAX", activity="observing route", nai="NAI-2"), geospatial={"lat": 37.4787, "lon": -118.6749}),
    event(id="rg_004", type="physical.sensor", source="OP-7", domain="physical", severity="medium", message="OP-7 reports acoustic trigger on east ridge draw.", metadata=raven_metadata(sender_id="mesh-op7", unit_label="OP/LP Sensor 7", mesh_node="SENS-1", mgrs="11S LV 42306 49198", t_offset_sec=45, report_type="SENSOR", rollup_id="bravo", sequence=4, trigger="acoustic", nai="NAI-2", confidence=0.68), geospatial={"lat": 37.4796, "lon": -118.6715}),
    event(id="rg_005", type="physical.uas", source="RQ-11", domain="physical", severity="low", message="RQ-11 launches from CP1 to scan Route Finch ahead of PL Raven.", metadata=raven_metadata(sender_id="mesh-rq11", unit_label="RQ-11 Raven", mesh_node="UAS-2", mgrs="11S LV 42209 49130", t_offset_sec=60, report_type="UAS", rollup_id="alpha", sequence=5, asset="small UAS", task="route scan"), geospatial={"lat": 37.4729, "lon": -118.6798}),
    event(id="rg_006", type="physical.uas", source="RQ-11", domain="physical", severity="high", message="RQ-11 observes three dismounts moving south from NAI-2.", metadata=raven_metadata(sender_id="mesh-rq11", unit_label="RQ-11 Raven", mesh_node="UAS-2", mgrs="11S LV 42289 49203", t_offset_sec=75, report_type="UAS", rollup_id="bravo", sequence=6, asset="small UAS", nai="NAI-2", activity="3 dismounts moving south"), geospatial={"lat": 37.4801, "lon": -118.6734}),
    event(id="rg_007", type="physical.support", source="WPN", domain="physical", severity="low", message="WPN set support-by-observation west of Phase Line Raven.", metadata=raven_metadata(sender_id="mesh-wpn", unit_label="Weapons Squad", mesh_node="WPN", mgrs="11S LV 42147 49165", t_offset_sec=90, report_type="SUPPORT", rollup_id="charlie", sequence=7, position="support by observation", phase_line="PL Raven"), geospatial={"lat": 37.4762, "lon": -118.6858}),
    event(id="rg_008", type="physical.vehicle", source="JLTV-1", domain="physical", severity="medium", message="JLTV-1 delayed at CP2; culvert washout slows support movement.", metadata=raven_metadata(sender_id="mesh-jltv1", unit_label="JLTV-1", mesh_node="JLTV-1", mgrs="11S LV 42121 49083", t_offset_sec=105, report_type="ACE", rollup_id="charlie", sequence=8, checkpoint="CP2", equipment="amber", constraint="culvert washout"), geospatial={"lat": 37.4685, "lon": -118.6886}),
    event(id="rg_009", type="physical.pli", source="3/A", domain="physical", severity="low", message="3/A holds south spur; maintaining flank screen.", metadata=raven_metadata(sender_id="mesh-3a", unit_label="3rd Squad Alpha Team", mesh_node="SQD-3", mgrs="11S LV 42220 49064", t_offset_sec=120, report_type="PLI", rollup_id="charlie", sequence=9, posture="holding", task="flank screen"), geospatial={"lat": 37.4669, "lon": -118.6775}),
    event(id="rg_010", type="physical.salute", source="2/B", domain="physical", severity="high", message="2/B confirms contact: three dismounts with handheld radio at NAI-2.", metadata=raven_metadata(sender_id="mesh-2b", unit_label="2nd Squad Bravo Team", mesh_node="SQD-2", mgrs="11S LV 42286 49193", t_offset_sec=135, report_type="SALUTE", rollup_id="bravo", sequence=10, size="3 PAX", activity="moving south", equipment="handheld radio", nai="NAI-2"), geospatial={"lat": 37.4792, "lon": -118.6738}),
    event(id="rg_011", type="physical.ace", source="1/A", domain="physical", severity="medium", message="1/A ACE: one minor ankle injury; pace slowed but mission capable.", metadata=raven_metadata(sender_id="mesh-1a", unit_label="1st Squad Alpha Team", mesh_node="SQD-1", mgrs="11S LV 42200 49173", t_offset_sec=150, report_type="ACE", rollup_id="alpha", sequence=11, ammo="amber", casualties="one minor", equipment="green", pace="slow"), geospatial={"lat": 37.4768, "lon": -118.6808}),
    event(id="rg_012", type="physical.command", source="PL", domain="physical", severity="high", message="PL updates NAI-2 risk high; collect with RQ-11 and keep squads west of PL Raven.", metadata=raven_metadata(sender_id="mesh-plt", unit_label="PL Raven", mesh_node="PLT", mgrs="11S LV 42185 49159", t_offset_sec=165, report_type="SITREP_SEED", rollup_id="bravo", sequence=12, nai="NAI-2", risk="high", recommendation="maintain UAS collection"), geospatial={"lat": 37.4755, "lon": -118.6828}),
]


SCENARIO_REGISTRY: dict[ScenarioId, dict[str, Any]] = {
    "coordinated_intrusion": {
        "id": "coordinated_intrusion",
        "name": "Coordinated Intrusion",
        "description": "Cyber, physical, and OSINT indicators converge into a coordinated intrusion pattern.",
        "events": COORDINATED_INTRUSION_EVENTS,
    },
    "cyber_breach": {
        "id": "cyber_breach",
        "name": "Cyber-Only Breach",
        "description": "Unauthorized access escalates into lateral movement, privilege escalation, and exfiltration.",
        "events": CYBER_BREACH_EVENTS,
    },
    "physical_perimeter": {
        "id": "physical_perimeter",
        "name": "Physical Perimeter Threat",
        "description": "Drone and maritime anomalies indicate a developing perimeter threat.",
        "events": PHYSICAL_PERIMETER_EVENTS,
    },
    "raven_gap": {
        "id": "raven_gap",
        "name": "Raven Gap",
        "description": "TacNet Edge platoon movement under EW degradation in a fictional contested valley.",
        "events": RAVEN_GAP_EVENTS,
    },
}


def get_scenarios() -> list[dict[str, str]]:
    """Return scenario metadata for the scenario picker."""
    return [
        {
            "id": scenario["id"],
            "name": scenario["name"],
            "description": scenario["description"],
        }
        for scenario in SCENARIO_REGISTRY.values()
    ]


def get_scenario_metadata(scenario_id: str = DEFAULT_SCENARIO_ID) -> dict[str, str]:
    """Return safe metadata for a requested scenario or the default fallback."""
    scenario = SCENARIO_REGISTRY.get(scenario_id) or SCENARIO_REGISTRY[DEFAULT_SCENARIO_ID]
    return {
        "id": scenario["id"],
        "name": scenario["name"],
        "description": scenario["description"],
    }


def build_scenario_events(scenario_id: str = DEFAULT_SCENARIO_ID) -> list[dict]:
    """Return fresh event templates for a requested scenario."""
    scenario = SCENARIO_REGISTRY.get(scenario_id) or SCENARIO_REGISTRY[DEFAULT_SCENARIO_ID]
    return deepcopy(scenario["events"])


def scenario_exists(scenario_id: str) -> bool:
    """Return whether a scenario ID is registered."""
    return scenario_id in SCENARIO_REGISTRY
