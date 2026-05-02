# app/models/event.py
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Optional


Domain = Literal["cyber", "physical", "osint", "unknown"]
Severity = Literal["low", "medium", "high", "critical", "unknown"]


@dataclass(frozen=True)
class Event:
    id: str
    timestamp: str
    type: str
    source: str
    domain: Domain
    severity: Severity = "unknown"
    message: str = ""
    raw: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)
    location: dict[str, Optional[float]] = field(
        default_factory=lambda: {"lat": None, "lon": None}
    )

    def to_dict(self) -> dict[str, Any]:
        payload = {
            "id": self.id,
            "timestamp": self.timestamp,
            "type": self.type,
            "source": self.source,
            "domain": self.domain,
            "severity": self.severity,
            "message": self.message,
            "raw": self.raw,
            "metadata": self.metadata,
        }

        if self.location.get("lat") is not None and self.location.get("lon") is not None:
            payload["geospatial"] = self.location

        return payload