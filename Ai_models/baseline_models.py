from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score


FEATURE_COLUMNS = ["focus_score", "emotion_score", "tasks_completed", "time_index"]
TARGET_COLUMN = "productivity_score"


def load_dataset(csv_path: str | Path) -> pd.DataFrame:
    dataframe = pd.read_csv(csv_path)
    dataframe = dataframe.copy()
    dataframe["time_index"] = range(len(dataframe))
    return dataframe


def train_baseline_models(dataframe: pd.DataFrame, output_dir: str | Path) -> dict[str, float]:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    features = dataframe[FEATURE_COLUMNS]
    target = dataframe[TARGET_COLUMN]

    linear_model = LinearRegression()
    linear_model.fit(features, target)
    linear_predictions = linear_model.predict(features)

    forest_model = RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        max_depth=6,
    )
    forest_model.fit(features, target)
    forest_predictions = forest_model.predict(features)

    joblib.dump(linear_model, output_path / "productivity_linear.joblib")
    joblib.dump(forest_model, output_path / "productivity_forest.joblib")

    return {
        "linear_mae": float(mean_absolute_error(target, linear_predictions)),
        "linear_r2": float(r2_score(target, linear_predictions)),
        "forest_mae": float(mean_absolute_error(target, forest_predictions)),
        "forest_r2": float(r2_score(target, forest_predictions)),
    }
