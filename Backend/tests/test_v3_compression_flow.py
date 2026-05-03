"""Targeted API tests for the Raven Gap v3 compression-switch flow."""

from fastapi.testclient import TestClient

from app.main import app


VOICE_EVENT_ID = "rg_voice_001"


def test_v3_compression_switch_flow():
    """Verify raw voice blocks, compressed SALUTE enters state once, and replay stays coherent."""
    client = TestClient(app)

    response = client.post("/scenario/select", json={"scenario_id": "raven_gap"})
    assert response.status_code == 200

    response = client.post("/simulate/start")
    assert response.status_code == 200
    state = response.json()

    comms = state["comms"]
    assert comms["degraded"] is True
    assert comms["kbps"] == 3
    assert comms["budget_bytes"] == 3750
    assert comms["compression_enabled"] is False
    assert state["voice_report"]["status"] == "ready"

    response = client.post("/voice/report", json={"audio_id": "raven_gap_salute_1"})
    assert response.status_code == 200
    state = response.json()
    voice_report = state["voice_report"]

    assert voice_report["status"] == "blocked_raw"
    assert voice_report["mode"] == "raw_audio"
    assert voice_report["transmit_bytes"] == voice_report["audio_estimated_bytes"]
    assert voice_report["fits_budget"] is False
    assert count_voice_events(state) == 0

    response = client.post("/compression/toggle", json={"enabled": True})
    assert response.status_code == 200
    state = response.json()
    assert state["comms"]["compression_enabled"] is True

    response = client.post("/voice/report", json={"audio_id": "raven_gap_salute_1"})
    assert response.status_code == 200
    state = response.json()
    voice_report = state["voice_report"]
    voice_event = voice_events(state)[0]

    assert voice_report["status"] == "processed"
    assert voice_report["mode"] == "compressed_json"
    assert voice_report["fits_budget"] is True
    assert count_voice_events(state) == 1
    assert voice_event["type"] == "salute"
    assert voice_event["metadata"]["voice_source"] is True

    response = client.post("/voice/report", json={"audio_id": "raven_gap_salute_1"})
    assert response.status_code == 200
    state = response.json()
    assert count_voice_events(state) == 1

    for _ in range(12):
        response = client.post("/simulate/step")
        assert response.status_code == 200
        state = response.json()

    assert len(state["compactions"]) >= 3
    assert state["incident"] is not None
    assert state["incident"]["evidence_lines"]
    assert "what_changed" in state["sitrep_delta"]
    assert "contact_markers" in state["map_state"]
    assert state["comms"]["raw_bytes"] > state["comms"]["budget_bytes"]
    assert state["comms"]["compacted_bytes"] <= state["comms"]["budget_bytes"]


def voice_events(state: dict) -> list[dict]:
    """Return all voice-derived SALUTE events in state."""
    return [
        event
        for event in state.get("events", [])
        if event.get("id") == VOICE_EVENT_ID
    ]


def count_voice_events(state: dict) -> int:
    """Count voice-derived SALUTE events in state."""
    return len(voice_events(state))
