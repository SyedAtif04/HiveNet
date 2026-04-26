"""
Temporal Fusion Transformer (TFT) demand forecasting.

Requires heavy optional dependencies:
    pip install torch pytorch-forecasting pytorch-lightning

is_available() returns False until those packages are installed.
All other code in logbot works without them.
"""

from typing import List, Dict, Any, Optional

try:
    import torch
    from pytorch_forecasting import TemporalFusionTransformer, TimeSeriesDataSet
    from pytorch_forecasting.metrics import QuantileLoss
    _TFT_AVAILABLE = True
except ImportError:
    _TFT_AVAILABLE = False


def is_available() -> bool:
    """Return True when PyTorch + pytorch-forecasting are installed."""
    return _TFT_AVAILABLE


def forecast_tft(
    records: List[Dict],          # [{"date": "YYYY-MM-DD", "value": float, "sku_id": str}, ...]
    steps: int,
    max_epochs: int = 50,
    learning_rate: float = 0.03,
    hidden_size: int = 64,
    attention_head_size: int = 4,
    dropout: float = 0.1,
    hidden_continuous_size: int = 32,
) -> Dict[str, Any]:
    """
    Train a Temporal Fusion Transformer and forecast `steps` periods ahead.

    Args:
        records: List of dicts with "date", "value", "sku_id".
        steps: Forecast horizon (number of periods).
        max_epochs: Training epochs.
        learning_rate: Initial learning rate.
        hidden_size: TFT hidden state dimension.
        attention_head_size: Number of attention heads.
        dropout: Dropout rate.
        hidden_continuous_size: Hidden size for continuous variable processing.

    Returns:
        {"forecast": [...], "method": "tft", "steps": int, "model_params": {...}}

    Raises:
        ImportError: If torch / pytorch-forecasting are not installed.
    """
    if not _TFT_AVAILABLE:
        raise ImportError(
            "TFT requires torch and pytorch-forecasting. "
            "Install with:\n  pip install torch pytorch-forecasting pytorch-lightning"
        )

    import pandas as pd
    import pytorch_lightning as pl
    from torch.utils.data import DataLoader

    df = pd.DataFrame(records)
    df["ds"] = pd.to_datetime(df["date"])
    df = df.sort_values("ds").reset_index(drop=True)
    df["time_idx"] = (df["ds"] - df["ds"].min()).dt.days
    df["sku_id"] = df["sku_id"].astype(str)
    df["value"] = df["value"].astype(float)

    max_encoder_length = min(len(df) // 2, 60)
    max_prediction_length = steps

    training_cutoff = df["time_idx"].max() - max_prediction_length

    training = TimeSeriesDataSet(
        df[df["time_idx"] <= training_cutoff],
        time_idx="time_idx",
        target="value",
        group_ids=["sku_id"],
        min_encoder_length=max_encoder_length // 2,
        max_encoder_length=max_encoder_length,
        min_prediction_length=1,
        max_prediction_length=max_prediction_length,
        time_varying_unknown_reals=["value"],
        add_relative_time_idx=True,
        add_target_scales=True,
        add_encoder_length=True,
    )

    validation = TimeSeriesDataSet.from_dataset(training, df, predict=True, stop_randomization=True)
    train_dl = DataLoader(training, batch_size=32, shuffle=True, num_workers=0)
    val_dl = DataLoader(validation, batch_size=32, shuffle=False, num_workers=0)

    tft = TemporalFusionTransformer.from_dataset(
        training,
        learning_rate=learning_rate,
        hidden_size=hidden_size,
        attention_head_size=attention_head_size,
        dropout=dropout,
        hidden_continuous_size=hidden_continuous_size,
        output_size=7,
        loss=QuantileLoss(),
        reduce_on_plateau_patience=4,
    )

    trainer = pl.Trainer(
        max_epochs=max_epochs,
        gradient_clip_val=0.1,
        enable_progress_bar=True,
        logger=False,
    )
    trainer.fit(tft, train_dl, val_dl)

    predictions = tft.predict(val_dl, return_y=True)
    forecast_vals = predictions.output[0].numpy().flatten().tolist()

    return {
        "forecast": [max(0.0, float(v)) for v in forecast_vals[:steps]],
        "method": "tft",
        "steps": steps,
        "model_params": {
            "hidden_size": hidden_size,
            "attention_head_size": attention_head_size,
            "max_epochs": max_epochs,
            "learning_rate": learning_rate,
        },
    }
