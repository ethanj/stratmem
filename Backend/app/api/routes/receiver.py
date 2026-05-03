"""Receiver-side decode API for TacNet compressed semantic frames.

The endpoint accepts a binary frame as hex or base64, validates the checksum,
reconstructs commander-readable text, and stores a short in-memory event list
for the S2 receiver dashboard panel.
"""

from __future__ import annotations

import base64
import binascii
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.receiver.semantic_frame import decode_semantic_frame


router = APIRouter(prefix="/api/receiver", tags=["receiver"])

DEMO_FRAME_HEX = (
    "a6 00 01 01 07 02 78 18 32 30 32 36 2d 30 35 2d 30 33 54 30 35 3a 33 30 "
    "3a 30 30 2e 30 30 30 5a 03 aa 01 01 02 69 42 72 61 76 6f 20 4f 6e 65 03 "
    "65 42 72 61 76 6f 04 6d 67 72 69 64 20 32 32 33 33 34 34 35 35 05 83 6d "
    "74 77 6f 20 64 69 73 6d 6f 75 6e 74 73 6e 6d 6f 76 65 6d 65 6e 74 20 73 "
    "6f 75 74 68 6b 6c 69 67 68 74 20 70 61 63 6b 73 06 6b 55 41 53 20 63 6f "
    "6e 66 69 72 6d 08 03 09 78 18 32 30 32 36 2d 30 35 2d 30 33 54 30 35 3a "
    "33 30 3a 30 30 2e 30 30 30 5a 0a 18 55 0b 70 74 78 5f 72 65 63 65 69 76 "
    "65 72 5f 64 65 6d 6f 04 1a d6 ad b0 d2 05 01"
)

MAX_EVENTS = 20
DEFAULT_ROOM = "raven-gap"
RAW_AUDIO_ESTIMATE_BYTES = 7500

receiver_events: list[dict[str, Any]] = []


class ReceiverDecodeRequest(BaseModel):
    """Request body for receiver-side semantic frame decode."""

    frame_hex: Optional[str] = None
    frame_base64: Optional[str] = None
    room: str = DEFAULT_ROOM
    source: Optional[str] = None
    received_at: Optional[str] = None
    use_fixture: bool = False


@router.post("/decode")
def decode_receiver_payload(payload: ReceiverDecodeRequest) -> dict[str, Any]:
    """Decode a compressed receiver payload and store it for dashboard display."""
    try:
        frame_bytes = request_frame_bytes(payload)
        decoded = decode_semantic_frame(frame_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    event = build_receiver_event(payload, decoded)
    receiver_events.insert(0, event)
    del receiver_events[MAX_EVENTS:]
    return event


@router.get("/events")
def list_receiver_events(room: Optional[str] = None) -> dict[str, list[dict[str, Any]]]:
    """Return recent receiver decode events."""
    return {"events": get_receiver_events(room)}


def get_receiver_events(room: Optional[str] = None) -> list[dict[str, Any]]:
    """Return a copied receiver event list, optionally filtered by room."""
    events = receiver_events
    if room:
        events = [event for event in receiver_events if event.get("room") == room]
    return [dict(event) for event in events]


def reset_receiver_events() -> None:
    """Clear receiver events when the demo scenario resets."""
    receiver_events.clear()


def request_frame_bytes(payload: ReceiverDecodeRequest) -> bytes:
    """Extract binary frame bytes from the accepted request shapes."""
    try:
        if payload.use_fixture:
            return bytes.fromhex(DEMO_FRAME_HEX)
        if payload.frame_hex:
            return bytes.fromhex(payload.frame_hex)
        if payload.frame_base64:
            return base64.b64decode(payload.frame_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("invalid_frame_payload") from exc
    raise ValueError("missing_frame_payload")


def build_receiver_event(payload: ReceiverDecodeRequest, decoded: Any) -> dict[str, Any]:
    """Build the receiver event contract consumed by the S2 dashboard panel."""
    room = payload.room or DEFAULT_ROOM
    received_at = payload.received_at or datetime.now(timezone.utc).isoformat()
    ratio = round(RAW_AUDIO_ESTIMATE_BYTES / decoded.byte_count, 1) if decoded.byte_count else None
    sequence = decoded.sequence if decoded.sequence is not None else len(receiver_events) + 1

    return {
        "id": f"rx-{room}-{sequence}",
        "room": room,
        "source": payload.source or "receiver-link",
        "received_at": received_at,
        "verified": decoded.verified,
        "frame_type": decoded.frame_type,
        "sequence": decoded.sequence,
        "byte_count": decoded.byte_count,
        "checksum": decoded.checksum,
        "metadata": decoded.metadata,
        "frame": decoded.frame,
        "reconstructed_text": decoded.reconstructed_text,
        "compression": {
            "raw_audio_estimated_bytes": RAW_AUDIO_ESTIMATE_BYTES,
            "binary_bytes": decoded.byte_count,
            "ratio": ratio,
        },
    }
