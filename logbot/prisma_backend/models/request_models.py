"""Request models for API endpoints"""

from pydantic import BaseModel, Field
from typing import Literal, Optional


class ForecastRequest(BaseModel):
    """Request model for forecast generation (train + predict)"""
    duration: Literal["3_months", "6_months", "12_months"] = Field(
        ...,
        description="Forecast duration"
    )
    data_path: str = Field(
        ...,
        description="Path to the uploaded dataset"
    )
    feature_select: bool = Field(
        default=True,
        description="Enable automatic feature selection"
    )
    top_n: Optional[int] = Field(
        default=None,
        description="Number of top features to select"
    )
    group_by: Optional[str] = Field(
        default=None,
        description="Column to group by for per-group forecasting (optional)"
    )
    history_days: int = Field(
        default=90,
        description="Number of historical days to use for training"
    )
    n_bootstrap: int = Field(
        default=100,
        description="Number of bootstrap samples for confidence intervals"
    )


class TrainRequest(BaseModel):
    """Request model for training only"""
    data_path: str = Field(
        ...,
        description="Path to the training dataset"
    )
    feature_select: bool = Field(
        default=True,
        description="Enable automatic feature selection"
    )
    top_n: Optional[int] = Field(
        default=None,
        description="Number of top features to select"
    )
    group_by: Optional[str] = Field(
        default=None,
        description="Column to group by for per-group forecasting (optional)"
    )


class PredictRequest(BaseModel):
    """Request model for prediction only"""
    data_path: str = Field(
        ...,
        description="Path to the dataset for prediction"
    )
    horizon: int = Field(
        ...,
        description="Forecast horizon in days"
    )
    history_days: int = Field(
        default=90,
        description="Number of historical days to use"
    )
    n_bootstrap: int = Field(
        default=100,
        description="Number of bootstrap samples for confidence intervals"
    )

