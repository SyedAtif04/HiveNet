from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from datetime import datetime
from fastapi import HTTPException

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/transactions")
def create_transaction(data: schemas.TransactionCreate, db: Session = Depends(get_db)):
    data_dict = data.dict(exclude_unset=True)

    # 👇 date parsing + error handling
    if "date" in data_dict and data_dict["date"]:
        try:
            data_dict["date"] = datetime.strptime(data_dict["date"], "%d-%m-%Y")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Date must be in format DD-MM-YYYY"
            )

    transaction = models.Transaction(**data_dict)

    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction

@router.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction)\
        .order_by(models.Transaction.date.desc())\
        .all()
    return transactions