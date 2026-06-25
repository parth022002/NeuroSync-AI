from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score


FEATURE_COLUMNS = [
    "focus_score",
    "emotion_score",
    "tasks_completed",
    "time_index",
    "productivity_lag_1",
    "focus_rolling_mean_3",
    "productivity_rolling_mean_3"
]
TARGET_COLUMN = "productivity_score"


def load_dataset(csv_path: str | Path) -> pd.DataFrame:
    dataframe = pd.read_csv(csv_path)
    dataframe = dataframe.copy()
    dataframe["time_index"] = range(len(dataframe))
    
    # Feature engineering: lag features
    dataframe["productivity_lag_1"] = dataframe["productivity_score"].shift(1).bfill().fillna(0.0)
    
    # Feature engineering: rolling window averages
    dataframe["focus_rolling_mean_3"] = dataframe["focus_score"].rolling(window=3, min_periods=1).mean()
    dataframe["productivity_rolling_mean_3"] = dataframe["productivity_score"].rolling(window=3, min_periods=1).mean()
    
    return dataframe


def train_baseline_models(dataframe: pd.DataFrame, output_dir: str | Path) -> dict[str, float]:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    features = dataframe[FEATURE_COLUMNS]
    target = dataframe[TARGET_COLUMN]

    # Perform Train-Test Split (80% Train, 20% Test)
    # Since this is time-series-like, we avoid shuffling to respect sequential ordering
    x_train, x_test, y_train, y_test = train_test_split(
        features, target, test_size=0.2, shuffle=False
    )

    linear_model = LinearRegression()
    linear_model.fit(x_train, y_train)
    linear_train_preds = linear_model.predict(x_train)
    linear_test_preds = linear_model.predict(x_test)

    forest_model = RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        max_depth=6,
    )
    forest_model.fit(x_train, y_train)
    forest_train_preds = forest_model.predict(x_train)
    forest_test_preds = forest_model.predict(x_test)

    joblib.dump(linear_model, output_path / "productivity_linear.joblib")
    joblib.dump(forest_model, output_path / "productivity_forest.joblib")

    return {
        "linear_mae": float(mean_absolute_error(y_train, linear_train_preds)),
        "linear_r2": float(r2_score(y_train, linear_train_preds)),
        "linear_test_mae": float(mean_absolute_error(y_test, linear_test_preds)),
        "linear_test_r2": float(r2_score(y_test, linear_test_preds)),
        
        "forest_mae": float(mean_absolute_error(y_train, forest_train_preds)),
        "forest_r2": float(r2_score(y_train, forest_train_preds)),
        "forest_test_mae": float(mean_absolute_error(y_test, forest_test_preds)),
        "forest_test_r2": float(r2_score(y_test, forest_test_preds)),
    }
