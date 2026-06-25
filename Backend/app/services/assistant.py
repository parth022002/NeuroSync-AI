from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

from app.config import Settings


class AssistantService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def generate_reply(self, message: str, context: Optional[Dict[str, Any]] = None) -> Tuple[str, str]:
        context = context or {}

        if self.settings.openai_api_key:
            try:
                return self._generate_openai_reply(message, context), "openai"
            except Exception:
                pass

        return self._generate_fallback_reply(message, context), "local"

    def _generate_openai_reply(self, message: str, context: Dict[str, Any]) -> str:
        import openai

        prompt = self._build_context_prompt(message, context)
        system_prompt = (
            "You are NeuroSync AI, a multimodal assistant for gesture, voice, emotion, analytics, "
            "and decision intelligence. Keep responses concise, practical, and grounded in the provided context."
        )

        if hasattr(openai, "OpenAI"):
            client = openai.OpenAI(api_key=self.settings.openai_api_key)
            response = client.responses.create(
                model=self.settings.openai_model,
                instructions=system_prompt,
                input=prompt,
            )
            return response.output_text.strip() or self._generate_fallback_reply(message, context)

        openai.api_key = self.settings.openai_api_key
        response = openai.ChatCompletion.create(
            model=self.settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
        )
        return response["choices"][0]["message"]["content"].strip()

    def _build_context_prompt(self, message: str, context: Dict[str, Any]) -> str:
        detection = context.get("detection") or {}
        analytics = context.get("analytics") or {}
        decision = context.get("decision") or {}
        return (
            f"User message: {message}\n\n"
            f"Detection context: {detection}\n"
            f"Analytics context: {analytics}\n"
            f"Decision context: {decision}\n\n"
            "Answer using the current system state."
        )

    def _generate_fallback_reply(self, message: str, context: Dict[str, Any]) -> str:
        text = message.lower()
        detection = context.get("detection") or {}
        analytics = context.get("analytics") or {}
        decision = context.get("decision") or {}

        gesture = detection.get("gesture", "Idle")
        emotion = detection.get("emotion", "Neutral")
        attention = detection.get("attention")
        forecast = analytics.get("predictedNext")
        risk_score = analytics.get("riskScore", 0)
        anomalies = analytics.get("anomalies", 0)
        average_focus = analytics.get("averageFocus")
        trend_label = analytics.get("trendLabel", "Stable")
        row_count = analytics.get("rowCount", 0)

        # 1. Action Triggers
        # A. Theme changes
        for theme in ["neon", "aurora", "ember", "cobalt", "focus", "calm"]:
            if f"theme {theme}" in text or f"switch to {theme}" in text or f"apply {theme}" in text:
                return f"[ACTION:THEME:{theme}] Transitioning system workspace theme to {theme.upper()}."

        # B. Camera controls
        if "start camera" in text or "turn on camera" in text or "activate camera" in text:
            return "[ACTION:CAMERA:START] Initializing camera device and computer vision pipelines."
        if "stop camera" in text or "turn off camera" in text or "close camera" in text:
            return "[ACTION:CAMERA:STOP] Deactivating camera device stream and releasing resources."

        # C. Load dataset
        if "load sample" in text or "load analytics" in text or "load dataset" in text or "load csv" in text:
            return "[ACTION:ANALYTICS:LOAD] Loading reference productivity dataset into analytics engine."

        # 2. Information/Status Queries
        # D. Help & Capabilities
        if any(keyword in text for keyword in ["help", "what can you do", "commands", "features", "capabilities"]):
            return (
                "I am NeuroSync AI, your multimodal intelligence assistant. I support the following functions:\n"
                "• Theme control: ask me to 'switch to theme aurora' or 'apply theme ember'\n"
                "• Camera control: ask me to 'start camera' or 'stop camera' to toggle CV feeds\n"
                "• Analytics: ask me to 'load sample dataset', 'show productivity forecast', or 'check risk levels'\n"
                "• Focus assistance: ask me for 'focus tips' or 'stress relief' to dynamically adjust workspace aesthetics"
            )

        # E. Risk & Volatility Analysis
        if any(keyword in text for keyword in ["risk", "anomaly", "anomalies", "volatility", "stable"]):
            if row_count == 0:
                return "Analytics data is currently offline. Load a dataset to evaluate session risk and volatility."
            risk_desc = "High" if risk_score > 60 else "Moderate" if risk_score > 30 else "Low"
            return (
                f"Operational risk is currently {risk_desc} ({round(float(risk_score))}%). "
                f"I have detected {anomalies} anomalies across the {row_count}-interval data series. "
                "Recommend focus preservation loops to stabilize volatility."
            )

        # F. Focus, Stress & Fatigue Advice
        if any(keyword in text for keyword in ["focus", "tired", "stressed", "fatigue", "exhausted", "attention"]):
            attention_text = f"{attention}%" if attention is not None else "not yet estimated"
            if emotion == "Stressed":
                return (
                    f"Your attention is at {attention_text} with signs of muscle tension (Stressed emotion). "
                    "I suggest a 5-minute tactical breathing exercise. Type 'apply theme calm' or ask me to switch to calm theme."
                )
            elif emotion == "Tired":
                return (
                    f"Your attention is at {attention_text} with droopy eye indicators (Tired emotion). "
                    "I recommend a 5-minute recovery break. Stand up, stretch, and let me handle strategic notification suppression."
                )
            elif emotion == "Focused":
                return (
                    f"Excellent state detected. Gaze tracking shows your attention is sustained at {attention_text}. "
                    "Deep-work preservation mode is active. I will suppress minor alerts to protect your flow state."
                )
            return (
                f"Your attention is currently {attention_text}. To optimize flow, maintain a relaxed posture, "
                "ensure stable room lighting, and ask me to enable 'focus theme' if you get distracted."
            )

        # G. Forecast and productivity
        if any(keyword in text for keyword in ["forecast", "trend", "productivity", "future", "predict"]):
            if forecast is None:
                return "No forecast metrics are available. Load a dataset first to initiate ensemble forecasting."
            return (
                f"Productivity trend is {trend_label.lower()}. Next-window weighted ensemble forecast "
                f"is projected at {round(float(forecast))}%. Average session focus is {round(float(average_focus or 0))}%."
            )

        # H. Multimodal state summary
        if any(keyword in text for keyword in ["state", "gesture", "emotion", "mood", "telemetry", "summary"]):
            attention_text = f"{attention}%" if attention is not None else "offline"
            return (
                f"System state overview: gesture is {gesture}, expression is {emotion}, attention is {attention_text}. "
                f"Active workspace recommended action: '{decision.get('title', 'Maintain ready state')}'."
            )

        # I. Hello / Greeting
        if any(keyword in text for keyword in ["hello", "hi", "greetings", "hey"]):
            return (
                "Greetings. NeuroSync AI interface is online. "
                f"Live feeds are standing by, current facial state is {emotion.lower()}. How can I assist you?"
            )

        # J. Default fallback response
        return (
            f"I'm tracking {gesture.lower()} gesture activity, {emotion.lower()} emotion signals, "
            f"and {row_count} analytics rows. Ask me to switch theme, start camera, summarize state, or forecast productivity."
        )
