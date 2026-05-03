"""Decode TacNet receiver-side semantic CBOR frames.

The receiver API uses this module to reverse compact binary payloads into
verified metadata and terse operational text. It mirrors the browser prototype's
P0 CBOR subset and FNV-1a checksum logic without adding a binary dependency.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any


FIELD_KEYS = {
    1: "report_type",
    2: "speaker",
    3: "unit",
    4: "location",
    5: "status",
    6: "request",
    7: "destination",
    8: "priority",
    9: "timestamp",
    10: "confidence",
    11: "source_transcript_id",
    12: "raw_transcript",
}

REPORT_CODES = {
    1: "salute",
    2: "ace_lace",
    3: "resupply",
    4: "casevac",
    5: "uas_sensor",
    9: "free_text",
}

PRIORITY_CODES = {
    1: "low",
    2: "medium",
    3: "high",
    4: "urgent",
}

FRAME_TYPES = {
    1: "metadata",
    2: "device_dead",
}


@dataclass(frozen=True)
class DecodedFrame:
    """Decoded receiver frame used by the API route."""

    frame: dict[str, Any]
    frame_type: str
    verified: bool
    metadata: dict[str, Any]
    reconstructed_text: str
    byte_count: int
    checksum: int | None
    sequence: int | None


def decode_semantic_frame(frame_bytes: bytes) -> DecodedFrame:
    """Decode a TacNet semantic frame from CBOR bytes."""
    frame = CborReader(frame_bytes).read()
    if not isinstance(frame, dict):
        raise ValueError("frame_must_be_map")

    frame_type = FRAME_TYPES.get(frame.get(5), "unknown")
    if frame_type == "device_dead":
        return decode_device_dead(frame, len(frame_bytes))

    compact = frame.get(3)
    if not isinstance(compact, dict):
        raise ValueError("metadata_frame_missing_payload")

    checksum = integer_or_none(frame.get(4))
    verified = checksum == checksum_payload(compact)
    metadata = expand_metadata(compact)

    return DecodedFrame(
        frame=string_keyed(frame),
        frame_type=frame_type,
        verified=verified,
        metadata=metadata,
        reconstructed_text=reconstruct_text(metadata),
        byte_count=len(frame_bytes),
        checksum=checksum,
        sequence=integer_or_none(frame.get(1)),
    )


def decode_device_dead(frame: dict[Any, Any], byte_count: int) -> DecodedFrame:
    """Decode a device-dead control frame."""
    payload = frame.get(6) if isinstance(frame.get(6), dict) else {}
    checksum = integer_or_none(frame.get(4))
    verified = checksum == checksum_payload(payload)
    source = payload.get(2) or "sender"
    text = f"SOURCE DEVICE DEAD. Treat {source} as offline."

    return DecodedFrame(
        frame=string_keyed(frame),
        frame_type="device_dead",
        verified=verified,
        metadata=string_keyed(payload),
        reconstructed_text=text,
        byte_count=byte_count,
        checksum=checksum,
        sequence=integer_or_none(frame.get(1)),
    )


def expand_metadata(compact: dict[Any, Any]) -> dict[str, Any]:
    """Expand integer-keyed compact metadata into semantic field names."""
    metadata: dict[str, Any] = {}
    for raw_key, value in compact.items():
        key = FIELD_KEYS.get(int(raw_key)) if is_int_like(raw_key) else None
        if key:
            metadata[key] = decode_known_value(key, value)
    return metadata


def reconstruct_text(metadata: dict[str, Any]) -> str:
    """Reconstruct terse operational text from decoded metadata."""
    if metadata.get("raw_transcript"):
        return str(metadata["raw_transcript"])

    subject = metadata.get("speaker") or metadata.get("unit") or "Unknown element"
    location = f" at {metadata['location']}" if metadata.get("location") else ""
    status_items = metadata.get("status") if isinstance(metadata.get("status"), list) else []
    status = f": {', '.join(str(item) for item in status_items)}" if status_items else ""
    request = f" Request {metadata['request']}" if metadata.get("request") else ""
    destination = f" to {metadata['destination']}" if metadata.get("destination") else ""
    report_type = metadata.get("report_type")

    if report_type == "casevac":
        return f"{subject}{location}: casualty report{status}.{request}{destination}."
    if report_type == "resupply":
        return f"{subject}{location}: sustainment issue{status}.{request}{destination}."
    if report_type == "uas_sensor":
        return f"{subject}{location}: sensor or UAS observation{status}.{request}."
    if report_type == "salute":
        return f"{subject}{location}: contact report{status}.{request}."
    return f"{subject}{location}{status}.{request}{destination}."


def checksum_payload(payload: dict[Any, Any]) -> int:
    """Return the prototype-compatible FNV-1a checksum for a compact payload."""
    normalized = normalize_for_json(payload)
    text = json.dumps(normalized, separators=(",", ":"), ensure_ascii=False)
    return fnv1a(text)


def fnv1a(text: str) -> int:
    """Return the unsigned 32-bit FNV-1a hash used by the prototype."""
    hash_value = 0x811C9DC5
    for char in text:
        hash_value ^= ord(char)
        hash_value = (hash_value * 0x01000193) & 0xFFFFFFFF
    return hash_value


def normalize_for_json(value: Any) -> Any:
    """Normalize maps so Python JSON matches browser JSON.stringify ordering."""
    if isinstance(value, dict):
        items = sorted(value.items(), key=lambda item: sort_key(item[0]))
        return {str(key): normalize_for_json(nested) for key, nested in items}
    if isinstance(value, list):
        return [normalize_for_json(item) for item in value]
    if isinstance(value, bytes):
        return value.hex()
    return value


def decode_known_value(key: str, value: Any) -> Any:
    """Decode codebook values for compact metadata fields."""
    if key == "report_type":
        return REPORT_CODES.get(int(value), "free_text") if is_int_like(value) else value
    if key == "priority":
        return PRIORITY_CODES.get(int(value), "low") if is_int_like(value) else value
    return value


def string_keyed(value: Any) -> Any:
    """Convert nested dictionary keys to strings for stable API JSON."""
    if isinstance(value, dict):
        return {str(key): string_keyed(nested) for key, nested in value.items()}
    if isinstance(value, list):
        return [string_keyed(item) for item in value]
    if isinstance(value, bytes):
        return value.hex()
    return value


def integer_or_none(value: Any) -> int | None:
    """Return int when the value is integer-like, otherwise None."""
    return int(value) if is_int_like(value) else None


def is_int_like(value: Any) -> bool:
    """Return whether a value can safely represent an integer key/code."""
    return isinstance(value, int) or (isinstance(value, str) and value.isdigit())


def sort_key(value: Any) -> tuple[int, int | str]:
    """Sort integer-like keys before string keys like browser objects do."""
    if is_int_like(value):
        return (0, int(value))
    return (1, str(value))


class CborReader:
    """Small CBOR reader covering the prototype frame subset."""

    def __init__(self, data: bytes):
        self.data = data
        self.offset = 0

    def read(self) -> Any:
        first = self.read_byte()
        major = first >> 5
        additional = first & 31
        length = self.read_length(additional)

        if major == 0:
            return length
        if major == 2:
            return self.read_bytes(length)
        if major == 3:
            return self.read_bytes(length).decode("utf-8")
        if major == 4:
            return [self.read() for _ in range(length)]
        if major == 5:
            return {self.read(): self.read() for _ in range(length)}
        if major == 7:
            return self.read_simple(additional)
        raise ValueError(f"unsupported_cbor_major_{major}")

    def read_byte(self) -> int:
        if self.offset >= len(self.data):
            raise ValueError("unexpected_end_of_cbor")
        value = self.data[self.offset]
        self.offset += 1
        return value

    def read_length(self, additional: int) -> int:
        if additional < 24:
            return additional
        if additional == 24:
            return self.read_byte()
        if additional == 25:
            return (self.read_byte() << 8) | self.read_byte()
        if additional == 26:
            return (
                (self.read_byte() << 24)
                | (self.read_byte() << 16)
                | (self.read_byte() << 8)
                | self.read_byte()
            )
        if 20 <= additional <= 23:
            return additional
        raise ValueError(f"unsupported_cbor_length_{additional}")

    def read_bytes(self, length: int) -> bytes:
        end = self.offset + length
        if end > len(self.data):
            raise ValueError("cbor_bytes_exceed_input")
        value = self.data[self.offset:end]
        self.offset = end
        return value

    def read_simple(self, additional: int) -> Any:
        if additional == 20:
            return False
        if additional == 21:
            return True
        if additional == 22:
            return None
        raise ValueError(f"unsupported_cbor_simple_{additional}")
