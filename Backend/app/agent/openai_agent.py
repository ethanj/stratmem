#app/agent/openai_agent.py
from __future__ import annotations

import json
import os
from typing import Any

from app.agent.base import AgentProvider
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.schemas import AgentOutput, validate_agent_output


class OpenAIAgent(AgentProvider):
    @property
    def name(self) -> str:
        return "openai"

    def available(self) -> bool:
        return bool(os.getenv("OPENAI_API_KEY"))

    def analyze(self, context: dict[str, Any]) -> AgentOutput | None:
        if not self.available():
            return None

        try:
            from openai import OpenAI

            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

            response = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-5-mini"),
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": json.dumps(context)},
                ],
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content

            if not content:
                return None

            parsed = json.loads(content)
            return validate_agent_output(parsed, provider=self.name)

        except Exception as e:
            print(f"[OPENAI AGENT ERROR] {e}")
            return None