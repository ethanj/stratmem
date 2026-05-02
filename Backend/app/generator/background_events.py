# app/generator/background_events.py
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


BACKGROUND_TELEMETRY_SEQUENCE: list[dict[str, Any]] = [
    {
        "type": "adapter.heartbeat",
        "source": "AUTH-GW-01",
        "domain": "cyber",
        "severity": "low",
        "message": "Auth gateway adapter heartbeat received",
        "metadata": {
            "adapter": "auth_gateway",
            "status": "online",
            "poll_cycle": "complete",
        },
    },
    {
        "type": "adapter.heartbeat",
        "source": "EDR-01",
        "domain": "cyber",
        "severity": "low",
        "message": "EDR sensor network heartbeat received",
        "metadata": {
            "adapter": "edr_sensor_network",
            "status": "online",
            "poll_cycle": "complete",
        },
    },
    {
        "type": "adapter.heartbeat",
        "source": "NET-GW-01",
        "domain": "cyber",
        "severity": "low",
        "message": "Network gateway telemetry pulse received",
        "metadata": {
            "adapter": "network_gateway",
            "status": "online",
            "traffic_state": "nominal",
        },
    },
    {
        "type": "adapter.heartbeat",
        "source": "SIEM-01",
        "domain": "cyber",
        "severity": "low",
        "message": "SIEM ingestion cycle complete",
        "metadata": {
            "adapter": "siem",
            "status": "online",
            "events_indexed": 24,
        },
    },
    {
        "type": "adapter.heartbeat",
        "source": "DEFENDER-01",
        "domain": "cyber",
        "severity": "low",
        "message": "Microsoft Defender adapter polling cycle complete",
        "metadata": {
            "adapter": "defender",
            "status": "online",
            "alerts_polled": 0,
        },
    },
    {
        "type": "sensor.heartbeat",
        "source": "UAS-SENSOR-01",
        "domain": "physical",
        "severity": "low",
        "message": "UAS monitoring sensor heartbeat received",
        "metadata": {
            "adapter": "uas_monitoring",
            "status": "online",
            "sector": "Sector B",
        },
    },
    {
        "type": "sensor.heartbeat",
        "source": "AIS-FEED-01",
        "domain": "osint",
        "severity": "low",
        "message": "AIS feed heartbeat received",
        "metadata": {
            "adapter": "ais_feed",
            "status": "online",
            "feed_state": "nominal",
        },
    },
    {
        "type": "system.health",
        "source": "FUSION-CORE",
        "domain": "unknown",
        "severity": "low",
        "message": "Fusion engine health check passed",
        "metadata": {
            "component": "fusion_core",
            "status": "healthy",
        },
    },
]


def build_background_event(step: int) -> dict[str, Any]:
    """
    Emit one harmless operational telemetry event per simulation step.

    These events make the console feel live without triggering threat detection.
    Detection rules respond only to suspicious event types such as:
    - auth.failed
    - auth.success with unfamiliar source metadata
    - network.lateral
    - identity.privilege_escalation
    - network.exfiltration
    - physical.drone
    - osint.ais_anomaly
    """

    template = BACKGROUND_TELEMETRY_SEQUENCE[
        step % len(BACKGROUND_TELEMETRY_SEQUENCE)
    ]

    return {
        **template,
        "id": f"bg-{uuid.uuid4().hex[:10]}",
        "timestamp": now_utc(),
        "raw": {
            "generated_by": "background_telemetry",
            "template_type": template["type"],
            "source": template["source"],
        },
        "metadata": {
            **template.get("metadata", {}),
            "background": True,
            "telemetry_step": step,
        },
    }