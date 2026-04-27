"""
Feature engineering for PRISMA - Lag features, rolling statistics, calendar features, encoding
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from typing import Tuple, Dict, List, Optional

from data_utils import (
    CATEGORICAL_FEATURES, CONTINUOUS_FEATURES,
    TARGET_COLUMN, TIME_COLUMN, get_feature_columns
)


# Feature engineering configuration
LAG_PERIODS = [1, 7, 14, 30]
ROLLING_WINDOWS = [7, 14, 30]
PRICE_LAG_PERIODS = [7]
PRICE_ROLLING_WINDOWS = [30]


def create_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create calendar-based features from date column

    Args:
        df: DataFrame with date column

    Returns:
        DataFrame with calendar features added
    """
    df = df.copy()

    print("   Creating calendar features...")

    # Ensure date column is datetime
    if not pd.api.types.is_datetime64_any_dtype(df[TIME_COLUMN]):
        df[TIME_COLUMN] = pd.to_datetime(df[TIME_COLUMN])

    # Day of week (0=Monday, 6=Sunday)
    df['day_of_week'] = df[TIME_COLUMN].dt.dayofweek

    # Month (1-12)
    df['month'] = df[TIME_COLUMN].dt.month

    # Is weekend (Saturday=5, Sunday=6)
    df['is_weekend'] = (df[TIME_COLUMN].dt.dayofweek >= 5).astype(int)

    # Additional calendar features
    df['day_of_month'] = df[TIME_COLUMN].dt.day
    df['quarter'] = df[TIME_COLUMN].dt.quarter
    df['week_of_year'] = df[TIME_COLUMN].dt.isocalendar().week

    print(f"   ✓ Calendar features created: day_of_week, month, is_weekend, day_of_month, quarter, week_of_year")

    return df


def check_existing_features(df: pd.DataFrame) -> Dict[str, bool]:
    """
    Check which lag/rolling features already exist in the dataset

    Args:
        df: DataFrame

    Returns:
        Dictionary indicating which feature types exist
    """
    # Check for new lag features
    lag_features = [f'quantity_lag_{lag}' for lag in LAG_PERIODS]
    rolling_features = [f'quantity_rolling_mean_{window}' for window in ROLLING_WINDOWS]
    price_lag_features = [f'price_lag_{lag}' for lag in PRICE_LAG_PERIODS]
    price_rolling_features = [f'price_rolling_mean_{window}' for window in PRICE_ROLLING_WINDOWS]

    has_lag = all(col in df.columns for col in lag_features)
    has_rolling = all(col in df.columns for col in rolling_features)
    has_price_lag = all(col in df.columns for col in price_lag_features)
    has_price_rolling = all(col in df.columns for col in price_rolling_features)

    return {
        'has_lag_features': has_lag,
        'has_rolling_features': has_rolling,
        'has_price_lag_features': has_price_lag,
        'has_price_rolling_features': has_price_rolling
    }


def create_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create lag features for quantity and price (1, 7, 14, 30 days)

    Args:
        df: DataFrame sorted by date

    Returns:
        DataFrame with lag features
    """
    df = df.copy()

    print(f"   Creating lag features for periods: {LAG_PERIODS}")

    # Quantity lag features
    created_features = []
    for lag in LAG_PERIODS:
        feature_name = f'quantity_lag_{lag}'
        if feature_name not in df.columns:
            df[feature_name] = df[TARGET_COLUMN].shift(lag)
            created_features.append(feature_name)

    if created_features:
        print(f"   ✓ Created {len(created_features)} quantity lag features: {', '.join(created_features)}")
    else:
        print(f"   ✓ Using existing quantity lag features")

    # Price lag features (if price column exists)
    price_col = None
    for col in ['unit_price', 'price', 'cost']:
        if col in df.columns:
            price_col = col
            break

    if price_col:
        price_features = []
        for lag in PRICE_LAG_PERIODS:
            feature_name = f'price_lag_{lag}'
            if feature_name not in df.columns:
                df[feature_name] = df[price_col].shift(lag)
                price_features.append(feature_name)

        if price_features:
            print(f"   ✓ Created {len(price_features)} price lag features: {', '.join(price_features)}")

    return df


def create_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create rolling statistics for quantity and price (7, 14, 30 day windows)

    Args:
        df: DataFrame sorted by date

    Returns:
        DataFrame with rolling features
    """
    df = df.copy()

    print(f"   Creating rolling features for windows: {ROLLING_WINDOWS}")

    # Quantity rolling statistics
    created_features = []
    for window in ROLLING_WINDOWS:
        # Rolling mean
        feature_name = f'quantity_rolling_mean_{window}'
        if feature_name not in df.columns:
            df[feature_name] = df[TARGET_COLUMN].rolling(window=window, min_periods=1).mean()
            created_features.append(feature_name)

        # Rolling std
        feature_name = f'quantity_rolling_std_{window}'
        if feature_name not in df.columns:
            df[feature_name] = df[TARGET_COLUMN].rolling(window=window, min_periods=1).std()
            created_features.append(feature_name)

    if created_features:
        print(f"   ✓ Created {len(created_features)} quantity rolling features")
    else:
        print(f"   ✓ Using existing quantity rolling features")

    # Price rolling statistics (if price column exists)
    price_col = None
    for col in ['unit_price', 'price', 'cost']:
        if col in df.columns:
            price_col = col
            break

    if price_col:
        price_features = []
        for window in PRICE_ROLLING_WINDOWS:
            feature_name = f'price_rolling_mean_{window}'
            if feature_name not in df.columns:
                df[feature_name] = df[price_col].rolling(window=window, min_periods=1).mean()
                price_features.append(feature_name)

        if price_features:
            print(f"   ✓ Created {len(price_features)} price rolling features: {', '.join(price_features)}")

    return df


def encode_categorical_features(
    df: pd.DataFrame, 
    encoders: Dict[str, LabelEncoder] = None
) -> Tuple[pd.DataFrame, Dict[str, LabelEncoder]]:
    """
    Encode categorical features using LabelEncoder
    
    Args:
        df: DataFrame
        encoders: Pre-fitted encoders (for prediction), None for training
        
    Returns:
        Tuple of (encoded DataFrame, encoders dictionary)
    """
    df = df.copy()
    
    available_cat, _ = get_feature_columns(df)
    
    if encoders is None:
        # Training mode - fit new encoders
        print(f"   Encoding {len(available_cat)} categorical features...")
        encoders = {}
        
        for col in available_cat:
            le = LabelEncoder()
            # Handle any unseen categories by converting to string first
            df[col] = df[col].astype(str)
            df[col] = le.fit_transform(df[col])
            encoders[col] = le
            print(f"      - {col}: {len(le.classes_)} unique values")
        
        print("   ✓ Categorical encoding complete")
    else:
        # Prediction mode - use existing encoders
        print(f"   Applying existing encoders to {len(available_cat)} categorical features...")
        
        for col in available_cat:
            if col in encoders:
                df[col] = df[col].astype(str)
                # Handle unseen categories
                le = encoders[col]
                df[col] = df[col].apply(
                    lambda x: le.transform([x])[0] if x in le.classes_ else -1
                )
        
        print("   ✓ Categorical encoding applied")
    
    return df, encoders


def prepare_features(
    df: pd.DataFrame,
    encoders: Dict[str, LabelEncoder] = None,
    is_training: bool = True
) -> Tuple[np.ndarray, np.ndarray, List[str], Dict[str, LabelEncoder]]:
    """
    Prepare features for model training or prediction

    Args:
        df: DataFrame
        encoders: Pre-fitted encoders (None for training)
        is_training: Whether this is for training (True) or prediction (False)

    Returns:
        Tuple of (X, y, feature_names, encoders)
    """
    df = df.copy()

    # Step 1: Create calendar features
    df = create_calendar_features(df)

    # Step 2: Check existing features
    existing = check_existing_features(df)

    # Step 3: Create lag features if needed
    if existing['has_lag_features']:
        print("   ✓ Using existing lag features")
    else:
        df = create_lag_features(df)

    # Step 4: Create rolling features if needed
    if existing['has_rolling_features']:
        print("   ✓ Using existing rolling features")
    else:
        df = create_rolling_features(df)

    # Step 5: Encode categorical features
    df, encoders = encode_categorical_features(df, encoders)

    # Step 6: Get available feature columns
    available_cat, available_cont = get_feature_columns(df)

    # Add calendar features to continuous features
    calendar_features = ['day_of_week', 'month', 'is_weekend', 'day_of_month', 'quarter', 'week_of_year']
    for feat in calendar_features:
        if feat in df.columns and feat not in available_cont:
            available_cont.append(feat)

    # Combine all features
    feature_cols = available_cat + available_cont

    print(f"   Total features for modeling: {len(feature_cols)}")
    print(f"      - Categorical: {len(available_cat)}")
    print(f"      - Continuous: {len(available_cont)}")
    print(f"      - Calendar: {len([f for f in calendar_features if f in feature_cols])}")

    # Prepare X and y
    X = df[feature_cols].fillna(0).values
    y = df[TARGET_COLUMN].values if is_training else None

    return X, y, feature_cols, encoders

