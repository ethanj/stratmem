# app/normalization/schemas.py

from __future__ import annotations

from typing import Any


VALID_DOMAINS = {"cyber", "physical", "osint", "unknown"}
VALID_SEVERITIES = {"low", "medium", "high", "critical", "unknown"}


CANONICAL_EVENT_KEYS = {
    "id",
    "timestamp",
    "type",
    "source",
    "domain",
    "severity",
    "message",
    "raw",
    "metadata",
    "geospatial",
}


def default_event() -> dict[str, Any]:
    return {
        "id": "",
        "timestamp": "",
        "type": "unknown.event",
        "source": "unknown",
        "domain": "unknown",
        "severity": "unknown",
        "message": "",
        "raw": {},
        "metadata": {},
    }