# server/tests/test_api_contract.py

import unittest

from fastapi.testclient import TestClient

from app.main import app


EXPECTED_SCENARIO_EVENT_COUNT = 17


def scenario_events(payload):
    """
    Scenario/security events are the events that drive detection,
    correlation, incidents, and map state.

    Background telemetry keeps the operator console alive, but should not
    count as scenario progression.
    """
    return [
        event
        for event in payload.get("events", [])
        if not event.get("metadata", {}).get("background")
    ]


def background_events(payload):
    """
    Background telemetry events are adapter/system pings such as heartbeats,
    polling cycles, and health checks.
    """
    return [
        event
        for event in payload.get("events", [])
        if event.get("metadata", {}).get("background") is True
    ]


class SimulationApiContractTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.client.post("/reset")

    def test_state_shape_contains_frontend_contract(self):
        response = self.client.post("/simulate/start")
        self.assertEqual(response.status_code, 200)

        payload = response.json()

        self.assertIn("events", payload)
        self.assertIn("signals", payload)
        self.assertIn("correlation", payload)
        self.assertIn("incident", payload)
        self.assertIn("map_state", payload)
        self.assertIn("meta", payload)

        # Start may now emit live background telemetry, but should not
        # emit scenario/security events yet.
        self.assertEqual(scenario_events(payload), [])
        self.assertGreaterEqual(len(background_events(payload)), 1)

        self.assertEqual(payload["signals"], [])
        self.assertIsNone(payload["incident"])

        self.assertEqual(payload["correlation"]["confidence"], 0)
        self.assertEqual(payload["correlation"]["cyberCount"], 0)
        self.assertEqual(payload["correlation"]["physicalCount"], 0)
        self.assertEqual(payload["correlation"]["signals"], [])
        self.assertEqual(payload["correlation"]["level"], "low")
        self.assertEqual(payload["correlation"]["osintCount"], 0)
        self.assertEqual(payload["correlation"]["explanation"], [])
        self.assertIn("scoreBreakdown", payload["correlation"])

        self.assertIn("tracks", payload["map_state"])
        self.assertIn("assets", payload["map_state"])
        self.assertIn("zones", payload["map_state"])
        self.assertIn("threat_paths", payload["map_state"])

        self.assertIn("meta", payload)
        self.assertEqual(payload["meta"]["status"], "running")
        self.assertEqual(payload["meta"]["mode"], "demo")

    def test_background_telemetry_is_present_but_does_not_trigger_signals(self):
        response = self.client.post("/simulate/start")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        telemetry = background_events(payload)

        self.assertGreaterEqual(len(telemetry), 1)
        self.assertEqual(scenario_events(payload), [])
        self.assertEqual(payload["signals"], [])
        self.assertEqual(payload["correlation"]["confidence"], 0)
        self.assertIsNone(payload["incident"])

        event = telemetry[0]

        self.assertIn("id", event)
        self.assertIn("timestamp", event)
        self.assertIn("type", event)
        self.assertIn("source", event)
        self.assertIn("domain", event)
        self.assertIn("severity", event)
        self.assertIn("message", event)
        self.assertIn("raw", event)
        self.assertIn("metadata", event)

        self.assertTrue(event["metadata"].get("background"))
        self.assertIn(event["domain"], ["cyber", "physical", "osint", "unknown"])
        self.assertIn(
            event["severity"],
            ["low", "medium", "high", "critical", "unknown"],
        )

    def test_normal_events_do_not_trigger_signals_immediately(self):
        self.client.post("/simulate/start")

        payload = None

        for _ in range(3):
            response = self.client.post("/simulate/step")
            self.assertEqual(response.status_code, 200)
            payload = response.json()

        self.assertIsNotNone(payload)

        # Scenario progression is still 3 events, even if telemetry is also present.
        self.assertEqual(len(scenario_events(payload)), 3)
        self.assertGreaterEqual(len(background_events(payload)), 1)

        self.assertEqual(payload["signals"], [])
        self.assertEqual(payload["correlation"]["confidence"], 0)
        self.assertIsNone(payload["incident"])

    def test_signals_progress_and_incident_triggers(self):
        self.client.post("/simulate/start")

        payload = None

        # Step through full richer scenario.
        for _ in range(18):
            response = self.client.post("/simulate/step")
            self.assertEqual(response.status_code, 200)
            payload = response.json()

        self.assertIsNotNone(payload)

        # Scenario/security events are deterministic.
        # Background telemetry may make total event count larger.
        self.assertEqual(
            len(scenario_events(payload)),
            EXPECTED_SCENARIO_EVENT_COUNT,
        )
        self.assertGreaterEqual(
            len(payload["events"]),
            EXPECTED_SCENARIO_EVENT_COUNT,
        )
        self.assertGreaterEqual(len(background_events(payload)), 1)

        signal_kinds = {signal["kind"] for signal in payload["signals"]}

        self.assertIn("auth.failed_burst", signal_kinds)
        self.assertIn("auth.anomalous_login", signal_kinds)
        self.assertIn("network.lateral_movement", signal_kinds)
        self.assertIn("physical.drone_recon", signal_kinds)
        self.assertIn("identity.privilege_escalation", signal_kinds)
        self.assertIn("network.data_exfiltration", signal_kinds)
        self.assertIn("osint.ais_anomaly", signal_kinds)

        self.assertEqual(payload["correlation"]["level"], "critical")
        self.assertGreaterEqual(payload["correlation"]["osintCount"], 1)
        self.assertGreaterEqual(len(payload["correlation"]["explanation"]), 1)
        self.assertIn("scoreBreakdown", payload["correlation"])
        self.assertGreaterEqual(
            payload["correlation"]["scoreBreakdown"]["crossDomainBonus"],
            0.1,
        )

        self.assertIsNotNone(payload["incident"])
        self.assertEqual(payload["incident"]["severity"], "critical")

        self.assertGreaterEqual(payload["correlation"]["confidence"], 0.9)
        self.assertGreaterEqual(len(payload["correlation"]["history"]), 1)

    def test_reset_clears_state(self):
        self.client.post("/simulate/start")
        self.client.post("/simulate/step")

        response = self.client.post("/reset")
        self.assertEqual(response.status_code, 200)

        payload = response.json()

        self.assertEqual(payload["events"], [])
        self.assertEqual(payload["signals"], [])
        self.assertEqual(payload["correlation"]["confidence"], 0)
        self.assertIsNone(payload["incident"])
        self.assertEqual(payload["map_state"]["tracks"], [])

    def test_events_are_normalized_after_step(self):
        self.client.post("/simulate/start")

        response = self.client.post("/simulate/step")
        self.assertEqual(response.status_code, 200)

        payload = response.json()

        scenario = scenario_events(payload)
        self.assertEqual(len(scenario), 1)

        event = scenario[0]

        self.assertIn("id", event)
        self.assertIn("timestamp", event)
        self.assertIn("type", event)
        self.assertIn("source", event)
        self.assertIn("domain", event)
        self.assertIn("severity", event)
        self.assertIn("message", event)
        self.assertIn("raw", event)
        self.assertIn("metadata", event)

        self.assertIn(event["domain"], ["cyber", "physical", "osint", "unknown"])
        self.assertIn(
            event["severity"],
            ["low", "medium", "high", "critical", "unknown"],
        )

    def test_background_and_scenario_events_are_both_normalized(self):
        self.client.post("/simulate/start")

        response = self.client.post("/simulate/step")
        self.assertEqual(response.status_code, 200)

        payload = response.json()

        self.assertGreaterEqual(len(payload["events"]), 1)

        for event in payload["events"]:
            self.assertIn("id", event)
            self.assertIn("timestamp", event)
            self.assertIn("type", event)
            self.assertIn("source", event)
            self.assertIn("domain", event)
            self.assertIn("severity", event)
            self.assertIn("message", event)
            self.assertIn("raw", event)
            self.assertIn("metadata", event)

            self.assertIn(event["domain"], ["cyber", "physical", "osint", "unknown"])
            self.assertIn(
                event["severity"],
                ["low", "medium", "high", "critical", "unknown"],
            )

    def test_map_state_updates_from_signals(self):
        self.client.post("/simulate/start")

        payload = None

        for _ in range(18):
            response = self.client.post("/simulate/step")
            self.assertEqual(response.status_code, 200)
            payload = response.json()

        self.assertIsNotNone(payload)

        map_state = payload["map_state"]

        self.assertIn("assets", map_state)
        self.assertIn("zones", map_state)
        self.assertIn("tracks", map_state)
        self.assertIn("threat_paths", map_state)
        self.assertIn("risk_level", map_state)

        self.assertGreaterEqual(len(map_state["assets"]), 5)
        self.assertGreaterEqual(len(map_state["zones"]), 1)
        self.assertGreaterEqual(len(map_state["tracks"]), 2)
        self.assertGreaterEqual(len(map_state["threat_paths"]), 3)

        self.assertEqual(map_state["risk_level"], "critical")

        asset_statuses = {
            asset["name"]: asset["status"]
            for asset in map_state["assets"]
        }

        # The newer map model can represent pre-confirmed auth compromise as
        # "suspect" before escalating to "alerting". In a critical full scenario,
        # either state is acceptable for auth depending on the scenario timing.
        self.assertIn(asset_statuses["AUTH SERVER"], ["suspect", "alerting"])

        self.assertEqual(asset_statuses["EDR SENSOR NETWORK"], "alerting")
        self.assertEqual(asset_statuses["NETWORK GATEWAY"], "alerting")
        self.assertIn(asset_statuses["UAS MONITORING"], ["active", "alerting"])
        self.assertIn(asset_statuses["AIS MONITORING"], ["active", "alerting"])

    def test_system_remains_live_after_scenario_exhaustion_without_new_scenario_events(
        self,
    ):
        self.client.post("/simulate/start")

        payload = None

        # Step beyond the known scenario length.
        for _ in range(24):
            response = self.client.post("/simulate/step")
            self.assertEqual(response.status_code, 200)
            payload = response.json()

        self.assertIsNotNone(payload)

        scenario_count_after_exhaustion = len(scenario_events(payload))

        self.assertEqual(
            scenario_count_after_exhaustion,
            EXPECTED_SCENARIO_EVENT_COUNT,
        )

        # With background telemetry enabled, the system can remain live even after
        # the scripted scenario has no new security events.
        self.assertEqual(payload["meta"]["status"], "running")

        # Exhaustion of scenario events should preserve the analyzed incident state.
        self.assertIsNotNone(payload["incident"])
        self.assertEqual(payload["correlation"]["level"], "critical")
        self.assertEqual(payload["incident"]["severity"], "critical")

        # Extra steps should not create additional scenario/security events.
        for _ in range(3):
            response = self.client.post("/simulate/step")
            self.assertEqual(response.status_code, 200)
            payload = response.json()

        self.assertEqual(
            len(scenario_events(payload)),
            scenario_count_after_exhaustion,
        )


if __name__ == "__main__":
    unittest.main()