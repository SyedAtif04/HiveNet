from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/transactions")
def create_transaction(data: schemas.TransactionCreate, db: Session = Depends(get_db)):
    transaction = models.Transaction(**data.dict())
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction