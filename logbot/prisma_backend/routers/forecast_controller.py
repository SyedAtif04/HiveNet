"""Forecast controller for training and prediction"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import json
from ..models.request_models import ForecastRequest, TrainRequest, PredictRequest
from ..models.response_models import ForecastResponse, TrainResponse, PredictResponse, ForecastDataResponse
from ..services.ml_service import train_model, predict, train_and_predict
from ..services.file_service import copy_forecast_to_results
from ..services.config import Config

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.post("", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """Generate complete forecast (train + predict)"""
    import traceback
    import logging
    logger = logging.getLogger(__name__)

    try:
        # Get horizon from duration
        horizon_days = Config.DURATION_MAP[request.duration]

        logger.info(f"Starting forecast generation: duration={request.duration}, horizon={horizon_days}d")
        logger.info(f"Parameters: data_path={request.data_path}, group_by={request.group_by}")

        # Execute ML pipeline
        train_output, predict_output, train_duration, predict_duration = await train_and_predict(
            data_path=request.data_path,
            horizon=horizon_days,
            feature_select=request.feature_select,
            top_n=request.top_n,
            group_by=request.group_by,
            history_days=request.history_days,
            n_bootstrap=request.n_bootstrap
        )

        logger.info(f"ML pipeline completed: train={train_duration:.2f}s, predict={predict_duration:.2f}s")

        # Copy forecast to results
        forecast_path = copy_forecast_to_results(horizon_days)
        logger.info(f"Forecast copied to: {forecast_path}")

        completed_at = datetime.now().isoformat()

        return ForecastResponse(
            status="success",
            message=f"Forecast generated successfully for {request.duration}",
            training=TrainResponse(
                status="success",
                message="Training completed",
                model_path=str(Config.ML_MODELS_DIR),
                duration_seconds=train_duration,
                completed_at=completed_at
            ),
            prediction=PredictResponse(
                status="success",
                message="Prediction completed",
                forecast_file=str(forecast_path),
                horizon_days=horizon_days,
                duration_seconds=predict_duration,
                completed_at=completed_at
            ),
            total_duration_seconds=train_duration + predict_duration,
            completed_at=completed_at
        )

    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Forecast generation failed: {str(e)}")
        logger.error(f"Traceback:\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"{str(e)}\n\nTraceback:\n{error_trace}")


@router.post("/train", response_model=TrainResponse)
async def train_only(request: TrainRequest):
    """Train model only"""
    try:
        output, duration = await train_model(
            data_path=request.data_path,
            feature_select=request.feature_select,
            top_n=request.top_n,
            group_by=request.group_by
        )
        
        return TrainResponse(
            status="success",
            message="Training completed successfully",
            model_path=str(Config.ML_MODELS_DIR),
            duration_seconds=duration,
            completed_at=datetime.now().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict", response_model=PredictResponse)
async def predict_only(request: PredictRequest):
    """Generate predictions only (requires pre-trained model)"""
    try:
        output, duration = await predict(
            data_path=request.data_path,
            horizon=request.horizon,
            history_days=request.history_days,
            n_bootstrap=request.n_bootstrap
        )
        
        # Copy forecast to results
        forecast_path = copy_forecast_to_results(request.horizon)
        
        return PredictResponse(
            status="success",
            message="Prediction completed successfully",
            forecast_file=str(forecast_path),
            horizon_days=request.horizon,
            duration_seconds=duration,
            completed_at=datetime.now().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{duration}", response_model=ForecastDataResponse)
async def get_forecast_results(duration: str):
    """Retrieve forecast results for a specific duration"""
    try:
        # Normalize duration
        if duration in Config.DURATION_SHORT_MAP:
            duration = Config.DURATION_SHORT_MAP[duration]
        
        if duration not in Config.DURATION_MAP:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid duration. Must be one of: {list(Config.DURATION_MAP.keys())}"
            )
        
        horizon_days = Config.DURATION_MAP[duration]
        forecast_filename = Config.get_forecast_filename(horizon_days, comprehensive=True)
        forecast_path = Config.RESULTS_DIR / forecast_filename
        
        if not forecast_path.exists():
            # Try non-comprehensive format
            forecast_filename = Config.get_forecast_filename(horizon_days, comprehensive=False)
            forecast_path = Config.RESULTS_DIR / forecast_filename
        
        if not forecast_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Forecast not found for {duration}. Please generate a forecast first."
            )
        
        # Load forecast data
        with open(forecast_path, 'r') as f:
            forecast_data = json.load(f)
        
        return ForecastDataResponse(
            status="success",
            duration=duration,
            horizon_days=horizon_days,
            data=forecast_data,
            retrieved_at=datetime.now().isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

