"""Configuration for PRISMA backend"""

from pathlib import Path
from typing import Dict


class Config:
    """Configuration class for backend settings"""
    
    # Base directories
    BASE_DIR = Path(__file__).parent.parent
    UPLOADS_DIR = BASE_DIR / "uploads"
    RESULTS_DIR = BASE_DIR / "results"
    LOGS_DIR = BASE_DIR / "logs"
    
    # ML Pipeline directories
    ML_BASE_DIR = BASE_DIR.parent / "prisma_forecast"
    ML_DATA_DIR = ML_BASE_DIR / "data"
    ML_FORECASTS_DIR = ML_BASE_DIR / "forecasts"
    ML_MODELS_DIR = ML_BASE_DIR / "saved_models"
    CLI_SCRIPT = ML_BASE_DIR / "src" / "cli_new.py"
    
    # File upload settings
    MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB
    ALLOWED_EXTENSIONS = {".csv"}
    
    # Duration mappings
    DURATION_MAP: Dict[str, int] = {
        "3_months": 90,
        "6_months": 180,
        "12_months": 365,
    }
    
    DURATION_SHORT_MAP: Dict[str, str] = {
        "3m": "3_months",
        "6m": "6_months",
        "12m": "12_months",
    }
    
    # CORS settings
    CORS_ORIGINS = [
        "http://localhost:8080",
        "http://localhost:3000",
        "http://localhost:5173",  # Vite default port
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",  # Vite default port
    ]
    
    @classmethod
    def ensure_directories(cls):
        """Ensure all required directories exist"""
        cls.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        cls.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        cls.LOGS_DIR.mkdir(parents=True, exist_ok=True)
    
    @classmethod
    def get_forecast_filename(cls, horizon_days: int, comprehensive: bool = True) -> str:
        """Get forecast filename based on horizon"""
        if comprehensive:
            return f"forecast_comprehensive_{horizon_days}d.json"
        return f"forecast_{horizon_days}d.json"
    
    @classmethod
    def check_ml_pipeline_available(cls) -> bool:
        """Check if ML pipeline is available"""
        return cls.CLI_SCRIPT.exists()
    
    @classmethod
    def check_models_available(cls) -> bool:
        """Check if trained models are available"""
        if not cls.ML_MODELS_DIR.exists():
            return False
        return len(list(cls.ML_MODELS_DIR.glob("*.pkl"))) > 0

