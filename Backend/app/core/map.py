"""Raven Gap common-operating-picture state builder.

The frontend consumes `map_state` as a JSON contract, not a GIS engine. This
module builds a deterministic tactical picture with MGRS anchor data, phase
line, checkpoints, NAIs, friendly markers, contact markers, risk zones, and
routes. Legacy map keys are still populated so the existing Sentinel Forge UI can
render during the TacNet Edge transition.
"""

from __future__ import annotations

from typing import Any

from app.core.map_contract import (
    build_contract_checkpoints,
    build_contract_contact_markers,
    build_contract_friendly_markers,
    build_contract_nais,
    build_contract_risk_zones,
    build_mgrs_grid_anchor,
)


RAVEN_ANCHOR = {"lat": 37.4755, "lon": -118.6818}
PL_RAVEN = [
    {"lat": 37.4662, "lon": -118.6788},
    {"lat": 37.4825, "lon": -118.6762},
]

CHECKPOINTS = [
    {"id": "cp-1", "name": "CP1", "location": {"lat": 37.4718, "lon": -118.6821}},
    {"id": "cp-2", "name": "CP2", "location": {"lat": 37.4685, "lon": -118.6886}},
    {"id": "cp-3", "name": "CP3", "location": {"lat": 37.4815, "lon": -118.6698}},
]

NAIS = [
    {"id": "nai-1", "name": "NAI-1 North Draw", "center": {"lat": 37.482, "lon": -118.684}, "radius_m": 350},
    {"id": "nai-2", "name": "NAI-2 East Ridge", "center": {"lat": 37.4792, "lon": -118.6738}, "radius_m": 450},
    {"id": "nai-3", "name": "NAI-3 South Spur", "center": {"lat": 37.4669, "lon": -118.6775}, "radius_m": 320},
]

FRIENDLY_BASE = [
    {"id": "plt-raven", "label": "PL Raven", "unit": "PL Raven", "kind": "command", "location": RAVEN_ANCHOR},
    {"id": "sqd-1", "label": "1st", "unit": "1st Squad", "kind": "rifle_squad", "location": {"lat": 37.4718, "lon": -118.6821}},
    {"id": "sqd-2", "label": "2nd", "unit": "2nd Squad", "kind": "rifle_squad", "location": {"lat": 37.4787, "lon": -118.6749}},
    {"id": "sqd-3", "label": "3rd", "unit": "3rd Squad", "kind": "rifle_squad", "location": {"lat": 37.4669, "lon": -118.6775}},
    {"id": "wpn", "label": "WPN", "unit": "Weapons Squad", "kind": "support", "location": {"lat": 37.4762, "lon": -118.6858}},
    {"id": "jltv-1", "label": "JLTV", "unit": "JLTV-1", "kind": "vehicle", "location": {"lat": 37.4685, "lon": -118.6886}},
    {"id": "uas-2", "label": "Raven-2", "unit": "Raven-2", "kind": "uas", "location": {"lat": 37.4729, "lon": -118.6798}},
    {"id": "sens-1", "label": "OP/LP", "unit": "OP/LP Sensor", "kind": "sensor", "location": {"lat": 37.4796, "lon": -118.6715}},
]

ROUTES = [
    {
        "id": "route-finch",
        "name": "Route Finch",
        "status": "amber",
        "points": [
            {"lat": 37.4685, "lon": -118.6886},
            {"lat": 37.4718, "lon": -118.6821},
            {"lat": 37.4768, "lon": -118.6808},
            {"lat": 37.4815, "lon": -118.6698},
        ],
    },
    {
        "id": "route-support",
        "name": "Support Route",
        "status": "delayed",
        "points": [
            {"lat": 37.4669, "lon": -118.6775},
            {"lat": 37.4685, "lon": -118.6886},
            {"lat": 37.4762, "lon": -118.6858},
        ],
    },
]


def build_map_state(
    events: list[dict[str, Any]],
    signals: list[Any] | None = None,
    compactions: list[dict[str, Any]] | None = None,
    comms: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build the Raven Gap COP plus legacy map keys."""
    signals = signals or []
    compactions = compactions or []
    signal_kinds = extract_signal_kinds(signals)
    raven_events = raven_gap_events(events)
    tracks = build_tracks(events)
    contact_markers = build_contact_markers(raven_events)
    legacy_risk_zones = build_risk_zones(contact_markers, compactions)
    friendly_markers = build_friendly_markers(raven_events)

    return {
        "mgrs_grid_anchor": build_mgrs_grid_anchor(RAVEN_ANCHOR),
        "mgrs_grid": build_mgrs_grid(),
        "phase_line": [{"id": "pl_raven", "label": "PL Raven", "points": PL_RAVEN}],
        "checkpoints": build_contract_checkpoints(CHECKPOINTS),
        "nais": build_contract_nais(NAIS),
        "friendly_markers": build_contract_friendly_markers(friendly_markers),
        "contact_markers": build_contract_contact_markers(contact_markers),
        "risk_zones": build_contract_risk_zones(legacy_risk_zones),
        "routes": ROUTES,
        "event_pulses": build_event_pulses(raven_events),
        "risk_level": calculate_risk_level(signal_kinds, compactions),
        "phase": determine_phase(signal_kinds, compactions, raven_events, comms),
        "tracks": tracks,
        "assets": build_legacy_assets(signal_kinds, bool(events)),
        "zones": legacy_risk_zones,
        "threat_paths": build_legacy_threat_paths(signal_kinds, tracks),
        "friendly_marker_details": friendly_markers,
        "contact_marker_details": contact_markers,
    }


def build_mgrs_grid() -> dict[str, Any]:
    """Return the fictional MGRS grid anchor and display cells."""
    return {
        "datum": "WGS84",
        "zone": "11S",
        "anchor": {"mgrs": "11S LV 42820 49210", **RAVEN_ANCHOR},
        "cell_size_m": 1000,
        "labels": ["LV 42 49", "LV 43 49", "LV 42 50", "LV 43 50"],
    }


def raven_gap_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Filter current events to Raven Gap physical source reports."""
    return [
        event for event in events
        if event.get("metadata", {}).get("scenario") == "raven_gap"
    ]


def build_tracks(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert geospatial events into legacy track markers."""
    tracks = []
    for event in events:
        location = event_location(event)
        if not location:
            continue

        tracks.append({
            "id": event.get("id"),
            "kind": event.get("type", "unknown"),
            "lat": location["lat"],
            "lon": location["lon"],
            "source": event.get("source"),
            "timestamp": event.get("timestamp"),
            "label": event.get("metadata", {}).get("unit") or event.get("source"),
            "severity": event.get("severity", "unknown"),
            "metadata": event.get("metadata", {}),
        })

    return tracks


def build_friendly_markers(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return friendly markers updated by the latest source report location."""
    latest_by_unit = latest_locations_by_unit(events)
    markers = []

    for marker in FRIENDLY_BASE:
        unit = marker["unit"]
        markers.append({
            **marker,
            "location": latest_by_unit.get(unit, marker["location"]),
            "status": friendly_status(unit, events),
        })

    return markers


def latest_locations_by_unit(events: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    """Map each unit to its latest reported location."""
    locations: dict[str, dict[str, float]] = {}
    for event in sorted(events, key=event_sequence):
        unit = event.get("metadata", {}).get("unit")
        location = event_location(event)
        if unit and location:
            locations[unit] = location

    return locations


def build_contact_markers(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build contact and sensor markers from Raven Gap reports."""
    markers = []
    for event in events:
        report_type = normalized_report_type(event)
        if report_type not in {"SALUTE", "SENSOR", "UAS", "SITREP_SEED"}:
            continue

        location = event_location(event)
        if location:
            markers.append(contact_marker(event, location))

    return markers


def contact_marker(
    event: dict[str, Any],
    location: dict[str, float],
) -> dict[str, Any]:
    """Build one contact marker with source provenance."""
    metadata = event.get("metadata", {})
    return {
        "id": f"contact-{metadata.get('sequence', event.get('id'))}",
        "label": metadata.get("nai") or metadata.get("report_type", "CONTACT"),
        "kind": metadata.get("report_type", "CONTACT").lower(),
        "location": location,
        "severity": event.get("severity", "medium"),
        "source_event_id": event.get("id"),
        "message": event.get("message"),
    }


def normalized_report_type(event: dict[str, Any]) -> str:
    """Return Raven Gap report type with tolerant casing."""
    return str(event.get("metadata", {}).get("report_type", "")).upper()


def build_risk_zones(
    contact_markers: list[dict[str, Any]],
    compactions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Build tactical risk overlays for the COP."""
    nai_2_active = bool(contact_markers) or any(item.get("status") == "red" for item in compactions)
    return [
        {
            "id": "risk-nai-2",
            "name": "NAI-2 contact risk",
            "center": {"lat": 37.4792, "lon": -118.6738},
            "radius_m": 520,
            "risk": "high" if nai_2_active else "watch",
            "active": nai_2_active,
            "source": "squad_compaction",
        },
        {
            "id": "risk-cp2-delay",
            "name": "CP2 mobility constraint",
            "center": {"lat": 37.4685, "lon": -118.6886},
            "radius_m": 260,
            "risk": "medium",
            "active": any("mobility" in item.get("tags", []) for item in compactions),
            "source": "jltv_report",
        },
    ]


def build_event_pulses(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return source-report pulses for map animation."""
    return [
        {
            "id": event.get("id"),
            "location": event_location(event),
            "severity": event.get("severity"),
            "sequence": event_sequence(event),
        }
        for event in events
        if event_location(event)
    ]


def calculate_risk_level(
    signal_kinds: set[str],
    compactions: list[dict[str, Any]],
) -> str:
    """Calculate a map-level risk label."""
    if any(item.get("status") == "red" for item in compactions):
        return "critical"

    if any(kind in signal_kinds for kind in {"network.data_exfiltration", "physical.drone_recon"}):
        return "critical"

    if any(item.get("status") == "amber" for item in compactions):
        return "high"

    if "network.lateral_movement" in signal_kinds:
        return "high"

    return "normal"


def determine_phase(
    signal_kinds: set[str],
    compactions: list[dict[str, Any]],
    events: list[dict[str, Any]],
    comms: dict[str, Any] | None,
) -> str:
    """Return a concise operational phase for the map."""
    if (comms or {}).get("degraded"):
        return "ew_degraded"

    if any(item.get("status") == "red" for item in compactions):
        return "contact_confirmed"

    if events:
        return "movement_to_contact"

    if signal_kinds:
        return "legacy_fusion"

    return "baseline"


def build_legacy_assets(
    signal_kinds: set[str],
    has_events: bool,
) -> list[dict[str, Any]]:
    """Build old asset rows for existing frontend components."""
    live = "streaming" if has_events else "operational"
    return [
        {"id": "asset-auth", "name": "AUTH SERVER", "kind": "server", "domain": "cyber", "status": "suspect" if has_auth(signal_kinds) else live},
        {"id": "asset-edr", "name": "EDR SENSOR NETWORK", "kind": "sensor", "domain": "cyber", "status": "alerting" if has_edr(signal_kinds) else live},
        {"id": "asset-net-gw", "name": "NETWORK GATEWAY", "kind": "gateway", "domain": "cyber", "status": "alerting" if has_network(signal_kinds) else live},
        {"id": "asset-uas", "name": "UAS MONITORING", "kind": "uas", "domain": "physical", "status": "alerting" if "physical.drone_recon" in signal_kinds else live},
        {"id": "asset-ais", "name": "AIS MONITORING", "kind": "ais_feed", "domain": "osint", "status": "alerting" if "osint.ais_anomaly" in signal_kinds else live},
        {"id": "asset-fusion", "name": "FUSION CORE", "kind": "fusion_engine", "domain": "fusion", "status": "alerting" if signal_kinds else ("live" if has_events else "standby")},
    ]


def build_legacy_threat_paths(
    signal_kinds: set[str],
    tracks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Build old semantic path rows for existing frontend components."""
    paths = []
    path_rules = [
        ("auth", has_auth(signal_kinds)),
        ("lateral", "network.lateral_movement" in signal_kinds),
        ("privilege", "identity.privilege_escalation" in signal_kinds),
        ("exfil", "network.data_exfiltration" in signal_kinds),
        ("drone", "physical.drone_recon" in signal_kinds),
        ("ais", "osint.ais_anomaly" in signal_kinds),
    ]

    for path_id, active in path_rules:
        if active:
            paths.append({"id": f"path-{path_id}", "active": True, "severity": "high"})

    if not paths and tracks:
        paths.append({"id": "path-raven-gap", "active": True, "severity": "medium"})

    return paths


def extract_signal_kinds(signals: list[Any]) -> set[str]:
    """Support Signal dataclasses and serialized signal dictionaries."""
    kinds = set()
    for signal in signals:
        kind = getattr(signal, "kind", None)
        if kind is None and isinstance(signal, dict):
            kind = signal.get("kind")
        if kind:
            kinds.add(str(kind))
    return kinds


def event_location(event: dict[str, Any]) -> dict[str, float] | None:
    """Return `{lat, lon}` when present."""
    geospatial = event.get("geospatial") or {}
    lat = geospatial.get("lat")
    lon = geospatial.get("lon")
    if lat is None or lon is None:
        return None
    return {"lat": lat, "lon": lon}


def event_sequence(event: dict[str, Any]) -> int:
    """Read Raven Gap sequence number from metadata."""
    return int(event.get("metadata", {}).get("sequence", 0))


def friendly_status(unit: str, events: list[dict[str, Any]]) -> str:
    """Return a tactical status for a friendly marker."""
    unit_events = [event for event in events if event.get("metadata", {}).get("unit") == unit]
    if any(event.get("severity") == "high" for event in unit_events):
        return "red"
    if any(event.get("severity") == "medium" for event in unit_events):
        return "amber"
    if unit_events:
        return "green"
    return "unknown"


def has_auth(signal_kinds: set[str]) -> bool:
    """Return whether auth-related legacy signals are active."""
    return bool({"auth.failed_burst", "auth.anomalous_login"} & signal_kinds)


def has_edr(signal_kinds: set[str]) -> bool:
    """Return whether EDR-related legacy signals are active."""
    return bool({"network.lateral_movement", "identity.privilege_escalation"} & signal_kinds)


def has_network(signal_kinds: set[str]) -> bool:
    """Return whether network-gateway legacy signals are active."""
    return bool({"network.data_exfiltration", "network.lateral_movement"} & signal_kinds)
