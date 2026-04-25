from __future__ import annotations

from math import exp, sqrt
from typing import Any, Dict, List, Tuple


def analyze_rows(rows: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], List[str]]:
    if not rows:
        return {}, ["Upload data to unlock KPI summaries, forecasts, and behavior insights."]

    columns = list(rows[0].keys())
    numeric_columns = [column for column in columns if any(is_finite_number(row.get(column)) for row in rows)]

    date_column = select_column(columns, ["date", "time", "timestamp", "day"])
    focus_column = select_column(numeric_columns, ["focus", "attention", "concentration"])
    productivity_column = select_column(numeric_columns, ["productivity", "efficiency", "output"])
    emotion_column = select_column(numeric_columns, ["emotion", "sentiment", "mood"])
    task_column = select_column(numeric_columns, ["task", "completed", "deliverable"])

    focus_series = build_numeric_series(rows, focus_column)
    productivity_series = build_numeric_series(rows, productivity_column)
    emotion_series = build_numeric_series(rows, emotion_column)
    task_series = build_numeric_series(rows, task_column)

    average_focus = safe_average(focus_series)
    average_productivity = safe_average(productivity_series)
    average_emotion = safe_average(emotion_series)
    average_tasks = safe_average(task_series)
    slope = calculate_slope(productivity_series)
    ema_series = exponential_smoothing(productivity_series, 0.42)
    ema_next = forecast_ema(productivity_series)
    linear_next = clamp(average_productivity + slope * 1.25, 0.0, 100.0)
    momentum_next = forecast_momentum(productivity_series)
    seasonal_next = forecast_seasonal(productivity_series)
    predicted_next = weighted_ensemble(
        [
            (linear_next, 0.28),
            (ema_next, 0.34),
            (momentum_next, 0.24),
            (seasonal_next, 0.14),
        ]
    )
    volatility = calculate_std_dev(productivity_series)
    anomaly_indexes = detect_anomalies(productivity_series)
    anomalies = len(anomaly_indexes)
    correlation = calculate_correlation(focus_series, productivity_series)
    focus_productivity_fit = sigmoid(correlation * 2.4)
    risk_score = clamp(volatility * 3.1 + anomalies * 8.5 - slope * 2.2 + max(0.0, 70.0 - average_focus) * 0.35, 0.0, 100.0)
    model_confidence = clamp(92.0 - volatility * 2.4 - anomalies * 5.0 + min(len(rows), 30) * 0.45, 42.0, 96.0)
    signal_quality = "High" if model_confidence >= 78 else "Medium" if model_confidence >= 60 else "Low"

    metrics = {
        "rowCount": len(rows),
        "columns": columns,
        "dateColumn": date_column,
        "focusColumn": focus_column,
        "productivityColumn": productivity_column,
        "emotionColumn": emotion_column,
        "taskColumn": task_column,
        "averageFocus": average_focus,
        "averageProductivity": average_productivity,
        "averageEmotion": average_emotion,
        "averageTasks": average_tasks,
        "predictedNext": predicted_next,
        "linearForecast": linear_next,
        "emaForecast": ema_next,
        "momentumForecast": momentum_next,
        "seasonalForecast": seasonal_next,
        "emaSeries": ema_series,
        "slope": slope,
        "volatility": volatility,
        "anomalies": anomalies,
        "anomalyIndexes": anomaly_indexes,
        "correlation": correlation,
        "focusProductivityFit": focus_productivity_fit,
        "riskScore": risk_score,
        "modelConfidence": model_confidence,
        "signalQuality": signal_quality,
        "analysisModels": [
            "Weighted ensemble forecast",
            "Exponential smoothing",
            "Momentum regression",
            "Seasonal naive baseline",
            "Z-score anomaly detection",
            "Correlation risk scoring",
        ],
        "trendLabel": "Climbing" if slope > 1.3 else "Cooling" if slope < -1.3 else "Stable",
    }

    correlation_label = "strong" if correlation > 0.45 else "moderate" if correlation > 0.18 else "weak"
    stability_label = "steady" if volatility < 6 else "dynamic" if volatility < 11 else "highly variable"

    insights = [
        f"Productivity is {metrics['trendLabel'].lower()} with a projected next-window score of {round(predicted_next)}%.",
        f"Ensemble confidence is {round(model_confidence)}% with {signal_quality.lower()} signal quality and risk at {round(risk_score)}%.",
        f"Focus averages {round(average_focus)}% and shows a {correlation_label} relationship with productivity.",
        f"Operational rhythm appears {stability_label}, with {anomalies} {'anomaly' if anomalies == 1 else 'anomalies'} detected across the series.",
        f"Average mood signal is {round(average_emotion)}% while throughput averages {average_tasks:.1f} completed tasks per interval.",
    ]
    return metrics, insights


def select_column(columns: List[str], candidates: List[str]) -> str:
    if not columns:
        return ""
    normalized = [(column, column.lower()) for column in columns]
    for candidate in candidates:
        for original, lowered in normalized:
            if candidate in lowered:
                return original
    return columns[0]


def numeric_value(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return float("nan")
    cleaned = "".join(char for char in value if char.isdigit() or char in ".-")
    try:
        return float(cleaned)
    except ValueError:
        return float("nan")


def is_finite_number(value: Any) -> bool:
    parsed = numeric_value(value)
    return parsed == parsed and parsed not in (float("inf"), float("-inf"))


def build_numeric_series(rows: List[Dict[str, Any]], column: str) -> List[float]:
    last_valid = 0.0
    values: List[float] = []
    for row in rows:
        parsed = numeric_value(row.get(column))
        if is_finite_number(parsed):
            last_valid = float(parsed)
        values.append(last_valid)
    return values


def safe_average(values: List[float]) -> float:
    usable = [value for value in values if is_finite_number(value)]
    if not usable:
        return 0.0
    return sum(usable) / len(usable)


def calculate_slope(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    count = len(values)
    x_mean = (count - 1) / 2
    y_mean = safe_average(values)
    numerator = 0.0
    denominator = 0.0
    for index, value in enumerate(values):
        numerator += (index - x_mean) * (value - y_mean)
        denominator += (index - x_mean) ** 2
    return numerator / denominator if denominator else 0.0


def calculate_std_dev(values: List[float]) -> float:
    mean = safe_average(values)
    variance = safe_average([(value - mean) ** 2 for value in values])
    return sqrt(variance)


def exponential_smoothing(values: List[float], alpha: float) -> List[float]:
    if not values:
        return []
    smoothed = [values[0]]
    for value in values[1:]:
        smoothed.append(alpha * value + (1 - alpha) * smoothed[-1])
    return smoothed


def forecast_ema(values: List[float]) -> float:
    if not values:
        return 0.0
    smoothed = exponential_smoothing(values, 0.42)
    momentum = values[-1] - smoothed[-1]
    return clamp(smoothed[-1] + momentum * 0.35, 0.0, 100.0)


def forecast_momentum(values: List[float]) -> float:
    if not values:
        return 0.0
    if len(values) < 4:
        return clamp(values[-1], 0.0, 100.0)
    recent = values[-4:]
    recent_slope = calculate_slope(recent)
    return clamp(values[-1] + recent_slope, 0.0, 100.0)


def forecast_seasonal(values: List[float]) -> float:
    if not values:
        return 0.0
    if len(values) >= 7:
        return clamp((values[-1] * 0.62) + (values[-7] * 0.38), 0.0, 100.0)
    return clamp((values[-1] + safe_average(values)) / 2, 0.0, 100.0)


def weighted_ensemble(values: List[Tuple[float, float]]) -> float:
    total_weight = sum(weight for _, weight in values) or 1.0
    return clamp(sum(value * weight for value, weight in values) / total_weight, 0.0, 100.0)


def detect_anomalies(values: List[float]) -> List[int]:
    if len(values) < 4:
        return []
    mean = safe_average(values)
    std_dev = calculate_std_dev(values) or 1.0
    return [
        index
        for index, value in enumerate(values)
        if abs((value - mean) / std_dev) >= 1.65 and abs(value - mean) >= 7.0
    ]


def sigmoid(value: float) -> float:
    return 1.0 / (1.0 + exp(-value))


def calculate_correlation(left: List[float], right: List[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    left_mean = safe_average(left)
    right_mean = safe_average(right)
    numerator = 0.0
    left_variance = 0.0
    right_variance = 0.0
    for left_value, right_value in zip(left, right):
        left_delta = left_value - left_mean
        right_delta = right_value - right_mean
        numerator += left_delta * right_delta
        left_variance += left_delta ** 2
        right_variance += right_delta ** 2
    denominator = sqrt(left_variance * right_variance) or 1.0
    return numerator / denominator


def clamp(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))
