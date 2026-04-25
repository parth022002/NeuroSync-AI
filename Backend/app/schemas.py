from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    openai_enabled: bool
    models: List[Dict[str, Any]] = []


class AssistantRequest(BaseModel):
    message: str = Field(..., min_length=1)
    context: Optional[Dict[str, Any]] = None


class AssistantResponse(BaseModel):
    reply: str
    mode: str


class AnalyticsRequest(BaseModel):
    rows: List[Dict[str, Any]]


class AnalyticsResponse(BaseModel):
    metrics: Dict[str, Any]
    insights: List[str]


class DecisionRequest(BaseModel):
    gesture: str = "Idle"
    emotion: str = "Neutral"
    attention: Optional[int] = None
    voice_state: str = "Standby"
    metrics: Optional[Dict[str, Any]] = None


class DecisionResponse(BaseModel):
    title: str
    reason: str
    confidence: float
    mode: str
    queue: List[str]


class ModelStatusResponse(BaseModel):
    models: List[Dict[str, Any]]
