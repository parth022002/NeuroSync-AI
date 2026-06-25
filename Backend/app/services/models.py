from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List


BASE_DIR = Path(__file__).resolve().parents[3]
TRAINED_DIR = BASE_DIR / "Ai_models" / "trained"


def get_model_status(openai_enabled: bool) -> List[Dict[str, Any]]:
    trained_files = {path.name for path in TRAINED_DIR.glob("*.joblib")} if TRAINED_DIR.exists() else set()
    return [
        {
            "name": "MediaPipe Hands",
            "type": "browser-vision",
            "status": "ready",
            "detail": "21-point hand landmarks for gesture control.",
        },
        {
            "name": "MediaPipe FaceMesh",
            "type": "browser-vision",
            "status": "ready",
            "detail": "Face landmarks for expression and attention cues.",
        },
        {
            "name": "Camera Motion Heuristic",
            "type": "edge-fallback",
            "status": "ready",
            "detail": "Low-latency fallback when landmark models are unavailable.",
        },
        {
            "name": "Productivity Random Forest",
            "type": "analytics",
            "status": "trained" if "productivity_forest.joblib" in trained_files else "fallback",
            "detail": "Tree ensemble forecast model for KPI data.",
        },
        {
            "name": "Productivity Linear Trend",
            "type": "analytics",
            "status": "trained" if "productivity_linear.joblib" in trained_files else "fallback",
            "detail": "Fast trend baseline for next-window estimates.",
        },
        {
            "name": "Productivity MLP Neural Network",
            "type": "analytics",
            "status": "trained" if "productivity_mlp.joblib" in trained_files else "fallback",
            "detail": "Multi-Layer Perceptron neural network model for productivity forecasting.",
        },
        {
            "name": "Weighted Forecast Ensemble",
            "type": "analytics",
            "status": "ready",
            "detail": "Blends linear trend, EMA, momentum, and seasonal baselines.",
        },
        {
            "name": "Anomaly + Risk Engine",
            "type": "analytics",
            "status": "ready",
            "detail": "Z-score anomaly detection with focus-productivity risk scoring.",
        },
        {
            "name": "NeuroSync Assistant LLM",
            "type": "assistant",
            "status": "remote" if openai_enabled else "local",
            "detail": "Context-aware assistant with local fallback logic.",
        },
    ]
