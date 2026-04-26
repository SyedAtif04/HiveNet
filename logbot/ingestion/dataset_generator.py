"""Generate ML-ready CSV splits from the daily-aggregated demand DataFrame."""

import pandas as pd
from typing import Dict

from .config import ML_DATA_DIR


def write_ml_datasets(df_daily: pd.DataFrame) -> Dict[str, str]:
    """
    Write three CSV files to prisma_forecast/data/:
      ml_train.csv        — first 80% of date range
      ml_test.csv         — last 20% of date range
      ml_forecast_input.csv — last min(90, n_dates) dates (for predict CLI)

    Column order: date, quantity_used, material, <feature cols>
    The 'material' column (= sku_name) enables --group-by material in the CLI.
    """
    ml_df = df_daily.copy()

    # Rename sku_name → material (matches --group-by material)
    if 'sku_name' in ml_df.columns:
        ml_df = ml_df.rename(columns={'sku_name': 'material'})

    # Date as YYYY-MM-DD string (what the ML pipeline expects)
    ml_df['date'] = pd.to_datetime(ml_df['date']).dt.strftime('%Y-%m-%d')

    # Drop columns the ML pipeline doesn't need
    drop_cols = [
        c for c in ('department', 'category', 'lead_time_scheduled',
                    'profit_ratio', 'order_status')
        if c in ml_df.columns
    ]
    ml_df = ml_df.drop(columns=drop_cols)

    # Canonical column order
    priority = ['date', 'quantity_used', 'material']
    feature_cols = [c for c in ml_df.columns if c not in priority]
    ml_df = ml_df[priority + feature_cols]

    ml_df = ml_df.sort_values(['date', 'material']).reset_index(drop=True)

    # Chronological time split
    unique_dates = sorted(ml_df['date'].unique())
    n_dates = len(unique_dates)
    split_idx = max(1, int(n_dates * 0.8))
    split_date = unique_dates[split_idx - 1]

    train_df = ml_df[ml_df['date'] <= split_date]
    test_df = ml_df[ml_df['date'] > split_date]

    # Forecast input: last min(90, n_dates) distinct dates
    forecast_days = min(90, n_dates)
    forecast_start = unique_dates[-forecast_days]
    forecast_df = ml_df[ml_df['date'] >= forecast_start]

    # Write files
    ML_DATA_DIR.mkdir(parents=True, exist_ok=True)
    train_path = ML_DATA_DIR / 'ml_train.csv'
    test_path = ML_DATA_DIR / 'ml_test.csv'
    forecast_path = ML_DATA_DIR / 'ml_forecast_input.csv'

    train_df.to_csv(train_path, index=False)
    test_df.to_csv(test_path, index=False)
    forecast_df.to_csv(forecast_path, index=False)

    return {
        'train': str(train_path),
        'test': str(test_path),
        'forecast_input': str(forecast_path),
    }
