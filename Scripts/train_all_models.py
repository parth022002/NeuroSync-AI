from __future__ import annotations

from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from Ai_models.baseline_models import load_dataset, train_baseline_models
from Ai_models.lstm_placeholder import moving_average_forecast


DATA_PATH = PROJECT_ROOT / "Data" / "sample_productivity.csv"
MODEL_OUTPUT_DIR = PROJECT_ROOT / "Ai_models" / "trained"


def main() -> None:
    dataframe = load_dataset(DATA_PATH)
    metrics = train_baseline_models(dataframe, MODEL_OUTPUT_DIR)
    lstm_forecast = moving_average_forecast(dataframe["productivity_score"].tolist())

    print("NeuroSync training summary")
    print(f"  Dataset rows: {len(dataframe)}")
    print(f"  Linear Regression MAE: {metrics['linear_mae']:.3f}")
    print(f"  Linear Regression R2: {metrics['linear_r2']:.3f}")
    print(f"  Random Forest MAE: {metrics['forest_mae']:.3f}")
    print(f"  Random Forest R2: {metrics['forest_r2']:.3f}")
    print(f"  Placeholder LSTM forecast: {lstm_forecast:.2f}")
    print(f"  Saved models: {MODEL_OUTPUT_DIR}")


if __name__ == "__main__":
    main()
