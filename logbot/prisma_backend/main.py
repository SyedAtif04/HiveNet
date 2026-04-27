"""
LogBot Backend API
Logistics intelligence system: demand forecasting, inventory optimization,
decision engine, and supply chain alerts.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import sys
from pathlib import Path

# Handle both direct execution and package import
try:
    from . import __version__
    from .services.config import Config
    from .routers import (
        upload_router, forecast_router, status_router,
        inventory_router, optimization_router, alerts_router,
        ingest_router, chat_router,
    )
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from prisma_backend import __version__
    from prisma_backend.services.config import Config
    from prisma_backend.routers import (
        upload_router, forecast_router, status_router,
        inventory_router, optimization_router, alerts_router,
        ingest_router, chat_router,
    )

# Ensure DB tables exist on startup
sys.path.insert(0, str(Path(__file__).parent.parent))
try:
    from core.database import init_db
    init_db()
except Exception as _db_exc:
    logging.getLogger(__name__).warning(f"DB init skipped: {_db_exc}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for startup and shutdown"""
    # Startup
    logger.info("Starting PRISMA Backend API...")
    Config.ensure_directories()
    logger.info(f"Directories initialized: {Config.UPLOADS_DIR}, {Config.RESULTS_DIR}")
    logger.info(f"ML Pipeline available: {Config.check_ml_pipeline_available()}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down PRISMA Backend API...")


# Create FastAPI app
app = FastAPI(
    title="LogBot API",
    description=(
        "Logistics intelligence backend — demand forecasting (LightGBM / ETS / TFT), "
        "inventory optimization (Safety Stock, ROP, EOQ), rule-based decision engine, "
        "and supply chain alerts."
    ),
    version=__version__,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers — existing
app.include_router(upload_router)
app.include_router(forecast_router)
app.include_router(status_router)

# Register routers — new modules
app.include_router(inventory_router)
app.include_router(optimization_router)
app.include_router(alerts_router)
app.include_router(ingest_router)
app.include_router(chat_router)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "LogBot API",
        "version": __version__,
        "status": "operational",
        "endpoints": {
            "upload": "/upload",
            "forecast": "/forecast",
            "inventory": "/inventory",
            "optimization": "/optimization",
            "alerts": "/alerts",
            "ingest": "/ingest",
            "status": "/status/health",
            "docs": "/docs",
        },
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    import traceback
    error_traceback = traceback.format_exc()
    logger.error(f"Unhandled exception: {exc}")
    logger.error(f"Traceback:\n{error_traceback}")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error",
            "detail": str(exc),
            "traceback": error_traceback
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

