"""Deterministic prerecorded voice-to-report fixtures.

This module does not perform live STT, model inference, network calls, or audio
decoding. It maps supported demo `audio_id` values to stored transcripts, structured
mission JSON, and one normalized physical-domain Raven Gap event payload.
"""

from __future__ import annotations

import json
from copy import deepcopy
from typing import Any


SALUTE_AUDIO_ID = "raven_gap_salute_1"
NINE_LINE_AUDIO_ID = "raven_gap_nine_line_1"
DEFAULT_AUDIO_ID = NINE_LINE_AUDIO_ID
SALUTE_EVENT_ID = "rg_voice_001"
NINE_LINE_EVENT_ID = "rg_voice_009"
VOICE_AUDIO_ESTIMATED_BYTES = 7500

SALUTE_TRANSCRIPT = (
    "One Alpha reports one dismount moving south near NAI 1, grid 11S LV 42210 "
    "49170, light pack, no visible crew-served weapon. Request RQ-11 confirm."
)

NINE_LINE_TRANSCRIPT = (
    "Alpha Two, nine-line MEDEVAC. Line one, pickup grid 12345678. Line two, "
    "call sign Alpha Two. Line three, one urgent casualty. Line four, no special "
    "equipment. Line five, one litter. Line six, pickup site security unknown. "
    "Line seven, mark with orange smoke. Line eight, U.S. military. Line nine, no CBRN."
)

STRUCTURED_SALUTE = {
    "type": "salute",
    "source": "1/A",
    "size": "1 dismount",
    "activity": "moving south near NAI-1",
    "location": "11S LV 42210 49170",
    "unit": "unknown dismount",
    "time": "T+45",
    "equipment": "light pack; no visible crew-served weapon",
    "request": "uas_confirm",
}

STRUCTURED_NINE_LINE = {
    "type": "nine_line_medevac",
    "source": "1/A",
    "line_1_location": "grid 12345678",
    "line_2_frequency": "Alpha Two",
    "line_3_precedence": "urgent",
    "line_4_equipment": "none",
    "line_5_patients": "one litter",
    "line_6_security": "unknown",
    "line_7_marking": "orange smoke",
    "line_8_nationality": "U.S. military",
    "line_9_cbrn": "none",
    "subject": "1-A RFL",
}

SALUTE_EVENT = {
    "id": SALUTE_EVENT_ID,
    "type": "salute",
    "source": "1/A",
    "domain": "physical",
    "severity": "medium",
    "message": "1/A SALUTE: one dismount moving south near NAI-1; request RQ-11 confirm.",
    "metadata": {
        "report_type": "salute",
        "voice_source": True,
        "scenario": "raven_gap",
        "background": False,
        "sender_id": "1st_squad_team_a",
        "unit_label": "1st Squad / Team A",
        "mesh_node": "SQD-1",
        "mgrs": "11S LV 42210 49170",
        "t_offset_sec": 45,
        "size": "1 dismount",
        "activity": "moving south near NAI-1",
        "equipment": "light pack",
        "request": "uas_confirm",
    },
    "geospatial": {"lat": 37.4765, "lon": -118.6797},
}

NINE_LINE_EVENT = {
    "id": NINE_LINE_EVENT_ID,
    "type": "casevac",
    "source": "1/A",
    "domain": "physical",
    "severity": "high",
    "message": "1/A 9-LINE MEDEVAC: Alpha Two reports one urgent litter casualty at grid 12345678.",
    "metadata": {
        "report_type": "nine_line_medevac",
        "voice_source": True,
        "scenario": "raven_gap",
        "background": False,
        "sender_id": "1st_squad_atl",
        "subject_entity_id": "1st_squad_rifle",
        "unit_label": "1st Squad / Team A",
        "mesh_node": "1st_squad",
        "mgrs": "11S LV 42190 49180",
        "t_offset_sec": 58,
        "sequence": 9,
        "priority": "urgent",
        "casualties": 1,
        "patient_type": "litter",
        "pickup_security": "unknown",
        "marking": "orange smoke",
    },
    "geospatial": {"lat": 37.4719, "lon": -118.6823},
}

VOICE_FIXTURES = {
    SALUTE_AUDIO_ID: {
        "audio_id": SALUTE_AUDIO_ID,
        "transcript": SALUTE_TRANSCRIPT,
        "structured_event_id": SALUTE_EVENT_ID,
        "schema": "salute",
        "structured_event": STRUCTURED_SALUTE,
        "event_payload": SALUTE_EVENT,
    },
    NINE_LINE_AUDIO_ID: {
        "audio_id": NINE_LINE_AUDIO_ID,
        "transcript": NINE_LINE_TRANSCRIPT,
        "structured_event_id": NINE_LINE_EVENT_ID,
        "schema": "nine_line_medevac",
        "structured_event": STRUCTURED_NINE_LINE,
        "event_payload": NINE_LINE_EVENT,
    },
}


def extract_salute(audio_id: str) -> dict[str, Any]:
    """Return the stored transcript, mission JSON, and event fixture."""
    fixture = VOICE_FIXTURES.get(audio_id)
    if not fixture:
        raise ValueError(f"Unsupported audio_id: {audio_id}")

    return {
        "audio_id": fixture["audio_id"],
        "transcript": fixture["transcript"],
        "structured_event_id": fixture["structured_event_id"],
        "schema": fixture["schema"],
        "structured_event": deepcopy(fixture["structured_event"]),
        "event_payload": deepcopy(fixture["event_payload"]),
        "audio_estimated_bytes": VOICE_AUDIO_ESTIMATED_BYTES,
        "transcript_bytes": utf8_bytes(fixture["transcript"]),
        "json_bytes": utf8_bytes(fixture["structured_event"]),
    }


def build_voice_report(
    *,
    status: str = "ready",
    mode: str = "raw_audio",
    transmit_bytes: int | None = None,
    fits_budget: bool | None = None,
    blocked_reason: str | None = None,
    audio_id: str = DEFAULT_AUDIO_ID,
) -> dict[str, Any]:
    """Build the `/state.voice_report` contract payload."""
    fixture = extract_salute(audio_id)
    return {
        "audio_id": fixture["audio_id"],
        "status": status,
        "mode": mode,
        "transcript": fixture["transcript"],
        "structured_event_id": fixture["structured_event_id"],
        "schema": fixture["schema"],
        "structured_event": fixture["structured_event"],
        "audio_estimated_bytes": fixture["audio_estimated_bytes"],
        "transcript_bytes": fixture["transcript_bytes"],
        "json_bytes": fixture["json_bytes"],
        "transmit_bytes": transmit_bytes,
        "fits_budget": fits_budget,
        "blocked_reason": blocked_reason,
    }


def voice_event_payload(audio_id: str) -> dict[str, Any]:
    """Return the normalized event payload for a supported audio fixture."""
    return extract_salute(audio_id)["event_payload"]


def utf8_bytes(value: Any) -> int:
    """Return deterministic UTF-8 byte count for strings or JSON values."""
    if isinstance(value, str):
        text = value
    else:
        text = json.dumps(value, sort_keys=True, separators=(",", ":"))

    return len(text.encode("utf-8"))
