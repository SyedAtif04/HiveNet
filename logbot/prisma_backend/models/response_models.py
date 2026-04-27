"""Response models for API endpoints"""

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class UploadResponse(BaseModel):
    """Response model for file upload"""
    status: str = Field(..., description="Upload status")
    filename: str = Field(..., description="Uploaded filename")
    path: str = Field(..., description="File path on server")
    size_bytes: int = Field(..., description="File size in bytes")
    uploaded_at: str = Field(..., description="Upload timestamp")


class TrainResponse(BaseModel):
    """Response model for training"""
    status: str = Field(..., description="Training status")
    message: str = Field(..., description="Status message")
    model_path: str = Field(..., description="Path to saved model")
    duration_seconds: float = Field(..., description="Training duration")
    completed_at: str = Field(..., description="Completion timestamp")


class PredictResponse(BaseModel):
    """Response model for prediction"""
    status: str = Field(..., description="Prediction status")
    message: str = Field(..., description="Status message")
    forecast_file: str = Field(..., description="Path to forecast file")
    horizon_days: int = Field(..., description="Forecast horizon")
    duration_seconds: float = Field(..., description="Prediction duration")
    completed_at: str = Field(..., description="Completion timestamp")


class ForecastResponse(BaseModel):
    """Response model for complete forecast (train + predict)"""
    status: str = Field(..., description="Overall status")
    message: str = Field(..., description="Status message")
    training: TrainResponse = Field(..., description="Training results")
    prediction: PredictResponse = Field(..., description="Prediction results")
    total_duration_seconds: float = Field(..., description="Total duration")
    completed_at: str = Field(..., description="Completion timestamp")


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="API version")
    timestamp: str = Field(..., description="Current timestamp")
    ml_pipeline_available: bool = Field(..., description="ML pipeline availability")


class StatusResponse(BaseModel):
    """Response model for detailed status"""
    status: str = Field(..., description="Service status")
    uptime_seconds: float = Field(..., description="Service uptime")
    uploads_count: int = Field(..., description="Number of uploaded files")
    results_count: int = Field(..., description="Number of result files")
    ml_models_available: bool = Field(..., description="ML models availability")
    timestamp: str = Field(..., description="Current timestamp")


class ErrorResponse(BaseModel):
    """Response model for errors"""
    status: str = Field(default="error", description="Error status")
    message: str = Field(..., description="Error message")
    detail: Optional[Any] = Field(default=None, description="Error details")


class ForecastDataResponse(BaseModel):
    """Response model for forecast data retrieval"""
    status: str = Field(..., description="Status")
    duration: str = Field(..., description="Forecast duration")
    horizon_days: int = Field(..., description="Forecast horizon in days")
    data: dict = Field(..., description="Forecast data")
    retrieved_at: str = Field(..., description="Retrieval timestamp")

