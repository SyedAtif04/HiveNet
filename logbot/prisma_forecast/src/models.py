"""
Model training for PRISMA - LightGBM
"""

import pandas as pd
import numpy as np
from typing import Tuple, Dict, List, Optional
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings

from data_utils import TARGET_COLUMN, TIME_COLUMN

# Suppress warnings
warnings.filterwarnings('ignore', category=FutureWarning)


def calculate_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Calculate Mean Absolute Percentage Error

    Args:
        y_true: True values
        y_pred: Predicted values

    Returns:
        MAPE value
    """
    # Avoid division by zero
    mask = y_true != 0
    if not mask.any():
        return 0.0

    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100


def train_lightgbm(
    X: np.ndarray, 
    y: np.ndarray, 
    feature_names: List[str],
    test_size: float = 0.2,
    random_state: int = 42
) -> Tuple[lgb.Booster, Dict]:
    """
    Train LightGBM model for demand forecasting
    
    Args:
        X: Feature matrix
        y: Target values
        feature_names: List of feature names
        test_size: Proportion of data for validation
        random_state: Random seed
        
    Returns:
        Tuple of (trained model, metrics dictionary)
    """
    print(f"   Training LightGBM with {X.shape[0]} samples, {X.shape[1]} features...")
    
    # Split data
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=test_size, random_state=random_state, shuffle=False
    )
    
    print(f"   Train set: {X_train.shape[0]} samples")
    print(f"   Validation set: {X_val.shape[0]} samples")
    
    # Create LightGBM datasets
    train_data = lgb.Dataset(X_train, label=y_train, feature_name=feature_names)
    val_data = lgb.Dataset(X_val, label=y_val, feature_name=feature_names, reference=train_data)
    
    # LightGBM parameters
    params = {
        'objective': 'regression',
        'metric': 'rmse',
        'boosting_type': 'gbdt',
        'num_leaves': 31,
        'learning_rate': 0.05,
        'feature_fraction': 0.9,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1,
        'seed': random_state
    }
    
    print(f"   Training with parameters:")
    for key, value in params.items():
        print(f"      - {key}: {value}")
    
    # Train model
    model = lgb.train(
        params,
        train_data,
        num_boost_round=500,
        valid_sets=[train_data, val_data],
        valid_names=['train', 'valid'],
        callbacks=[
            lgb.early_stopping(stopping_rounds=50, verbose=False),
            lgb.log_evaluation(period=0)  # Suppress iteration logs
        ]
    )
    
    print(f"   ✓ Training completed in {model.best_iteration} iterations")
    
    # Make predictions
    y_train_pred = model.predict(X_train, num_iteration=model.best_iteration)
    y_val_pred = model.predict(X_val, num_iteration=model.best_iteration)
    
    # Calculate metrics including MAPE
    metrics = {
        'train': {
            'mae': mean_absolute_error(y_train, y_train_pred),
            'rmse': np.sqrt(mean_squared_error(y_train, y_train_pred)),
            'r2': r2_score(y_train, y_train_pred),
            'mape': calculate_mape(y_train, y_train_pred)
        },
        'validation': {
            'mae': mean_absolute_error(y_val, y_val_pred),
            'rmse': np.sqrt(mean_squared_error(y_val, y_val_pred)),
            'r2': r2_score(y_val, y_val_pred),
            'mape': calculate_mape(y_val, y_val_pred)
        }
    }

    print(f"\n   📊 LightGBM Validation Metrics:")
    print(f"      MAE:  {metrics['validation']['mae']:.2f}")
    print(f"      RMSE: {metrics['validation']['rmse']:.2f}")
    print(f"      MAPE: {metrics['validation']['mape']:.2f}%")
    print(f"      R²:   {metrics['validation']['r2']:.4f}")

    # Print top 10 feature importances
    print(f"\n   🔍 Top 10 Feature Importances:")
    importance_df = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importance(importance_type='gain')
    }).sort_values('importance', ascending=False)

    for idx, row in importance_df.head(10).iterrows():
        print(f"      {idx+1:2d}. {row['feature']:30s} - {row['importance']:,.0f}")

    return model, metrics

def train_per_group(
    df: pd.DataFrame,
    group_cols: List[str],
    feature_names: List[str],
    encoders: Dict,
    test_size: float = 0.2,
    random_state: int = 42,
    min_samples: int = 50
) -> Dict[str, Tuple[lgb.Booster, Dict]]:
    """
    Train separate LightGBM models for each group (e.g., per material or per region)

    Args:
        df: DataFrame with features and target
        group_cols: List of columns to group by (e.g., ['material', 'region'])
        feature_names: List of feature names to use for training
        encoders: Dictionary of label encoders
        test_size: Proportion of data for validation
        random_state: Random seed
        min_samples: Minimum samples required to train a group model

    Returns:
        Dictionary mapping group_key -> (model, metrics)
    """
    from features import prepare_features

    print(f"\n{'='*70}")
    print(f"🔄 TRAINING PER-GROUP MODELS")
    print(f"{'='*70}")
    print(f"   Group columns: {group_cols}")
    print(f"   Minimum samples per group: {min_samples}")

    # Get unique groups
    if len(group_cols) == 1:
        groups = df[group_cols[0]].unique()
        group_keys = [(g,) for g in groups]
    else:
        group_keys = df[group_cols].drop_duplicates().values.tolist()
        group_keys = [tuple(g) for g in group_keys]

    print(f"   Total groups found: {len(group_keys)}")

    models_dict = {}
    trained_count = 0
    skipped_count = 0

    for group_key in group_keys:
        # Filter data for this group
        if len(group_cols) == 1:
            group_df = df[df[group_cols[0]] == group_key[0]].copy()
            group_name = f"{group_cols[0]}={group_key[0]}"
        else:
            mask = pd.Series([True] * len(df))
            for col, val in zip(group_cols, group_key):
                mask &= (df[col] == val)
            group_df = df[mask].copy()
            group_name = "_".join([f"{col}={val}" for col, val in zip(group_cols, group_key)])

        # Check if enough samples
        if len(group_df) < min_samples:
            print(f"\n   ⚠️  Skipping {group_name}: only {len(group_df)} samples (< {min_samples})")
            skipped_count += 1
            continue

        print(f"\n   {'─'*70}")
        print(f"   📦 Training model for: {group_name}")
        print(f"   {'─'*70}")
        print(f"   Samples: {len(group_df)}")

        try:
            # Prepare features for this group
            X_group, y_group, group_feature_names, _ = prepare_features(
                group_df,
                encoders=encoders,
                is_training=True
            )

            # Filter to selected features
            feature_indices = [i for i, f in enumerate(group_feature_names) if f in feature_names]
            X_group = X_group[:, feature_indices]

            # Get the actual feature names after filtering
            filtered_feature_names = [group_feature_names[i] for i in feature_indices]

            # Train model for this group
            model, metrics = train_lightgbm(
                X_group,
                y_group,
                filtered_feature_names,
                test_size=test_size,
                random_state=random_state
            )

            models_dict[group_name] = (model, metrics)
            trained_count += 1

        except Exception as e:
            print(f"   ❌ Error training {group_name}: {str(e)}")
            skipped_count += 1
            continue

    print(f"\n{'='*70}")
    print(f"✅ PER-GROUP TRAINING COMPLETE")
    print(f"{'='*70}")
    print(f"   Successfully trained: {trained_count} models")
    print(f"   Skipped: {skipped_count} groups")
    print(f"   Total: {len(group_keys)} groups")

    return models_dict


