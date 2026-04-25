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

        if any(keyword in text for keyword in ("gesture", "face", "emotion", "state")):
            attention_text = f"{attention}%" if attention is not None else "not yet estimated"
            return f"Current multimodal state: gesture is {gesture}, emotion is {emotion}, and attention is {attention_text}."

        if any(keyword in text for keyword in ("forecast", "trend", "productivity")) and forecast is not None:
            return (
                f"Productivity is {analytics.get('trendLabel', 'stable').lower()} with a forecast of "
                f"{round(float(forecast))}%. Focus averages {round(float(analytics.get('averageFocus', 0)))}%."
            )

        if any(keyword in text for keyword in ("decision", "action", "recommend")) and decision:
            return f"{decision.get('title', 'Maintain ready state')}. {decision.get('reason', 'No decision reason yet.')}"

        return (
            f"I'm tracking {gesture.lower()} gesture activity, {emotion.lower()} emotion signals, "
            f"and {analytics.get('rowCount', 0)} analytics rows. Ask for a decision summary or productivity trend."
        )
