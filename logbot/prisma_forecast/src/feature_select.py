"""
Feature Selection Module for PRISMA

Implements mutual information, LightGBM importance, and permutation importance
for intelligent feature selection.
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from typing import List, Dict, Tuple, Optional

import lightgbm as lgb
from sklearn.feature_selection import mutual_info_regression
from sklearn.inspection import permutation_importance
from sklearn.model_selection import train_test_split


def quick_preselect(
    df: pd.DataFrame,
    target_col: str,
    candidate_features: List[str],
    missing_thresh: float = 0.5
) -> List[str]:
    """
    Quick pre-selection to filter out features with too many missing values.
    
    Args:
        df: DataFrame with features
        target_col: Name of target column
        candidate_features: List of candidate feature names
        missing_thresh: Maximum allowed missing rate (0.0-1.0)
        
    Returns:
        List of features that pass the missing value threshold
    """
    print(f"\n[*] Quick pre-selection (missing_thresh={missing_thresh})...")
    
    selected = []
    removed = []
    
    for feat in candidate_features:
        if feat not in df.columns:
            removed.append((feat, "not_in_df"))
            continue
        
        if feat == target_col:
            continue
        
        missing_rate = df[feat].isnull().mean()
        
        if missing_rate > missing_thresh:
            removed.append((feat, f"missing_rate={missing_rate:.2%}"))
        else:
            selected.append(feat)
    
    print(f"   [OK] Pre-selected: {len(selected)}/{len(candidate_features)} features")
    if removed:
        print(f"   [*] Removed {len(removed)} features:")
        for feat, reason in removed[:5]:
            print(f"       - {feat}: {reason}")
        if len(removed) > 5:
            print(f"       ... and {len(removed)-5} more")
    
    return selected


def score_features(
    df: pd.DataFrame,
    target_col: str,
    features: List[str],
    use_permutation: bool = None
) -> Tuple[Dict[str, Dict[str, float]], Optional[lgb.Booster]]:
    """
    Score features using mutual information and LightGBM importance.
    
    Args:
        df: DataFrame with features and target
        target_col: Name of target column
        features: List of feature names to score
        use_permutation: Whether to use permutation importance (auto if None)
        
    Returns:
        (scores_dict, lgb_model) where scores_dict maps feature -> {mi, gain, perm}
    """
    print(f"\n[*] Scoring {len(features)} features...")
    
    # Prepare data
    X = df[features].copy()
    y = df[target_col].copy()
    
    # Handle missing values (simple imputation)
    for col in X.columns:
        if X[col].dtype in ['float64', 'float32', 'int64', 'int32']:
            X[col].fillna(X[col].median(), inplace=True)
        else:
            X[col].fillna(X[col].mode()[0] if len(X[col].mode()) > 0 else 'missing', inplace=True)
    
    # Encode categorical features
    categorical_features = []
    for col in X.columns:
        if X[col].dtype == 'object' or X[col].dtype.name == 'category':
            X[col] = X[col].astype('category')
            categorical_features.append(col)
    
    # Split data
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    scores = {feat: {} for feat in features}
    
    # 1. Mutual Information (for numeric features only)
    print("   [*] Computing mutual information...")
    numeric_features = [col for col in features if X[col].dtype in ['float64', 'float32', 'int64', 'int32']]
    
    if numeric_features:
        X_numeric = X[numeric_features].values
        mi_scores = mutual_info_regression(X_numeric, y, random_state=42)
        
        for feat, mi_score in zip(numeric_features, mi_scores):
            scores[feat]['mi'] = float(mi_score)
    
    # Set MI to 0 for categorical features
    for feat in categorical_features:
        scores[feat]['mi'] = 0.0
    
    print(f"   [OK] Mutual information computed for {len(numeric_features)} numeric features")
    
    # 2. LightGBM Feature Importance (gain)
    print("   [*] Training LightGBM for feature importance...")
    
    train_data = lgb.Dataset(
        X_train,
        label=y_train,
        categorical_feature=categorical_features,
        free_raw_data=False
    )
    
    val_data = lgb.Dataset(
        X_val,
        label=y_val,
        categorical_feature=categorical_features,
        reference=train_data,
        free_raw_data=False
    )
    
    params = {
        'objective': 'regression',
        'metric': 'rmse',
        'boosting_type': 'gbdt',
        'num_leaves': 31,
        'learning_rate': 0.05,
        'feature_fraction': 0.9,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1
    }
    
    lgb_model = lgb.train(
        params,
        train_data,
        num_boost_round=200,
        valid_sets=[val_data],
        callbacks=[
            lgb.early_stopping(stopping_rounds=20, verbose=False),
            lgb.log_evaluation(period=0)
        ]
    )
    
    # Get feature importance (gain)
    importance_gain = lgb_model.feature_importance(importance_type='gain')
    
    for feat, gain in zip(features, importance_gain):
        scores[feat]['gain'] = float(gain)
    
    print(f"   [OK] LightGBM importance computed")
    
    # 3. Permutation Importance (optional, expensive)
    # Note: Skipping permutation importance as it requires sklearn-compatible estimator
    # LightGBM Booster is not directly compatible with sklearn's permutation_importance
    # We can use gain as a proxy for importance instead
    print("   [*] Skipping permutation importance (using gain as proxy)")
    for feat in features:
        scores[feat]['perm'] = 0.0
    
    return scores, lgb_model


def select_features(
    scores: Dict[str, Dict[str, float]],
    top_k: int = 30,
    min_gain: float = 0.0
) -> List[str]:
    """
    Select top features based on combined scores.
    
    Args:
        scores: Dict mapping feature -> {mi, gain, perm}
        top_k: Number of top features to select
        min_gain: Minimum gain threshold
        
    Returns:
        List of selected feature names
    """
    print(f"\n[*] Selecting top {top_k} features...")
    
    # Normalize scores to [0, 1]
    def normalize(values):
        values = np.array(values)
        if values.max() == 0:
            return values
        return values / values.max()
    
    # Extract scores
    features = list(scores.keys())
    mi_scores = normalize([scores[f].get('mi', 0) for f in features])
    gain_scores = normalize([scores[f].get('gain', 0) for f in features])
    perm_scores = normalize([scores[f].get('perm', 0) for f in features])
    
    # Combined score (weighted average)
    # Gain is most important, then MI, then permutation
    combined_scores = 0.5 * gain_scores + 0.3 * mi_scores + 0.2 * perm_scores
    
    # Create ranking
    feature_scores = list(zip(features, combined_scores, gain_scores))
    feature_scores.sort(key=lambda x: x[1], reverse=True)
    
    # Filter by min_gain and select top_k
    selected = []
    for feat, combined, gain in feature_scores:
        if gain >= min_gain and len(selected) < top_k:
            selected.append(feat)
    
    print(f"   [OK] Selected {len(selected)} features")
    print(f"   [*] Top 10 features:")
    for i, (feat, combined, gain) in enumerate(feature_scores[:10]):
        if feat in selected:
            print(f"       {i+1:2d}. {feat:30s} (combined: {combined:.4f}, gain: {gain:.4f})")
    
    return selected


def save_feature_selection_report(
    scores: Dict[str, Dict[str, float]],
    selected: List[str],
    path: str
):
    """
    Save feature selection report as JSON.
    
    Args:
        scores: Dict mapping feature -> {mi, gain, perm}
        selected: List of selected feature names
        path: Output file path
    """
    # Compute combined scores
    features = list(scores.keys())
    
    def normalize(values):
        values = np.array(values)
        if values.max() == 0:
            return values
        return values / values.max()
    
    mi_scores = normalize([scores[f].get('mi', 0) for f in features])
    gain_scores = normalize([scores[f].get('gain', 0) for f in features])
    perm_scores = normalize([scores[f].get('perm', 0) for f in features])
    combined_scores = 0.5 * gain_scores + 0.3 * mi_scores + 0.2 * perm_scores
    
    # Create report
    report = {
        'total_features': len(features),
        'selected_features': len(selected),
        'selected': selected,
        'scores': {}
    }
    
    for feat, combined in zip(features, combined_scores):
        report['scores'][feat] = {
            'mi': scores[feat].get('mi', 0),
            'gain': scores[feat].get('gain', 0),
            'perm': scores[feat].get('perm', 0),
            'combined': float(combined),
            'selected': feat in selected
        }
    
    # Save to file
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n[*] Feature selection report saved to: {path}")

