"""Scripted individual transmission rows for the Raven Gap readiness rail.

The rows are operator-facing demo data. They show each soldier doing believable
busy work while the 9-line showcase soldiers expose the voice-to-metadata flow.
"""

from __future__ import annotations

from typing import Any


NINE_LINE_SENDER_ID = "1st_squad_atl"
NINE_LINE_SUBJECT_ID = "1st_squad_rifle"

ROLE_CHANNELS = {
    "sl": "CMD",
    "atl": "VOICE",
    "ar": "SUPPORT",
    "gren": "MANEUVER",
    "rifle": "MED",
    "btl": "LOG",
    "bar": "SECURITY",
    "bgren": "MANEUVER",
    "brifle": "COMMS",
    "wsl": "WPN",
    "mg1": "WPN",
    "ag1": "WPN",
    "mg2": "WPN",
    "ag2": "WPN",
    "javelin": "AT",
}

ROLE_MESSAGES = {
    "sl": "Squad leader syncing movement, casualty flow, and PL updates.",
    "ar": "Automatic rifleman reports sector covered and ammo green.",
    "gren": "Grenadier marks phase-line crossing and smoke plan.",
    "btl": "Bravo team leader tracks rear security and resupply.",
    "bar": "Bravo automatic rifleman covers support route.",
    "bgren": "Bravo grenadier maintains flank security.",
    "brifle": "Rifleman checks relay, water, and comms handoff.",
    "wsl": "Weapons squad leader coordinates support-by-fire.",
    "mg1": "Machine gunner covers likely enemy approach.",
    "ag1": "Assistant gunner updates ammo and range card.",
    "mg2": "Machine gunner overwatches CASEVAC route.",
    "ag2": "Assistant gunner checks tripod and spare barrel.",
    "javelin": "Antiarmor gunner screens vehicle threat avenue.",
}


def soldier_transmissions(
    entity_id: str,
    role_id: str,
    casevac_active: bool,
    event_id: str | None,
) -> list[dict[str, Any]]:
    """Return display transmissions for one soldier."""
    if entity_id == NINE_LINE_SENDER_ID:
        return sender_transmissions(casevac_active, event_id)
    if entity_id == NINE_LINE_SUBJECT_ID:
        return subject_transmissions(casevac_active, event_id)

    return [
        transmission(
            "T+00:42",
            ROLE_CHANNELS.get(role_id, "SQUAD"),
            "ROUTINE",
            ROLE_MESSAGES.get(role_id, "Maintaining assigned task and reporting green by exception."),
        )
    ]


def receiver_sender_transmissions(event_id: Any) -> list[dict[str, Any]]:
    """Return Soldier 1 transmissions after receiver-frame decode."""
    return [
        transmission("RX", "BINARY", "RECEIVED", "Peer receiver decoded compressed CASEVAC metadata.", event_id),
        transmission("RX", "VOICE", "TRACE", "Audio meaning reconstructed as 9-line CASEVAC text.", event_id),
    ]


def receiver_subject_transmissions(event_id: Any) -> list[dict[str, Any]]:
    """Return Soldier 2 transmissions after receiver-frame decode."""
    return [
        transmission("RX", "MED", "URGENT", "Receiver frame reports one urgent casualty.", event_id),
        transmission("RX", "READINESS", "RED", "Health, mobility, and readiness downgraded for CASEVAC.", event_id),
    ]


def sender_transmissions(casevac_active: bool, event_id: str | None) -> list[dict[str, Any]]:
    """Return Soldier 1 transmission rows before or after the 9-line."""
    if casevac_active:
        return [
            transmission("T+00:58", "AUDIO", "CAPTURED", "9-line MEDEVAC spoken by Alpha Two.", event_id),
            transmission("T+00:59", "METADATA", "COMPRESSED", "9-line fields encoded as compact mission metadata.", event_id),
            transmission("T+01:00", "S2", "DELIVERED", "CASEVAC update entered the command picture.", event_id),
        ]

    return [
        transmission("T+00:45", "VOICE", "STANDING BY", "Designated sender for 9-line MEDEVAC voice report."),
        transmission("T+00:46", "METADATA", "READY", "Awaiting operator send; no CASEVAC payload transmitted yet."),
    ]


def subject_transmissions(casevac_active: bool, event_id: str | None) -> list[dict[str, Any]]:
    """Return Soldier 2 transmission rows before or after the 9-line."""
    if casevac_active:
        return [
            transmission("T+01:00", "MED", "URGENT", "9-line reports one urgent litter casualty.", event_id),
            transmission("T+01:01", "READINESS", "RED", "Health and mobility changed from green to red.", event_id),
        ]

    return [
        transmission("T+00:44", "MED", "GREEN", "No casualty report received; soldier remains available."),
        transmission("T+00:45", "READINESS", "GREEN", "Health, readiness, and mobility are green before 9-line."),
    ]


def transmission(
    time: str,
    channel: str,
    status: str,
    message: str,
    event_id: Any = None,
) -> dict[str, Any]:
    """Return one drawer transmission row."""
    return {
        "time": time,
        "channel": channel,
        "status": status,
        "message": message,
        "event_id": event_id,
    }

