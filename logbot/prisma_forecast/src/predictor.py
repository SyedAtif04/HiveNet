"""
Prediction pipeline for PRISMA - Generate iterative future forecasts
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import timedelta
import lightgbm as lgb
from sklearn.preprocessing import LabelEncoder
import json
import warnings

from data_utils import TIME_COLUMN, TARGET_COLUMN, get_feature_columns, preprocess_data
from features import prepare_features, create_calendar_features

warnings.filterwarnings('ignore')


def generate_iterative_forecast(
    df: pd.DataFrame,
    lgb_model: lgb.Booster,
    prophet_model: Optional[any],
    encoders: Dict[str, LabelEncoder],
    feature_names: List[str],
    horizon: int = 30,
    series_col: Optional[str] = None,
    series_value: Optional[str] = None,
    feature_schema: Optional[Dict] = None,
    pca_model: Optional[any] = None,
    history_days: int = 90,
    n_bootstrap: int = 100
) -> List[Dict]:
    """
    Generate iterative future demand forecasts using LightGBM with bootstrap ensemble
    Uses predictions as features for subsequent predictions and computes confidence intervals

    Args:
        df: Historical data (recent history)
        lgb_model: Trained LightGBM model
        prophet_model: Not used (kept for compatibility)
        encoders: Label encoders for categorical features
        feature_names: List of feature names
        horizon: Number of days to forecast
        series_col: Column name for series (e.g., 'material')
        series_value: Specific series value to forecast
        feature_schema: Optional feature selection schema
        pca_model: Optional PCA model for dimensionality reduction
        history_days: Number of recent days to use for forecasting (default: 90)
        n_bootstrap: Number of bootstrap samples for confidence intervals (default: 100)

    Returns:
        List of prediction dictionaries with y_lower and y_upper
    """
    print(f"   Generating iterative forecasts for {horizon} days...")

    if feature_schema:
        print(f"   [*] Using feature schema with {len(feature_schema.get('selected_features', []))} selected features")
    if pca_model:
        print(f"   [*] Using PCA model with {pca_model.n_components_} components")

    # Make a copy to avoid modifying original
    df_work = df.copy()

    # Ensure date column is datetime
    df_work[TIME_COLUMN] = pd.to_datetime(df_work[TIME_COLUMN])

    # Sort by date
    df_work = df_work.sort_values(TIME_COLUMN)

    # Get the last date in the dataset
    last_date = df_work[TIME_COLUMN].max()
    print(f"   Last date in data: {last_date}")

    # Use only last history_days rows for forecasting
    if len(df_work) > history_days:
        history_df = df_work.tail(history_days).copy()
        print(f"   Using last {history_days} days of history ({len(history_df)} rows)")
    else:
        history_df = df_work.copy()
        print(f"   Using all {len(history_df)} rows of history")

    # Generate future dates
    future_dates = pd.date_range(
        start=last_date + timedelta(days=1),
        periods=horizon,
        freq='D'
    )
    print(f"   Forecast period: {future_dates[0]} to {future_dates[-1]}")

    # Bootstrap ensemble for confidence intervals
    print(f"   Running bootstrap ensemble ({n_bootstrap} iterations)...")
    all_bootstrap_predictions = []

    for bootstrap_iter in range(n_bootstrap):
        # Sample with replacement from history
        bootstrap_history = history_df.sample(n=len(history_df), replace=True).sort_values(TIME_COLUMN)

        # LightGBM iterative predictions for this bootstrap sample
        lgb_predictions = []
        bootstrap_df = bootstrap_history.copy()

        for i, future_date in enumerate(future_dates):
            # Create future row based on last known values
            future_row = bootstrap_df.iloc[-1:].copy()
            future_row[TIME_COLUMN] = future_date

            # Update calendar features
            future_row['day_of_week'] = future_date.dayofweek
            future_row['month'] = future_date.month
            future_row['is_weekend'] = 1 if future_date.dayofweek >= 5 else 0
            future_row['day_of_month'] = future_date.day
            future_row['quarter'] = (future_date.month - 1) // 3 + 1
            future_row['week_of_year'] = future_date.isocalendar().week

            # Update cyclic features
            if 'month_sin' in future_row.columns:
                future_row['month_sin'] = np.sin(2 * np.pi * future_date.month / 12)
            if 'month_cos' in future_row.columns:
                future_row['month_cos'] = np.cos(2 * np.pi * future_date.month / 12)
            if 'week_sin' in future_row.columns:
                future_row['week_sin'] = np.sin(2 * np.pi * future_date.isocalendar().week / 52)
            if 'week_cos' in future_row.columns:
                future_row['week_cos'] = np.cos(2 * np.pi * future_date.isocalendar().week / 52)
            if 'day_of_week_sin' in future_row.columns:
                future_row['day_of_week_sin'] = np.sin(2 * np.pi * future_date.dayofweek / 7)
            if 'day_of_week_cos' in future_row.columns:
                future_row['day_of_week_cos'] = np.cos(2 * np.pi * future_date.dayofweek / 7)

            # Update year if it exists
            if 'year' in future_row.columns:
                future_row['year'] = future_date.year

            # Compute lag features from history + predictions
            # Lag 1: previous day's prediction (or last known value)
            if i == 0:
                lag_1_value = bootstrap_df[TARGET_COLUMN].iloc[-1]
            else:
                lag_1_value = lgb_predictions[-1]

            # Update all lag features (1, 3, 5, 7, 14, 30)
            for lag in [1, 3, 5, 7, 14, 30]:
                lag_col = f'quantity_lag_{lag}'
                if lag_col in future_row.columns:
                    if i < lag:
                        # Use historical data
                        idx = max(0, len(bootstrap_df) - (lag - i))
                        future_row[lag_col] = bootstrap_df[TARGET_COLUMN].iloc[idx]
                    else:
                        # Use previous predictions
                        future_row[lag_col] = lgb_predictions[i - lag]

            # Compute rolling features
            # Combine recent history + predictions so far
            recent_values = list(bootstrap_df[TARGET_COLUMN].tail(60).values) + lgb_predictions

            # Update rolling mean features
            for window in [7, 14, 30]:
                mean_col = f'quantity_rolling_mean_{window}'
                if mean_col in future_row.columns:
                    if len(recent_values) >= window:
                        future_row[mean_col] = np.mean(recent_values[-window:])
                    else:
                        future_row[mean_col] = np.mean(recent_values)

            # Update rolling std features
            for window in [7, 14, 30]:
                std_col = f'quantity_rolling_std_{window}'
                if std_col in future_row.columns:
                    if len(recent_values) >= window:
                        future_row[std_col] = np.std(recent_values[-window:])
                    else:
                        future_row[std_col] = np.std(recent_values)

            # Update diff features (set to 0 for future predictions)
            if 'quantity_used_diff' in future_row.columns:
                if i == 0:
                    future_row['quantity_used_diff'] = 0
                else:
                    future_row['quantity_used_diff'] = lgb_predictions[-1] - (lgb_predictions[-2] if i > 1 else bootstrap_df[TARGET_COLUMN].iloc[-1])

            # Prepare features for this single prediction
            # Set target to 0 (placeholder)
            future_row[TARGET_COLUMN] = 0

            # Extract features in the correct order
            X_future_row = []
            for feat in feature_names:
                if feat in future_row.columns:
                    val = future_row[feat].values[0]
                    # Handle categorical encoding
                    if feat in encoders:
                        # Encode categorical feature if it's a string
                        if isinstance(val, str):
                            try:
                                val = encoders[feat].transform([val])[0]
                            except ValueError:
                                # Unknown category - use a default value (0 or most common)
                                val = 0
                        X_future_row.append(val)
                    else:
                        X_future_row.append(val)
                else:
                    X_future_row.append(0)  # Missing feature

            X_future_row = np.array(X_future_row).reshape(1, -1)

            # Apply PCA transformation if PCA model exists
            if pca_model is not None:
                X_future_row = pca_model.transform(X_future_row)

            # Make prediction
            pred = lgb_model.predict(X_future_row)[0]
            pred = max(0, pred)  # Ensure non-negative
            lgb_predictions.append(pred)

        # Store this bootstrap iteration's predictions
        all_bootstrap_predictions.append(lgb_predictions)

    # Convert to numpy array: shape (n_bootstrap, horizon)
    all_bootstrap_predictions = np.array(all_bootstrap_predictions)

    print(f"   ✓ Bootstrap ensemble complete ({n_bootstrap} iterations)")

    # Compute mean prediction and confidence intervals
    mean_predictions = np.mean(all_bootstrap_predictions, axis=0)
    lower_predictions = np.percentile(all_bootstrap_predictions, 5, axis=0)  # 5th percentile
    upper_predictions = np.percentile(all_bootstrap_predictions, 95, axis=0)  # 95th percentile

    # Format output
    predictions = []
    for i, date in enumerate(future_dates):
        pred_dict = {
            'date': date.strftime('%Y-%m-%d'),
            'y_hat': float(mean_predictions[i]),
            'y_lower': float(lower_predictions[i]),
            'y_upper': float(upper_predictions[i]),
            'lgb_prediction': float(mean_predictions[i])
        }
        predictions.append(pred_dict)

    # Print summary statistics
    print(f"\n   📊 Forecast Summary:")
    print(f"      Mean predicted quantity: {np.mean(mean_predictions):.2f}")
    print(f"      Min predicted quantity: {np.min(mean_predictions):.2f}")
    print(f"      Max predicted quantity: {np.max(mean_predictions):.2f}")
    print(f"      Total predicted demand: {np.sum(mean_predictions):.2f}")
    print(f"      Avg confidence interval width: {np.mean(upper_predictions - lower_predictions):.2f}")

    return predictions



def get_last_year_values(df: pd.DataFrame, future_dates: List[str]) -> Dict[str, Optional[float]]:
    """
    Get values from the same dates last year (365 days back)

    Args:
        df: Historical dataframe with date and quantity_used columns
        future_dates: List of future date strings

    Returns:
        Dictionary mapping date -> last_year_value (or None if not available)
    """
    last_year_values = {}

    # Ensure date column is datetime
    df_copy = df.copy()
    df_copy[TIME_COLUMN] = pd.to_datetime(df_copy[TIME_COLUMN])

    for date_str in future_dates:
        future_date = pd.to_datetime(date_str)
        last_year_date = future_date - pd.Timedelta(days=365)

        # Find matching date (within 1 day tolerance)
        matching_rows = df_copy[
            (df_copy[TIME_COLUMN] >= last_year_date - pd.Timedelta(days=1)) &
            (df_copy[TIME_COLUMN] <= last_year_date + pd.Timedelta(days=1))
        ]

        if len(matching_rows) > 0:
            last_year_values[date_str] = float(matching_rows[TARGET_COLUMN].mean())
        else:
            last_year_values[date_str] = None

    return last_year_values


def get_actual_values(df: pd.DataFrame, future_dates: List[str]) -> Dict[str, Optional[float]]:
    """
    Get actual values for dates that exist in historical data

    Args:
        df: Historical dataframe with date and quantity_used columns
        future_dates: List of future date strings

    Returns:
        Dictionary mapping date -> actual_value (or None if not available)
    """
    actual_values = {}

    # Ensure date column is datetime
    df_copy = df.copy()
    df_copy[TIME_COLUMN] = pd.to_datetime(df_copy[TIME_COLUMN])

    for date_str in future_dates:
        future_date = pd.to_datetime(date_str)

        # Find matching date
        matching_rows = df_copy[df_copy[TIME_COLUMN] == future_date]

        if len(matching_rows) > 0:
            actual_values[date_str] = float(matching_rows[TARGET_COLUMN].mean())
        else:
            actual_values[date_str] = None

    return actual_values


def format_forecast_json(
    predictions: List[Dict],
    df: pd.DataFrame,
    horizon: int,
    series_col: Optional[str] = None,
    series_value: Optional[str] = None
) -> Dict:
    """
    Format predictions as JSON output (legacy format - kept for compatibility)

    Args:
        predictions: List of prediction dictionaries
        df: Original dataframe (for metadata)
        horizon: Forecast horizon
        series_col: Series column name
        series_value: Series value

    Returns:
        Formatted JSON dictionary
    """
    # Extract metadata from dataframe
    metadata = {}

    if series_col and series_col in df.columns:
        if series_value is not None:
            # Convert to native Python type
            if isinstance(series_value, (np.integer, np.floating)):
                metadata[series_col] = int(series_value)
            else:
                metadata[series_col] = str(series_value)
        else:
            val = df[series_col].iloc[-1]
            if isinstance(val, (np.integer, np.floating)):
                metadata[series_col] = int(val)
            else:
                metadata[series_col] = str(val)

    # Check for other identifying columns
    for col in ['project_id', 'region', 'supplier']:
        if col in df.columns:
            val = df[col].iloc[-1]
            if isinstance(val, (np.integer, np.floating)):
                metadata[col] = int(val)
            else:
                metadata[col] = str(val)

    # Build output JSON
    output = {
        'metadata': metadata,
        'horizon_days': horizon,
        'forecast_start': predictions[0]['date'],
        'forecast_end': predictions[-1]['date'],
        'total_predicted_demand': float(sum(p['y_hat'] for p in predictions)),
        'forecast': [
            {
                'date': p['date'],
                'y_hat': round(p['y_hat'], 2),
                'y_lower': round(p['y_lower'], 2),
                'y_upper': round(p['y_upper'], 2)
            }
            for p in predictions
        ]
    }

    return output


def format_per_group_forecast_json(
    group_forecasts: Dict[str, List[Dict]],
    df: pd.DataFrame,
    horizon: int,
    group_cols: List[str]
) -> Dict:
    """
    Format per-group forecasts into the new comprehensive JSON structure

    Args:
        group_forecasts: Dictionary mapping group_key -> predictions list
        df: Original dataframe (for metadata and historical values)
        horizon: Forecast horizon
        group_cols: List of grouping columns (e.g., ['material', 'region'])

    Returns:
        Formatted JSON dictionary with metadata, materials array, and aggregated forecast
    """
    from datetime import datetime

    # Extract top-level metadata from the most recent row
    metadata = {
        "model_version": "v1.0",
        "generated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    # Add project_id, region, supplier if available
    for col in ['project_id', 'region', 'supplier']:
        if col in df.columns:
            val = df[col].iloc[-1]
            if isinstance(val, (np.integer, np.floating)):
                metadata[col] = int(val)
            else:
                metadata[col] = str(val)

    # Get forecast dates from first group
    first_group = list(group_forecasts.values())[0]
    forecast_start = first_group[0]['date']
    forecast_end = first_group[-1]['date']

    # Build materials array
    materials = []
    all_dates = [p['date'] for p in first_group]

    for group_key, predictions in group_forecasts.items():
        # Parse group key (e.g., "material=cement_opc_53" or "material=aggregate_20mm_region=West Bengal")
        # Use same parsing logic as generate_per_group_forecasts
        group_filters = {}
        parts = group_key.split("_")
        current_col = None
        current_val_parts = []

        for part in parts:
            if "=" in part and not current_col:
                # Start of a new filter
                col, val = part.split("=", 1)
                current_col = col
                current_val_parts = [val] if val else []
            elif "=" in part and current_col:
                # New filter starts, save previous
                group_filters[current_col] = "_".join(current_val_parts)
                col, val = part.split("=", 1)
                current_col = col
                current_val_parts = [val] if val else []
            else:
                # Part of current value
                if current_col:
                    current_val_parts.append(part)

        # Save last filter
        if current_col:
            group_filters[current_col] = "_".join(current_val_parts)

        # Extract material name from group_filters
        material_name = group_filters.get('material', 'Unknown')

        # Get material-specific data from dataframe
        material_df = df.copy()
        for col, val in group_filters.items():
            if col in material_df.columns:
                material_df = material_df[material_df[col] == val]

        # Extract material metadata
        material_unit = None
        material_supplier = None
        lead_time_days = None

        if len(material_df) > 0:
            # Get unit
            if 'material_unit' in material_df.columns:
                material_unit = str(material_df['material_unit'].iloc[-1])
            elif 'unit' in material_df.columns:
                material_unit = str(material_df['unit'].iloc[-1])

            # Get supplier
            if 'supplier' in material_df.columns:
                material_supplier = str(material_df['supplier'].iloc[-1])

            # Get lead time
            if 'lead_time_days' in material_df.columns:
                lead_time_days = int(material_df['lead_time_days'].iloc[-1])

        # Get actual and last_year values for this material
        actual_values = get_actual_values(material_df, all_dates)
        last_year_values = get_last_year_values(material_df, all_dates)

        # Build forecast array for this material
        forecast_array = []
        for pred in predictions:
            date_str = pred['date']
            forecast_entry = {
                'date': date_str,
                'y_hat': round(pred['y_hat'], 2),
                'y_lower': round(pred['y_lower'], 2),
                'y_upper': round(pred['y_upper'], 2),
                'actual': round(actual_values[date_str], 2) if actual_values.get(date_str) is not None else None,
                'last_year': round(last_year_values[date_str], 2) if last_year_values.get(date_str) is not None else None
            }
            forecast_array.append(forecast_entry)

        # Calculate total predicted demand for this material
        total_predicted = sum(p['y_hat'] for p in predictions)

        # Build material entry
        material_entry = {
            'material_name': material_name,
            'unit': material_unit,
            'supplier': material_supplier,
            'lead_time_days': lead_time_days,
            'total_predicted_demand': round(total_predicted, 2),
            'forecast': forecast_array
        }

        materials.append(material_entry)

    # Build aggregated forecast (sum across all materials)
    aggregated_forecast = []
    for i, date_str in enumerate(all_dates):
        # Sum predictions across all materials for this date
        y_hat_sum = sum(group_forecasts[group_key][i]['y_hat'] for group_key in group_forecasts)
        y_lower_sum = sum(group_forecasts[group_key][i]['y_lower'] for group_key in group_forecasts)
        y_upper_sum = sum(group_forecasts[group_key][i]['y_upper'] for group_key in group_forecasts)

        # Get aggregated actual and last_year values
        actual_sum = 0
        actual_count = 0
        last_year_sum = 0
        last_year_count = 0

        for material in materials:
            forecast_entry = material['forecast'][i]
            if forecast_entry['actual'] is not None:
                actual_sum += forecast_entry['actual']
                actual_count += 1
            if forecast_entry['last_year'] is not None:
                last_year_sum += forecast_entry['last_year']
                last_year_count += 1

        aggregated_entry = {
            'date': date_str,
            'y_hat': round(y_hat_sum, 2),
            'y_lower': round(y_lower_sum, 2),
            'y_upper': round(y_upper_sum, 2),
            'actual': round(actual_sum, 2) if actual_count > 0 else None,
            'last_year': round(last_year_sum, 2) if last_year_count > 0 else None
        }
        aggregated_forecast.append(aggregated_entry)

    # Calculate total predicted demand across all materials
    total_predicted_demand = sum(material['total_predicted_demand'] for material in materials)

    # Build final output
    output = {
        'metadata': metadata,
        'horizon_days': horizon,
        'forecast_start': forecast_start,
        'forecast_end': forecast_end,
        'total_predicted_demand': round(total_predicted_demand, 2),
        'materials': materials,
        'aggregated_forecast': aggregated_forecast
    }

    return output


def save_forecast_csv(
    predictions: List[Dict],
    output_path: str,
    include_components: bool = True
):
    """
    Save forecast to CSV file

    Args:
        predictions: List of prediction dictionaries
        output_path: Path to save CSV
        include_components: Include LightGBM components
    """
    # Convert to DataFrame
    if include_components:
        df = pd.DataFrame(predictions)
    else:
        df = pd.DataFrame([
            {
                'date': p['date'],
                'y_hat': p['y_hat'],
                'y_lower': p['y_lower'],
                'y_upper': p['y_upper']
            }
            for p in predictions
        ])

    # Save to CSV
    df.to_csv(output_path, index=False)
    print(f"   ✓ Forecast saved to: {output_path}")


def print_forecast_table(predictions: List[Dict], max_rows: int = 10):
    """
    Print forecast as formatted table

    Args:
        predictions: List of prediction dictionaries
        max_rows: Maximum rows to display
    """
    print("\n" + "="*80)
    print("📅 FORECAST TABLE")
    print("="*80)

    print(f"\n{'Date':<12} {'Predicted':<12} {'Lower':<12} {'Upper':<12} {'Range':<12}")
    print("-"*80)

    # Show first few rows
    for i, pred in enumerate(predictions[:max_rows]):
        date = pred['date']
        y_hat = pred['y_hat']
        y_lower = pred['y_lower']
        y_upper = pred['y_upper']
        range_val = y_upper - y_lower

        print(f"{date:<12} {y_hat:<12.2f} {y_lower:<12.2f} {y_upper:<12.2f} {range_val:<12.2f}")

    # Show ellipsis if truncated
    if len(predictions) > max_rows:
        print(f"... ({len(predictions) - max_rows} more rows)")
        print("-"*80)

        # Show last row
        pred = predictions[-1]
        date = pred['date']
        y_hat = pred['y_hat']
        y_lower = pred['y_lower']
        y_upper = pred['y_upper']
        range_val = y_upper - y_lower

        print(f"{date:<12} {y_hat:<12.2f} {y_lower:<12.2f} {y_upper:<12.2f} {range_val:<12.2f}")

    print("="*80)


def generate_per_group_forecasts(
    df: pd.DataFrame,
    models_dict: Dict[str, Tuple],
    group_cols: List[str],
    encoders: Dict[str, LabelEncoder],
    feature_names: List[str],
    horizon: int = 30,
    feature_schema: Optional[Dict] = None,
    pca_model: Optional[any] = None,
    history_days: int = 90,
    n_bootstrap: int = 100
) -> Dict[str, List[Dict]]:
    """
    Generate forecasts for each group using their respective models with bootstrap ensemble

    Args:
        df: Historical data
        models_dict: Dictionary mapping group_key -> (model, metrics)
        group_cols: List of columns used for grouping
        encoders: Label encoders for categorical features
        feature_names: List of feature names
        horizon: Number of days to forecast
        feature_schema: Optional feature selection schema
        pca_model: Optional PCA model
        history_days: Number of recent days to use per group (default: 90)
        n_bootstrap: Number of bootstrap samples for confidence intervals (default: 100)

    Returns:
        Dictionary mapping group_key -> predictions list
    """
    print(f"\n{'='*70}")
    print(f"🔮 GENERATING PER-GROUP FORECASTS WITH BOOTSTRAP ENSEMBLE")
    print(f"{'='*70}")
    print(f"   Groups to forecast: {len(models_dict)}")
    print(f"   Horizon: {horizon} days")
    print(f"   History days per group: {history_days}")
    print(f"   Bootstrap iterations: {n_bootstrap}")

    all_forecasts = {}

    for group_name, (model, metrics) in models_dict.items():
        print(f"\n   {'─'*70}")
        print(f"   📦 Forecasting for: {group_name}")
        print(f"   {'─'*70}")

        try:
            # Parse group name to filter data
            # Group name format: "material=aggregate_20mm" or "material=aggregate_20mm_region=Delhi"
            group_filters = {}

            # Split by known group columns to handle underscores in values
            parts = group_name.split("_")
            current_col = None
            current_val_parts = []

            for part in parts:
                if "=" in part and not current_col:
                    # Start of a new filter
                    col, val = part.split("=", 1)
                    current_col = col
                    current_val_parts = [val] if val else []
                elif "=" in part and current_col:
                    # New filter starts, save previous
                    group_filters[current_col] = "_".join(current_val_parts)
                    col, val = part.split("=", 1)
                    current_col = col
                    current_val_parts = [val] if val else []
                else:
                    # Part of current value
                    if current_col:
                        current_val_parts.append(part)

            # Save last filter
            if current_col:
                group_filters[current_col] = "_".join(current_val_parts)

            # Filter data for this group
            group_df = df.copy()
            for col, val in group_filters.items():
                if col in group_df.columns:
                    group_df = group_df[group_df[col] == val]

            if len(group_df) == 0:
                print(f"   ⚠️  No data found for {group_name}, skipping...")
                print(f"      Filters: {group_filters}")
                continue

            print(f"   Group data: {len(group_df)} rows")

            # Generate forecast for this group with bootstrap ensemble
            predictions = generate_iterative_forecast(
                df=group_df,
                lgb_model=model,
                prophet_model=None,
                encoders=encoders,
                feature_names=feature_names,
                horizon=horizon,
                feature_schema=feature_schema,
                pca_model=pca_model,
                history_days=history_days,
                n_bootstrap=n_bootstrap
            )

            all_forecasts[group_name] = predictions

        except Exception as e:
            print(f"   ❌ Error forecasting {group_name}: {str(e)}")
            continue

    print(f"\n{'='*70}")
    print(f"✅ PER-GROUP FORECASTING COMPLETE")
    print(f"{'='*70}")
    print(f"   Successfully generated: {len(all_forecasts)} group forecasts")

    return all_forecasts


def aggregate_group_forecasts(
    group_forecasts: Dict[str, List[Dict]],
    aggregation: str = 'sum'
) -> List[Dict]:
    """
    Aggregate multiple group forecasts into a unified forecast

    Args:
        group_forecasts: Dictionary mapping group_key -> predictions list
        aggregation: Aggregation method ('sum', 'mean', 'median')

    Returns:
        Unified predictions list
    """
    print(f"\n   📊 Aggregating {len(group_forecasts)} group forecasts using '{aggregation}' method...")

    if not group_forecasts:
        return []

    # Get all dates from first group
    first_group = list(group_forecasts.values())[0]
    dates = [p['date'] for p in first_group]

    # Aggregate predictions for each date
    unified_predictions = []

    for i, date in enumerate(dates):
        # Collect all predictions for this date (y_hat, y_lower, y_upper)
        date_predictions = []
        date_lower = []
        date_upper = []

        for group_name, predictions in group_forecasts.items():
            if i < len(predictions):
                date_predictions.append(predictions[i]['y_hat'])
                date_lower.append(predictions[i]['y_lower'])
                date_upper.append(predictions[i]['y_upper'])

        # Aggregate point predictions
        if aggregation == 'sum':
            agg_value = np.sum(date_predictions)
            agg_lower = np.sum(date_lower)
            agg_upper = np.sum(date_upper)
        elif aggregation == 'mean':
            agg_value = np.mean(date_predictions)
            agg_lower = np.mean(date_lower)
            agg_upper = np.mean(date_upper)
        elif aggregation == 'median':
            agg_value = np.median(date_predictions)
            agg_lower = np.median(date_lower)
            agg_upper = np.median(date_upper)
        else:
            agg_value = np.sum(date_predictions)  # Default to sum
            agg_lower = np.sum(date_lower)
            agg_upper = np.sum(date_upper)

        unified_predictions.append({
            'date': date,
            'y_hat': float(agg_value),
            'y_lower': float(agg_lower),
            'y_upper': float(agg_upper),
            'lgb_prediction': float(agg_value),
            'num_groups': len(date_predictions)
        })

    print(f"   ✓ Unified forecast created with {len(unified_predictions)} days")
    print(f"   ✓ Total predicted demand: {sum(p['y_hat'] for p in unified_predictions):.2f}")

    return unified_predictions


def save_all_forecasts(
    group_forecasts: Dict[str, List[Dict]],
    unified_forecast: List[Dict],
    output_dir: str = "forecasts",
    horizon: int = 30,
    df: Optional[pd.DataFrame] = None,
    group_cols: Optional[List[str]] = None,
    use_new_format: bool = True
):
    """
    Save all group forecasts and unified forecast to files

    Args:
        group_forecasts: Dictionary mapping group_key -> predictions list
        unified_forecast: Unified predictions list
        output_dir: Directory to save forecasts
        horizon: Forecast horizon
        df: Original dataframe (for new format with metadata)
        group_cols: List of grouping columns (for new format)
        use_new_format: Whether to use the new comprehensive format
    """
    from pathlib import Path
    import json

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    print(f"\n   💾 Saving forecasts to {output_dir}/")

    if use_new_format and df is not None and group_cols is not None:
        # Use new comprehensive format
        comprehensive_json = format_per_group_forecast_json(
            group_forecasts=group_forecasts,
            df=df,
            horizon=horizon,
            group_cols=group_cols
        )

        # Save comprehensive forecast
        comprehensive_json_path = output_path / f"forecast_comprehensive_{horizon}d.json"
        with open(comprehensive_json_path, 'w') as f:
            json.dump(comprehensive_json, f, indent=2)
        print(f"   ✓ Comprehensive forecast: {comprehensive_json_path}")

        # Also save CSV of aggregated forecast
        aggregated_csv_path = output_path / f"forecast_aggregated_{horizon}d.csv"
        pd.DataFrame(comprehensive_json['aggregated_forecast']).to_csv(aggregated_csv_path, index=False)
        print(f"   ✓ Aggregated CSV: {aggregated_csv_path}")

    else:
        # Use legacy format
        # Save unified forecast
        unified_json_path = output_path / f"forecast_unified_{horizon}d.json"
        with open(unified_json_path, 'w') as f:
            json.dump({
                'metadata': {
                    'type': 'unified',
                    'num_groups': len(group_forecasts),
                    'horizon_days': horizon
                },
                'forecast': unified_forecast
            }, f, indent=2)
        print(f"   ✓ Unified forecast: {unified_json_path}")

        # Save unified CSV
        unified_csv_path = output_path / f"forecast_unified_{horizon}d.csv"
        pd.DataFrame(unified_forecast).to_csv(unified_csv_path, index=False)
        print(f"   ✓ Unified CSV: {unified_csv_path}")

    # Save individual group forecasts (both formats)
    for group_name, predictions in group_forecasts.items():
        group_json_path = output_path / f"forecast_{group_name}_{horizon}d.json"
        with open(group_json_path, 'w') as f:
            json.dump({
                'metadata': {
                    'type': 'group',
                    'group': group_name,
                    'horizon_days': horizon
                },
                'forecast': predictions
            }, f, indent=2)

    print(f"   ✓ Saved {len(group_forecasts)} individual group forecasts")


