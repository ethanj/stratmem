"""Tests for receiver-side compressed semantic frame decoding."""

from fastapi.testclient import TestClient

from app.main import app


def test_receiver_decode_fixture_updates_s2_event_list():
    """Receiver fixture decodes into verified metadata and reconstructed text."""
    client = TestClient(app)
    client.post("/reset")

    response = client.post(
        "/api/receiver/decode",
        json={
            "use_fixture": True,
            "room": "raven-gap",
            "source": "s2-dashboard-test",
        },
    )

    assert response.status_code == 200
    event = response.json()

    assert event["verified"] is True
    assert event["frame_type"] == "metadata"
    assert event["metadata"]["report_type"] == "casevac"
    assert event["metadata"]["speaker"] == "Alpha Two"
    assert "Alpha Two at grid 12345678" in event["reconstructed_text"]
    assert event["compression"]["binary_bytes"] == event["byte_count"]
    assert event["compression"]["ratio"] > 1

    response = client.get("/api/receiver/events?room=raven-gap")
    assert response.status_code == 200
    events = response.json()["events"]

    assert len(events) == 1
    assert events[0]["id"] == event["id"]


def test_receiver_decode_rejects_missing_frame_payload():
    """Decode endpoint requires an explicit frame or the demo fixture flag."""
    client = TestClient(app)

    response = client.post("/api/receiver/decode", json={"room": "raven-gap"})

    assert response.status_code == 400
    assert response.json()["detail"] == "missing_frame_payload"


def test_receiver_decode_rejects_invalid_frame_hex():
    """Decode endpoint rejects malformed frame hex before decoding."""
    client = TestClient(app)

    response = client.post("/api/receiver/decode", json={"frame_hex": "not-hex"})

    assert response.status_code == 400
    assert response.json()["detail"] == "invalid_frame_payload"


def test_state_includes_receiver_events_after_decode():
    """The dashboard state endpoint exposes receiver events for the S2 panel."""
    client = TestClient(app)
    client.post("/scenario/select", json={"scenario_id": "raven_gap"})
    client.post("/api/receiver/decode", json={"use_fixture": True})

    response = client.get("/state")

    assert response.status_code == 200
    state = response.json()
    assert state["receiver_events"]
    assert state["receiver_events"][0]["verified"] is True
    entities = state["map_state"]["entities"]
    casualty = next(entity for entity in entities if entity["id"] == "1st_squad_rifle")
    assert casualty["status"]["health"] == "red"
    assert casualty["report_status"] == "CASEVAC pending"
