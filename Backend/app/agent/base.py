#app/agent/base.py

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.agent.schemas import AgentOutput


class AgentProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def available(self) -> bool:
        pass

    @abstractmethod
    def analyze(self, context: dict[str, Any]) -> AgentOutput | None:
        pass