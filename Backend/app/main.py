# app/main.py
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from app.adapters.mock import MockAdapter
from app.api.routes.agent import router as agent_router
from app.core.pipeline import run_pipeline
from app.core.scenario import (
    DEFAULT_SCENARIO_ID,
    build_scenario_events,
    get_scenario_metadata,
    get_scenarios,
    scenario_exists,
)
from app.generator.background_events import build_background_event
from app.state.store import StateStore


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")


app = FastAPI(title="Sentinel Forge API")
app.include_router(agent_router)

store = StateStore()

selected_scenario_id = DEFAULT_SCENARIO_ID
adapter = MockAdapter({"events": build_scenario_events(selected_scenario_id)})


class ScenarioSelectRequest(BaseModel):
    scenario_id: str


class IncidentResolveRequest(BaseModel):
    incident_id: str


class IncidentActionUpdateRequest(BaseModel):
    incident_id: str
    action: str
    completed: bool
    note: Optional[str] = None


def current_scenario() -> dict:
    return get_scenario_metadata(selected_scenario_id)


def reset_adapter():
    global adapter
    adapter = MockAdapter({"events": build_scenario_events(selected_scenario_id)})


def run_and_apply_pipeline(state: dict) -> dict:
    incident_id = (state.get("incident") or {}).get("id")
    operator_actions = state.get("operator_actions", {}).get(incident_id, {}).get("action_status", {}) if incident_id else {}

    result = run_pipeline(
        state["events"],
        previous_correlation=state.get("correlation"),
        operator_actions=operator_actions,
        previous_incident=state.get("incident"),
    )

    return store.apply_pipeline_result(result)


@app.get("/scenarios")
def list_scenarios():
    return {
        "scenarios": get_scenarios(),
        "selected": current_scenario(),
    }


@app.post("/scenario/select")
def select_scenario(payload: ScenarioSelectRequest):
    global selected_scenario_id

    if not scenario_exists(payload.scenario_id):
        raise HTTPException(status_code=404, detail="Scenario not found")

    selected_scenario_id = payload.scenario_id
    reset_adapter()

    state = store.reset(scenario=current_scenario())
    state["meta"]["status"] = "idle"
    state["meta"]["mode"] = "demo"

    return store.replace(state)


@app.post("/simulate/start")
def start_simulation():
    reset_adapter()

    state = store.reset(scenario=current_scenario())
    state["meta"]["status"] = "running"
    state["meta"]["mode"] = "demo"

    # Emit exactly one telemetry ping on start so the system visibly comes alive.
    background_event = build_background_event(0)
    state = store.replace(state)
    state = store.append_event(background_event)

    state = run_and_apply_pipeline(state)

    state["scenario"] = current_scenario()
    state["meta"]["status"] = "running"
    state["meta"]["mode"] = "demo"

    return store.replace(state)


@app.post("/simulate/step")
def step_simulation():
    state = store.get()

    current_step = store.get_step()
    scenario_event = adapter.fetch_next_event()

    store.increment_step()

    if scenario_event:
        # Normal case: advance the selected scenario one event at a time.
        state = store.append_event(scenario_event)
        state["meta"]["status"] = "running"
    else:
        # Scenario is complete. If the operator manually steps again,
        # emit a harmless telemetry ping instead of doing nothing.
        background_event = build_background_event(current_step)
        state = store.append_event(background_event)
        state["meta"]["status"] = "complete"

    state = run_and_apply_pipeline(state)

    # New event means previous analyst output may no longer match current state.
    state = store.clear_agent()

    state["scenario"] = current_scenario()
    state["meta"]["mode"] = "demo"

    return store.replace(state)


@app.get("/state")
def get_state():
    state = store.get()
    state["scenario"] = current_scenario()
    return state


@app.post("/reset")
def reset():
    reset_adapter()
    return store.reset(scenario=current_scenario())




@app.post("/incident/resolve")
def resolve_incident(payload: IncidentResolveRequest):
    state = store.get()
    incident = state.get("incident")

    if not incident or incident.get("id") != payload.incident_id:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident["manually_resolved"] = True
    state["incident"] = incident
    store.replace(state)

    result = run_pipeline(
        state["events"],
        previous_correlation=state.get("correlation"),
        operator_actions=state.get("operator_actions", {}).get(payload.incident_id, {}).get("action_status", {}),
        previous_incident=incident,
    )

    return store.apply_pipeline_result(result)


@app.post("/incident/action")
def update_incident_action(payload: IncidentActionUpdateRequest):
    state = store.set_incident_action_status(
        incident_id=payload.incident_id,
        action=payload.action,
        completed=payload.completed,
        note=payload.note,
    )

    result = run_pipeline(
        state["events"],
        previous_correlation=state.get("correlation"),
        operator_actions=state.get("operator_actions", {}).get(payload.incident_id, {}).get("action_status", {}),
        previous_incident=state.get("incident"),
    )

    return store.apply_pipeline_result(result)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
