# NeuroSync AI

NeuroSync AI is a multimodal intelligent dashboard that combines webcam perception, hand gesture recognition, face/emotion heuristics, voice interaction, analytics forecasting, decision intelligence, and downloadable session reporting in one responsive web experience.

The project is built as a lightweight production-ready stack:

- **Frontend:** Vanilla HTML, CSS, and JavaScript in `Frontend/`
- **Backend:** FastAPI in `Backend/app/`
- **AI/Analytics:** Browser MediaPipe models, local perception fallback, ensemble KPI forecasting, anomaly/risk scoring, and optional OpenAI assistant integration
- **Deployment:** Docker, Docker Compose, and Procfile support

## Main Use Cases

- Monitor a live webcam feed with hand and face overlays.
- Detect gesture states such as open palm, pointer, pinch select, swipe, hold, and camera fallback motion.
- Estimate emotion and attention from facial signals or fallback camera signals.
- Use voice recognition and audio monitoring for hands-free interaction.
- Upload or load productivity CSV data and generate forecasts, insights, risk scores, and confidence scores.
- Fuse gesture, emotion, voice, and analytics into a recommended next action.
- Download a full session report for record keeping.

## Real-Life Applications

NeuroSync AI is designed as a practical prototype for environments where live human-computer interaction and productivity intelligence matter.

### Smart Work Dashboard

Teams can use NeuroSync as a focus and productivity dashboard during work sessions. A user can load daily KPI data, monitor current engagement signals, and download a session report at the end of a work block. The report can help compare focus, productivity, risk, and recommended actions across sessions.

### Accessibility and Hands-Free Control

The gesture and voice controls demonstrate how an interface can be operated with minimal keyboard or mouse input. This is useful for accessibility experiments, kiosk interfaces, lab environments, presentations, or situations where a user needs quick hands-free actions.

### Training and Coaching Sessions

Coaches, mentors, or instructors can use the dashboard to review session rhythm. Gesture, voice, emotion, attention, and analytics data are combined into a simple decision recommendation, making it easier to discuss productivity patterns after a session.

### Productivity Analytics Prototype

The CSV analytics engine can be used with productivity, task, focus, or sentiment datasets. The system generates forecasts, anomaly detection, risk scoring, and confidence estimates, which makes it useful as a demo for business intelligence or workplace analytics.

### Research and Demonstration

NeuroSync works well as a college project, AI demo, hackathon prototype, or proof-of-concept for multimodal AI. It shows how browser-based vision models, voice APIs, analytics, and a FastAPI backend can be combined in a single deployable system.

### Meeting or Study Session Records

At the end of a meeting, study session, or work sprint, the **Download Report** feature creates a record of detected state, analytics summary, insights, decision queue, and timeline events. This can be stored as documentation or used for later review.

Important: The current gesture and emotion signals are heuristic assistive signals. They should not be used for medical diagnosis, hiring, grading, surveillance, or other high-impact decisions.

## Browser Console Notes

MediaPipe may print WebGL and TensorFlow Lite runtime messages such as `Successfully created a WebGL context`, `GL version`, `OpenGL error checking is disabled`, or `Created TensorFlow Lite XNNPACK delegate for CPU`. These are normal MediaPipe runtime logs, not application failures. The frontend filters these known benign messages so the console stays clean while real errors remain visible.

## Features

- Live camera start/stop controls.
- MediaPipe Hands and FaceMesh integration.
- Correctly aligned mirrored landmark overlay for live feed.
- Camera-only fallback model when vision landmarks are unavailable.
- Speech recognition and speech synthesis when supported by the browser.
- Animated AI audio assistant avatar.
- Real-time audio waveform and microphone level meter.
- CSV upload and sample dataset loader.
- Advanced analytics engine:
  - Weighted ensemble forecast
  - Exponential smoothing
  - Momentum forecast
  - Seasonal baseline
  - Z-score anomaly detection
  - Correlation-based signal fit
  - Risk score
  - Model confidence
- Decision fusion engine.
- Model registry panel.
- Mood-reactive background colors.
- Six themes: Neon, Aurora, Ember, Cobalt, Focus, and Calm.
- Downloadable text report with a machine-readable JSON snapshot.
- Responsive layout for desktop, tablet, and mobile screens.

## Project Structure

```text
NeuroSync - AI/
  Ai_models/               Trained model placeholders and model scripts
  Assets/                  Logo and visual assets
  Backend/                 FastAPI backend
    app/
      main.py              API routes and static frontend serving
      schemas.py           Pydantic request/response models
      services/            Assistant, analytics, decision, model registry
  Data/                    Sample data
  Docker/                  Dockerfile and Compose config
  Docs/                    Extra documentation
  Frontend/                HTML, CSS, JavaScript dashboard
  Scripts/                 Startup and training scripts
  Procfile                 Procfile deployment command
  requirements.txt       Python dependencies
```

## Requirements

- Python 3.9 or newer
- Modern browser with camera support
- Chrome or Edge recommended for speech recognition
- Internet access for MediaPipe CDN model scripts
- Optional: Docker Desktop
- Optional: `OPENAI_API_KEY` for remote LLM assistant responses

## Local Setup

Install dependencies:

```powershell
cd "C:\Users\parth\OneDrive\Desktop\Project and work\NeuroSync - AI"
pip install -r Backend\requirements.txt
```

Start the backend:

```powershell
python -m uvicorn app.main:app --app-dir Backend --host 127.0.0.1 --port 8000
```

Open:

```text
http://127.0.0.1:8000
```

Camera and microphone permissions work best from `http://127.0.0.1:8000` or HTTPS, not by opening the HTML file directly.

## Optional OpenAI Assistant

Create a `.env` file or set environment variables:

```powershell
$env:OPENAI_API_KEY="your_api_key_here"
$env:OPENAI_MODEL="gpt-5-mini"
```

Then restart the backend.

If no key is configured, NeuroSync uses the local assistant fallback.

## CSV Format

The analytics engine auto-detects useful columns. Best results come from columns similar to:

```csv
date,focus_score,productivity_score,emotion_score,tasks_completed
2026-04-01,82,76,73,5
2026-04-02,85,81,75,6
```

Supported column name hints include:

- Date: `date`, `time`, `timestamp`, `day`
- Focus: `focus`, `attention`, `concentration`
- Productivity: `productivity`, `efficiency`, `output`
- Emotion: `emotion`, `sentiment`, `mood`
- Tasks: `task`, `completed`, `deliverable`

## API Endpoints

```text
GET  /api/health
GET  /api/models/status
POST /api/assistant/chat
POST /api/analytics/analyze
POST /api/decision/recommend
GET  /
GET  /styles.css
GET  /app.js
```

## Download Report

Use the **Download Report** button in the top bar, Analytics panel, or Decision panel. The report includes:

- Timestamp
- Gesture, emotion, attention, voice, and transcript state
- Dataset name and analytics metrics
- Forecast, AI confidence, risk score, and model list
- Generated insights
- Decision recommendation and priority queue
- Event timeline
- Machine-readable JSON snapshot

## Docker Deployment

Build and run with Docker Compose:

```powershell
cd "C:\Users\parth\OneDrive\Desktop\Project and work\NeuroSync - AI\Docker"
docker compose up --build
```

Open:

```text
http://127.0.0.1:8000
```

## Vercel Deployment

The project includes Vercel-ready files:

- `api/index.py` exposes the FastAPI app as a Vercel Python function.
- `vercel.json` routes all requests through the FastAPI app so `/`, `/api/health`, `/styles.css`, and `/app.js` keep working.
- Root `requirements.txt` points Vercel to the backend Python dependencies.

The Vercel config intentionally avoids the legacy `builds` field, so dashboard Build and Development Settings remain usable and the deploy warning about unused build settings does not appear.

### Deploy from GitHub

1. Push this project to a GitHub repository.
2. Open [Vercel](https://vercel.com/new).
3. Import the GitHub repository.
4. Keep the framework preset as **Other** if Vercel does not auto-detect Python.
5. Leave build command empty unless Vercel asks for one.
6. Add optional environment variables:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
7. Click **Deploy**.

After deployment, verify:

```text
https://your-project.vercel.app/
https://your-project.vercel.app/api/health
https://your-project.vercel.app/api/models/status
```

### Deploy with Vercel CLI

Install and login:

```powershell
npm install -g vercel
vercel login
```

Deploy a preview:

```powershell
cd "C:\Users\parth\OneDrive\Desktop\Project and work\NeuroSync - AI"
vercel
```

Deploy production:

```powershell
vercel --prod
```

Important: camera and microphone APIs require HTTPS in production. Vercel deployments use HTTPS automatically, so the live perception features should work better there than from a plain local file.

## Procfile Deployment

For platforms that support Procfiles, use:

```text
web: uvicorn app.main:app --app-dir Backend --host 0.0.0.0 --port ${PORT:-8000}
```

Make sure the platform installs dependencies from `Backend/requirements.txt` or configure the build command accordingly.

## Production Notes

- Use HTTPS in production so browser camera and microphone APIs work reliably.
- Set `OPENAI_API_KEY` only in secure environment variables.
- Keep CORS restricted for public deployments.
- MediaPipe scripts are loaded from CDN; for fully offline deployments, vendor those assets locally.
- The current emotion and gesture models are heuristic and should be treated as assistive signals, not medical or biometric claims.

## Verification Commands

```powershell
python -m compileall Backend\app
node --check Frontend\app.js
```

Health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/health
```

## Current Status

The project is ready for local demonstration, responsive device testing, and Docker-based deployment. It includes graceful fallbacks for camera, voice, backend, and remote LLM availability.
