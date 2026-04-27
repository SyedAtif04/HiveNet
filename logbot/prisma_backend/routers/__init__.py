"""API routers"""

from .upload_controller import router as upload_router
from .forecast_controller import router as forecast_router
from .status_controller import router as status_router
from .inventory_router import router as inventory_router
from .optimization_router import router as optimization_router
from .alerts_router import router as alerts_router
from .ingest_router import router as ingest_router
from .chat_router import router as chat_router

__all__ = [
    "upload_router",
    "forecast_router",
    "status_router",
    "inventory_router",
    "optimization_router",
    "alerts_router",
    "ingest_router",
    "chat_router",
]

