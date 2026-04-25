from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.schemas import (
    AnalyticsRequest,
    AnalyticsResponse,
    AssistantRequest,
    AssistantResponse,
    DecisionRequest,
    DecisionResponse,
    HealthResponse,
    ModelStatusResponse,
)
from app.services.analytics import analyze_rows
from app.services.assistant import AssistantService
from app.services.decision import compute_decision
from app.services.models import get_model_status

settings = get_settings()
assistant_service = AssistantService(settings)

BASE_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIR = BASE_DIR / "Frontend"
ASSETS_DIR = BASE_DIR / "Assets"

app = FastAPI(title=settings.app_name, version=settings.app_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if ASSETS_DIR.exists():
    app.mount("/Assets", StaticFiles(directory=ASSETS_DIR), name="assets")


@app.get("/api/health", response_model=HealthResponse)
def healthcheck() -> HealthResponse:
    return HealthResponse(
        status="ok",
        app_name=settings.app_name,
        version=settings.app_version,
        openai_enabled=bool(settings.openai_api_key),
        models=get_model_status(bool(settings.openai_api_key)),
    )


@app.get("/api/models/status", response_model=ModelStatusResponse)
def model_status() -> ModelStatusResponse:
    return ModelStatusResponse(models=get_model_status(bool(settings.openai_api_key)))


@app.post("/api/assistant/chat", response_model=AssistantResponse)
def assistant_chat(request: AssistantRequest) -> AssistantResponse:
    reply, mode = assistant_service.generate_reply(request.message, request.context)
    return AssistantResponse(reply=reply, mode=mode)


@app.post("/api/analytics/analyze", response_model=AnalyticsResponse)
def analytics_analyze(request: AnalyticsRequest) -> AnalyticsResponse:
    metrics, insights = analyze_rows(request.rows)
    return AnalyticsResponse(metrics=metrics, insights=insights)


@app.post("/api/decision/recommend", response_model=DecisionResponse)
def decision_recommend(request: DecisionRequest) -> DecisionResponse:
    decision = compute_decision(
        gesture=request.gesture,
        emotion=request.emotion,
        attention=request.attention,
        voice_state=request.voice_state,
        metrics=request.metrics,
    )
    return DecisionResponse(**decision)


@app.get("/", include_in_schema=False)
def frontend_index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/styles.css", include_in_schema=False)
def frontend_styles() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "styles.css")


@app.get("/app.js", include_in_schema=False)
def frontend_app_script() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "app.js")
