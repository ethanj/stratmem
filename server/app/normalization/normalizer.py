# app/normalization/normalizer.py

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.normalization.schemas import VALID_DOMAINS, VALID_SEVERITIES, default_event


def normalize_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Normalize all incoming events into the canonical internal event schema.

    This is intentionally adapter-agnostic. Mock, Defender, SIEM, sensor,
    AIS, and future feeds should all pass through here before detection.
    """
    normalized = [normalize_event(event) for event in events]
    return sorted(normalized, key=lambda event: event["timestamp"])


def normalize_event(event: dict[str, Any]) -> dict[str, Any]:
    base = default_event()

    event_type = str(event.get("type") or base["type"])
    source = str(event.get("source") or base["source"])
    domain = normalize_domain(event.get("domain"))
    severity = normalize_severity(event.get("severity"))

    message = str(
        event.get("message")
        or event.get("metadata", {}).get("title")
        or event_type
    )

    raw = event.get("raw")
    if not isinstance(raw, dict):
        raw = event.copy()

    metadata = event.get("metadata")
    if not isinstance(metadata, dict):
        metadata = {}

    normalized = {
        **base,
        "id": str(event.get("id") or f"evt-{uuid.uuid4()}"),
        "timestamp": to_rfc3339_utc(event.get("timestamp")),
        "type": event_type,
        "source": source,
        "domain": domain,
        "severity": severity,
        "message": message,
        "raw": raw,
        "metadata": metadata,
    }

    geospatial = normalize_geospatial(event.get("geospatial"))

    if geospatial:
        normalized["geospatial"] = geospatial

    return normalized


def normalize_domain(value: Any) -> str:
    domain = str(value or "unknown").lower()
    return domain if domain in VALID_DOMAINS else "unknown"


def normalize_severity(value: Any) -> str:
    severity = str(value or "unknown").lower()
    return severity if severity in VALID_SEVERITIES else "unknown"


def normalize_geospatial(value: Any) -> dict[str, float] | None:
    if not isinstance(value, dict):
        return None

    lat = value.get("lat")
    lon = value.get("lon")

    if lat is None or lon is None:
        return None

    try:
        geo = {
            "lat": float(lat),
            "lon": float(lon),
        }

        if value.get("alt") is not None:
            geo["alt"] = float(value["alt"])

        return geo

    except (TypeError, ValueError):
        return None


def to_rfc3339_utc(value: Any) -> str:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

    if isinstance(value, str) and value:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        except ValueError:
            return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")