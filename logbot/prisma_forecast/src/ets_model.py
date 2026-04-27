"""
Holt-Winters Exponential Smoothing (ETS) demand forecasting.
Pluggable alternative or complement to LightGBM for shorter series.

Usage:
    from ets_model import forecast_ets
    result = forecast_ets(dates, values, steps=30)
"""

from typing import List, Optional, Dict, Any
import numpy as np


def forecast_ets(
    dates: List[str],
    values: List[float],
    steps: int,
    seasonal_periods: Optional[int] = None,
    trend: str = "add",
    seasonal: Optional[str] = "add",
    damped_trend: bool = True,
) -> Dict[str, Any]:
    """
    Holt-Winters ETS forecast with automatic seasonal detection.

    Args:
        dates: Date strings aligned with values (YYYY-MM-DD or YYYY-MM).
        values: Historical demand series.
        steps: Number of future periods to forecast.
        seasonal_periods: Periods per season; auto-detected if None.
        trend: "add" | "mul" | None
        seasonal: "add" | "mul" | None
        damped_trend: Dampen the trend for more conservative long-range forecasts.

    Returns:
        {forecast, lower_ci, upper_ci, aic, method, trend, seasonal, seasonal_periods}
    """
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    series = list(values)
    n = len(series)

    # Auto-detect seasonality based on available data
    if seasonal_periods is None:
        if n >= 24:
            seasonal_periods = 12   # monthly → annual cycle
        elif n >= 14:
            seasonal_periods = 7    # daily → weekly cycle
        else:
            seasonal = None         # too few points

    # Need at least 2 full seasons for seasonal fitting
    if seasonal is not None and seasonal_periods and n < 2 * seasonal_periods:
        seasonal = None

    try:
        model = ExponentialSmoothing(
            series,
            trend=trend,
            seasonal=seasonal,
            seasonal_periods=seasonal_periods if seasonal else None,
            damped_trend=damped_trend if trend else False,
            initialization_method="estimated",
        )
        fit = model.fit(optimized=True)
        forecast = fit.forecast(steps)

        # Simulation-based 95% confidence intervals
        sims = fit.simulate(steps, repetitions=500, error="add")
        lower_ci = np.quantile(sims, 0.025, axis=1).tolist()
        upper_ci = np.quantile(sims, 0.975, axis=1).tolist()

        return {
            "forecast": [max(0.0, float(v)) for v in forecast],
            "lower_ci": [max(0.0, float(v)) for v in lower_ci],
            "upper_ci": [max(0.0, float(v)) for v in upper_ci],
            "aic": round(float(fit.aic), 4),
            "method": "ets",
            "trend": trend,
            "seasonal": seasonal,
            "seasonal_periods": seasonal_periods,
        }

    except Exception as exc:
        # Graceful fallback to Simple Exponential Smoothing
        from statsmodels.tsa.holtwinters import SimpleExpSmoothing
        fit = SimpleExpSmoothing(series, initialization_method="estimated").fit()
        forecast = fit.forecast(steps)
        return {
            "forecast": [max(0.0, float(v)) for v in forecast],
            "lower_ci": [max(0.0, float(v) * 0.85) for v in forecast],
            "upper_ci": [max(0.0, float(v) * 1.15) for v in forecast],
            "aic": None,
            "method": "ses_fallback",
            "fallback_reason": str(exc),
        }
