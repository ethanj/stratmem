"""Tactical entity model for the Raven Gap S2 common operating picture.

The map entity contract is intentionally additive to the legacy map fields. It
gives the frontend a richer, Palantir-style object model for squads, individual
soldiers, vehicles, UAS, sensors, and contacts without changing scenario flow.
"""

from __future__ import annotations

from typing import Any

from app.core.map_demo import (
    ASSETS,
    NINE_LINE_SENDER_ID,
    NINE_LINE_SUBJECT_ID,
    RIFLE_ROLES,
    SISTER_PLATOONS,
    SQUADS,
    WEAPONS_ROLES,
    DemoReadiness,
    build_demo_readiness,
    platoon_activity,
    platoon_status,
    soldier_extra,
    soldier_history,
    squad_activity,
)


def build_map_entities(
    events: list[dict[str, Any]],
    contacts: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Build the full tactical entity list used by the S2 map."""
    latest = latest_events_by_sender(events)
    demo = build_demo_readiness(events)
    contact_entities = [contact_entity(contact) for contact in contacts]
    squads = [squad_entity(spec, latest, demo) for spec in SQUADS]
    personnel = [soldier for spec in SQUADS for soldier in squad_soldiers(spec, latest, demo)]
    assets = [asset_entity(spec, latest) for spec in ASSETS]
    sister_platoons = [mock_platoon_entity(spec) for spec in SISTER_PLATOONS]

    return [
        platoon_entity(latest, demo),
        *sister_platoons,
        *squads,
        *personnel,
        *assets,
        *contact_entities,
    ]


def platoon_entity(
    latest: dict[str, dict[str, Any]],
    demo: DemoReadiness,
) -> dict[str, Any]:
    """Return the platoon command entity."""
    report = latest.get("PL")
    personnel_available = 35 if demo.casevac_active else 36
    return base_entity(
        entity_id="plt-raven",
        parent_id=None,
        label="PL RAVEN",
        callsign="PL",
        entity_type="platoon",
        sidc="SFG-UCI----D",
        lat=location_value(report, "lat", 37.4755),
        lon=location_value(report, "lon", -118.6818),
        status=platoon_status(demo),
        history=history_for("PL", latest),
        extra={
            "echelon": "platoon",
            "activity": platoon_activity(demo),
            "personnel_available": personnel_available,
            "personnel_total": 36,
        },
    )


def squad_entity(
    spec: tuple[str, str, str, str, float, float],
    latest: dict[str, dict[str, Any]],
    demo: DemoReadiness,
) -> dict[str, Any]:
    """Return one aggregate squad entity."""
    squad_id, label, callsign, sidc, lat, lon = spec
    members = squad_soldiers(spec, latest, demo)
    readiness = aggregate_readiness([member["status"] for member in members])
    report = latest.get(squad_sender_id(squad_id))

    return base_entity(
        entity_id=squad_id,
        parent_id="plt-raven",
        label=label,
        callsign=callsign,
        entity_type="squad",
        sidc=sidc,
        lat=location_value(report, "lat", lat),
        lon=location_value(report, "lon", lon),
        status=readiness,
        history=history_for(squad_sender_id(squad_id), latest),
        extra={
            "echelon": "squad",
            "activity": squad_activity(squad_id, demo),
            "personnel_available": available_count(members),
            "personnel_total": len(members),
        },
    )


def squad_soldiers(
    spec: tuple[str, str, str, str, float, float],
    latest: dict[str, dict[str, Any]],
    demo: DemoReadiness,
) -> list[dict[str, Any]]:
    """Return individual soldiers under one squad."""
    squad_id, _, callsign, _, lat, lon = spec
    roles = WEAPONS_ROLES if squad_id == "weapons_squad" else RIFLE_ROLES
    return [
        soldier_entity(squad_id, callsign, role, index, lat, lon, latest, demo)
        for index, role in enumerate(roles)
    ]


def soldier_entity(
    squad_id: str,
    squad_callsign: str,
    role: tuple[str, str, str],
    index: int,
    lat: float,
    lon: float,
    latest: dict[str, dict[str, Any]],
    demo: DemoReadiness,
) -> dict[str, Any]:
    """Return one synthetic soldier status object for demo inspection."""
    role_id, role_label, role_name = role
    entity_id = f"{squad_id}_{role_id}"
    display = f"{squad_callsign}-{role_label}"
    override = soldier_status_override(entity_id, demo)
    fallback_history = history_for(squad_sender_id(squad_id), latest)

    return base_entity(
        entity_id=entity_id,
        parent_id=squad_id,
        label=display,
        callsign=display,
        entity_type="personnel",
        sidc="SFG-UCI----A",
        lat=lat + personnel_lat_offset(index),
        lon=lon + personnel_lon_offset(index),
        status=override or status("green", "green", "green", "green", "green"),
        history=soldier_history(entity_id, fallback_history, demo),
        extra=soldier_extra(entity_id, role_id, role_name, demo),
    )


def mock_platoon_entity(spec: tuple[str, str, str, float, float]) -> dict[str, Any]:
    """Return an adjacent platoon symbol without drilldown details."""
    entity_id, label, callsign, lat, lon = spec
    return base_entity(
        entity_id=entity_id,
        parent_id=None,
        label=label,
        callsign=callsign,
        entity_type="platoon",
        sidc="SFG-UCI----D",
        lat=lat,
        lon=lon,
        status=status("unknown", "unknown", "unknown", "unknown", "unknown"),
        history=[history_item(None, "Adjacent platoon shown for context only.")],
        extra={"echelon": "platoon", "detail_locked": True},
    )


def asset_entity(
    spec: tuple[str, str, str, str, str, float, float],
    latest: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Return one vehicle, UAS, or sensor entity."""
    entity_id, label, callsign, entity_type, sidc, lat, lon = spec
    report = latest.get(entity_id)
    return base_entity(
        entity_id=entity_id,
        parent_id=asset_parent(entity_type),
        label=label,
        callsign=callsign,
        entity_type=entity_type,
        sidc=sidc,
        lat=location_value(report, "lat", lat),
        lon=location_value(report, "lon", lon),
        status=asset_status(entity_type, report),
        history=history_for(entity_id, latest),
        extra={"echelon": "equipment"},
    )


def contact_entity(contact: dict[str, Any]) -> dict[str, Any]:
    """Return a hostile or unknown contact entity."""
    location = contact.get("location", {})
    return base_entity(
        entity_id=contact["id"].replace("contact-", "ctc_"),
        parent_id=None,
        label=contact.get("label", "CONTACT"),
        callsign=contact.get("label", "CONTACT"),
        entity_type="contact",
        sidc="SHG-UCI----C",
        lat=float(location.get("lat", 37.4792)),
        lon=float(location.get("lon", -118.6738)),
        status=status("red", "red", "unknown", "unknown", "green"),
        history=[history_item(contact.get("source_event_id"), contact.get("message"))],
        extra={"affiliation": "hostile", "nationality": "unknown"},
    )


def base_entity(
    entity_id: str,
    parent_id: str | None,
    label: str,
    callsign: str,
    entity_type: str,
    sidc: str,
    lat: float,
    lon: float,
    status: dict[str, str],
    history: list[dict[str, Any]],
    extra: dict[str, Any],
) -> dict[str, Any]:
    """Return the shared entity contract shape."""
    return {
        "id": entity_id,
        "parent_id": parent_id,
        "label": label,
        "callsign": callsign,
        "entity_type": entity_type,
        "affiliation": extra.get("affiliation", "friend"),
        "nationality": extra.get("nationality", "USA"),
        "sidc": sidc,
        "echelon": extra.get("echelon"),
        "lat": lat,
        "lon": lon,
        "mgrs": "11S LV 42 49",
        "status": status,
        "history": history,
        **{key: value for key, value in extra.items() if key not in {"affiliation", "nationality"}},
    }


def latest_events_by_sender(events: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Return latest Raven Gap event keyed by sender id."""
    return {
        str(event.get("metadata", {}).get("sender_id")): event
        for event in sorted(events, key=event_sequence)
        if event.get("metadata", {}).get("sender_id")
    }


def history_for(sender_id: str, latest: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    """Return the latest event history for a sender."""
    event = latest.get(sender_id)
    if not event:
        return [history_item(None, "No individual update; reporting green by exception.")]
    return [history_item(event.get("id"), event.get("message"))]


def history_item(event_id: Any, message: Any) -> dict[str, Any]:
    """Return one drawer history item."""
    return {"event_id": event_id, "message": message or "No report text available."}


def status(
    health: str,
    readiness: str,
    ammo: str,
    comms: str,
    mobility: str,
    battery: str = "n/a",
    fuel: str = "n/a",
) -> dict[str, str]:
    """Return a normalized tactical status dictionary."""
    return {
        "health": health,
        "readiness": readiness,
        "ammo": ammo,
        "comms": comms,
        "mobility": mobility,
        "battery": battery,
        "fuel": fuel,
    }


def aggregate_readiness(statuses: list[dict[str, str]]) -> dict[str, str]:
    """Aggregate child statuses into one squad status."""
    return status(
        health=worst(statuses, "health"),
        readiness=worst(statuses, "readiness"),
        ammo=worst(statuses, "ammo"),
        comms=worst(statuses, "comms"),
        mobility=worst(statuses, "mobility"),
    )


def worst(statuses: list[dict[str, str]], key: str) -> str:
    """Return the worst green/amber/red status value for a key."""
    ranks = {"unknown": 0, "green": 1, "amber": 2, "red": 3}
    values = [item.get(key, "unknown") for item in statuses]
    return max(values, key=lambda value: ranks.get(value, 0), default="unknown")


def available_count(members: list[dict[str, Any]]) -> int:
    """Return personnel count not marked red for health/readiness."""
    return sum(1 for member in members if member["status"].get("health") != "red")


def soldier_status_override(
    entity_id: str,
    demo: DemoReadiness,
) -> dict[str, str] | None:
    """Return scripted individual status overrides for the demo."""
    if entity_id == NINE_LINE_SENDER_ID and demo.casevac_active:
        return status("green", "amber", "green", "amber", "green")
    if entity_id == NINE_LINE_SUBJECT_ID and demo.casevac_active:
        return status("red", "red", "green", "green", "red")

    overrides = {
        "1st_squad_btl": status("green", "amber", "amber", "amber", "green"),
        "2nd_squad_atl": status("green", "green", "green", "amber", "green"),
        "weapons_squad_mg1": status("green", "amber", "amber", "green", "green"),
    }
    return overrides.get(entity_id)


def asset_status(entity_type: str, report: dict[str, Any] | None) -> dict[str, str]:
    """Return status for equipment entities."""
    if entity_type == "vehicle":
        return status("green", "amber", "green", "green", "amber", fuel="amber")
    if entity_type == "drone":
        return status("green", "amber", "n/a", "amber", "green", battery="amber")
    if report:
        return status("green", "green", "n/a", "green", "green", battery="green")
    return status("green", "green", "n/a", "green", "green")


def location_value(event: dict[str, Any] | None, key: str, fallback: float) -> float:
    """Return a float location component from an event or fallback."""
    location = (event or {}).get("geospatial", {})
    return float(location.get(key, fallback))


def personnel_lat_offset(index: int) -> float:
    """Return deterministic individual-soldier latitude spread."""
    offsets = [0.00018, 0.00012, 0.00004, -0.00004, -0.00012, 0.00006, -0.00002, -0.00010, -0.00018]
    return offsets[index % len(offsets)]


def personnel_lon_offset(index: int) -> float:
    """Return deterministic individual-soldier longitude spread."""
    offsets = [-0.00008, 0.00012, 0.00022, 0.00012, -0.00002, -0.00020, -0.00030, -0.00020, -0.00008]
    return offsets[index % len(offsets)]


def squad_sender_id(squad_id: str) -> str:
    """Map aggregate squad ids to the latest representative sender id."""
    sender_ids = {
        "1st_squad": "1st_squad_team_a",
        "2nd_squad": "2nd_squad_team_b",
        "3rd_squad": "3rd_squad_team_a",
        "weapons_squad": "weapons_squad",
    }
    return sender_ids.get(squad_id, squad_id)


def asset_parent(entity_type: str) -> str:
    """Return parent unit id for equipment."""
    if entity_type == "drone":
        return "uas_team"
    if entity_type == "sensor":
        return "op_lp"
    return "weapons_squad"


def event_sequence(event: dict[str, Any]) -> int:
    """Read Raven Gap sequence number from metadata."""
    return int(event.get("metadata", {}).get("sequence", 0))
