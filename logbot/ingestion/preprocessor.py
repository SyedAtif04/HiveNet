"""CSV loading, cleaning, and daily aggregation."""

import pandas as pd
from pathlib import Path
from typing import Union

from .config import COLUMN_RENAMES, PII_COLUMNS, NOISE_COLUMNS, EXCLUDE_ORDER_STATUSES


def load_and_clean(csv_path: Union[str, Path]) -> pd.DataFrame:
    """
    Load a CSV, drop PII/noise columns, filter bad rows, and rename
    columns to internal names. Returns a transaction-level DataFrame.
    """
    try:
        df = pd.read_csv(str(csv_path), encoding='utf-8', low_memory=False)
    except UnicodeDecodeError:
        df = pd.read_csv(str(csv_path), encoding='latin1', low_memory=False)

    # Drop PII and noise columns (silently skip if absent)
    drop_cols = [c for c in PII_COLUMNS + NOISE_COLUMNS if c in df.columns]
    df = df.drop(columns=drop_cols)

    # Rename to internal names (only rename columns that exist)
    rename_map = {k: v for k, v in COLUMN_RENAMES.items() if k in df.columns}
    df = df.rename(columns=rename_map)

    # Filter out bad order statuses
    if 'order_status' in df.columns:
        df = df[~df['order_status'].isin(EXCLUDE_ORDER_STATUSES)]

    # Filter: positive quantity
    if 'quantity_used' in df.columns:
        df['quantity_used'] = pd.to_numeric(df['quantity_used'], errors='coerce')
        df = df[df['quantity_used'] > 0]

    # Filter: non-null SKU name
    if 'sku_name' in df.columns:
        df = df[df['sku_name'].notna() & (df['sku_name'].astype(str) != '')]

    # Parse dates → normalize to midnight
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(
            df['date'], format='mixed', dayfirst=False, errors='coerce'
        )
        df = df[df['date'].notna()]
        df['date'] = df['date'].dt.floor('D')

    # Numeric casts
    for col in ('lead_time_days', 'lead_time_scheduled'):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(7).astype(int)

    if 'unit_price' in df.columns:
        df['unit_price'] = pd.to_numeric(df['unit_price'], errors='coerce').fillna(0.0)

    if 'late_delivery_risk' in df.columns:
        df['late_delivery_risk'] = (
            pd.to_numeric(df['late_delivery_risk'], errors='coerce').fillna(0).astype(int)
        )

    if 'profit_ratio' in df.columns:
        df['profit_ratio'] = pd.to_numeric(df['profit_ratio'], errors='coerce').fillna(0.0)

    # Fill categorical nulls
    for col in ('category', 'department', 'region', 'shipping_mode', 'delivery_status'):
        if col in df.columns:
            df[col] = df[col].fillna('Unknown')

    return df.reset_index(drop=True)


def aggregate_daily(df: pd.DataFrame) -> pd.DataFrame:
    """
    Collapse transaction-level rows to one row per (date, SKU).
    Quantities are summed; prices and lead times are averaged.
    """
    agg: dict = {'quantity_used': 'sum'}

    # Optional columns — aggregate only if present
    for col, method in [
        ('unit_price', 'mean'),
        ('lead_time_days', 'mean'),
        ('late_delivery_risk', 'max'),
        ('category', 'first'),
        ('department', 'first'),
        ('region', 'first'),
        ('shipping_mode', 'first'),
        ('profit_ratio', 'mean'),
    ]:
        if col in df.columns:
            agg[col] = method

    df_daily = (
        df.groupby(['date', 'sku_name'], as_index=False)
        .agg(agg)
        .sort_values(['sku_name', 'date'])
        .reset_index(drop=True)
    )

    if 'lead_time_days' in df_daily.columns:
        df_daily['lead_time_days'] = df_daily['lead_time_days'].round(1)

    return df_daily
