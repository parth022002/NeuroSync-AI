# NeuroSync Backend Overview

## What is included

- FastAPI application with health, assistant, analytics, and decision endpoints
- Static serving hooks for the current frontend
- Local fallback assistant logic
- Analytics summary service aligned with the frontend KPI logic
- Decision engine service aligned with the frontend signal-fusion logic
- Baseline ML training script and sample dataset

## Main routes

- `GET /api/health`
- `POST /api/assistant/chat`
- `POST /api/analytics/analyze`
- `POST /api/decision/recommend`

## Run locally

```bash
cd Backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Train starter models

```bash
python Scripts/train_all_models.py
```
