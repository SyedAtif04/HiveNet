"""POST /ingest — run the full CSV ingestion pipeline."""

import sys
import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

LOGBOT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(LOGBOT_ROOT))

from core.database import get_db
from ingestion.pipeline import run_ingestion_pipeline

router = APIRouter(prefix="/ingest", tags=["ingestion"])


class IngestRequest(BaseModel):
    data_path: str


@router.post("")
def run_ingest(data: IngestRequest, db: Session = Depends(get_db)):
    """
    Run the full ingestion pipeline on an uploaded CSV.

    Expects `data_path` to point to a CSV file already on disk
    (e.g. the path returned by POST /upload).

    On success, all logbot DB tables are populated and ML-ready
    CSVs are written to prisma_forecast/data/.
    """
    path = Path(data.data_path)
    if not path.exists():
        raise HTTPException(status_code=400, detail=f"File not found: {data.data_path}")
    if path.suffix.lower() != '.csv':
        raise HTTPException(status_code=400, detail="Only .csv files are supported")

    t0 = time.time()
    try:
        result = run_ingestion_pipeline(str(path), db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    result['duration_seconds'] = round(time.time() - t0, 2)
    return result
