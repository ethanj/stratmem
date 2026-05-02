# app/models/signal.py

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


Domain = Literal["cyber", "physical", "osint", "unknown"]


@dataclass(frozen=True)
class Signal:
    id: str
    kind: str
    domain: Domain
    weight: float
    evidence: list[str]
    label: str
    active: bool = True
    description: str = ""
    source: str = "fusion-engine"
    location: dict[str, float | None] = field(
        default_factory=lambda: {"lat": None, "lon": None}
    )
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind,
            "domain": self.domain,
            "weight": self.weight,
            "evidence": self.evidence,
            "label": self.label,
            "active": self.active,
            "description": self.description,
            "source": self.source,
            "location": self.location,
            "metadata": self.metadata,
        }