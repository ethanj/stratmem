# app/adapters/mock.py

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from .base import Adapter


class MockAdapter(Adapter):
    """
    Scenario-backed mock adapter.

    This behaves like a real adapter boundary:
    - scenario templates come in
    - adapter emits normalized runtime events
    - each fetched event gets a fresh id/timestamp
    """

    @property
    def name(self):
        return "mock"

    def __init__(self, config=None):
        super().__init__(config)
        config = config or {}
        self.events = list(config.get("events", []))
        self.index = int(config.get("initial_index", 0))

    def reset(self):
        self.index = 0
        self._checkpoint = {
            "cursor": None,
            "last_timestamp": None,
        }

    def fetch_next_event(self) -> dict[str, Any] | None:
        if self.index >= len(self.events):
            return None

        event = self.events[self.index]
        self.index += 1

        return self.normalize_event(event)

    def _pull_page(self, *, cursor, since, page_size):
        start = int(cursor) if cursor else 0
        page = self.events[start:start + page_size]
        next_cursor = str(start + page_size) if start + page_size < len(self.events) else None
        return page, next_cursor

    def normalize_event(self, event: dict[str, Any]):
        timestamp = event.get("timestamp") or self._now()
        raw = event.get("raw") or event.copy()

        normalized = {
            "id": str(event.get("id") or f"log-{uuid.uuid4()}"),
            "timestamp": self._to_rfc3339_utc(timestamp),
            "source": event.get("source", self.name),
            "domain": event.get("domain", "unknown"),
            "type": event.get("type", "mock_event"),
            "severity": event.get("severity", "low"),
            "message": event.get("message", event.get("type", "mock event")),
            "raw": raw,
            "metadata": event.get("metadata", {}),
        }

        if "geospatial" in event:
            normalized["geospatial"] = event["geospatial"]

        return normalized

    @staticmethod
    def _now():
        return datetime.now(timezone.utc).isoformat()