from __future__ import annotations

from typing import Any, Dict


def analyze_voice_tone(pitch: float, jitter: float, energy: float) -> Dict[str, Any]:
    """
    Analyzes physical voice metrics to classify emotional arousal and stress levels.
    
    Parameters:
        pitch (float): Approximated fundamental frequency (Hz).
        jitter (float): Frequency instability / variance.
        energy (float): Normalized amplitude / speech volume.
    
    Returns:
        Dict containing tone profile label, explanation, and arousal level.
    """
    # Default values
    profile = "Calm"
    explanation = "Speech pattern suggests stable, relaxed, and balanced baseline state."
    arousal = 0.35

    # Check active speech indicators
    if energy < 0.05:
        return {
            "profile": "Silent",
            "explanation": "No active voice activity detected in the local microphone capture.",
            "arousal": 0.0,
        }

    # Heuristic classifications based on pitch and variation
    if pitch > 200:
        # High Pitch indicators
        if jitter > 0.08:
            profile = "Excited"
            explanation = "High vocal pitch combined with high frequency jitter indicates excitement or animated discussion."
            arousal = 0.85
        elif energy > 0.35:
            profile = "Stressed"
            explanation = "Elevated fundamental frequency with compressed variation suggests stress or defensive tension cues."
            arousal = 0.78
        else:
            profile = "Alert"
            explanation = "Elevated voice pitch suggests heightened responsiveness or active focus."
            arousal = 0.6
    elif pitch > 80:
        # Moderate Pitch indicators
        if jitter > 0.08:
            profile = "Expressive"
            explanation = "Standard vocal pitch with dynamic modulation indicates collaborative or engaging discourse."
            arousal = 0.65
        elif energy > 0.35:
            profile = "Assertive"
            explanation = "Balanced speech frequencies with high energy indicates confidence or directive communication."
            arousal = 0.7
        else:
            profile = "Calm"
            explanation = "Steady pitch and stable volume suggest a relaxed, focused, and calm baseline."
            arousal = 0.35
    else:
        # Low Pitch indicators (under 80Hz is extremely low / monotonic)
        if energy < 0.15:
            profile = "Tired"
            explanation = "Low pitch coupled with weak voice energy suggests physical fatigue, low stamina, or sleepiness."
            arousal = 0.15
        else:
            profile = "Steady"
            explanation = "Low, steady fundamental pitch suggests controlled, strategic, or solemn voice output."
            arousal = 0.3

    return {
        "profile": profile,
        "explanation": explanation,
        "arousal": arousal,
        "pitch": pitch,
        "jitter": jitter,
        "energy": energy,
    }
