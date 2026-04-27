"""File handling service"""

import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException
import aiofiles
from .config import Config


async def validate_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in Config.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(Config.ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size (read in chunks to avoid memory issues)
    file_size = 0
    chunk_size = 1024 * 1024  # 1 MB chunks
    
    while chunk := await file.read(chunk_size):
        file_size += len(chunk)
        if file_size > Config.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {Config.MAX_UPLOAD_SIZE / (1024*1024):.0f} MB"
            )
    
    # Reset file pointer
    await file.seek(0)


async def save_upload(file: UploadFile) -> tuple[Path, int]:
    """Save uploaded file to uploads directory"""
    Config.ensure_directories()
    
    file_path = Config.UPLOADS_DIR / file.filename
    file_size = 0
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        while chunk := await file.read(1024 * 1024):  # 1 MB chunks
            file_size += len(chunk)
            await f.write(chunk)
    
    return file_path, file_size


def copy_to_ml_data(file_path: Path) -> Path:
    """Copy uploaded file to ML pipeline data directory"""
    ml_data_path = Config.ML_DATA_DIR / file_path.name
    shutil.copy2(file_path, ml_data_path)
    return ml_data_path


def clear_results_directory() -> None:
    """Clear results directory"""
    if Config.RESULTS_DIR.exists():
        for file in Config.RESULTS_DIR.glob("*"):
            if file.is_file():
                file.unlink()


def copy_forecast_to_results(horizon_days: int) -> Path:
    """Copy forecast file from ML forecasts to results directory"""
    # Try comprehensive format first
    forecast_filename = Config.get_forecast_filename(horizon_days, comprehensive=True)
    source_path = Config.ML_FORECASTS_DIR / forecast_filename
    
    if not source_path.exists():
        # Try non-comprehensive format
        forecast_filename = Config.get_forecast_filename(horizon_days, comprehensive=False)
        source_path = Config.ML_FORECASTS_DIR / forecast_filename
    
    if not source_path.exists():
        raise FileNotFoundError(f"Forecast file not found: {forecast_filename}")
    
    dest_path = Config.RESULTS_DIR / forecast_filename
    shutil.copy2(source_path, dest_path)
    
    return dest_path

