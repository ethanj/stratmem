#app/api/routes/agent.py
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.agent.context_builder import build_agent_context
from app.agent.router import run_agent


router = APIRouter(prefix="/agent", tags=["agent"])


class AgentAnalyzeRequest(BaseModel):
    correlation: dict[str, Any]
    incident: dict[str, Any]


class AgentChatRequest(BaseModel):
    question: str
    state: Optional[dict[str, Any]] = None
    incident: Optional[dict[str, Any]] = None
    correlation: Optional[dict[str, Any]] = None


@router.post("/analyze")
def analyze_incident(payload: AgentAnalyzeRequest):
    context = build_agent_context(
        payload.correlation,
        payload.incident,
    )

    return {
        "agent": run_agent(context)
    }


@router.post("/chat")
def chat_with_agent(payload: AgentChatRequest):
    context = {
        "operator_question": payload.question,
        "incident": payload.incident,
        "correlation": payload.correlation,
        "state": payload.state,
        "instruction": (
            "Answer the operator's question using only the provided incident, "
            "correlation, and state context. Be concise and operational."
        ),
    }

    return {
        "agent": run_agent(context)
    }