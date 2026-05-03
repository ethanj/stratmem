"""FastAPI entrypoint for the Sentinel Forge and TacNet Edge demo API.

The app keeps legacy routes such as `/incident/action` while adding the Branch B
TacNet state fields and `/comms/degrade` endpoint. Route handlers remain thin:
they mutate in-memory state, run the pipeline, then return the normalized
`/state` contract.
"""

from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.adapters.mock import MockAdapter
from app.api.routes.agent import router as agent_router
from app.api.routes.receiver import (
    get_receiver_events,
    reset_receiver_events,
    router as receiver_router,
)
from app.core.map import build_map_state
from app.core.map_demo import state_with_receiver_impact
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
from app.voice.salute_extractor import (
    build_voice_report,
    extract_salute,
    voice_event_payload,
)


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")


app = FastAPI(title="Sentinel Forge API")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r"^http://("
        r"localhost|127\.0\.0\.1|0\.0\.0\.0|"
        r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"192\.168\.\d{1,3}\.\d{1,3}|"
        r"172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
        r")(:\d+)?$"
    ),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(agent_router)
app.include_router(receiver_router)

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


class CommsDegradeRequest(BaseModel):
    degraded: bool
    kbps: Optional[float] = None


class CompressionToggleRequest(BaseModel):
    enabled: bool


class VoiceReportRequest(BaseModel):
    audio_id: str


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
        comms=state.get("comms"),
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
    reset_receiver_events()

    state = store.reset(scenario=current_scenario())
    state["meta"]["status"] = "idle"
    state["meta"]["mode"] = "demo"
    state = state_with_map_entities(state)

    return store.replace(state)


@app.post("/simulate/start")
def start_simulation():
    reset_adapter()
    reset_receiver_events()

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
    state = state_with_map_entities(store.get())
    state["scenario"] = current_scenario()
    receiver_events = get_receiver_events()
    state["receiver_events"] = receiver_events
    return state_with_receiver_impact(state, receiver_events)


@app.post("/comms/degrade")
def degrade_comms(payload: CommsDegradeRequest):
    state = store.set_comms(degraded=payload.degraded, kbps=payload.kbps)
    state = run_and_apply_pipeline(state)
    state["scenario"] = current_scenario()
    return store.replace(state)


@app.post("/compression/toggle")
def toggle_compression(payload: CompressionToggleRequest):
    state = store.set_compression_enabled(payload.enabled)
    state["scenario"] = current_scenario()
    return store.replace(state)


@app.post("/voice/report")
def voice_report(payload: VoiceReportRequest):
    validate_voice_audio(payload.audio_id)
    state = store.get()

    if not state.get("comms", {}).get("compression_enabled"):
        return block_raw_voice_report(payload.audio_id, state)

    return process_compressed_voice_report(payload.audio_id, state)


@app.post("/reset")
def reset():
    reset_adapter()
    reset_receiver_events()
    state = store.reset(scenario=current_scenario())
    return store.replace(state_with_map_entities(state))


def state_with_map_entities(state: dict) -> dict:
    """Ensure idle/reset states still carry the drillable Raven Gap map."""
    if state.get("map_state", {}).get("entities"):
        return state

    return {
        **state,
        "map_state": build_map_state(
            state.get("events", []),
            signals=state.get("signals"),
            compactions=state.get("compactions"),
            comms=state.get("comms"),
        ),
    }


def validate_voice_audio(audio_id: str) -> None:
    try:
        extract_salute(audio_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Voice fixture not found") from exc


def block_raw_voice_report(audio_id: str, state: dict) -> dict:
    base_report = build_voice_report(audio_id=audio_id)
    state["voice_report"] = build_voice_report(
        status="blocked_raw",
        mode="raw_audio",
        transmit_bytes=base_report["audio_estimated_bytes"],
        fits_budget=False,
        blocked_reason="raw audio exceeds 3 Kbps / 10 sec budget",
        audio_id=audio_id,
    )
    state["scenario"] = current_scenario()
    return store.replace(state)


def process_compressed_voice_report(audio_id: str, state: dict) -> dict:
    event_payload = voice_event_payload(audio_id)
    base_report = build_voice_report(audio_id=audio_id)
    state["voice_report"] = build_voice_report(
        status="processed",
        mode="compressed_json",
        transmit_bytes=base_report["json_bytes"],
        fits_budget=True,
        audio_id=audio_id,
    )
    state["events"] = upsert_event(state.get("events", []), event_payload)
    state = store.replace(state)
    state = run_and_apply_pipeline(state)
    state["scenario"] = current_scenario()
    return store.replace(state)


def upsert_event(
    events: list[dict],
    event_payload: dict,
) -> list[dict]:
    event_id = event_payload.get("id")
    replaced = False
    updated_events = []

    for event in events:
        if event.get("id") == event_id:
            updated_events.append(event_payload)
            replaced = True
            continue
        updated_events.append(event)

    if not replaced:
        updated_events.append(event_payload)

    return updated_events




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
        comms=state.get("comms"),
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
        comms=state.get("comms"),
    )

    return store.apply_pipeline_result(result)
