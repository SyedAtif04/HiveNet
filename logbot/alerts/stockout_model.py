"""
Out-of-stock probability prediction using Logistic Regression.

Features per SKU:
  current_qty, avg_daily_demand, lead_time_days, safety_stock,
  reorder_point, days_since_last_reorder, demand_std
"""

import numpy as np
import joblib
from pathlib import Path
from typing import Dict, List

MODEL_PATH = Path(__file__).parent.parent / "data" / "stockout_model.pkl"

_FEATURE_KEYS = [
    "current_qty",
    "avg_daily_demand",
    "lead_time_days",
    "safety_stock",
    "reorder_point",
    "days_since_last_reorder",
    "demand_std",
]


def _to_features(item: Dict) -> List[float]:
    return [float(item.get(k, 0)) for k in _FEATURE_KEYS]


def train_stockout_model(training_data: List[Dict]) -> Dict:
    """
    Train a Logistic Regression stockout classifier.

    Each record in training_data must include the feature keys above
    plus "stockout_occurred" (1 = stockout happened, 0 = did not).

    Saves the pipeline to disk and returns a summary dict.
    """
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    from sklearn.model_selection import cross_val_score

    X = np.array([_to_features(d) for d in training_data])
    y = np.array([int(d["stockout_occurred"]) for d in training_data])

    if len(np.unique(y)) < 2:
        raise ValueError("Training data must contain both stockout (1) and non-stockout (0) examples.")

    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("lr", LogisticRegression(max_iter=1000, class_weight="balanced", C=1.0)),
    ])
    pipe.fit(X, y)

    cv_scores = cross_val_score(pipe, X, y, cv=min(5, len(y)), scoring="roc_auc")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, MODEL_PATH)

    return {
        "status": "trained",
        "n_samples": len(y),
        "positive_rate": float(y.mean()),
        "cv_roc_auc_mean": round(float(cv_scores.mean()), 4),
        "cv_roc_auc_std": round(float(cv_scores.std()), 4),
        "model_path": str(MODEL_PATH),
    }


def predict_stockout_probability(item: Dict) -> float:
    """
    Return the probability (0–1) of stockout for the given inventory item.
    Returns -1.0 when no trained model exists yet.
    """
    if not MODEL_PATH.exists():
        return -1.0

    pipe = joblib.load(MODEL_PATH)
    features = np.array([_to_features(item)])
    prob = pipe.predict_proba(features)[0][1]
    return round(float(prob), 4)
