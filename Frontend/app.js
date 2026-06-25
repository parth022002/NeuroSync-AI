const appConfig = {
  assistantEndpoint:
    window.localStorage.getItem("neurosync-assistant-endpoint") ||
    (window.location.protocol.startsWith("http") ? "/api/assistant/chat" : ""),
  healthEndpoint: window.location.protocol.startsWith("http") ? "/api/health" : "",
  modelsEndpoint: window.location.protocol.startsWith("http") ? "/api/models/status" : "",
  analyticsEndpoint: window.location.protocol.startsWith("http") ? "/api/analytics/analyze" : "",
  decisionEndpoint: window.location.protocol.startsWith("http") ? "/api/decision/recommend" : "",
  speechEnabled: "speechSynthesis" in window,
  recognitionEnabled: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
};

const state = {
  capabilities: {
    camera: Boolean(navigator.mediaDevices?.getUserMedia),
    audio: Boolean(navigator.mediaDevices?.getUserMedia),
    visionModels: false,
  },
  camera: {
    stream: null,
    active: false,
    demoMode: true,
    mediapipeReady: false,
    controller: null,
    loopId: null,
    hands: null,
    faceMesh: null,
    processing: false,
    lastVisionFrameAt: 0,
    fallbackLoopId: null,
    fallbackCanvas: document.createElement("canvas"),
    fallbackPreviousFrame: null,
  },
  detection: {
    gesture: "Idle",
    gestureMeta: "Awaiting hand landmarks",
    emotion: "Neutral",
    emotionMeta: "No face signal yet",
    attention: null,
    attentionMeta: "Focus heuristics offline",
    voice: "Standby",
    voiceMeta: "Recognition not started",
    transcript: "No command captured yet.",
    lastSpeech: "Assistant voice output will appear here after commands or chat prompts.",
    handCount: 0,
  },
  analytics: {
    rows: [],
    metrics: null,
    insights: [],
    fileName: "",
  },
  decision: {
    title: "Maintain ready state",
    reason:
      "NeuroSync is waiting for perception inputs or analytics data before selecting an intelligent action.",
    confidence: 0.24,
    mode: "Observation",
    queue: [],
  },
  voice: {
    recognition: null,
    active: false,
    listening: false,
    muted: false,
  },
  audio: {
    stream: null,
    context: null,
    analyser: null,
    source: null,
    dataArray: null,
    active: false,
    level: 0,
    noiseFloor: 0,
    speechEnergy: 0,
    pitch: 0,
    jitter: 0,
    toneProfile: "Calm",
    recentPitches: [],
    animationId: null,
  },
  models: [],
  timeline: [],
};

const dom = {};
let latestHandLandmarks = [];
let latestFaceLandmarks = null;
let lastPalmCenter = null;
let lastGestureAt = 0;
let demoLoop = null;
let lastDecisionSignature = "";
let decisionSyncTimer = null;

document.addEventListener("DOMContentLoaded", boot);

function boot() {
  cacheDom();
  syncVoiceControlsUI();
  wireEvents();
  applySavedTheme();
  initializeChat();
  renderPerception();
  resizeAudioCanvas();
  drawIdleAudioWave();
  updateClock();
  setInterval(updateClock, 1000);
  checkRuntimeCapabilities();
  loadBackendStatus();
  loadSampleDataset();
  startDemoLoop();
  recomputeDecision("Initial boot");
}

function cacheDom() {
  dom.clockPill = document.getElementById("clockPill");
  dom.systemStatusPill = document.getElementById("systemStatusPill");
  dom.startOverlay = document.getElementById("startOverlay");
  dom.runtimeModeLabel = document.getElementById("runtimeModeLabel");
  dom.cameraHealth = document.getElementById("cameraHealth");
  dom.voiceHealth = document.getElementById("voiceHealth");
  dom.audioHealth = document.getElementById("audioHealth");
  dom.visionHealth = document.getElementById("visionHealth");
  dom.analyticsHealth = document.getElementById("analyticsHealth");
  dom.handsStackState = document.getElementById("handsStackState");
  dom.faceStackState = document.getElementById("faceStackState");
  dom.voiceStackState = document.getElementById("voiceStackState");
  dom.forecastStackState = document.getElementById("forecastStackState");
  dom.modelGrid = document.getElementById("modelGrid");
  dom.heroGesture = document.getElementById("heroGesture");
  dom.heroEmotion = document.getElementById("heroEmotion");
  dom.heroForecast = document.getElementById("heroForecast");
  dom.heroConfidence = document.getElementById("heroConfidence");
  dom.video = document.getElementById("cameraVideo");
  dom.canvas = document.getElementById("overlayCanvas");
  dom.canvasContext = dom.canvas.getContext("2d");
  dom.stageBadge = document.getElementById("stageBadge");
  dom.stageFeedStatus = document.getElementById("stageFeedStatus");
  dom.stageEmptyState = document.getElementById("stageEmptyState");
  dom.stageGestureValue = document.getElementById("stageGestureValue");
  dom.stageEmotionValue = document.getElementById("stageEmotionValue");
  dom.gestureValue = document.getElementById("gestureValue");
  dom.gestureMeta = document.getElementById("gestureMeta");
  dom.emotionValue = document.getElementById("emotionValue");
  dom.emotionMeta = document.getElementById("emotionMeta");
  dom.attentionValue = document.getElementById("attentionValue");
  dom.attentionMeta = document.getElementById("attentionMeta");
  dom.voiceValue = document.getElementById("voiceValue");
  dom.voiceMeta = document.getElementById("voiceMeta");
  dom.audioLevelValue = document.getElementById("audioLevelValue");
  dom.audioLevelBar = document.getElementById("audioLevelBar");
  dom.audioNoiseFloor = document.getElementById("audioNoiseFloor");
  dom.audioSpeechEnergy = document.getElementById("audioSpeechEnergy");
  dom.audioVoicePitch = document.getElementById("audioVoicePitch");
  dom.audioToneProfile = document.getElementById("audioToneProfile");
  dom.audioMeta = document.getElementById("audioMeta");
  dom.audioRecognitionValue = document.getElementById("audioRecognitionValue");
  dom.audioOutputValue = document.getElementById("audioOutputValue");
  dom.audioWaveCanvas = document.getElementById("audioWaveCanvas");
  dom.audioWaveContext = dom.audioWaveCanvas.getContext("2d");
  dom.transcriptValue = document.getElementById("transcriptValue");
  dom.assistantSpeechValue = document.getElementById("assistantSpeechValue");
  dom.voiceIndicator = document.getElementById("voiceIndicator");
  dom.voiceIndicatorText = document.getElementById("voiceIndicatorText");
  dom.chatFeed = document.getElementById("chatFeed");
  dom.chatForm = document.getElementById("chatForm");
  dom.chatInput = document.getElementById("chatInput");
  dom.assistantModeBadge = document.getElementById("assistantModeBadge");
  dom.csvFileInput = document.getElementById("csvFileInput");
  dom.uploadCard = document.getElementById("uploadCard");
  dom.uploadMeta = document.getElementById("uploadMeta");
  dom.rowsMetric = document.getElementById("rowsMetric");
  dom.focusMetric = document.getElementById("focusMetric");
  dom.productivityMetric = document.getElementById("productivityMetric");
  dom.forecastMetric = document.getElementById("forecastMetric");
  dom.modelConfidenceMetric = document.getElementById("modelConfidenceMetric");
  dom.riskMetric = document.getElementById("riskMetric");
  dom.trendCanvas = document.getElementById("trendCanvas");
  dom.trendBadge = document.getElementById("trendBadge");
  dom.dateColumnValue = document.getElementById("dateColumnValue");
  dom.focusColumnValue = document.getElementById("focusColumnValue");
  dom.productivityColumnValue = document.getElementById("productivityColumnValue");
  dom.insightList = document.getElementById("insightList");
  dom.gestureWeightBar = document.getElementById("gestureWeightBar");
  dom.emotionWeightBar = document.getElementById("emotionWeightBar");
  dom.voiceWeightBar = document.getElementById("voiceWeightBar");
  dom.analyticsWeightBar = document.getElementById("analyticsWeightBar");
  dom.gestureWeightLabel = document.getElementById("gestureWeightLabel");
  dom.emotionWeightLabel = document.getElementById("emotionWeightLabel");
  dom.voiceWeightLabel = document.getElementById("voiceWeightLabel");
  dom.analyticsWeightLabel = document.getElementById("analyticsWeightLabel");
  dom.decisionTitle = document.getElementById("decisionTitle");
  dom.decisionReason = document.getElementById("decisionReason");
  dom.decisionConfidence = document.getElementById("decisionConfidence");
  dom.decisionMode = document.getElementById("decisionMode");
  dom.actionQueue = document.getElementById("actionQueue");
  dom.eventLog = document.getElementById("eventLog");
  dom.reportSummary = document.getElementById("reportSummary");
  dom.startExperienceBtn = document.getElementById("startExperienceBtn");
  dom.loadSampleBtn = document.getElementById("loadSampleBtn");
  dom.startCameraBtn = document.getElementById("startCameraBtn");
  dom.stopCameraBtn = document.getElementById("stopCameraBtn");
  dom.startVoiceBtn = document.getElementById("startVoiceBtn");
  dom.runInsightBtn = document.getElementById("runInsightBtn");
  dom.downloadReportBtn = document.getElementById("downloadReportBtn");
  dom.topDownloadReportBtn = document.getElementById("topDownloadReportBtn");
  dom.decisionDownloadReportBtn = document.getElementById("decisionDownloadReportBtn");
  dom.recomputeDecisionBtn = document.getElementById("recomputeDecisionBtn");
  dom.previewInterfaceBtn = document.getElementById("previewInterfaceBtn");
  dom.themeButtons = Array.from(document.querySelectorAll("[data-theme]"));
  dom.toggleVoiceAgentBtn = document.getElementById("toggleVoiceAgentBtn");
  dom.voiceAgentDot = document.getElementById("voiceAgentDot");
  dom.toggleMuteBtn = document.getElementById("toggleMuteBtn");
  dom.muteDot = document.getElementById("muteDot");
  dom.stageVoiceToneValue = document.getElementById("stageVoiceToneValue");
  dom.stressReliefWidget = document.getElementById("stressReliefWidget");
  dom.breathingStateText = document.getElementById("breathingStateText");
}

function wireEvents() {
  dom.startExperienceBtn.addEventListener("click", async () => {
    dismissStartOverlay();
    await startCamera();
    await startAudioMonitoring();
    await startVoiceRecognition();
    addAssistantMessage(
      "assistant",
      "Live experience activated. Camera, voice, analytics, and decision intelligence are all standing by."
    );
  });

  dom.previewInterfaceBtn.addEventListener("click", () => {
    dismissStartOverlay();
  });

  dom.loadSampleBtn.addEventListener("click", () => {
    loadSampleDataset();
    logEvent("Analytics", "Sample productivity dataset loaded.");
  });

  dom.startCameraBtn.addEventListener("click", async () => {
    await startCamera();
    await startAudioMonitoring();
  });
  dom.stopCameraBtn.addEventListener("click", stopCamera);
  dom.startVoiceBtn.addEventListener("click", async () => {
    await startAudioMonitoring();
    await startVoiceRecognition();
  });
  dom.runInsightBtn.addEventListener("click", () => {
    if (!state.analytics.metrics) {
      loadSampleDataset();
    }
    renderInsights(generateInsights(state.analytics.metrics));
    recomputeDecision("Insight generation");
  });
  dom.recomputeDecisionBtn.addEventListener("click", () => recomputeDecision("Manual recompute"));
  dom.downloadReportBtn.addEventListener("click", downloadSessionReport);
  dom.topDownloadReportBtn.addEventListener("click", downloadSessionReport);
  dom.decisionDownloadReportBtn.addEventListener("click", downloadSessionReport);

  dom.chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = dom.chatInput.value.trim();
    if (!message) {
      return;
    }
    dom.chatInput.value = "";
    await handleAssistantPrompt(message);
  });

  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", async () => {
      await handleAssistantPrompt(button.dataset.prompt);
    });
  });

  dom.themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setTheme(button.dataset.theme);
    });
  });

  dom.csvFileInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }
    await readAndProcessCsv(file);
  });

  ["dragenter", "dragover"].forEach((type) => {
    dom.uploadCard.addEventListener(type, (event) => {
      event.preventDefault();
      dom.uploadCard.classList.add("dragover");
    });
  });

  ["dragleave", "dragend", "drop"].forEach((type) => {
    dom.uploadCard.addEventListener(type, (event) => {
      event.preventDefault();
      dom.uploadCard.classList.remove("dragover");
    });
  });

  dom.uploadCard.addEventListener("drop", async (event) => {
    const [file] = event.dataTransfer.files || [];
    if (!file) {
      return;
    }
    await readAndProcessCsv(file);
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    resizeAudioCanvas();
    drawOverlay();
    drawTrendChart();
    if (!state.audio.active) {
      drawIdleAudioWave();
    }
  });

  if (dom.toggleVoiceAgentBtn) {
    dom.toggleVoiceAgentBtn.addEventListener("click", async () => {
      if (state.voice.active) {
        stopVoiceRecognition();
      } else {
        await startVoiceRecognition();
      }
    });
  }

  if (dom.toggleMuteBtn) {
    dom.toggleMuteBtn.addEventListener("click", () => {
      state.voice.muted = !state.voice.muted;
      if (state.voice.muted) {
        window.speechSynthesis?.cancel();
        logEvent("Voice", "Speech output muted.");
      } else {
        logEvent("Voice", "Speech output unmuted.");
      }
      syncVoiceControlsUI();
    });
  }
}

function applySavedTheme() {
  const savedTheme = window.localStorage.getItem("neurosync-theme") || "neon";
  setTheme(savedTheme);
}

function setTheme(themeName) {
  document.documentElement.dataset.theme = themeName;
  dom.themeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === themeName);
  });
  window.localStorage.setItem("neurosync-theme", themeName);
}

function dismissStartOverlay() {
  if (!dom.startOverlay || dom.startOverlay.classList.contains("hidden")) {
    return;
  }

  dom.startOverlay.classList.add("hidden");
}

function initializeChat() {
  addAssistantMessage(
    "system",
    "NeuroSync AI v2 is ready. Ask about multimodal state, analytics trends, or the next best action."
  );
  addAssistantMessage(
    "assistant",
    "Tip: load a CSV, enable the camera, then ask for a decision summary to see the full signal-fusion workflow."
  );
}

function updateClock() {
  const now = new Date();
  const date = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  dom.clockPill.textContent = `${date} | ${time}`;
}

function checkRuntimeCapabilities() {
  const visionModelsLoaded = Boolean(window.Hands && window.FaceMesh);
  state.capabilities.visionModels = visionModelsLoaded;
  dom.visionHealth.textContent = visionModelsLoaded ? "Connected" : "Fallback Mode";
  dom.handsStackState.textContent = visionModelsLoaded ? "Available" : "Unavailable";
  dom.faceStackState.textContent = visionModelsLoaded ? "Available" : "Unavailable";
  dom.voiceStackState.textContent = appConfig.recognitionEnabled ? "Available" : "Unsupported";
  dom.forecastStackState.textContent = "Ready";
  dom.voiceHealth.textContent = appConfig.recognitionEnabled ? "Standby" : "Unsupported";
  dom.audioHealth.textContent = state.capabilities.audio ? "Standby" : "Unavailable";
  dom.cameraHealth.textContent = state.capabilities.camera ? "Ready" : "Unavailable";
  dom.analyticsHealth.textContent = "Ready";
  dom.runtimeModeLabel.textContent = visionModelsLoaded ? "Live Models" : "Hybrid Demo";
  dom.systemStatusPill.textContent = visionModelsLoaded ? "System Live" : "System Ready";
  dom.assistantModeBadge.textContent = appConfig.assistantEndpoint ? "Remote LLM" : "Local Intelligence";
  updateStageFeedStatus(state.capabilities.camera ? "Camera Ready" : "Camera Unsupported", false);
  updateVoiceIndicator(
    appConfig.recognitionEnabled ? "standby" : "unsupported",
    appConfig.recognitionEnabled ? "Voice Standby" : "Voice Unsupported"
  );
  renderModelGrid();
}

async function loadBackendStatus() {
  if (!appConfig.healthEndpoint && !appConfig.modelsEndpoint) {
    state.models = buildBrowserModelStatus();
    renderModelGrid();
    return;
  }

  try {
    const endpoint = appConfig.modelsEndpoint || appConfig.healthEndpoint;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    state.models = payload.models?.length ? payload.models : buildBrowserModelStatus();
    dom.systemStatusPill.textContent = "Backend Online";
    dom.assistantModeBadge.textContent = payload.openai_enabled ? "Remote LLM" : dom.assistantModeBadge.textContent;
    logEvent("Backend", "FastAPI backend and model registry connected.");
  } catch (error) {
    state.models = buildBrowserModelStatus();
    dom.systemStatusPill.textContent = "Frontend Ready";
    logEvent("Backend", `Backend not reachable yet: ${error.message}`);
  }

  renderModelGrid();
}

function buildBrowserModelStatus() {
  return [
    {
      name: "MediaPipe Hands",
      type: "browser-vision",
      status: state.capabilities.visionModels ? "ready" : "fallback",
      detail: "Gesture landmarks when CDN models are loaded.",
    },
    {
      name: "FaceMesh Emotion",
      type: "browser-vision",
      status: state.capabilities.visionModels ? "ready" : "fallback",
      detail: "Expression, attention, and fatigue heuristics.",
    },
    {
      name: "Camera Motion Heuristic",
      type: "edge-fallback",
      status: "ready",
      detail: "Keeps live state changing even without landmark models.",
    },
    {
      name: "CSV Forecast Engine",
      type: "analytics",
      status: state.analytics.metrics ? "hot" : "standby",
      detail: "Trend, anomaly, correlation, and forecast logic.",
    },
    {
      name: "Weighted Forecast Ensemble",
      type: "analytics",
      status: state.analytics.metrics ? "hot" : "ready",
      detail: "Blends EMA, trend, momentum, and seasonal forecasts.",
    },
    {
      name: "Anomaly + Risk Engine",
      type: "analytics",
      status: state.analytics.metrics ? "hot" : "ready",
      detail: "Detects volatility spikes and session risk.",
    },
  ];
}

function renderModelGrid() {
  if (!dom.modelGrid) {
    return;
  }

  const models = state.models.length ? state.models : buildBrowserModelStatus();
  dom.modelGrid.innerHTML = "";
  models.forEach((model) => {
    const item = document.createElement("article");
    item.className = "model-card";
    item.innerHTML = `
      <span>${escapeHtml(model.type || "model")}</span>
      <strong>${escapeHtml(model.name || "AI Model")}</strong>
      <small>${escapeHtml(model.detail || "Ready for NeuroSync processing.")}</small>
      <em data-status="${escapeHtml(model.status || "ready")}">${escapeHtml(model.status || "ready")}</em>
    `;
    dom.modelGrid.appendChild(item);
  });
}

function updateStageFeedStatus(text, isLive) {
  dom.stageFeedStatus.textContent = text;
  dom.stageBadge.classList.toggle("live", Boolean(isLive));
}

function updateVoiceIndicator(stateName, text) {
  dom.voiceIndicator.dataset.state = stateName;
  dom.voiceIndicatorText.textContent = text;
}

async function startCamera() {
  if (!state.capabilities.camera) {
    state.camera.demoMode = true;
    dom.cameraHealth.textContent = "Unavailable";
    updateStageFeedStatus("Camera Unsupported", false);
    logEvent("Camera", "Camera access is not supported in this browser.");
    return;
  }

  if (state.camera.active) {
    return;
  }

  try {
    state.camera.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    dom.video.srcObject = state.camera.stream;
    await dom.video.play();
    state.camera.active = true;
    state.camera.demoMode = false;
    dom.cameraHealth.textContent = "Live";
    dom.stageEmptyState.hidden = true;
    updateStageFeedStatus("Live Feed Active", true);
    resizeCanvas();
    logEvent("Camera", "Webcam stream started.");

    if (!state.capabilities.visionModels) {
      updateStageFeedStatus("Loading AI Models...", true);
      dom.visionHealth.textContent = "Loading...";
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js");
        state.capabilities.visionModels = true;
        dom.visionHealth.textContent = "Connected";
        dom.handsStackState.textContent = "Available";
        dom.faceStackState.textContent = "Available";
        dom.runtimeModeLabel.textContent = "Live Models";
        dom.systemStatusPill.textContent = "System Live";
        state.models = buildBrowserModelStatus();
        renderModelGrid();
        logEvent("Vision", "MediaPipe CDN scripts loaded successfully.");
      } catch (e) {
        logEvent("Vision", `Failed to load MediaPipe from CDN: ${e.message}`);
      }
    }

    if (state.capabilities.visionModels) {
      await startMediapipePipeline();
    } else {
      dom.visionHealth.textContent = "Camera only";
      startCameraFallbackLoop();
      logEvent("Vision", "MediaPipe unavailable, using camera motion and brightness fallback.");
    }
  } catch (error) {
    state.camera.demoMode = true;
    dom.cameraHealth.textContent = "Blocked";
    updateStageFeedStatus("Camera Blocked", false);
    logEvent("Camera", `Webcam unavailable: ${error.message}`);
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

function stopCamera() {
  if (state.camera.controller?.stop) {
    state.camera.controller.stop();
  }

  if (state.camera.stream) {
    state.camera.stream.getTracks().forEach((track) => track.stop());
  }

  if (state.camera.loopId) {
    window.cancelAnimationFrame(state.camera.loopId);
  }

  if (state.camera.fallbackLoopId) {
    window.cancelAnimationFrame(state.camera.fallbackLoopId);
  }

  state.camera.hands?.close?.();
  state.camera.faceMesh?.close?.();

  state.camera.stream = null;
  state.camera.active = false;
  state.camera.controller = null;
  state.camera.loopId = null;
  state.camera.fallbackLoopId = null;
  state.camera.hands = null;
  state.camera.faceMesh = null;
  state.camera.processing = false;
  state.camera.lastVisionFrameAt = 0;
  state.camera.fallbackPreviousFrame = null;
  state.camera.mediapipeReady = false;
  state.camera.demoMode = true;
  latestHandLandmarks = [];
  latestFaceLandmarks = null;
  updateGesture("Idle", "Camera stopped", 0);
  updateEmotion("Neutral", "Camera stopped", null);
  dom.video.srcObject = null;
  dom.video.removeAttribute("src");
  dom.video.load();
  dom.stageEmptyState.hidden = false;
  dom.cameraHealth.textContent = state.capabilities.camera ? "Ready" : "Unavailable";
  updateStageFeedStatus(state.capabilities.camera ? "Camera Ready" : "Camera Unsupported", false);
  clearOverlay();
  logEvent("Camera", "Webcam stream stopped.");
  recomputeDecision("Camera stopped");
}

async function startMediapipePipeline() {
  if (state.camera.mediapipeReady) {
    return;
  }

  const hands = new window.Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.55,
  });
  hands.onResults(handleHandsResults);

  const faceMesh = new window.FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.55,
    minTrackingConfidence: 0.55,
  });
  faceMesh.onResults(handleFaceResults);

  state.camera.mediapipeReady = true;
  state.camera.hands = hands;
  state.camera.faceMesh = faceMesh;
  dom.visionHealth.textContent = "Streaming";
  logEvent("Vision", "MediaPipe Hands and FaceMesh pipeline started.");

  if (window.Camera) {
    state.camera.controller = new window.Camera(dom.video, {
      onFrame: async () => {
        if (!shouldProcessVisionFrame()) {
          return;
        }
        await processVisionFrame(hands, faceMesh);
      },
      width: 1280,
      height: 720,
    });

    state.camera.controller.start();
    return;
  }

  const runFrame = async () => {
    if (!state.camera.active) {
      return;
    }

    if (shouldProcessVisionFrame()) {
      await processVisionFrame(hands, faceMesh);
    }
    state.camera.loopId = window.requestAnimationFrame(runFrame);
  };

  runFrame();
}

function shouldProcessVisionFrame() {
  if (!state.camera.active || state.camera.processing || dom.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return false;
  }

  const now = performance.now();
  if (now - state.camera.lastVisionFrameAt < 110) {
    return false;
  }

  state.camera.lastVisionFrameAt = now;
  return true;
}

async function processVisionFrame(hands, faceMesh) {
  state.camera.processing = true;
  try {
    await hands.send({ image: dom.video });
    await faceMesh.send({ image: dom.video });
  } catch (error) {
    dom.visionHealth.textContent = "Fallback";
    state.camera.mediapipeReady = false;
    startCameraFallbackLoop();
    logEvent("Vision", `Landmark pipeline paused, fallback active: ${error.message}`);
  } finally {
    state.camera.processing = false;
  }
}

function startCameraFallbackLoop() {
  if (state.camera.fallbackLoopId || !state.camera.active) {
    return;
  }

  const canvas = state.camera.fallbackCanvas;
  canvas.width = 96;
  canvas.height = 54;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const tick = () => {
    if (!state.camera.active || state.camera.mediapipeReady) {
      state.camera.fallbackLoopId = null;
      return;
    }

    if (dom.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(dom.video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let brightness = 0;
      let warmPixels = 0;
      let motion = 0;
      const previous = state.camera.fallbackPreviousFrame;

      for (let index = 0; index < frame.length; index += 16) {
        const red = frame[index];
        const green = frame[index + 1];
        const blue = frame[index + 2];
        brightness += (red + green + blue) / 3;
        if (red > green * 1.08 && red > blue * 1.16) {
          warmPixels += 1;
        }
        if (previous) {
          motion += Math.abs(red - previous[index]) + Math.abs(green - previous[index + 1]) + Math.abs(blue - previous[index + 2]);
        }
      }

      const sampleCount = frame.length / 16;
      const averageBrightness = brightness / sampleCount;
      const motionScore = previous ? clamp(Math.round(motion / sampleCount / 4), 0, 100) : 0;
      const warmth = warmPixels / sampleCount;

      state.camera.fallbackPreviousFrame = new Uint8ClampedArray(frame);
      updateGesture(
        motionScore > 34 ? "Motion Wave" : motionScore > 12 ? "Micro Movement" : "Open Presence",
        `Camera fallback motion score ${motionScore}%`,
        0
      );
      
      // Extended emotion logic for fallback camera telemetry
      let inferredEmotion = "Focused";
      let inferredMeta = `Camera fallback brightness ${Math.round(averageBrightness)} and motion ${motionScore}%`;
      if (averageBrightness < 54) {
        inferredEmotion = "Tired";
      } else if (motionScore > 48 && averageBrightness < 80) {
        inferredEmotion = "Stressed";
        inferredMeta = `High restlessness (${motionScore}%) in dim light suggests stress/fatigue`;
      } else if (motionScore > 38 && warmth > 0.24) {
        inferredEmotion = "Excited";
        inferredMeta = `Enthusiastic movement (${motionScore}%) with warmth suggests high excitement`;
      } else if (motionScore < 8 && averageBrightness > 125) {
        inferredEmotion = "Distracted";
        inferredMeta = `Lack of movement (${motionScore}%) in high illumination suggests distraction`;
      } else if (warmth > 0.24) {
        inferredEmotion = "Positive";
      } else if (motionScore > 42) {
        inferredEmotion = "Engaged";
      }
      
      updateEmotion(
        inferredEmotion,
        inferredMeta,
        clamp(Math.round(52 + averageBrightness / 4 + motionScore / 3), 35, 96)
      );
      drawOverlay();
      recomputeDecision("Camera fallback signal");
    }

    state.camera.fallbackLoopId = window.requestAnimationFrame(tick);
  };

  tick();
}

function handleHandsResults(results) {
  latestHandLandmarks = results.multiHandLandmarks || [];

  if (!latestHandLandmarks.length) {
    updateGesture("Idle", "No hand detected", 0);
    drawOverlay();
    recomputeDecision("Hands idle");
    return;
  }

  const primaryHand = latestHandLandmarks[0];
  const inferred = inferGesture(primaryHand);
  updateGesture(inferred.label, inferred.meta, latestHandLandmarks.length);
  drawOverlay();
  recomputeDecision("Gesture update");
}

function handleFaceResults(results) {
  latestFaceLandmarks = results.multiFaceLandmarks?.[0] || null;

  if (!latestFaceLandmarks) {
    updateEmotion("Neutral", "No face detected", null);
    drawOverlay();
    recomputeDecision("Face idle");
    return;
  }

  const inferred = inferEmotion(latestFaceLandmarks);
  updateEmotion(inferred.label, inferred.meta, inferred.attention);
  drawOverlay();
  recomputeDecision("Emotion update");
}

function inferGesture(hand) {
  // 1. Hand scale reference (wrist: 0 to middle MCP knuckle: 9)
  const handScale = Math.max(0.01, distanceBetween(hand[0], hand[9]));

  // 2. Rotation-invariant finger extension heuristics
  // Compares distance from wrist to tip vs wrist to PIP joint
  const indexExtended = distanceBetween(hand[0], hand[8]) > distanceBetween(hand[0], hand[6]) * 1.15;
  const middleExtended = distanceBetween(hand[0], hand[12]) > distanceBetween(hand[0], hand[10]) * 1.15;
  const ringExtended = distanceBetween(hand[0], hand[16]) > distanceBetween(hand[0], hand[14]) * 1.15;
  const pinkyExtended = distanceBetween(hand[0], hand[20]) > distanceBetween(hand[0], hand[18]) * 1.15;

  // Thumb extension heuristic (distance thumb tip (4) to thumb MCP (2) and index MCP (5))
  const thumbDistanceToMCP2 = distanceBetween(hand[4], hand[2]);
  const thumbDistanceToIndexKnuckle = distanceBetween(hand[4], hand[5]);
  const thumbExtended = thumbDistanceToMCP2 > handScale * 0.72 || thumbDistanceToIndexKnuckle > handScale * 0.9;

  const extendedCount = Number(indexExtended) + Number(middleExtended) + Number(ringExtended) + Number(pinkyExtended);

  const palmCenter = {
    x: (hand[0].x + hand[5].x + hand[17].x) / 3,
    y: (hand[0].y + hand[5].y + hand[17].y) / 3,
  };

  const pinchDistance = distanceBetween(hand[4], hand[8]);
  const normalizedPinch = pinchDistance / handScale;

  const motionDeltaX = lastPalmCenter ? palmCenter.x - lastPalmCenter.x : 0;
  const now = Date.now();
  lastPalmCenter = palmCenter;

  // A. Pinch (high precision contact between thumb and index tip)
  if (normalizedPinch < 0.25) {
    return {
      label: "Pinch Select",
      meta: `Thumb and index finger pinching (ratio: ${normalizedPinch.toFixed(2)})`
    };
  }

  // B. Swipe gestures (requires open palm moving rapidly)
  if (extendedCount >= 3 && Math.abs(motionDeltaX) > 0.08 && now - lastGestureAt > 500) {
    lastGestureAt = now;
    return {
      label: motionDeltaX > 0 ? "Swipe Right" : "Swipe Left",
      meta: `Horizontal swipe gesture detected (delta: ${motionDeltaX.toFixed(2)})`
    };
  }

  // C. Open Palm
  if (extendedCount >= 3) {
    return {
      label: "Open Palm",
      meta: "Open palm detected (all fingers extended)"
    };
  }

  // D. Pointer (only index finger extended)
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return {
      label: "Pointer",
      meta: "Pointing gesture active (index finger extended)"
    };
  }

  // E. Fist / Hold (all fingers closed)
  if (extendedCount === 0 && !thumbExtended) {
    return {
      label: "Fist / Hold",
      meta: "Closed fist detected"
    };
  }

  // F. Default or intermediate state
  return {
    label: "Pointer",
    meta: `Partial hand engagement (extended count: ${extendedCount})`
  };
}

function inferEmotion(face) {
  // 1. Establish reference scale (eyeDistance)
  // Outer corners of eyes: left eye outer (33), right eye outer (263)
  const eyeDistance = Math.max(0.01, distanceBetween(face[33], face[263]));
  
  // 2. Normalize vertical eye openness
  // Left eye: top (159) to bottom (145). Right eye: top (386) to bottom (374)
  const leftEyeOpenRatio = distanceBetween(face[159], face[145]) / eyeDistance;
  const rightEyeOpenRatio = distanceBetween(face[386], face[374]) / eyeDistance;
  const eyeOpenRatio = (leftEyeOpenRatio + rightEyeOpenRatio) / 2;

  // 3. Normalize brow furrow (brow distance)
  // Inner brows: left (55), right (285)
  const browDistance = distanceBetween(face[55], face[285]);
  const browFurrowRatio = browDistance / eyeDistance;

  // 4. Normalize mouth width & mouth opening
  // Corners of mouth: left (61), right (291)
  const mouthWidth = distanceBetween(face[61], face[291]);
  const mouthWidthRatio = mouthWidth / eyeDistance;

  // Lips: upper (13), lower (14)
  const mouthOpen = distanceBetween(face[13], face[14]);
  const mouthOpenRatio = mouthOpen / eyeDistance;

  // 5. Normalize smile lift (vertical lift of corners relative to top lip center)
  const cornersY = (face[61].y + face[291].y) / 2;
  const upperLipY = face[13].y;
  const smileLiftRatio = (upperLipY - cornersY) / eyeDistance;

  // 6. Gaze tracking (pupil position relative to inner and outer eye corners)
  let eyesLookingAway = false;
  let gazeDetails = "gaze stable";
  if (face[468] && face[133] && face[33] && face[473] && face[362] && face[263]) {
    const leftPupilToInner = distanceBetween(face[468], face[133]);
    const leftPupilToOuter = distanceBetween(face[468], face[33]);
    const leftPupilRatio = leftPupilToInner / Math.max(leftPupilToOuter, 0.01);

    const rightPupilToInner = distanceBetween(face[473], face[362]);
    const rightPupilToOuter = distanceBetween(face[473], face[263]);
    const rightPupilRatio = rightPupilToInner / Math.max(rightPupilToOuter, 0.01);

    eyesLookingAway = (leftPupilRatio > 1.6 || leftPupilRatio < 0.6) && (rightPupilRatio > 1.6 || rightPupilRatio < 0.6);
    gazeDetails = `gaze ratio L: ${leftPupilRatio.toFixed(2)}, R: ${rightPupilRatio.toFixed(2)}`;
  }

  // 7. Eyebrow lift (brows to eye top center)
  // Left brow: 105 to left eye top: 159. Right brow: 334 to right eye top: 386
  const leftBrowLift = distanceBetween(face[105], face[159]) / eyeDistance;
  const rightBrowLift = distanceBetween(face[334], face[386]) / eyeDistance;
  const browLiftRatio = (leftBrowLift + rightBrowLift) / 2;

  // Attention score calculation (scale-invariant attention heuristic)
  const attention = clamp(Math.round((eyeOpenRatio * 420 + browLiftRatio * 150) * 100 / 2), 40, 98);

  // A. Gaze distraction
  if (eyesLookingAway) {
    return {
      label: "Distracted",
      meta: `User gaze shifted away (${gazeDetails})`,
      attention: clamp(attention - 25, 20, 55)
    };
  }

  // B. Frown/Stress (brow furrowing)
  if (browFurrowRatio < 0.31 && mouthOpenRatio < 0.08) {
    return {
      label: "Stressed",
      meta: `Furrowed brow detected (brow ratio: ${browFurrowRatio.toFixed(3)})`,
      attention: clamp(attention - 5, 45, 80)
    };
  }

  // C. Smile Detection (Excited / Positive)
  if (smileLiftRatio > 0.005 || (mouthWidthRatio > 0.51 && smileLiftRatio > -0.02)) {
    if (mouthOpenRatio > 0.05 || browLiftRatio > 0.32) {
      return {
        label: "Excited",
        meta: `Active open smile detected (lift: ${smileLiftRatio.toFixed(3)}, width: ${mouthWidthRatio.toFixed(3)})`,
        attention: clamp(attention + 8, 75, 98)
      };
    } else {
      return {
        label: "Positive",
        meta: `Subtle smiling facial pattern (lift: ${smileLiftRatio.toFixed(3)}, width: ${mouthWidthRatio.toFixed(3)})`,
        attention: clamp(attention + 3, 70, 95)
      };
    }
  }

  // D. Surprise (mouth wide open, eyes wide open)
  if (mouthOpenRatio > 0.12 && eyeOpenRatio > 0.07) {
    return {
      label: "Surprised",
      meta: `Wide open eyes and mouth detected (mouth ratio: ${mouthOpenRatio.toFixed(3)})`,
      attention
    };
  }

  // E. Tiredness / Fatigue (sleepy or squinting eyes)
  if (eyeOpenRatio < 0.035) {
    return {
      label: "Tired",
      meta: `Low eye openness indicating fatigue (eye ratio: ${eyeOpenRatio.toFixed(3)})`,
      attention: clamp(attention - 18, 20, 90)
    };
  }

  // F. Focus (slightly narrowed eyes, calm expressions)
  if (eyeOpenRatio < 0.052 && browFurrowRatio >= 0.31) {
    return {
      label: "Focused",
      meta: `Sustained concentrated expression (eye ratio: ${eyeOpenRatio.toFixed(3)})`,
      attention: clamp(attention + 5, 75, 95)
    };
  }

  // G. Default Neutral state
  return {
    label: "Neutral",
    meta: `Stable baseline expression (lift: ${smileLiftRatio.toFixed(2)}, eyes: ${eyeOpenRatio.toFixed(2)})`,
    attention
  };
}

function updateGesture(label, meta, handCount) {
  state.detection.gesture = label;
  state.detection.gestureMeta = `${meta}${handCount ? ` - ${handCount} hand${handCount > 1 ? "s" : ""}` : ""}`;
  state.detection.handCount = handCount;
  renderPerception();
}

function updateEmotion(label, meta, attention) {
  const previousEmotion = state.detection.emotion;
  
  let fusedLabel = label;
  let fusedMeta = meta;
  let fusedAttention = attention;

  // Perform multimodal fusion with vocal tone profile if active and not silent
  if (state.audio.active && state.audio.toneProfile && state.audio.toneProfile !== "Silent") {
    const tone = state.audio.toneProfile;
    if (label === "Neutral") {
      if (tone === "Excited") {
        fusedLabel = "Excited";
        fusedMeta = `Voice excited. Face neutral. Fused: Excited. (${meta})`;
        fusedAttention = Math.max(attention || 50, 80);
      } else if (tone === "Stressed") {
        fusedLabel = "Stressed";
        fusedMeta = `Voice stressed. Face neutral. Fused: Stressed. (${meta})`;
        fusedAttention = Math.max(attention || 50, 75);
      } else if (tone === "Tired") {
        fusedLabel = "Tired";
        fusedMeta = `Voice tired. Face neutral. Fused: Tired. (${meta})`;
        fusedAttention = Math.min(attention || 80, 55);
      } else if (tone === "Alert" || tone === "Assertive") {
        fusedLabel = "Focused";
        fusedMeta = `Voice focused/assertive. Fused: Focused. (${meta})`;
        fusedAttention = Math.max(attention || 50, 85);
      }
    } else if (label === "Stressed") {
      if (tone === "Stressed") {
        fusedMeta = `High confidence Stress: Face and Voice agree. (${meta})`;
        fusedAttention = Math.min(attention || 75, 60);
      } else if (tone === "Calm" || tone === "Steady") {
        fusedLabel = "Focused";
        fusedMeta = `Face shows tension, but voice is calm. Fused: Focused. (${meta})`;
        fusedAttention = Math.max(attention || 50, 78);
      }
    } else if (label === "Tired") {
      if (tone === "Tired") {
        fusedMeta = `High confidence Fatigue: Face and Voice agree. (${meta})`;
        fusedAttention = Math.min(attention || 60, 45);
      }
    } else if (label === "Excited") {
      if (tone === "Excited" || tone === "Expressive") {
        fusedMeta = `High confidence Excitement: Face and Voice agree. (${meta})`;
        fusedAttention = Math.max(attention || 80, 90);
      }
    } else if (label === "Focused") {
      if (tone === "Tired") {
        fusedLabel = "Tired";
        fusedMeta = `Face focused, but voice shows deep fatigue. Fused: Tired. (${meta})`;
        fusedAttention = Math.min(attention || 85, 60);
      } else if (tone === "Stressed") {
        fusedLabel = "Stressed";
        fusedMeta = `Face focused, but voice shows high stress. Fused: Stressed. (${meta})`;
      }
    }
  }

  state.detection.emotion = fusedLabel;
  state.detection.emotionMeta = fusedMeta;
  state.detection.attention = fusedAttention;
  state.detection.attentionMeta =
    fusedAttention == null ? "Focus heuristics offline" : `Estimated attention score from fused eye, brow, and audio dynamics`;
  
  renderPerception();

  // If fused emotion changes, recompute decision instantly to update theme/widget
  if (previousEmotion !== fusedLabel) {
    recomputeDecision("Multimodal emotion update");
  }
}

function renderPerception() {
  dom.gestureValue.textContent = state.detection.gesture;
  dom.gestureMeta.textContent = state.detection.gestureMeta;
  dom.emotionValue.textContent = state.detection.emotion;
  dom.emotionMeta.textContent = state.detection.emotionMeta;
  dom.attentionValue.textContent =
    state.detection.attention == null ? "--" : `${state.detection.attention}%`;
  dom.attentionMeta.textContent = state.detection.attentionMeta;
  dom.voiceValue.textContent = state.detection.voice;
  dom.voiceMeta.textContent = state.detection.voiceMeta;
  dom.transcriptValue.textContent = state.detection.transcript;
  dom.assistantSpeechValue.textContent = state.detection.lastSpeech;
  dom.heroGesture.textContent = state.detection.gesture;
  dom.heroEmotion.textContent = state.detection.emotion;
  dom.stageGestureValue.textContent = state.detection.gesture;
  dom.stageEmotionValue.textContent = state.detection.emotion;
  if (dom.stageVoiceToneValue) {
    dom.stageVoiceToneValue.textContent = state.audio.toneProfile || "Calm";
  }
  dom.audioRecognitionValue.textContent = state.detection.voice;
  document.documentElement.dataset.gesture = state.detection.gesture.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  document.documentElement.dataset.emotion = state.detection.emotion.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function resizeCanvas() {
  const bounds = dom.video.getBoundingClientRect();
  dom.canvas.width = Math.max(1, Math.floor(bounds.width));
  dom.canvas.height = Math.max(1, Math.floor(bounds.height));
  dom.canvas.style.transform = "none"; // Bypasses browser cache of old CSS scaleX(-1) transform on canvas
}

function resizeAudioCanvas() {
  const bounds = dom.audioWaveCanvas.getBoundingClientRect();
  dom.audioWaveCanvas.width = Math.max(200, Math.floor(bounds.width || dom.audioWaveCanvas.width));
  dom.audioWaveCanvas.height = 120;
}

function drawOverlay() {
  const bounds = dom.video.getBoundingClientRect();
  const elementWidth = Math.max(1, Math.floor(bounds.width));
  const elementHeight = Math.max(1, Math.floor(bounds.height));

  if (dom.canvas.width !== elementWidth || dom.canvas.height !== elementHeight) {
    resizeCanvas();
  }

  clearOverlay();
  const ctx = dom.canvasContext;

  if (latestFaceLandmarks) {
    drawLandmarkConnections(latestFaceLandmarks, window.FACEMESH_TESSELATION, "rgba(123, 232, 214, 0.2)", 1);
    drawLandmarkPoints([1, 33, 61, 199, 263, 291].map((index) => latestFaceLandmarks[index]).filter(Boolean), "#67ffe0", 3.5);
  }

  latestHandLandmarks.forEach((hand) => {
    drawLandmarkConnections(hand, window.HAND_CONNECTIONS, "rgba(255, 197, 97, 0.9)", 3);
    drawLandmarkPoints(hand, "#fff7f0", 3.2);
  });
}

function projectLandmark(point) {
  const videoWidth = dom.video.videoWidth;
  const videoHeight = dom.video.videoHeight;
  const elementWidth = dom.canvas.width;
  const elementHeight = dom.canvas.height;

  if (!videoWidth || !videoHeight) {
    return {
      x: (1 - point.x) * elementWidth,
      y: point.y * elementHeight,
    };
  }

  const scale = Math.max(elementWidth / videoWidth, elementHeight / videoHeight);
  const scaledWidth = videoWidth * scale;
  const scaledHeight = videoHeight * scale;
  const offsetX = (scaledWidth - elementWidth) / 2;
  const offsetY = (scaledHeight - elementHeight) / 2;

  // Render mirrored on screen relative to elementWidth:
  // Math: elementWidth - (point.x * scaledWidth - offsetX) => (1 - point.x) * scaledWidth - offsetX
  return {
    x: (1 - point.x) * scaledWidth - offsetX,
    y: point.y * scaledHeight - offsetY,
  };
}

function drawLandmarkConnections(points, connections, color, lineWidth) {
  if (!points?.length || !connections?.length) {
    return;
  }

  const ctx = dom.canvasContext;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  connections.forEach(([startIndex, endIndex]) => {
    const start = points[startIndex];
    const end = points[endIndex];
    if (!start || !end) {
      return;
    }
    const a = projectLandmark(start);
    const b = projectLandmark(end);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawLandmarkPoints(points, color, radius) {
  if (!points?.length) {
    return;
  }

  const ctx = dom.canvasContext;
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  points.forEach((point) => {
    const projected = projectLandmark(point);
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function clearOverlay() {
  dom.canvasContext.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
}

async function startVoiceRecognition() {
  await startAudioMonitoring();

  if (!appConfig.recognitionEnabled) {
    state.detection.voice = "Unsupported";
    state.detection.voiceMeta = "Speech recognition is not available in this browser.";
    dom.voiceHealth.textContent = "Unsupported";
    dom.audioRecognitionValue.textContent = "Unsupported";
    updateVoiceIndicator("unsupported", "Voice Unsupported");
    renderPerception();
    return;
  }

  if (!state.voice.recognition) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => {
      state.voice.listening = true;
      state.voice.active = true;
      state.detection.voice = "Listening";
      state.detection.voiceMeta = "Say commands like open analytics or summarize state";
      dom.voiceHealth.textContent = "Listening";
      dom.audioRecognitionValue.textContent = "Listening";
      updateVoiceIndicator("listening", "Listening for commands");
      renderPerception();
      logEvent("Voice", "Voice recognition started.");
      syncVoiceControlsUI();
    };
    recognition.onresult = async (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();

      if (!transcript) {
        return;
      }

      state.detection.transcript = transcript;
      state.detection.voice = event.results[event.results.length - 1].isFinal ? "Command" : "Listening";
      state.detection.voiceMeta = event.results[event.results.length - 1].isFinal
        ? "Command captured and interpreted"
        : "Capturing live speech";
      updateVoiceIndicator(
        event.results[event.results.length - 1].isFinal ? "command" : "listening",
        event.results[event.results.length - 1].isFinal ? "Command captured" : "Listening for commands"
      );
      renderPerception();

      if (event.results[event.results.length - 1].isFinal) {
        const response = handleVoiceCommand(transcript);
        addAssistantMessage("assistant", response);
        speak(response);
        recomputeDecision("Voice command");
      }
    };
    recognition.onerror = (event) => {
      state.detection.voice = "Error";
      state.detection.voiceMeta = `Speech error: ${event.error}`;
      dom.voiceHealth.textContent = "Error";
      dom.audioRecognitionValue.textContent = "Error";
      updateVoiceIndicator("warning", "Voice unavailable");
      renderPerception();
      logEvent("Voice", `Voice recognition error: ${event.error}`);
    };
    recognition.onend = () => {
      state.voice.listening = false;
      if (state.voice.active) {
        recognition.start();
        return;
      }

      state.detection.voice = "Standby";
      state.detection.voiceMeta = "Recognition paused";
      dom.voiceHealth.textContent = "Standby";
      dom.audioRecognitionValue.textContent = "Standby";
      updateVoiceIndicator(state.audio.active ? "monitoring" : "standby", state.audio.active ? "Mic monitoring active" : "Voice Standby");
      renderPerception();
      syncVoiceControlsUI();
    };
    state.voice.recognition = recognition;
  }

  if (!state.voice.listening) {
    state.voice.active = true;
    updateVoiceIndicator("listening", "Starting voice agent");
    state.voice.recognition.start();
    syncVoiceControlsUI();
  }
}

function stopVoiceRecognition() {
  state.voice.active = false;
  if (state.voice.recognition) {
    try {
      state.voice.recognition.stop();
    } catch (e) {
      console.warn("Failed to stop recognition:", e);
    }
  }
  state.detection.voice = "Standby";
  state.detection.voiceMeta = "Voice Agent deactivated";
  if (dom.voiceHealth) dom.voiceHealth.textContent = "Standby";
  if (dom.audioRecognitionValue) dom.audioRecognitionValue.textContent = "Standby";
  updateVoiceIndicator(state.audio.active ? "monitoring" : "standby", state.audio.active ? "Mic monitoring active" : "Voice Standby");
  renderPerception();
  logEvent("Voice", "Voice recognition stopped.");
  syncVoiceControlsUI();
}

function syncVoiceControlsUI() {
  if (dom.toggleVoiceAgentBtn && dom.voiceAgentDot) {
    dom.toggleVoiceAgentBtn.innerHTML = `<span class="status-dot" id="voiceAgentDot" style="width: 8px; height: 8px; border-radius: 50%; background: ${state.voice.active ? "#53f7af" : "#ff7a8a"}; display: inline-block;"></span> Voice Agent: ${state.voice.active ? "ON" : "OFF"}`;
    dom.voiceAgentDot = document.getElementById("voiceAgentDot");
  }
  if (dom.toggleMuteBtn && dom.muteDot) {
    dom.toggleMuteBtn.innerHTML = `<span class="status-dot" id="muteDot" style="width: 8px; height: 8px; border-radius: 50%; background: ${state.voice.muted ? "#ff7a8a" : "#53f7af"}; display: inline-block;"></span> Muted: ${state.voice.muted ? "YES" : "NO"}`;
    dom.muteDot = document.getElementById("muteDot");
  }
}

function handleVoiceCommand(transcript) {
  const text = transcript.toLowerCase();
  let response = "Command captured. NeuroSync is updating the current workspace.";

  if (text.includes("unmute")) {
    state.voice.muted = false;
    syncVoiceControlsUI();
    response = "Voice output unmuted. Text-to-speech output is active.";
  } else if (text.includes("mute")) {
    state.voice.muted = true;
    window.speechSynthesis?.cancel();
    syncVoiceControlsUI();
    response = "Voice output muted. Text updates will continue in the assistant panel.";
  } else if (text.includes("stop listening") || text.includes("deactivate voice")) {
    response = "Deactivating voice commands agent. Standing by.";
    state.detection.lastSpeech = response;
    renderPerception();
    logEvent("Voice", "Voice agent deactivated via speech command.");
    speak(response);
    setTimeout(() => {
      stopVoiceRecognition();
    }, 2000);
    return response;
  } else if (text.includes("analytics")) {
    const el = document.getElementById("analytics");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    response = "Analytics workspace is in focus. I recommend reviewing the forecast curve and generated insights.";
  } else if (text.includes("camera") || text.includes("vision")) {
    startCamera();
    response = "Vision pipeline is being activated so we can monitor gesture and emotion signals live.";
  } else if (text.includes("summary")) {
    response = buildDecisionNarrative();
  } else if (text.includes("focus mode")) {
    state.decision.mode = "Focus Preservation";
    response = "Focus mode enabled. I will prioritize low-friction actions and sustained productivity cues.";
  }

  state.detection.lastSpeech = response;
  renderPerception();
  logEvent("Voice", `Command interpreted: ${transcript}`);
  return response;
}

function speak(text) {
  if (!appConfig.speechEnabled || !text) {
    return;
  }

  if (state.voice.muted) {
    return;
  }

  const shouldResumeRecognition = Boolean(state.voice.recognition && state.voice.listening);
  if (shouldResumeRecognition) {
    state.voice.active = false;
    state.voice.recognition.stop();
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1.02;
  utterance.onstart = () => {
    state.detection.lastSpeech = text;
    dom.audioOutputValue.textContent = "Speaking";
    updateVoiceIndicator("speaking", "Assistant speaking");
    renderPerception();
  };
  utterance.onend = () => {
    dom.audioOutputValue.textContent = "Ready";
    updateVoiceIndicator(state.audio.active ? "monitoring" : "standby", state.audio.active ? "Mic monitoring active" : "Voice Standby");
    if (shouldResumeRecognition) {
      startVoiceRecognition();
    }
  };
  window.speechSynthesis.speak(utterance);
}

async function startAudioMonitoring() {
  if (state.audio.active) {
    return;
  }

  if (!state.capabilities.audio) {
    dom.audioHealth.textContent = "Unavailable";
    dom.audioMeta.textContent = "Microphone monitoring is not supported in this browser.";
    updateVoiceIndicator("unsupported", "Microphone Unsupported");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextCtor();
    if (context.state === "suspended") {
      await context.resume();
    }
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;

    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);

    state.audio.stream = stream;
    state.audio.context = context;
    state.audio.analyser = analyser;
    state.audio.source = source;
    state.audio.dataArray = new Uint8Array(analyser.fftSize);
    state.audio.active = true;

    dom.audioHealth.textContent = "Monitoring";
    dom.audioMeta.textContent = "Microphone level is live. Voice commands and ambient speech energy are visible here.";
    if (!state.voice.listening) {
      updateVoiceIndicator("monitoring", "Mic monitoring active");
    }
    renderAudioFrame();
    logEvent("Audio", "Microphone monitoring started.");
  } catch (error) {
    dom.audioHealth.textContent = "Blocked";
    dom.audioMeta.textContent = `Microphone unavailable: ${error.message}`;
    updateVoiceIndicator("warning", "Microphone blocked");
    drawIdleAudioWave();
    logEvent("Audio", `Microphone unavailable: ${error.message}`);
  }
}

function renderAudioFrame() {
  if (!state.audio.active || !state.audio.analyser || !state.audio.dataArray) {
    drawIdleAudioWave();
    return;
  }

  state.audio.analyser.getByteTimeDomainData(state.audio.dataArray);
  const samples = state.audio.dataArray;
  let sumSquares = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const normalized = (samples[index] - 128) / 128;
    sumSquares += normalized ** 2;
  }

  const rms = Math.sqrt(sumSquares / samples.length);
  state.audio.level = clamp(rms * 2.8, 0, 1);
  dom.audioLevelValue.textContent = `${Math.round(state.audio.level * 100)}%`;
  dom.audioLevelBar.style.width = `${Math.round(state.audio.level * 100)}%`;

  // Estimate Noise Floor slowly adapting to minimum ambient volume
  let noiseFloor = state.audio.noiseFloor || 0.005;
  if (rms < noiseFloor) {
    noiseFloor = noiseFloor * 0.85 + rms * 0.15;
  } else {
    noiseFloor = noiseFloor * 0.997 + rms * 0.003;
  }
  state.audio.noiseFloor = noiseFloor;

  // Speech energy = dynamic difference above noise floor
  const voiceDelta = Math.max(0, rms - noiseFloor);
  state.audio.speechEnergy = clamp(voiceDelta * 4.5, 0, 1);

  // Pitch Autocorrelation detection
  const sampleRate = state.audio.context.sampleRate || 44100;
  const pitchHz = autoCorrelate(samples, sampleRate);
  state.audio.pitch = pitchHz;

  // Track recent pitches during active speech to calculate jitter
  if (state.audio.speechEnergy > 0.08 && pitchHz > 50 && pitchHz < 500) {
    state.audio.recentPitches.push(pitchHz);
    if (state.audio.recentPitches.length > 15) {
      state.audio.recentPitches.shift();
    }
  } else {
    // Decaying pitch over silence
    state.audio.pitch = 0;
    if (state.audio.recentPitches.length > 0) {
      state.audio.recentPitches.shift();
    }
  }

  // Calculate Jitter (coefficient of variation of pitches)
  let jitterValue = 0;
  if (state.audio.recentPitches.length >= 4) {
    const avgPitch = safeAverage(state.audio.recentPitches);
    const variance = safeAverage(state.audio.recentPitches.map(p => Math.pow(p - avgPitch, 2)));
    const stdDev = Math.sqrt(variance);
    jitterValue = avgPitch > 0 ? stdDev / avgPitch : 0;
  }
  state.audio.jitter = jitterValue;

  // Vocal Tone Heuristic Profiling (matches python heuristics)
  let toneProfile = "Calm";
  if (state.audio.speechEnergy < 0.05) {
    toneProfile = "Silent";
  } else if (state.audio.pitch > 200) {
    if (state.audio.jitter > 0.08) toneProfile = "Excited";
    else if (state.audio.speechEnergy > 0.35) toneProfile = "Stressed";
    else toneProfile = "Alert";
  } else if (state.audio.pitch > 80) {
    if (state.audio.jitter > 0.08) toneProfile = "Expressive";
    else if (state.audio.speechEnergy > 0.35) toneProfile = "Assertive";
    else toneProfile = "Calm";
  } else {
    if (state.audio.speechEnergy < 0.15) toneProfile = "Tired";
    else toneProfile = "Steady";
  }
  state.audio.toneProfile = toneProfile;

  // If camera is not active, let voice tone predict/influence the mood
  if (!state.camera.active) {
    let voiceEmotion = "Neutral";
    let voiceMeta = "Voice tone is normal";
    let voiceAttention = 70;
    if (toneProfile === "Excited") {
      voiceEmotion = "Excited";
      voiceMeta = "Excited voice pattern detected (pitch & jitter high)";
      voiceAttention = 85;
    } else if (toneProfile === "Stressed") {
      voiceEmotion = "Stressed";
      voiceMeta = "Stressed or tense speech pattern detected (high energy/pitch)";
      voiceAttention = 75;
    } else if (toneProfile === "Tired") {
      voiceEmotion = "Tired";
      voiceMeta = "Tired or low energy voice pattern detected";
      voiceAttention = 50;
    } else if (toneProfile === "Alert" || toneProfile === "Assertive") {
      voiceEmotion = "Focused";
      voiceMeta = "Focused, steady, or assertive speech pattern";
      voiceAttention = 90;
    } else if (toneProfile === "Calm" || toneProfile === "Steady" || toneProfile === "Expressive") {
      voiceEmotion = "Positive";
      voiceMeta = "Calm or expressive speech pattern";
      voiceAttention = 80;
    }
    
    // Update emotion with the vocal prediction if not silent
    if (toneProfile !== "Silent") {
      updateEmotion(voiceEmotion, voiceMeta, voiceAttention);
    } else if (!state.camera.demoMode) {
      updateEmotion("Neutral", "No active voice signals (ambient silence)", 65);
    }
  }

  const floorPercent = clamp(Math.round(state.audio.noiseFloor * 280), 0, 100);
  const speechPercent = clamp(Math.round(state.audio.speechEnergy * 100), 0, 100);
  
  dom.audioNoiseFloor.textContent = `${floorPercent}%`;
  dom.audioSpeechEnergy.textContent = `${speechPercent}%`;
  dom.audioVoicePitch.textContent = state.audio.pitch > 0 ? `${Math.round(state.audio.pitch)} Hz` : "0 Hz";
  dom.audioToneProfile.textContent = toneProfile;

  drawAudioWave(samples, state.audio.level);
  state.audio.animationId = window.requestAnimationFrame(renderAudioFrame);
}

function autoCorrelate(buffer, sampleRate) {
  const minPeriod = Math.floor(sampleRate / 500); // 500Hz limit
  const maxPeriod = Math.floor(sampleRate / 50);  // 50Hz limit
  
  const data = new Float32Array(buffer.length);
  let totalSum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const val = (buffer[i] - 128) / 128;
    data[i] = val;
    totalSum += val * val;
  }
  const rms = Math.sqrt(totalSum / buffer.length);
  if (rms < 0.012) {
    return 0; // Amplitude too low for clean autocorrelation
  }
  
  let correlations = new Float32Array(maxPeriod + 1);
  for (let offset = minPeriod; offset <= maxPeriod; offset++) {
    let sum = 0;
    for (let i = 0; i < buffer.length - offset; i++) {
      sum += data[i] * data[i + offset];
    }
    correlations[offset] = sum;
  }
  
  let peakOffset = -1;
  let maxVal = -1;
  for (let offset = minPeriod; offset <= maxPeriod; offset++) {
    if (correlations[offset] > maxVal && 
        correlations[offset] > correlations[offset - 1] && 
        correlations[offset] > correlations[offset + 1]) {
      maxVal = correlations[offset];
      peakOffset = offset;
    }
  }
  
  if (peakOffset !== -1 && maxVal > 0.08) {
    return sampleRate / peakOffset;
  }
  return 0;
}

function drawIdleAudioWave() {
  const pseudoSamples = new Uint8Array(256);
  for (let index = 0; index < pseudoSamples.length; index += 1) {
    pseudoSamples[index] = 128 + Math.sin(index / 12) * 6;
  }
  dom.audioLevelValue.textContent = "0%";
  dom.audioLevelBar.style.width = "0%";
  if (dom.audioNoiseFloor) dom.audioNoiseFloor.textContent = "0%";
  if (dom.audioSpeechEnergy) dom.audioSpeechEnergy.textContent = "0%";
  if (dom.audioVoicePitch) dom.audioVoicePitch.textContent = "0 Hz";
  if (dom.audioToneProfile) dom.audioToneProfile.textContent = "Calm";
  drawAudioWave(pseudoSamples, 0.08);
}

function drawAudioWave(samples, level) {
  const ctx = dom.audioWaveContext;
  const width = dom.audioWaveCanvas.width;
  const height = dom.audioWaveCanvas.height;
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#67ffe0";
  const accentTwo = getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim() || "#ff5fb2";
  const accentThree = getComputedStyle(document.documentElement).getPropertyValue("--accent-3").trim() || "#7d83ff";

  ctx.clearRect(0, 0, width, height);
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "rgba(8, 14, 32, 0.96)");
  background.addColorStop(1, "rgba(3, 8, 20, 0.98)");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let row = 1; row < 4; row += 1) {
    const y = (height / 4) * row;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const glow = ctx.createLinearGradient(0, 0, width, 0);
  glow.addColorStop(0, accent);
  glow.addColorStop(0.5, accentThree);
  glow.addColorStop(1, accentTwo);

  ctx.beginPath();
  const step = Math.max(1, Math.floor(samples.length / width));
  for (let x = 0; x < width; x += 1) {
    const sampleIndex = Math.min(samples.length - 1, x * step);
    const normalized = (samples[sampleIndex] - 128) / 128;
    const y = height / 2 + normalized * (height * 0.34);
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = glow;
  ctx.shadowBlur = 18 + level * 20;
  ctx.shadowColor = accent;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "600 12px IBM Plex Mono";
  ctx.fillText(`INPUT LEVEL ${Math.round(level * 100)}%`, 14, 20);
}

function drawIdleAudioWave() {
  const pseudoSamples = new Uint8Array(256);
  for (let index = 0; index < pseudoSamples.length; index += 1) {
    pseudoSamples[index] = 128 + Math.sin(index / 12) * 6;
  }
  dom.audioLevelValue.textContent = "0%";
  dom.audioLevelBar.style.width = "0%";
  drawAudioWave(pseudoSamples, 0.08);
}

async function handleAssistantPrompt(message) {
  addAssistantMessage("user", message);
  let reply = await getAssistantReply(message);

  // Intercept and parse action tokens from local assistant
  if (reply.includes("[ACTION:")) {
    const match = reply.match(/\[ACTION:([A-Z]+):([a-zA-Z0-9_-]+)\]/);
    if (match) {
      const category = match[1];
      const argument = match[2];
      
      // Strip action tag from displayed and spoken reply
      reply = reply.replace(match[0], "").trim();

      // Dispatch execution commands
      if (category === "THEME") {
        setTheme(argument.toLowerCase());
      } else if (category === "CAMERA") {
        if (argument === "START") {
          startCamera();
        } else if (argument === "STOP") {
          stopCamera();
        }
      } else if (category === "ANALYTICS" && argument === "LOAD") {
        loadSampleDataset();
      }
    }
  }

  addAssistantMessage("assistant", reply);
  speak(reply);
  logEvent("Assistant", `Prompt handled: ${message}`);
}

function addAssistantMessage(role, content) {
  const bubble = document.createElement("article");
  bubble.className = `chat-bubble ${role}`;
  bubble.innerHTML = `<span class="chat-role">${role}</span><div>${escapeHtml(content)}</div>`;
  dom.chatFeed.appendChild(bubble);
  dom.chatFeed.scrollTop = dom.chatFeed.scrollHeight;
}

async function getAssistantReply(message) {
  if (appConfig.assistantEndpoint) {
    try {
      const response = await fetch(appConfig.assistantEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: {
            detection: state.detection,
            analytics: state.analytics.metrics,
            decision: state.decision,
          },
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        return payload.reply || payload.message || buildLocalAssistantReply(message);
      }
    } catch (error) {
      logEvent("Assistant", `Remote endpoint failed, using local fallback: ${error.message}`);
    }
  }

  return buildLocalAssistantReply(message);
}

function buildLocalAssistantReply(message) {
  const text = message.toLowerCase();
  const metrics = state.analytics.metrics;

  if (text.includes("gesture") || text.includes("face") || text.includes("emotion")) {
    return `Current multimodal state: gesture is ${state.detection.gesture}, emotion is ${state.detection.emotion}, attention is ${
      state.detection.attention == null ? "not yet estimated" : `${state.detection.attention}%`
    }.`;
  }

  if (text.includes("trend") || text.includes("forecast") || text.includes("productivity")) {
    if (!metrics) {
      return "No analytics dataset is loaded yet. Upload a CSV or use the sample dataset and I will generate a trend forecast.";
    }

    return `Productivity is ${metrics.trendLabel.toLowerCase()} with a next-window forecast of ${formatPercent(
      metrics.predictedNext
    )}. Focus averages ${formatPercent(metrics.averageFocus)} across ${metrics.rowCount} records.`;
  }

  if (text.includes("action") || text.includes("decision")) {
    return buildDecisionNarrative();
  }

  if (text.includes("insight")) {
    const insights = generateInsights(metrics);
    return insights.join(" ");
  }

  if (text.includes("hello") || text.includes("hi")) {
    return "Hello. NeuroSync is online and ready to fuse perception, analytics, and decision support.";
  }

  return `I'm tracking ${state.detection.gesture.toLowerCase()} gesture activity, ${state.detection.emotion.toLowerCase()} emotion signals, and ${
    metrics ? `${metrics.rowCount} analytics rows` : "no analytics rows yet"
  }. Ask for a decision summary, productivity trend, or recommended action.`;
}

function downloadSessionReport() {
  const metrics = state.analytics.metrics || {};
  const reportJson = {
    generatedAt: new Date().toISOString(),
    perception: {
      gesture: state.detection.gesture,
      gestureMeta: state.detection.gestureMeta,
      emotion: state.detection.emotion,
      emotionMeta: state.detection.emotionMeta,
      attention: state.detection.attention,
      voice: state.detection.voice,
      transcript: state.detection.transcript,
      tonePitch: state.audio.pitch,
      toneJitter: state.audio.jitter,
      toneProfile: state.audio.toneProfile,
    },
    analytics: {
      fileName: state.analytics.fileName || "sample_productivity.csv",
      metrics,
      insights: state.analytics.insights,
    },
    decision: state.decision,
    models: state.models,
    timeline: state.timeline,
  };
  const report = [
    "NeuroSync AI Session Report",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "Perception",
    `Gesture: ${state.detection.gesture}`,
    `Gesture detail: ${state.detection.gestureMeta}`,
    `Emotion: ${state.detection.emotion}`,
    `Emotion detail: ${state.detection.emotionMeta}`,
    `Attention: ${state.detection.attention == null ? "Not estimated" : `${state.detection.attention}%`}`,
    `Voice: ${state.detection.voice}`,
    `Transcript: ${state.detection.transcript}`,
    `Voice Pitch: ${state.audio.pitch > 0 ? `${Math.round(state.audio.pitch)} Hz` : "0 Hz"}`,
    `Voice Jitter: ${state.audio.jitter.toFixed(4)}`,
    `Voice Tone Profile: ${state.audio.toneProfile}`,
    "",
    "Analytics",
    `Dataset: ${state.analytics.fileName || "sample_productivity.csv"}`,
    `Rows: ${metrics.rowCount ?? 0}`,
    `Average focus: ${metrics.averageFocus == null ? "--" : formatPercent(metrics.averageFocus)}`,
    `Average productivity: ${metrics.averageProductivity == null ? "--" : formatPercent(metrics.averageProductivity)}`,
    `Forecast: ${metrics.predictedNext == null ? "--" : formatPercent(metrics.predictedNext)}`,
    `AI confidence: ${metrics.modelConfidence == null ? "--" : formatPercent(metrics.modelConfidence)}`,
    `Risk score: ${metrics.riskScore == null ? "--" : formatPercent(metrics.riskScore)}`,
    `Models: ${(metrics.analysisModels || []).join(", ") || "Local analytics engine"}`,
    "",
    "Insights",
    ...(state.analytics.insights.length ? state.analytics.insights.map((item) => `- ${item}`) : ["- No insights generated."]),
    "",
    "Decision",
    `Title: ${state.decision.title}`,
    `Mode: ${state.decision.mode}`,
    `Confidence: ${Math.round(state.decision.confidence * 100)}%`,
    `Reason: ${state.decision.reason}`,
    "Queue:",
    ...state.decision.queue.map((item) => `- ${item}`),
    "",
    "Event Timeline",
    ...state.timeline.map((item) => `- [${item.timestamp}] ${item.tag}: ${item.text}`),
    "",
    "Machine Readable Snapshot",
    JSON.stringify(reportJson, null, 2),
  ].join("\n");

  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `neurosync-session-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  logEvent("Report", "Session report downloaded.");
}

async function readAndProcessCsv(file) {
  const text = await file.text();
  const rows = parseCsv(text);

  if (!rows.length) {
    logEvent("Analytics", "Uploaded CSV contained no readable rows.");
    return;
  }

  state.analytics.fileName = file.name;
  processAnalyticsRows(rows, file.name);
}

function loadSampleDataset() {
  const sampleRows = Array.from({ length: 14 }, (_, index) => {
    const day = index + 1;
    const focus = 72 + Math.round(Math.sin(day / 2.1) * 12 + day * 0.8);
    const productivity = 68 + Math.round(Math.cos(day / 3.1) * 10 + day * 1.1);
    const emotion = 70 + Math.round(Math.sin(day / 3.8) * 7);
    const tasks = 4 + (index % 4);
    return {
      date: `2026-04-${String(day).padStart(2, "0")}`,
      focus_score: clamp(focus, 52, 96),
      productivity_score: clamp(productivity, 48, 98),
      emotion_score: clamp(emotion, 56, 94),
      tasks_completed: tasks,
    };
  });

  processAnalyticsRows(sampleRows, "sample_productivity.csv");
}

function processAnalyticsRows(rows, fileName) {
  const metrics = computeAnalytics(rows);
  state.analytics.rows = rows;
  state.analytics.metrics = metrics;
  state.analytics.insights = generateInsights(metrics);
  dom.uploadMeta.textContent = `${fileName} loaded - ${rows.length} rows ready for analysis`;
  dom.analyticsHealth.textContent = "Hot";
  renderAnalytics();
  renderInsights(state.analytics.insights);
  if (!appConfig.modelsEndpoint) {
    state.models = buildBrowserModelStatus();
    renderModelGrid();
  }
  syncBackendAnalytics(rows);
  recomputeDecision("Analytics update");
}

async function syncBackendAnalytics(rows) {
  if (!appConfig.analyticsEndpoint) {
    return;
  }

  try {
    const response = await fetch(appConfig.analyticsEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (payload.metrics && Object.keys(payload.metrics).length) {
      state.analytics.metrics = { ...state.analytics.metrics, ...payload.metrics };
      state.analytics.insights = payload.insights?.length ? payload.insights : state.analytics.insights;
      renderAnalytics();
      renderInsights(state.analytics.insights);
      recomputeDecision("Backend analytics model");
    }
  } catch (error) {
    logEvent("Backend", `Analytics API fallback active: ${error.message}`);
  }
}

function computeAnalytics(rows) {
  const columns = Object.keys(rows[0] || {});
  const numericColumns = columns.filter((column) => rows.some((row) => isFiniteNumber(row[column])));
  const dateColumn = selectColumn(columns, ["date", "time", "timestamp", "day"]);
  const focusColumn = selectColumn(numericColumns, ["focus", "attention", "concentration"]);
  const productivityColumn = selectColumn(numericColumns, ["productivity", "efficiency", "output"]);
  const emotionColumn = selectColumn(numericColumns, ["emotion", "sentiment", "mood"]);
  const taskColumn = selectColumn(numericColumns, ["task", "completed", "deliverable"]);

  const focusSeries = buildNumericSeries(rows, focusColumn);
  const productivitySeries = buildNumericSeries(rows, productivityColumn);
  const emotionSeries = buildNumericSeries(rows, emotionColumn);
  const taskSeries = buildNumericSeries(rows, taskColumn);
  const dateLabels = rows.map((row, index) => {
    if (!dateColumn || !row[dateColumn]) {
      return `T${index + 1}`;
    }
    return formatDateLabel(row[dateColumn]);
  });

  const averageFocus = safeAverage(focusSeries);
  const averageProductivity = safeAverage(productivitySeries);
  const averageEmotion = safeAverage(emotionSeries);
  const averageTasks = safeAverage(taskSeries);
  const slope = calculateSlope(productivitySeries);
  const emaSeries = exponentialSmoothing(productivitySeries, 0.42);
  const linearForecast = clamp(averageProductivity + slope * 1.25, 0, 100);
  const emaForecast = forecastEma(productivitySeries);
  const momentumForecast = forecastMomentum(productivitySeries);
  const seasonalForecast = forecastSeasonal(productivitySeries);
  const predictedNext = weightedEnsemble([
    [linearForecast, 0.28],
    [emaForecast, 0.34],
    [momentumForecast, 0.24],
    [seasonalForecast, 0.14],
  ]);
  const volatility = calculateStdDev(productivitySeries);
  const anomalyIndexes = detectAnomalies(productivitySeries);
  const anomalies = anomalyIndexes.length;
  const correlation = calculateCorrelation(focusSeries, productivitySeries);
  const focusProductivityFit = sigmoid(correlation * 2.4);
  const riskScore = clamp(volatility * 3.1 + anomalies * 8.5 - slope * 2.2 + Math.max(0, 70 - averageFocus) * 0.35, 0, 100);
  const modelConfidence = clamp(92 - volatility * 2.4 - anomalies * 5 + Math.min(rows.length, 30) * 0.45, 42, 96);
  const signalQuality = modelConfidence >= 78 ? "High" : modelConfidence >= 60 ? "Medium" : "Low";

  const productivityLag1 = productivitySeries.length >= 2 ? productivitySeries[productivitySeries.length - 2] : (productivitySeries[0] || 0);
  const focusRollingMean3 = safeAverage(focusSeries.slice(-3));
  const productivityRollingMean3 = safeAverage(productivitySeries.slice(-3));

  return {
    rowCount: rows.length,
    columns,
    dateColumn,
    focusColumn,
    productivityColumn,
    emotionColumn,
    taskColumn,
    dateLabels,
    focusSeries,
    productivitySeries,
    emotionSeries,
    taskSeries,
    averageFocus,
    averageProductivity,
    averageEmotion,
    averageTasks,
    predictedNext,
    linearForecast,
    emaForecast,
    momentumForecast,
    seasonalForecast,
    emaSeries,
    slope,
    volatility,
    anomalies,
    anomalyIndexes,
    correlation,
    focusProductivityFit,
    riskScore,
    modelConfidence,
    signalQuality,
    productivityLag1,
    focusRollingMean3,
    productivityRollingMean3,
    analysisModels: [
      "Weighted ensemble forecast",
      "Exponential smoothing",
      "Momentum regression",
      "Seasonal naive baseline",
      "Z-score anomaly detection",
      "Correlation risk scoring",
    ],
    trendLabel: slope > 1.3 ? "Climbing" : slope < -1.3 ? "Cooling" : "Stable",
  };
}

function renderAnalytics() {
  const metrics = state.analytics.metrics;
  if (!metrics) {
    return;
  }

  dom.rowsMetric.textContent = String(metrics.rowCount);
  dom.focusMetric.textContent = formatPercent(metrics.averageFocus);
  dom.productivityMetric.textContent = formatPercent(metrics.averageProductivity);
  dom.forecastMetric.textContent = formatPercent(metrics.predictedNext);
  dom.modelConfidenceMetric.textContent = formatPercent(metrics.modelConfidence || 0);
  dom.riskMetric.textContent = formatPercent(metrics.riskScore || 0);
  dom.trendBadge.textContent = metrics.trendLabel;
  dom.dateColumnValue.textContent = metrics.dateColumn || "Synthetic index";
  dom.focusColumnValue.textContent = metrics.focusColumn || "Unavailable";
  dom.productivityColumnValue.textContent = metrics.productivityColumn || "Unavailable";
  dom.heroForecast.textContent = formatPercent(metrics.predictedNext);
  dom.forecastStackState.textContent = `Forecast ${metrics.trendLabel}`;
  drawTrendChart();
}

function drawTrendChart() {
  const metrics = state.analytics.metrics;
  const canvas = dom.trendCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff9f0";
  ctx.fillRect(0, 0, width, height);

  if (!metrics || !metrics.productivitySeries.length) {
    ctx.fillStyle = "#5b6f7f";
    ctx.font = "16px IBM Plex Sans";
    ctx.fillText("Upload data to visualize productivity and forecast trends.", 24, height / 2);
    return;
  }

  const points = metrics.productivitySeries;
  const max = Math.max(...points, metrics.predictedNext) + 8;
  const min = Math.min(...points, metrics.predictedNext) - 8;
  const padX = 36;
  const padY = 28;
  const usableWidth = width - padX * 2;
  const usableHeight = height - padY * 2;
  const xStep = usableWidth / Math.max(points.length, 1);

  ctx.strokeStyle = "rgba(23, 49, 70, 0.08)";
  ctx.lineWidth = 1;
  for (let index = 0; index < 5; index += 1) {
    const y = padY + (usableHeight / 4) * index;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(width - padX, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#0f9d8a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((value, index) => {
    const x = padX + xStep * index;
    const y = padY + ((max - value) / (max - min || 1)) * usableHeight;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = "#0f9d8a";
  points.forEach((value, index) => {
    const x = padX + xStep * index;
    const y = padY + ((max - value) / (max - min || 1)) * usableHeight;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const forecastX = padX + xStep * points.length;
  const forecastY = padY + ((max - metrics.predictedNext) / (max - min || 1)) * usableHeight;
  const lastX = padX + xStep * (points.length - 1);
  const lastY =
    padY + ((max - points[points.length - 1]) / (max - min || 1)) * usableHeight;

  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = "#ff7b54";
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(forecastX, forecastY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#ff7b54";
  ctx.beginPath();
  ctx.arc(forecastX, forecastY, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "13px IBM Plex Sans";
  ctx.fillStyle = "#173146";
  ctx.fillText(`Forecast ${formatPercent(metrics.predictedNext)}`, Math.max(18, forecastX - 58), forecastY - 12);
}

function generateInsights(metrics) {
  if (!metrics) {
    return [
      "Upload a CSV or load the sample dataset to unlock KPI summaries, forecasts, and behavior insights.",
    ];
  }

  const correlationLabel =
    metrics.correlation > 0.45
      ? "strong"
      : metrics.correlation > 0.18
      ? "moderate"
      : "weak";
  const stabilityLabel =
    metrics.volatility < 6 ? "steady" : metrics.volatility < 11 ? "dynamic" : "highly variable";

  return [
    `Productivity is ${metrics.trendLabel.toLowerCase()} with a projected next-window score of ${formatPercent(
      metrics.predictedNext
    )}.`,
    `AI ensemble confidence is ${formatPercent(metrics.modelConfidence || 0)} with ${metrics.signalQuality || "medium"} signal quality and risk at ${formatPercent(metrics.riskScore || 0)}.`,
    `Focus averages ${formatPercent(metrics.averageFocus)} and shows a ${correlationLabel} relationship with productivity.`,
    `Operational rhythm appears ${stabilityLabel}, with ${metrics.anomalies} anomal${metrics.anomalies === 1 ? "y" : "ies"} detected across the series.`,
    `Average mood signal is ${formatPercent(metrics.averageEmotion)} while throughput averages ${metrics.averageTasks.toFixed(
      1
    )} completed tasks per interval.`,
  ];
}

function renderInsights(insights) {
  dom.insightList.innerHTML = "";
  insights.forEach((insight) => {
    const item = document.createElement("li");
    item.textContent = insight;
    dom.insightList.appendChild(item);
  });
}

let breathingInterval = null;
function startBreathingGuide() {
  if (breathingInterval) return;
  let phase = 0;
  breathingInterval = setInterval(() => {
    if (!dom.breathingStateText) return;
    if (state.decision.mode === "Recovery" || state.decision.mode === "Mandatory Recovery") {
      // 3 phase: Inhale, Hold, Exhale
      const phases = ["Inhale deeply...", "Hold...", "Exhale slowly..."];
      dom.breathingStateText.textContent = phases[phase % phases.length];
    } else {
      // 4 phase box breathing: Inhale, Hold, Exhale, Hold
      const phases = ["Inhale (4s)...", "Hold (4s)...", "Exhale (4s)...", "Hold (4s)..."];
      dom.breathingStateText.textContent = phases[phase % phases.length];
    }
    phase++;
  }, 2000);
}

function stopBreathingGuide() {
  if (breathingInterval) {
    clearInterval(breathingInterval);
    breathingInterval = null;
  }
}

function recomputeDecision(reason) {
  const metrics = state.analytics.metrics;
  const gesture = state.detection.gesture;
  const emotion = state.detection.emotion;
  const attention = state.detection.attention;

  let title = "Maintain ready state";
  let explanation =
    "NeuroSync is monitoring gesture, emotion, voice, and analytics streams while waiting for a higher-confidence action trigger.";
  let confidence = 0.32;
  let mode = "Observation";
  const queue = [];

  // Theme auto-switching based on emotion state
  if (emotion === "Stressed") {
    setTheme("calm");
  } else if (emotion === "Distracted") {
    setTheme("focus");
  } else if (emotion === "Excited") {
    setTheme("aurora");
  } else if (emotion === "Tired") {
    setTheme("calm");
  } else if (emotion === "Focused") {
    setTheme("focus");
  } else if (emotion === "Positive") {
    setTheme("neon");
  }

  if (gesture === "Pinch Select") {
    title = "Lock onto active workspace selection";
    explanation =
      "Pinch input is a high-intent gesture. Keep the current card or UI zone selected and surface contextual shortcuts.";
    confidence += 0.22;
    mode = "Intent Capture";
    queue.push("Highlight the currently targeted widget.");
  }

  if (gesture === "Swipe Left" || gesture === "Swipe Right") {
    title = "Navigate insight carousel";
    explanation =
      "Directional hand motion suggests browse intent, so the interface should rotate between dashboards, assistant views, or decision cards.";
    confidence += 0.2;
    mode = "Navigation";
    queue.push("Switch to the next multimodal insight panel.");
  }

  if (["Motion Wave", "Micro Movement", "Open Presence"].includes(gesture)) {
    title = "Maintain live perception tracking";
    explanation =
      "The camera fallback model is detecting movement, so the interface should remain responsive while landmark models warm up.";
    confidence += 0.1;
    mode = "Live Tracking";
    queue.push("Keep camera feedback visible and continue updating fallback perception.");
  }

  if (emotion === "Tired") {
    title = "Trigger recovery recommendation";
    explanation =
      "Facial fatigue cues indicate reduced stamina. Shift toward low-friction actions, shorter prompts, and a short recovery break suggestion.";
    confidence += 0.18;
    mode = "Recovery";
    queue.unshift("Offer a quick break and summarize only the highest-priority action.");
  } else if (emotion === "Stressed") {
    title = "Alleviate workload pressure";
    explanation =
      "Signs of stress or muscle tension detected. Switch to Calm Lavender mode, suggest breathing exercises, and prioritize low-pressure tasks.";
    confidence += 0.18;
    mode = "Stamina Buffer";
    queue.unshift("Suggest a 5-minute tactical breathing exercise.");
  } else if (emotion === "Distracted") {
    title = "Redirect focus to active task";
    explanation =
      "Gaze deviation suggests the user is looking away. The interface will switch to Focus Mode, suppress notification overlays, and highlight the highest priority task.";
    confidence += 0.15;
    mode = "Focus Rescue";
    queue.unshift("Activate deep-work notifications suppression.");
  } else if (emotion === "Excited") {
    title = "Harness peak energy window";
    explanation =
      "High expressions of positive energy and high attention detected. Suggest tackling creative or complex deliverables while stamina is at its peak.";
    confidence += 0.2;
    mode = "Peak Stamina";
    queue.unshift("Surface the highest-priority creative backlog item.");
  } else if (emotion === "Focused" && attention && attention > 70) {
    title = "Preserve deep-work flow";
    explanation =
      "High attention with a focused expression suggests flow state. Reduce interruptions and present concise, action-first guidance.";
    confidence += 0.16;
    mode = "Focus Preservation";
    queue.unshift("Suppress non-essential prompts and show one decisive recommendation.");
  } else if (emotion === "Engaged") {
    title = "Amplify active workspace support";
    explanation =
      "Movement and attention cues suggest the user is actively interacting with the workspace.";
    confidence += 0.14;
    mode = "Active Support";
    queue.unshift("Keep controls visible and prioritize immediate dashboard feedback.");
  }

  if (metrics) {
    if (metrics.trendLabel === "Climbing") {
      confidence += 0.12;
      queue.push("Recommend high-value tasks while performance is trending upward.");
    } else if (metrics.trendLabel === "Cooling") {
      title = "Intervene before productivity softens";
      explanation =
        "Analytics forecast shows a downward trend. Pair simple interface actions with recovery or prioritization guidance to stabilize output.";
      confidence += 0.15;
      mode = "Stabilization";
      queue.push("Surface the most important KPI and a single corrective action.");
    }

    if (metrics.averageFocus > 78) {
      queue.push("Route the assistant into concise strategic support instead of exploratory suggestions.");
    }

    if ((metrics.riskScore || 0) >= 58) {
      title = "Stabilize high-risk work session";
      explanation =
        "The advanced analytics engine sees elevated volatility or anomaly risk, so the next action should reduce load and preserve clarity.";
      confidence += 0.14;
      mode = "Risk Control";
      queue.unshift("Download or review the report before continuing the next work block.");
    }

    if ((metrics.modelConfidence || 0) >= 82) {
      confidence += 0.05;
    }
  }

  if (state.detection.voice === "Command") {
    confidence += 0.08;
    queue.unshift("Honor the most recent voice command before lower-priority suggestions.");
  }

  // Precision signal quality confidence adjustments (dampeners)
  if (state.audio.active && state.audio.noiseFloor > 0.16) {
    confidence -= 0.15; // High background noise dampens command recognition confidence
  }
  if (state.camera.active && !state.camera.mediapipeReady) {
    confidence -= 0.1;  // Running in lower-fidelity camera motion fallback mode
  }
  if (state.camera.active && gesture === "Idle" && emotion === "Neutral") {
    confidence -= 0.05; // No active signals detected from camera telemetry
  }

  if (!queue.length) {
    queue.push("Await stronger multimodal intent before changing the interface.");
    queue.push("Continue updating gesture, emotion, and forecast confidence.");
  }

  state.decision = {
    title,
    reason: explanation,
    confidence: clamp(confidence, 0.05, 0.96),
    mode,
    queue: queue.slice(0, 4),
  };

  renderDecision(reason);
}

function renderDecision(triggerReason) {
  dom.decisionTitle.textContent = state.decision.title;
  dom.decisionReason.textContent = state.decision.reason;
  dom.decisionConfidence.textContent = `Confidence: ${Math.round(state.decision.confidence * 100)}%`;
  dom.decisionMode.textContent = `Mode: ${state.decision.mode}`;
  dom.heroConfidence.textContent = `${Math.round(state.decision.confidence * 100)}%`;

  if (dom.stressReliefWidget) {
    const showWidget = ["Critical Stress Intervention", "Stamina Buffer", "Mandatory Recovery", "Recovery"].includes(state.decision.mode);
    if (showWidget) {
      dom.stressReliefWidget.style.display = "block";
      startBreathingGuide();
    } else {
      dom.stressReliefWidget.style.display = "none";
      stopBreathingGuide();
    }
  }

  const weights = calculateFusionWeights();
  setWeight(dom.gestureWeightBar, dom.gestureWeightLabel, weights.gesture);
  setWeight(dom.emotionWeightBar, dom.emotionWeightLabel, weights.emotion);
  setWeight(dom.voiceWeightBar, dom.voiceWeightLabel, weights.voice);
  setWeight(dom.analyticsWeightBar, dom.analyticsWeightLabel, weights.analytics);

  dom.actionQueue.innerHTML = "";
  state.decision.queue.forEach((action) => {
    const item = document.createElement("li");
    item.textContent = action;
    dom.actionQueue.appendChild(item);
  });
  renderReportSummary();

  const decisionSignature = `${state.decision.title}|${state.decision.mode}|${triggerReason}`;
  if (decisionSignature !== lastDecisionSignature) {
    lastDecisionSignature = decisionSignature;
    logEvent("Decision", `${state.decision.title} - ${triggerReason}`);
  }

  queueBackendDecisionSync();
}

function renderReportSummary() {
  if (!dom.reportSummary) {
    return;
  }

  const metrics = state.analytics.metrics;
  const confidence = Math.round(state.decision.confidence * 100);
  const forecast = metrics ? formatPercent(metrics.predictedNext) : "no forecast";
  const risk = metrics ? formatPercent(metrics.riskScore || 0) : "no risk score";
  dom.reportSummary.textContent = `Current report captures ${state.detection.gesture} gesture, ${state.detection.emotion} mood, ${forecast} forecast, ${risk} risk, and ${confidence}% decision confidence.`;
}

function queueBackendDecisionSync() {
  if (!appConfig.decisionEndpoint) {
    return;
  }

  window.clearTimeout(decisionSyncTimer);
  decisionSyncTimer = window.setTimeout(syncBackendDecision, 380);
}

async function syncBackendDecision() {
  try {
    const metricsPayload = state.analytics.metrics ? { ...state.analytics.metrics } : {};
    metricsPayload.audioNoiseFloor = state.audio.active ? state.audio.noiseFloor : 0;
    metricsPayload.cameraFallback = state.camera.active && !state.camera.mediapipeReady;
    metricsPayload.hasActivePerception = state.camera.active && (state.detection.gesture !== "Idle" || state.detection.emotion !== "Neutral");
    metricsPayload.tonePitch = state.audio.active ? state.audio.pitch : 0;
    metricsPayload.toneJitter = state.audio.active ? state.audio.jitter : 0;
    metricsPayload.audioSpeechEnergy = state.audio.active ? (state.audio.speechEnergy * 100) : 0;

    const response = await fetch(appConfig.decisionEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gesture: state.detection.gesture,
        emotion: state.detection.emotion,
        attention: state.detection.attention,
        voice_state: state.detection.voice,
        metrics: metricsPayload,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const decision = await response.json();
    if (!decision.title || decision.title === state.decision.title) {
      return;
    }
    state.decision = decision;
    renderDecision("Backend decision model");
  } catch (error) {
    logEvent("Backend", `Decision API fallback active: ${error.message}`);
  }
}

function calculateFusionWeights() {
  const metrics = state.analytics.metrics;
  const hasVoiceCommand = state.detection.voice === "Command";
  const gestureWeight = state.detection.gesture !== "Idle" ? 28 : 16;
  const emotionWeight = state.detection.emotion !== "Neutral" ? 28 : 20;
  const voiceWeight = hasVoiceCommand ? 24 : 16;
  const analyticsWeight = metrics ? 32 : 18;
  const total = gestureWeight + emotionWeight + voiceWeight + analyticsWeight;

  return {
    gesture: Math.round((gestureWeight / total) * 100),
    emotion: Math.round((emotionWeight / total) * 100),
    voice: Math.round((voiceWeight / total) * 100),
    analytics: Math.round((analyticsWeight / total) * 100),
  };
}

function setWeight(bar, label, value) {
  bar.style.width = `${value}%`;
  label.textContent = `${value}%`;
}

function buildDecisionNarrative() {
  const metrics = state.analytics.metrics;
  const forecastText = metrics ? `forecast ${formatPercent(metrics.predictedNext)}` : "no forecast yet";
  return `${state.decision.title}. ${state.decision.reason} Current gesture is ${state.detection.gesture}, emotion is ${state.detection.emotion}, and the analytics engine reports ${forecastText}.`;
}

function startDemoLoop() {
  const demoStates = [
    { gesture: "Open Palm", emotion: "Focused", attention: 82 },
    { gesture: "Swipe Right", emotion: "Excited", attention: 88 },
    { gesture: "Pointer", emotion: "Neutral", attention: 71 },
    { gesture: "Idle", emotion: "Stressed", attention: 55 },
    { gesture: "Pinch Select", emotion: "Positive", attention: 77 },
    { gesture: "Idle", emotion: "Distracted", attention: 35 },
    { gesture: "Idle", emotion: "Neutral", attention: 65 },
  ];

  let index = 0;
  demoLoop = window.setInterval(() => {
    if (!state.camera.demoMode || state.camera.active) {
      return;
    }

    const next = demoStates[index % demoStates.length];
    index += 1;
    state.detection.gesture = next.gesture;
    state.detection.gestureMeta = "Demo perception signal";
    updateEmotion(next.emotion, "Demo emotion heuristic", next.attention);
    recomputeDecision("Demo signal refresh");
  }, 5500);
}

function logEvent(tag, text) {
  state.timeline.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    tag,
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
  state.timeline = state.timeline.slice(0, 8);

  dom.eventLog.innerHTML = "";
  state.timeline.forEach((item) => {
    const row = document.createElement("li");
    row.textContent = `[${item.timestamp}] ${item.tag}: ${item.text}`;
    dom.eventLog.appendChild(row);
  });
}

function parseCsv(text) {
  const rows = [];
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (!lines.length) {
    return rows;
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  for (let index = 1; index < lines.length; index += 1) {
    const values = splitCsvLine(lines[index]);
    if (values.every((value) => value.trim() === "")) {
      continue;
    }
    const row = {};
    headers.forEach((header, headerIndex) => {
      row[header] = (values[headerIndex] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function selectColumn(columns, candidates) {
  if (!columns.length) {
    return "";
  }

  const normalized = columns.map((column) => ({ original: column, normalized: column.toLowerCase() }));
  for (const candidate of candidates) {
    const match = normalized.find(({ normalized: columnName }) => columnName.includes(candidate));
    if (match) {
      return match.original;
    }
  }
  return columns[0];
}

function numericValue(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value !== "string") {
    return Number.NaN;
  }
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function buildNumericSeries(rows, column) {
  let lastValid = 0;
  return rows.map((row) => {
    const parsed = numericValue(row[column]);
    if (Number.isFinite(parsed)) {
      lastValid = parsed;
      return parsed;
    }
    return lastValid;
  });
}

function safeAverage(values) {
  const usable = values.filter(Number.isFinite);
  if (!usable.length) {
    return 0;
  }
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function calculateSlope(values) {
  if (values.length < 2) {
    return 0;
  }

  const count = values.length;
  const xMean = (count - 1) / 2;
  const yMean = safeAverage(values);
  let numerator = 0;
  let denominator = 0;

  values.forEach((value, index) => {
    numerator += (index - xMean) * (value - yMean);
    denominator += (index - xMean) ** 2;
  });

  return denominator ? numerator / denominator : 0;
}

function calculateStdDev(values) {
  const mean = safeAverage(values);
  const variance = safeAverage(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function exponentialSmoothing(values, alpha) {
  if (!values.length) {
    return [];
  }

  const smoothed = [values[0]];
  for (let index = 1; index < values.length; index += 1) {
    smoothed.push(alpha * values[index] + (1 - alpha) * smoothed[index - 1]);
  }
  return smoothed;
}

function forecastEma(values) {
  if (!values.length) {
    return 0;
  }
  const smoothed = exponentialSmoothing(values, 0.42);
  const momentum = values[values.length - 1] - smoothed[smoothed.length - 1];
  return clamp(smoothed[smoothed.length - 1] + momentum * 0.35, 0, 100);
}

function forecastMomentum(values) {
  if (!values.length) {
    return 0;
  }
  if (values.length < 4) {
    return clamp(values[values.length - 1], 0, 100);
  }
  const recent = values.slice(-4);
  return clamp(values[values.length - 1] + calculateSlope(recent), 0, 100);
}

function forecastSeasonal(values) {
  if (!values.length) {
    return 0;
  }
  if (values.length >= 7) {
    return clamp(values[values.length - 1] * 0.62 + values[values.length - 7] * 0.38, 0, 100);
  }
  return clamp((values[values.length - 1] + safeAverage(values)) / 2, 0, 100);
}

function weightedEnsemble(values) {
  const totalWeight = values.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  return clamp(values.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight, 0, 100);
}

function detectAnomalies(values) {
  if (values.length < 4) {
    return [];
  }
  const mean = safeAverage(values);
  const stdDev = calculateStdDev(values) || 1;
  return values
    .map((value, index) => ({ value, index, z: Math.abs((value - mean) / stdDev) }))
    .filter(({ value, z }) => z >= 1.65 && Math.abs(value - mean) >= 7)
    .map(({ index }) => index);
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function calculateCorrelation(left, right) {
  if (!left.length || !right.length || left.length !== right.length) {
    return 0;
  }

  const leftMean = safeAverage(left);
  const rightMean = safeAverage(right);
  let numerator = 0;
  let leftVariance = 0;
  let rightVariance = 0;

  left.forEach((value, index) => {
    const leftDelta = value - leftMean;
    const rightDelta = right[index] - rightMean;
    numerator += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  });

  return numerator / Math.sqrt(leftVariance * rightVariance || 1);
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value) {
  return Number.isFinite(numericValue(value));
}

function escapeHtml(text) {
  const container = document.createElement("div");
  container.textContent = text;
  return container.innerHTML;
}
