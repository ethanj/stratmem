# app/ingestion/cyber_ingestor.py
from typing import List
from app.adapters.base import Adapter


class CyberIngestor:
    """
    Handles all cyber-domain data sources:
    - Microsoft Defender
    - SIEM systems
    - Auth logs
    """

    def __init__(self, adapters: List[Adapter]):
        self.adapters = adapters

    def fetch(self) -> List[dict]:
        events = []

        for adapter in self.adapters:
            try:
                data = adapter.fetch_events()

                # enforce domain
                cyber_events = [
                    e for e in data if e.get("domain") == "cyber"
                ]

                events.extend(cyber_events)

            except Exception as e:
                print(f"[CYBER INGEST ERROR] {adapter.name}: {e}")

        return sorted(events, key=lambda e: e["timestamp"])