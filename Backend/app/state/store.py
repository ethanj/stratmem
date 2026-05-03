"""In-memory state store for the Sentinel Forge FastAPI demo.

The store is the single owner of the `/state` response shape. It keeps the
legacy Sentinel Forge incident contract intact while adding TacNet Edge fields
for mesh hierarchy, squad compactions, SITREP deltas, and degraded-comms proof.

The module deliberately returns deep copies at API boundaries so route handlers
can compose updates without accidentally mutating shared state between requests.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Optional

from app.voice.salute_extractor import build_voice_report


DEFAULT_SCENARIO = {
    "id": "coordinated_intrusion",
    "name": "Coordinated Intrusion",
    "description": "Cyber, physical, and OSINT indicators converge into a coordinated intrusion pattern.",
}


DEGRADED_COMMS_KBPS = 3
COMMS_WINDOW_SECONDS = 10


def build_empty_correlation() -> dict[str, Any]:
    """Build the empty correlation payload expected by existing clients."""
    return {
        "confidence": 0,
        "level": "low",
        "cyberCount": 0,
        "physicalCount": 0,
        "osintCount": 0,
        "signals": [],
        "history": [],
        "explanation": [],
        "scoreBreakdown": {
            "base": 0,
            "evidenceBonus": 0,
            "diversityBonus": 0,
            "crossDomainBonus": 0,
            "escalationBonus": 0,
            "raw": 0,
        },
    }


def build_empty_map_state() -> dict[str, Any]:
    """Build a map contract that supports both legacy and Raven Gap clients."""
    return {
        "tracks": [],
        "assets": [],
        "zones": [],
        "threat_paths": [],
        "mgrs_grid": {},
        "phase_line": {},
        "checkpoints": [],
        "nais": [],
        "friendly_markers": [],
        "contact_markers": [],
        "risk_zones": [],
        "routes": [],
    }


def build_default_mesh() -> dict[str, Any]:
    """Build the static TacNet command-tree mesh for Raven Gap."""
    return {
        "id": "raven-gap-mesh",
        "root": "PLT",
        "nodes": [
            {"id": "PLT", "label": "PL Raven", "role": "commander", "echelon": "platoon"},
            {"id": "SQD-1", "label": "1st Squad", "role": "rifle_squad", "parent": "PLT"},
            {"id": "SQD-2", "label": "2nd Squad", "role": "rifle_squad", "parent": "PLT"},
            {"id": "SQD-3", "label": "3rd Squad", "role": "rifle_squad", "parent": "PLT"},
            {"id": "WPN", "label": "Weapons Squad", "role": "support", "parent": "PLT"},
            {"id": "UAS-2", "label": "Raven-2", "role": "small_uas", "parent": "PLT"},
            {"id": "JLTV-1", "label": "JLTV-1", "role": "support_vehicle", "parent": "PLT"},
            {"id": "SENS-1", "label": "OP/LP Sensor", "role": "sensor", "parent": "PLT"},
        ],
        "links": [
            {"from": "SQD-1", "to": "PLT", "mode": "summary_up"},
            {"from": "SQD-2", "to": "PLT", "mode": "summary_up"},
            {"from": "SQD-3", "to": "PLT", "mode": "summary_up"},
            {"from": "WPN", "to": "PLT", "mode": "summary_up"},
            {"from": "UAS-2", "to": "PLT", "mode": "summary_up"},
            {"from": "JLTV-1", "to": "PLT", "mode": "summary_up"},
            {"from": "SENS-1", "to": "PLT", "mode": "summary_up"},
        ],
    }


def build_empty_sitrep_delta() -> dict[str, Any]:
    """Build the empty commander-delta payload."""
    return {
        "since_id": None,
        "what_changed": [],
        "summary": "No commander SITREP yet.",
        "changed": [],
    }


def build_comms_proof(
    raw_bytes: int = 0,
    compacted_bytes: int = 0,
    kbps: float | None = None,
) -> dict[str, Any]:
    """Build the deterministic per-window bandwidth proof.

    Args:
        raw_bytes: Bytes required to transmit source reports.
        compacted_bytes: Bytes required to transmit compacted summaries.
        kbps: Link budget in kilobits per second.

    Returns:
        A proof payload with byte budget, compression ratio, and fit status.
    """
    budget_bytes = None
    if kbps is not None:
        budget_bytes = int((float(kbps) * 1000 / 8) * COMMS_WINDOW_SECONDS)

    ratio = round(raw_bytes / compacted_bytes, 2) if compacted_bytes else None

    return {
        "budget_bytes": budget_bytes,
        "raw_bytes": int(raw_bytes),
        "compacted_bytes": int(compacted_bytes),
        "compression_ratio": ratio,
        "fits_budget": True if budget_bytes is None else compacted_bytes <= budget_bytes,
    }


def build_default_comms() -> dict[str, Any]:
    """Build the default v3 degraded-link comms state."""
    return {
        "degraded": True,
        "kbps": DEGRADED_COMMS_KBPS,
        "window_sec": COMMS_WINDOW_SECONDS,
        **build_comms_proof(kbps=DEGRADED_COMMS_KBPS),
        "source_detail_level": "full",
        "compression_enabled": False,
    }


def build_initial_state(scenario: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """Build a fresh state document for `/state`."""
    return {
        "events": [],
        "signals": [],
        "correlation": build_empty_correlation(),
        "incident": None,
        "agent": None,
        "map_state": build_empty_map_state(),
        "mesh": build_default_mesh(),
        "compactions": [],
        "sitrep_delta": build_empty_sitrep_delta(),
        "voice_report": build_voice_report(),
        "comms": build_default_comms(),
        "scenario": scenario or DEFAULT_SCENARIO,
        "meta": {
            "mode": "demo",
            "step": 0,
            "status": "idle",
        },
        "operator_actions": {},
        "resolved_incidents": [],
    }


def _build_operator_report(incident: dict[str, Any], tracking: dict[str, Any]) -> dict[str, Any]:
    """Summarize operator action completion for the legacy incident card."""
    recommended = incident.get("recommended_actions", []) or []
    action_status = tracking.get("action_status", {})
    completed_actions = [action for action in recommended if action_status.get(action)]

    completion_count = len(completed_actions)
    total_actions = len(recommended)
    completion_percent = round((completion_count / total_actions) * 100) if total_actions else 0

    summary = (
        f"Operator completed {completion_count} of {total_actions} recommended actions "
        f"for incident {incident.get('id', 'unknown')} ({completion_percent}%)."
    )

    return {
        "completed_actions": completed_actions,
        "completion_count": completion_count,
        "total_actions": total_actions,
        "completion_percent": completion_percent,
        "summary": summary,
        "history": tracking.get("history", []),
    }


def _merge_comms(comms: Optional[dict[str, Any]]) -> dict[str, Any]:
    merged = build_default_comms()
    if comms:
        merged.update(deepcopy(comms))

    if "window_seconds" in merged:
        merged["window_sec"] = merged.pop("window_seconds")

    if not merged.get("source_detail_level"):
        merged["source_detail_level"] = (
            "reduced" if merged.get("degraded") else "full"
        )

    return merged


class StateStore:
    """Tiny process-local store for the demo server."""

    def __init__(self):
        self._state = build_initial_state()

    def reset(self, scenario: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        self._state = build_initial_state(scenario=scenario)
        return self.get()

    def get(self) -> dict[str, Any]:
        self._ensure_contract_fields()
        return deepcopy(self._state)

    def replace(self, state: dict[str, Any]) -> dict[str, Any]:
        self._state = deepcopy(state)
        self._ensure_contract_fields()
        return self.get()

    def set_status(self, status: str) -> dict[str, Any]:
        self._state["meta"]["status"] = status
        return self.get()

    def get_step(self) -> int:
        return int(self._state.get("meta", {}).get("step", 0))

    def increment_step(self) -> int:
        current = self.get_step()
        self._state["meta"]["step"] = current + 1
        return self._state["meta"]["step"]

    def append_event(self, event: dict[str, Any]) -> dict[str, Any]:
        self._state["events"].append(event)
        return self.get()

    def set_agent(self, agent: Optional[dict[str, Any]]) -> dict[str, Any]:
        self._state["agent"] = deepcopy(agent)
        return self.get()

    def clear_agent(self) -> dict[str, Any]:
        self._state["agent"] = None
        return self.get()

    def set_comms(self, degraded: bool, kbps: Optional[float] = None) -> dict[str, Any]:
        current = self._state.get("comms", {})
        link_kbps = kbps if kbps is not None else DEGRADED_COMMS_KBPS
        if not degraded:
            link_kbps = None

        self._state["comms"] = {
            "degraded": degraded,
            "kbps": link_kbps,
            "window_sec": COMMS_WINDOW_SECONDS,
            **build_comms_proof(kbps=link_kbps),
            "source_detail_level": "reduced" if degraded else "full",
            "compression_enabled": bool(current.get("compression_enabled")),
        }
        return self.get()

    def set_compression_enabled(self, enabled: bool) -> dict[str, Any]:
        comms = _merge_comms(self._state.get("comms"))
        comms["compression_enabled"] = enabled
        self._state["comms"] = comms
        return self.get()

    def set_voice_report(self, report: dict[str, Any]) -> dict[str, Any]:
        self._state["voice_report"] = deepcopy(report)
        return self.get()

    def apply_pipeline_result(self, result: dict[str, Any]) -> dict[str, Any]:
        self._apply_core_result(result)
        self._apply_tacnet_result(result)
        self._apply_incident_tracking()
        return self.get()

    def _apply_core_result(self, result: dict[str, Any]) -> None:
        if "events" in result:
            self._state["events"] = result.get("events", [])

        self._state["signals"] = result.get("signals", [])

        self._state["correlation"] = result.get(
            "correlation",
            build_empty_correlation(),
        )

        self._state["incident"] = result.get("incident")

        if "agent" in result:
            self._state["agent"] = result.get("agent")

        if "map_state" in result:
            self._state["map_state"] = result.get("map_state") or build_empty_map_state()

    def _apply_tacnet_result(self, result: dict[str, Any]) -> None:
        for key in ("mesh", "compactions", "sitrep_delta", "voice_report"):
            if key in result:
                self._state[key] = deepcopy(result.get(key))

        if "comms" in result:
            self._state["comms"] = _merge_comms(result.get("comms"))

    def _apply_incident_tracking(self) -> None:
        incident = self._state.get("incident")
        if not incident:
            return

        incident_id = incident.get("id")
        tracking = self._state.get("operator_actions", {}).get(incident_id, {})
        incident["operator_actions"] = tracking.get("action_status", {})
        incident["operator_report"] = _build_operator_report(incident, tracking)
        self._record_resolved_incident(incident, incident_id)

    def _record_resolved_incident(
        self,
        incident: dict[str, Any],
        incident_id: str,
    ) -> None:
        if incident.get("status") != "resolved":
            return

        resolved = self._state.setdefault("resolved_incidents", [])
        if not any(item.get("id") == incident_id for item in resolved):
            resolved.append(deepcopy(incident))

    def _ensure_contract_fields(self) -> None:
        self._state.setdefault("map_state", build_empty_map_state())
        self._state.setdefault("mesh", build_default_mesh())
        self._state.setdefault("compactions", [])
        self._state.setdefault("sitrep_delta", build_empty_sitrep_delta())
        self._state.setdefault("voice_report", build_voice_report())
        self._state["comms"] = _merge_comms(self._state.get("comms"))

    def set_incident_action_status(
        self,
        incident_id: str,
        action: str,
        completed: bool,
        note: Optional[str] = None,
    ) -> dict[str, Any]:
        actions = self._state.setdefault("operator_actions", {})
        incident_tracking = actions.setdefault(incident_id, {
            "action_status": {},
            "history": [],
        })

        incident_tracking["action_status"][action] = completed
        incident_tracking["history"].append({
            "action": action,
            "completed": completed,
            "note": note,
        })

        incident = self._state.get("incident")
        if incident and incident.get("id") == incident_id:
            incident["operator_actions"] = incident_tracking["action_status"]
            incident["operator_report"] = _build_operator_report(incident, incident_tracking)

        return self.get()
