# app/state/store.py
from __future__ import annotations

from copy import deepcopy
from typing import Any, Optional


DEFAULT_SCENARIO = {
    "id": "coordinated_intrusion",
    "name": "Coordinated Intrusion",
    "description": "Cyber, physical, and OSINT indicators converge into a coordinated intrusion pattern.",
}


def build_empty_correlation() -> dict[str, Any]:
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


def build_initial_state(scenario: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    return {
        "events": [],
        "signals": [],
        "correlation": build_empty_correlation(),
        "incident": None,
        "agent": None,
        "map_state": {
            "tracks": [],
            "assets": [],
            "zones": [],
            "threat_paths": [],
        },
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


class StateStore:
    def __init__(self):
        self._state = build_initial_state()

    def reset(self, scenario: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        self._state = build_initial_state(scenario=scenario)
        return self.get()

    def get(self) -> dict[str, Any]:
        return deepcopy(self._state)

    def replace(self, state: dict[str, Any]) -> dict[str, Any]:
        self._state = deepcopy(state)
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

    def apply_pipeline_result(self, result: dict[str, Any]) -> dict[str, Any]:
        if "events" in result:
            self._state["events"] = result.get("events", [])

        self._state["signals"] = result.get("signals", [])

        self._state["correlation"] = result.get(
            "correlation",
            build_empty_correlation(),
        )

        self._state["incident"] = result.get("incident")

        if self._state.get("incident"):
            incident_id = self._state["incident"].get("id")
            tracking = self._state.get("operator_actions", {}).get(incident_id, {})
            self._state["incident"]["operator_actions"] = tracking.get("action_status", {})
            self._state["incident"]["operator_report"] = _build_operator_report(
                self._state["incident"],
                tracking,
            )

            if self._state["incident"].get("status") == "resolved":
                resolved = self._state.setdefault("resolved_incidents", [])
                if not any(item.get("id") == incident_id for item in resolved):
                    resolved.append(deepcopy(self._state["incident"]))

        if "agent" in result:
            self._state["agent"] = result.get("agent")

        self._state["map_state"] = result.get(
            "map_state",
            {
                "tracks": [],
                "assets": [],
                "zones": [],
                "threat_paths": [],
            },
        )

        return self.get()

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
