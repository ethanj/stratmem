#app/agent/router.py
from __future__ import annotations

import os
from typing import Any

from app.agent.base import AgentProvider
from app.agent.heuristic_agent import HeuristicAgent
from app.agent.ollama_agent import OllamaAgent
from app.agent.openai_agent import OpenAIAgent
from app.agent.schemas import AgentOutput


def get_providers() -> list[AgentProvider]:
    preferred = os.getenv("AGENT_PROVIDER", "auto").lower()

    heuristic = HeuristicAgent()
    ollama = OllamaAgent()
    openai = OpenAIAgent()

    if preferred == "heuristic":
        return [heuristic]

    if preferred == "ollama":
        return [ollama, heuristic]

    if preferred == "openai":
        return [openai, heuristic]

    return [ollama, openai, heuristic]


def run_agent(context: dict[str, Any]) -> AgentOutput:
    for provider in get_providers():
        if not provider.available():
            continue

        result = provider.analyze(context)

        if result:
            return result

    # Should never happen because heuristic is always available.
    return HeuristicAgent().analyze(context)