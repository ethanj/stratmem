# app/agent/ollama_agent.py
from __future__ import annotations

import json
import os
from typing import Any

import httpx

from app.agent.base import AgentProvider
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.schemas import AgentOutput, validate_agent_output


class OllamaAgent(AgentProvider):
    def __init__(self):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
        self.timeout_seconds = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "30"))

    @property
    def name(self) -> str:
        return "ollama"

    def available(self) -> bool:
        try:
            response = httpx.get(f"{self.base_url}/api/tags", timeout=0.2)
            return response.status_code == 200
        except Exception:
            return False

    def analyze(self, context: dict[str, Any]) -> AgentOutput | None:
        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            "Incident context:\n"
            f"{json.dumps(context, indent=2)}"
        )

        try:
            response = httpx.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "keep_alive": "10m",
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 350,
                    },
                },
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()

            payload = response.json()
            raw_text = payload.get("response")

            if not raw_text:
                return None

            parsed = json.loads(raw_text)
            return validate_agent_output(parsed, provider=self.name)

        except Exception as e:
            print(f"[OLLAMA AGENT ERROR] {e}")
            return None