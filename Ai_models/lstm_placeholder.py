from __future__ import annotations

from typing import Iterable


def moving_average_forecast(values: Iterable[float], window: int = 3) -> float:
    series = [float(value) for value in values]
    if not series:
        return 0.0
    if len(series) < window:
        return sum(series) / len(series)
    tail = series[-window:]
    return sum(tail) / len(tail)
