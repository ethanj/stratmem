# app/ingestion/physical_ingestor.py
from typing import List
from app.adapters.base import Adapter


class PhysicalIngestor:
    """
    Handles physical domain:
    - drones
    - sensors
    - cameras
    """

    def __init__(self, adapters: List[Adapter]):
        self.adapters = adapters

    def fetch(self) -> List[dict]:
        events = []

        for adapter in self.adapters:
            try:
                data = adapter.fetch_events()

                physical_events = [
                    e for e in data if e.get("domain") == "physical"
                ]

                events.extend(physical_events)

            except Exception as e:
                print(f"[PHYSICAL INGEST ERROR] {adapter.name}: {e}")

        return sorted(events, key=lambda e: e["timestamp"])