from __future__ import annotations

from typing import Any, Dict, List, Optional


def compute_decision(
    gesture: str,
    emotion: str,
    attention: Optional[int],
    voice_state: str,
    metrics: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    title = "Maintain ready state"
    reason = (
        "NeuroSync is monitoring gesture, emotion, voice, and analytics streams while "
        "waiting for a higher-confidence action trigger."
    )
    confidence = 0.32
    mode = "Observation"
    queue: List[str] = []

    if gesture == "Pinch Select":
        title = "Lock onto active workspace selection"
        reason = "Pinch input is a high-intent gesture. Keep the current UI zone selected and surface contextual shortcuts."
        confidence += 0.22
        mode = "Intent Capture"
        queue.append("Highlight the currently targeted widget.")

    if gesture in {"Swipe Left", "Swipe Right"}:
        title = "Navigate insight carousel"
        reason = "Directional hand motion suggests browse intent, so the interface should rotate between dashboards and insight panels."
        confidence += 0.2
        mode = "Navigation"
        queue.append("Switch to the next multimodal insight panel.")

    if gesture in {"Motion Wave", "Micro Movement", "Open Presence"}:
        title = "Maintain live perception tracking"
        reason = "The camera fallback model is detecting movement, so keep the interface responsive while landmark models warm up."
        confidence += 0.1
        mode = "Live Tracking"
        queue.append("Keep camera feedback visible and continue updating fallback perception.")

    if emotion == "Tired":
        title = "Trigger recovery recommendation"
        reason = "Facial fatigue cues indicate reduced stamina. Shift toward lower-friction actions and a short recovery suggestion."
        confidence += 0.18
        mode = "Recovery"
        queue.insert(0, "Offer a quick break and summarize the highest-priority action.")
    elif emotion == "Focused" and attention and attention > 70:
        title = "Preserve deep-work flow"
        reason = "High attention with a focused expression suggests flow state. Reduce interruptions and present concise guidance."
        confidence += 0.16
        mode = "Focus Preservation"
        queue.insert(0, "Suppress non-essential prompts and show one decisive recommendation.")
    elif emotion == "Engaged":
        title = "Amplify active workspace support"
        reason = "Movement and attention cues suggest the user is actively interacting with the workspace."
        confidence += 0.14
        mode = "Active Support"
        queue.insert(0, "Keep controls visible and prioritize immediate dashboard feedback.")

    if metrics:
        trend = metrics.get("trendLabel", "Stable")
        average_focus = float(metrics.get("averageFocus", 0))
        risk_score = float(metrics.get("riskScore", 0))
        model_confidence = float(metrics.get("modelConfidence", 0))
        if trend == "Climbing":
            confidence += 0.12
            queue.append("Recommend high-value tasks while performance is trending upward.")
        elif trend == "Cooling":
            title = "Intervene before productivity softens"
            reason = "Analytics forecast shows a downward trend. Pair simple interface actions with recovery or prioritization guidance."
            confidence += 0.15
            mode = "Stabilization"
            queue.append("Surface the most important KPI and a single corrective action.")

        if average_focus > 78:
            queue.append("Route the assistant into concise strategic support instead of exploratory suggestions.")

        if risk_score >= 58:
            title = "Stabilize high-risk work session"
            reason = "The advanced analytics engine sees elevated volatility or anomaly risk, so the next action should reduce load and preserve clarity."
            confidence += 0.14
            mode = "Risk Control"
            queue.insert(0, "Download or review the report before continuing the next work block.")

        if model_confidence >= 82:
            confidence += 0.05

    if voice_state == "Command":
        confidence += 0.08
        queue.insert(0, "Honor the most recent voice command before lower-priority suggestions.")

    if not queue:
        queue = [
            "Await stronger multimodal intent before changing the interface.",
            "Continue updating gesture, emotion, and forecast confidence.",
        ]

    return {
        "title": title,
        "reason": reason,
        "confidence": max(0.0, min(0.96, confidence)),
        "mode": mode,
        "queue": queue[:4],
    }
