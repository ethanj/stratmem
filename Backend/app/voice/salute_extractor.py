"""Deterministic prerecorded voice-to-SALUTE fixture.

This module does not perform live STT, model inference, network calls, or audio
decoding. It maps the single demo `audio_id` to a stored transcript, structured
SALUTE JSON, and one normalized physical-domain Raven Gap event payload.
"""

from __future__ import annotations

import json
from copy import deepcopy
from typing import Any


VOICE_AUDIO_ID = "raven_gap_salute_1"
VOICE_EVENT_ID = "rg_voice_001"
VOICE_AUDIO_ESTIMATED_BYTES = 64000

VOICE_TRANSCRIPT = (
    "One Alpha reports one dismount moving south near NAI 1, grid 11S LV 42210 "
    "49170, light pack, no visible crew-served weapon. Request RQ-11 confirm."
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

VOICE_EVENT = {
    "id": VOICE_EVENT_ID,
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


def extract_salute(audio_id: str) -> dict[str, Any]:
    """Return the stored transcript, structured JSON, and event fixture."""
    if audio_id != VOICE_AUDIO_ID:
        raise ValueError(f"Unsupported audio_id: {audio_id}")

    return {
        "audio_id": VOICE_AUDIO_ID,
        "transcript": VOICE_TRANSCRIPT,
        "structured_event_id": VOICE_EVENT_ID,
        "schema": "salute",
        "structured_event": deepcopy(STRUCTURED_SALUTE),
        "event_payload": deepcopy(VOICE_EVENT),
        "audio_estimated_bytes": VOICE_AUDIO_ESTIMATED_BYTES,
        "transcript_bytes": utf8_bytes(VOICE_TRANSCRIPT),
        "json_bytes": utf8_bytes(STRUCTURED_SALUTE),
    }


def build_voice_report(
    *,
    status: str = "ready",
    mode: str = "raw_audio",
    transmit_bytes: int | None = None,
    fits_budget: bool | None = None,
    blocked_reason: str | None = None,
) -> dict[str, Any]:
    """Build the `/state.voice_report` contract payload."""
    fixture = extract_salute(VOICE_AUDIO_ID)
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
