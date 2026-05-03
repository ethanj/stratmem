#app/adapters/base.py
from __future__ import annotations

import copy
import random
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable


@dataclass(frozen=True)
class AdapterHealth:
    ok: bool
    status: str
    details: dict[str, Any]


class Adapter(ABC):
    """
    Canonical adapter contract.

    ALL adapters MUST return this shape:

    {
        "id": str,
        "timestamp": RFC3339 UTC,
        "source": str,
        "domain": "cyber" | "physical",
        "type": str,
        "severity": "low|medium|high|critical|unknown",
        "raw": dict,
        "metadata": dict
    }
    """

    default_page_size = 100

    def __init__(self, config: dict[str, Any] | None = None):
        self.config = config or {}
        self._checkpoint = {
            "cursor": self.config.get("initial_cursor"),
            "last_timestamp": self.config.get("initial_last_timestamp"),
        }
        self._status = "idle"
        self._last_error: str | None = None

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    def fetch_events(self, limit: int | None = None) -> list[dict]:
        results = []
        page_size = int(self.config.get("page_size", self.default_page_size))
        target = limit or page_size

        cursor = self._checkpoint["cursor"]
        since = self._checkpoint["last_timestamp"]
        max_ts = since

        while len(results) < target:
            events, next_cursor = self._pull_page(
                cursor=cursor,
                since=since if cursor is None else None,
                page_size=min(page_size, target - len(results)),
            )

            if not events:
                break

            normalized = [self.normalize_event(e) for e in events]
            results.extend(normalized)

            cursor = next_cursor

            for e in normalized:
                ts = e["timestamp"]
                if not max_ts or ts > max_ts:
                    max_ts = ts

            if not next_cursor:
                break

        self._checkpoint = {"cursor": cursor, "last_timestamp": max_ts}
        return results

    @abstractmethod
    def _pull_page(self, *, cursor, since, page_size):
        pass

    @abstractmethod
    def normalize_event(self, event: dict) -> dict:
        pass

    def _with_retry(self, fn: Callable):
        retries = self.config.get("retries", 3)
        for i in range(retries):
            try:
                return fn()
            except Exception as e:
                if i == retries - 1:
                    self._last_error = str(e)
                    raise
                time.sleep(0.25 * (2 ** i) + random.random() * 0.05)

    @staticmethod
    def _to_rfc3339_utc(value):
        if isinstance(value, str):
            return value
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")