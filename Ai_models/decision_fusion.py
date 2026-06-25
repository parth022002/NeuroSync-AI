from __future__ import annotations

from typing import Any, Dict, List, Optional
from Ai_models.tone_analyzer import analyze_voice_tone


def compute_decision(
    gesture: str,
    emotion: str,
    attention: Optional[int],
    voice_state: str,
    metrics: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Fuses gesture, expression, attention, speech commands, and audio tone metrics
    into a structured action plan and priority queue.
    """
    title = "Maintain ready state"
    reason = (
        "NeuroSync is monitoring gesture, emotion, voice, and analytics streams while "
        "waiting for a higher-confidence action trigger."
    )
    confidence = 0.32
    mode = "Observation"
    queue: List[str] = []

    # Extract audio tone metrics sent from frontend client
    tone_pitch = 0.0
    tone_jitter = 0.0
    tone_energy = 0.0
    if metrics:
        tone_pitch = float(metrics.get("tonePitch", 0.0))
        tone_jitter = float(metrics.get("toneJitter", 0.0))
        tone_energy = float(metrics.get("audioSpeechEnergy", 0.0)) / 100.0  # normalize back to 0.0 - 1.0

    # Analyze voice tone heuristics
    tone_analysis = analyze_voice_tone(tone_pitch, tone_jitter, tone_energy)
    tone_profile = tone_analysis["profile"]

    # --- 1. Gesture Intention Mapping ---
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

    # --- 2. Advanced Multimodal Behavior Fusion (Face + Voice Tone) ---
    if emotion == "Stressed" and tone_profile == "Stressed":
        title = "Critical stress intervention triggered"
        reason = "Both facial brow-furrowing and vocal tension verify high cognitive pressure. Transitioning to Calm Lavender theme."
        confidence += 0.32
        mode = "Critical Stress Intervention"
        queue.insert(0, "Initiate mandatory 5-minute deep breathing sequence immediately.")
    elif emotion == "Stressed" or tone_profile == "Stressed":
        title = "Alleviate workload pressure"
        reason = "Stress cues detected in either facial expressions or speech pitch. Suggesting breathing breaks."
        confidence += 0.18
        mode = "Stamina Buffer"
        queue.insert(0, "Suggest a 5-minute tactical breathing exercise.")

    elif emotion == "Tired" and tone_profile == "Tired":
        title = "Mandatory recovery break recommended"
        reason = "Severe fatigue verified by both drooped eyelids and flat vocal energy. A recovery block is critical."
        confidence += 0.28
        mode = "Mandatory Recovery"
        queue.insert(0, "Pause active dashboard work and suggest standing up to stretch.")
    elif emotion == "Tired" or tone_profile == "Tired":
        title = "Trigger recovery recommendation"
        reason = "Vocal energy depletion or facial fatigue indicators suggest stamina is dropping. Transitioning to Calm mode."
        confidence += 0.18
        mode = "Recovery"
        queue.insert(0, "Offer a quick break and summarize only the highest-priority action.")

    elif emotion == "Excited" or tone_profile == "Excited":
        title = "Harness peak energy window"
        reason = "High vocal pitch modulation or expressions of positive energy suggest prime creative focus."
        confidence += 0.22
        mode = "Peak Stamina"
        queue.insert(0, "Surface the highest-priority creative backlog item.")

    elif emotion == "Distracted" or tone_profile == "Alert":
        title = "Redirect focus to active task"
        reason = "Gaze deviation or vocal alerts indicate attention is slipping from active workspace cards."
        confidence += 0.15
        mode = "Focus Rescue"
        queue.insert(0, "Activate deep-work notifications suppression.")

    elif emotion == "Focused" and attention and attention > 70:
        title = "Preserve deep-work flow"
        reason = "High attention with a focused expression suggests flow state. Reduce interruptions."
        confidence += 0.16
        mode = "Focus Preservation"
        queue.insert(0, "Suppress non-essential prompts and show one decisive recommendation.")

    elif emotion == "Engaged":
        title = "Amplify active workspace support"
        reason = "Movement and attention cues suggest active workspace interaction."
        confidence += 0.14
        mode = "Active Support"
        queue.insert(0, "Keep controls visible and prioritize immediate dashboard feedback.")

    # --- 3. CSV Analytics Metrics Fusion ---
    if metrics:
        trend = metrics.get("trendLabel", "Stable")
        average_focus = float(metrics.get("averageFocus", 0))
        risk_score = float(metrics.get("riskScore", 0))
        model_confidence = float(metrics.get("modelConfidence", 0))
        
        # Audio / Video signal quality metrics passed from client
        audio_noise_floor = float(metrics.get("audioNoiseFloor", 0))
        camera_fallback = bool(metrics.get("cameraFallback", False))
        has_active_perception = bool(metrics.get("hasActivePerception", True))

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

        # Dynamic confidence dampening on backend
        if audio_noise_floor > 0.16:
            confidence -= 0.15
        if camera_fallback:
            confidence -= 0.1
        if not has_active_perception and gesture == "Idle" and emotion == "Neutral":
            confidence -= 0.05

    if voice_state == "Command":
        confidence += 0.08
        queue.insert(0, "Honor the most recent voice command before lower-priority suggestions.")

    if not queue:
        queue = [
            "Await stronger multimodal intent before changing the interface.",
            "Continue updating gesture, emotion, and forecast confidence.",
        ]

    # Include voice tone details in the returned structure for download logs
    result = {
        "title": title,
        "reason": reason,
        "confidence": max(0.05, min(0.96, confidence)),
        "mode": mode,
        "queue": queue[:4],
    }
    return result
