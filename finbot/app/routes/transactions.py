from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from datetime import datetime
from fastapi import HTTPException
from app.models import TransactionItem, Inventory
from app.services.categorizer import categorize

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

    # 👇 date parsing
    if "date" in data_dict and data_dict["date"]:
        try:
            data_dict["date"] = datetime.strptime(data_dict["date"], "%d-%m-%Y")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Date must be in format DD-MM-YYYY"
            )

    # ❗ remove items from dict before creating transaction
    items = data_dict.pop("items", [])

    if not data_dict.get("category") and items:
        item_names = [i["product_name"] for i in items]
        data_dict["category"] = categorize(item_names, data_dict.get("description", ""))

    # ✅ create transaction
    transaction = models.Transaction(**data_dict)

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    # ✅ add items + update inventory
    for item in items:
        db_item = TransactionItem(
            transaction_id=transaction.id,
            product_name=item["product_name"],
            quantity=item["quantity"],
            price=item["price"]
        )
        db.add(db_item)

        # 🔁 inventory update
        existing = db.query(Inventory).filter_by(
            product_name=item["product_name"]
        ).first()

        if not existing:
            existing = Inventory(
                product_name=item["product_name"],
                quantity=0
            )
            db.add(existing)

        existing.unit_price = item["price"]

        if transaction.type == "income":
            existing.quantity -= item["quantity"]
        else:
            existing.quantity += item["quantity"]

    db.commit()

    return transaction

@router.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction)\
        .order_by(models.Transaction.date.desc())\
        .all()
    return transactions

