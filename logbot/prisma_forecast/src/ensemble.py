"""
Ensemble methods for PRISMA - Combining LightGBM predictions (Prophet optional)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional


def create_ensemble_forecast(
    lgb_predictions: np.ndarray,
    prophet_predictions: Optional[np.ndarray] = None,
    weights: Dict[str, float] = None
) -> np.ndarray:
    """
    Create ensemble forecast by combining LightGBM and Prophet predictions
    If Prophet is not available, returns LightGBM predictions only

    Args:
        lgb_predictions: Predictions from LightGBM model
        prophet_predictions: Predictions from Prophet model (optional, can be None)
        weights: Dictionary with 'lgb' and 'prophet' weights (default: equal weighting)

    Returns:
        Ensemble predictions
    """
    # If Prophet predictions are not available, return LightGBM only
    if prophet_predictions is None:
        return lgb_predictions

    if weights is None:
        # Default: equal weighting
        weights = {'lgb': 0.6, 'prophet': 0.4}

    # Normalize weights
    total_weight = weights['lgb'] + weights['prophet']
    lgb_weight = weights['lgb'] / total_weight
    prophet_weight = weights['prophet'] / total_weight

    # Weighted average
    ensemble = lgb_weight * lgb_predictions + prophet_weight * prophet_predictions

    return ensemble


def adaptive_ensemble(
    lgb_predictions: np.ndarray,
    prophet_predictions: Optional[np.ndarray],
    lgb_metrics: Dict,
    prophet_metrics: Optional[Dict] = None
) -> np.ndarray:
    """
    Create adaptive ensemble based on validation performance
    If Prophet is not available, returns LightGBM predictions only

    Args:
        lgb_predictions: Predictions from LightGBM model
        prophet_predictions: Predictions from Prophet model (optional, can be None)
        lgb_metrics: LightGBM validation metrics
        prophet_metrics: Prophet validation metrics (optional, can be None)

    Returns:
        Adaptive ensemble predictions
    """
    # If Prophet predictions are not available, return LightGBM only
    if prophet_predictions is None or prophet_metrics is None:
        print(f"   Using LightGBM predictions only (Prophet not available)")
        return lgb_predictions

    # Use validation RMSE to determine weights (inverse of error)
    lgb_rmse = lgb_metrics['validation']['rmse']
    prophet_rmse = prophet_metrics['validation']['rmse']

    # Inverse error weighting
    lgb_weight = (1 / lgb_rmse) if lgb_rmse > 0 else 1.0
    prophet_weight = (1 / prophet_rmse) if prophet_rmse > 0 else 1.0

    # Normalize
    total_weight = lgb_weight + prophet_weight
    lgb_weight = lgb_weight / total_weight
    prophet_weight = prophet_weight / total_weight

    print(f"   Adaptive ensemble weights:")
    print(f"      - LightGBM: {lgb_weight:.3f} (RMSE: {lgb_rmse:.2f})")
    print(f"      - Prophet: {prophet_weight:.3f} (RMSE: {prophet_rmse:.2f})")

    # Weighted average
    ensemble = lgb_weight * lgb_predictions + prophet_weight * prophet_predictions

    return ensemble

