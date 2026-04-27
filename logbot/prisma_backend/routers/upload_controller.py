"""Upload controller for file uploads"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from datetime import datetime
from ..models.response_models import UploadResponse
from ..services.file_service import validate_file, save_upload, copy_to_ml_data, clear_results_directory
from ..services.config import Config

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload a CSV dataset file"""
    try:
        # Validate file
        await validate_file(file)
        
        # Clear previous results
        clear_results_directory()
        
        # Save file
        file_path, file_size = await save_upload(file)
        
        # Copy to ML data directory
        ml_data_path = copy_to_ml_data(file_path)
        
        return UploadResponse(
            status="success",
            filename=file.filename,
            path=str(ml_data_path),
            size_bytes=file_size,
            uploaded_at=datetime.now().isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/info")
async def get_upload_info():
    """Get upload configuration information"""
    uploads_count = len(list(Config.UPLOADS_DIR.glob("*"))) if Config.UPLOADS_DIR.exists() else 0
    
    return {
        "max_size_mb": Config.MAX_UPLOAD_SIZE / (1024 * 1024),
        "allowed_extensions": list(Config.ALLOWED_EXTENSIONS),
        "upload_directory": str(Config.UPLOADS_DIR),
        "uploads_count": uploads_count
    }

