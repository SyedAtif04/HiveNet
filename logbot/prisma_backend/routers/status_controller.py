"""Status controller for health checks and service status"""

from fastapi import APIRouter
from datetime import datetime
import time
from ..models.response_models import HealthResponse, StatusResponse
from ..services.config import Config
from .. import __version__

router = APIRouter(prefix="/status", tags=["status"])

# Track service start time
SERVICE_START_TIME = time.time()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Basic health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="PRISMA Forecast API",
        version=__version__,
        timestamp=datetime.now().isoformat(),
        ml_pipeline_available=Config.check_ml_pipeline_available()
    )


@router.get("", response_model=StatusResponse)
async def get_status():
    """Detailed service status"""
    uptime = time.time() - SERVICE_START_TIME
    
    uploads_count = len(list(Config.UPLOADS_DIR.glob("*"))) if Config.UPLOADS_DIR.exists() else 0
    results_count = len(list(Config.RESULTS_DIR.glob("*.json"))) if Config.RESULTS_DIR.exists() else 0
    
    return StatusResponse(
        status="operational",
        uptime_seconds=uptime,
        uploads_count=uploads_count,
        results_count=results_count,
        ml_models_available=Config.check_models_available(),
        timestamp=datetime.now().isoformat()
    )


@router.get("/config")
async def get_config():
    """Get configuration information"""
    return {
        "version": __version__,
        "max_upload_size_mb": Config.MAX_UPLOAD_SIZE / (1024 * 1024),
        "allowed_extensions": list(Config.ALLOWED_EXTENSIONS),
        "duration_options": list(Config.DURATION_MAP.keys()),
        "ml_pipeline_available": Config.check_ml_pipeline_available(),
        "directories": {
            "uploads": str(Config.UPLOADS_DIR),
            "results": str(Config.RESULTS_DIR),
            "ml_forecasts": str(Config.ML_FORECASTS_DIR),
            "ml_models": str(Config.ML_MODELS_DIR)
        }
    }

