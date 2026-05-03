"""Raven Gap demo readiness overlays for S2 map entities.

This module holds the scripted 90-second readiness story outside the generic
map entity builder. The helpers are deterministic and only add display metadata
or status changes for the showcase 9-line MEDEVAC scenario.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.map_transmissions import (
    receiver_sender_transmissions,
    receiver_subject_transmissions,
    soldier_transmissions,
)


NINE_LINE_SENDER_ID = "1st_squad_atl"
NINE_LINE_SUBJECT_ID = "1st_squad_rifle"
NINE_LINE_REPORT_TYPES = {"nine_line_medevac", "casevac"}

RIFLE_ROLES = [
    ("sl", "SL", "Squad Leader"),
    ("atl", "A TL", "Alpha Team Leader"),
    ("ar", "A AR", "Automatic Rifleman"),
    ("gren", "A GRN", "Grenadier"),
    ("rifle", "A RFL", "Rifleman"),
    ("btl", "B TL", "Bravo Team Leader"),
    ("bar", "B AR", "Automatic Rifleman"),
    ("bgren", "B GRN", "Grenadier"),
    ("brifle", "B RFL", "Rifleman"),
]

SQUADS = [
    ("1st_squad", "1ST SQUAD", "1", "SFG-UCI----C", 37.4718, -118.6821),
    ("2nd_squad", "2ND SQUAD", "2", "SFG-UCI----C", 37.4787, -118.6749),
    ("3rd_squad", "3RD SQUAD", "3", "SFG-UCI----C", 37.4669, -118.6775),
    ("weapons_squad", "WEAPONS SQD", "WPN", "SFG-UCWM---C", 37.4762, -118.6858),
]

WEAPONS_ROLES = [
    ("wsl", "WSL", "Weapons Squad Leader"),
    ("mg1", "MG1", "Machine Gunner"),
    ("ag1", "AG1", "Assistant Gunner"),
    ("mg2", "MG2", "Machine Gunner"),
    ("ag2", "AG2", "Assistant Gunner"),
    ("javelin", "JAV", "Antiarmor Gunner"),
]

ASSETS = [
    ("jltv_v1", "JLTV-1", "V1", "vehicle", "SFG-EVA----", 37.4685, -118.6886),
    ("rq_11", "RQ-11 RAVEN", "RQ-11", "drone", "SFG-UCVU---", 37.4729, -118.6798),
    ("sensor_s7", "OP/LP SENSOR 7", "S7", "sensor", "SFG-UCR----", 37.4796, -118.6715),
]

SISTER_PLATOONS = [
    ("plt-cobra", "2ND PLT", "2PL", 37.4826, -118.6865),
    ("plt-viper", "3RD PLT", "3PL", 37.4644, -118.6706),
]

SOLDIER_ACTIVITIES = {
    "sl": "controlling squad movement and casualty report flow",
    "atl": "voice sender for 9-line MEDEVAC report",
    "ar": "covering north draw from support-by-fire position",
    "gren": "marking phase-line crossing and smoke plan",
    "rifle": "casualty subject; CASEVAC readiness impact",
    "btl": "tracking resupply and rear security",
    "bar": "covering support route",
    "bgren": "maintaining flank security",
    "brifle": "checking comms relay and water status",
    "wsl": "coordinating weapons squad support",
    "mg1": "covering likely enemy approach",
    "ag1": "carrying ammo and range card updates",
    "mg2": "overwatching CASEVAC route",
    "ag2": "checking tripod and spare barrel readiness",
    "javelin": "screening vehicle threat avenue",
}


@dataclass(frozen=True)
class DemoReadiness:
    """Readiness facts derived from the 9-line demo event."""

    casevac_active: bool
    event_id: str | None


def build_demo_readiness(events: list[dict[str, Any]]) -> DemoReadiness:
    """Return whether the 9-line/CASEVAC event has entered the COP."""
    event = latest_casevac_event(events)
    return DemoReadiness(
        casevac_active=event is not None,
        event_id=str(event.get("id")) if event else None,
    )


def state_with_receiver_impact(
    state: dict[str, Any],
    receiver_events: list[dict[str, Any]],
) -> dict[str, Any]:
    """Return state with receiver CASEVAC frames reflected in map entities."""
    receiver_event = latest_receiver_casevac(receiver_events)
    if not receiver_event:
        return state

    map_state = state.get("map_state") or {}
    entities = map_state.get("entities") or []
    impacted_entities = [
        entity_with_receiver_impact(entity, receiver_event)
        for entity in entities
    ]
    return {
        **state,
        "map_state": {
            **map_state,
            "entities": impacted_entities,
        },
    }


def latest_receiver_casevac(
    receiver_events: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Return the latest receiver decode event carrying CASEVAC metadata."""
    matches = [
        event for event in receiver_events
        if is_casevac_metadata(event.get("metadata", {}))
    ]
    return matches[0] if matches else None


def entity_with_receiver_impact(
    entity: dict[str, Any],
    receiver_event: dict[str, Any],
) -> dict[str, Any]:
    """Apply receiver-frame readiness impact to one entity copy."""
    entity_id = entity.get("id")
    event_id = receiver_event.get("id")

    if entity_id == "plt-raven":
        return {
            **entity,
            "status": status_dict("amber", "amber", "green", "amber", "amber"),
            "personnel_available": 35,
            "activity": "Receiver CASEVAC frame active; PL tracking route support.",
            "linked_event_ids": [event_id],
        }
    if entity_id == "1st_squad":
        return {
            **entity,
            "status": status_dict("red", "red", "green", "amber", "red"),
            "personnel_available": 8,
            "activity": "Receiver CASEVAC frame active; 1/A managing aid and evacuation.",
            "linked_event_ids": [event_id],
        }
    if entity_id == NINE_LINE_SENDER_ID:
        return receiver_sender_entity(entity, event_id)
    if entity_id == NINE_LINE_SUBJECT_ID:
        return receiver_subject_entity(entity, event_id)
    return entity


def receiver_sender_entity(entity: dict[str, Any], event_id: Any) -> dict[str, Any]:
    """Return Soldier 1 after a receiver CASEVAC frame."""
    return {
        **entity,
        "status": status_dict("green", "amber", "green", "amber", "green"),
        "activity": "9-line CASEVAC received from peer binary frame.",
        "report_status": "9-line received",
        "linked_event_ids": [event_id],
        "transmissions": receiver_sender_transmissions(event_id),
        "history": [
            {
                "event_id": event_id,
                "message": "Peer receiver decoded compressed CASEVAC metadata.",
            },
        ],
    }


def receiver_subject_entity(entity: dict[str, Any], event_id: Any) -> dict[str, Any]:
    """Return Soldier 2 after a receiver CASEVAC frame."""
    return {
        **entity,
        "status": status_dict("red", "red", "green", "green", "red"),
        "activity": "CASEVAC subject; readiness degraded from receiver report.",
        "report_status": "CASEVAC pending",
        "linked_event_ids": [event_id],
        "transmissions": receiver_subject_transmissions(event_id),
        "history": [
            {
                "event_id": event_id,
                "message": "Receiver frame reports one urgent casualty and CASEVAC request.",
            },
        ],
    }


def latest_casevac_event(events: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Return the latest event that represents the 9-line MEDEVAC report."""
    matches = [
        event for event in events
        if is_casevac_metadata(event.get("metadata", {}))
    ]
    return max(matches, key=event_sequence, default=None)


def is_casevac_metadata(metadata: dict[str, Any]) -> bool:
    """Return whether metadata represents the demo CASEVAC/9-line payload."""
    report_type = str(metadata.get("report_type", "")).lower()
    return report_type in NINE_LINE_REPORT_TYPES


def soldier_extra(
    entity_id: str,
    role_id: str,
    role_name: str,
    context: DemoReadiness,
) -> dict[str, Any]:
    """Return extra drawer fields for one soldier entity."""
    extra = {
        "role": role_name,
        "echelon": "individual",
        "activity": SOLDIER_ACTIVITIES.get(role_id, "maintaining assigned sector"),
        "transmissions": soldier_transmissions(
            entity_id,
            role_id,
            context.casevac_active,
            context.event_id,
        ),
    }

    if entity_id == NINE_LINE_SENDER_ID:
        extra.update(sender_extra(context))
    if entity_id == NINE_LINE_SUBJECT_ID:
        extra.update(subject_extra(context))

    return extra


def sender_extra(context: DemoReadiness) -> dict[str, Any]:
    """Return Soldier 1 demo metadata."""
    status_text = "9-line sent" if context.casevac_active else "ready to send 9-line"
    return linked_extra(
        context,
        {
            "demo_role": "nine_line_sender",
            "report_status": status_text,
            "activity": "sending 9-line MEDEVAC over compressed voice link",
        },
    )


def subject_extra(context: DemoReadiness) -> dict[str, Any]:
    """Return Soldier 2 demo metadata."""
    status_text = "CASEVAC pending" if context.casevac_active else "healthy; no 9-line received"
    return linked_extra(
        context,
        {
            "demo_role": "nine_line_subject",
            "report_status": status_text,
            "activity": "healthy before 9-line; readiness changes after report",
        },
    )


def linked_extra(context: DemoReadiness, extra: dict[str, Any]) -> dict[str, Any]:
    """Attach the supporting event id when the 9-line is active."""
    if not context.event_id:
        return extra
    return {**extra, "linked_event_ids": [context.event_id]}


def soldier_history(
    entity_id: str,
    fallback: list[dict[str, Any]],
    context: DemoReadiness,
) -> list[dict[str, Any]]:
    """Return showcase soldier history or the generic fallback."""
    if entity_id == NINE_LINE_SENDER_ID:
        message = "9-line MEDEVAC transmitted; compressed metadata entered S2 COP."
        if not context.casevac_active:
            message = "Designated demo sender for the 9-line MEDEVAC report."
        return [history(context, message)]

    if entity_id == NINE_LINE_SUBJECT_ID:
        message = "Reported urgent casualty; health, mobility, and readiness degraded."
        if not context.casevac_active:
            message = "Designated demo casualty subject; readiness updates after report."
        return [history(context, message)]

    return fallback


def platoon_status(context: DemoReadiness) -> dict[str, str]:
    """Return primary platoon aggregate status for the readiness rail."""
    if context.casevac_active:
        return status_dict("amber", "amber", "green", "amber", "amber")
    return status_dict("green", "green", "green", "green", "green")


def platoon_activity(context: DemoReadiness) -> str:
    """Return the primary platoon's current activity summary."""
    if context.casevac_active:
        return "1st Squad CASEVAC active; PL tracking route support and casualty evacuation."
    return "Platoon moving under degraded comms; 1st Squad is the drilldown focus."


def squad_activity(squad_id: str, context: DemoReadiness) -> str:
    """Return scripted activity for one squad."""
    activities = {
        "1st_squad": "CASEVAC report flow and immediate aid under 1/A control"
        if context.casevac_active else "movement to contact; 1/A prepared for 9-line voice report",
        "2nd_squad": "screening east ridge contact and maintaining observation",
        "3rd_squad": "flank security and route confirmation",
        "weapons_squad": "support-by-fire and JLTV route support",
    }
    return activities.get(squad_id, "maintaining assigned mission")


def status_dict(
    health: str,
    readiness: str,
    ammo: str,
    comms: str,
    mobility: str,
) -> dict[str, str]:
    """Return a compact status dictionary for demo-only aggregate statuses."""
    return {
        "health": health,
        "readiness": readiness,
        "ammo": ammo,
        "comms": comms,
        "mobility": mobility,
        "battery": "n/a",
        "fuel": "n/a",
    }


def history(context: DemoReadiness, message: str) -> dict[str, Any]:
    """Return one display history row linked to the 9-line event when present."""
    return {"event_id": context.event_id or "DEMO", "message": message}


def event_sequence(event: dict[str, Any]) -> int:
    """Read Raven Gap sequence number from event metadata."""
    return int(event.get("metadata", {}).get("sequence", 0) or 0)
