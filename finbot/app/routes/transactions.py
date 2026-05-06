from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from datetime import datetime
from fastapi import HTTPException
from app.models import TransactionItem, Inventory
from app.services.categorizer import categorize
from app.services.finance import (
    calculate_summary, monthly_summary, predict_financials,
    generate_insights, format_finance_knowledge, get_embedding,
)
from app.models import KnowledgeBase

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _refresh_knowledge_base():
    """Recompute and replace the finance knowledge entry. Runs as a background task."""
    db = SessionLocal()
    try:
        transactions = db.query(models.Transaction).all()
        if not transactions:
            return
        summary = calculate_summary(transactions)
        monthly = monthly_summary(transactions)
        prediction = predict_financials(monthly)
        insights = generate_insights(monthly)
        content = format_finance_knowledge(summary, monthly, prediction, insights)
        embedding = get_embedding(content)
        db.query(KnowledgeBase).filter_by(source="finance").delete()
        db.add(KnowledgeBase(content=content, source="finance", embedding=embedding))
        db.commit()
    except Exception:
        pass
    finally:
        db.close()


@router.post("/transactions")
def create_transaction(data: schemas.TransactionCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
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

    background_tasks.add_task(_refresh_knowledge_base)

    return transaction

@router.get("/inventory/items")
def get_inventory_items(db: Session = Depends(get_db)):
    """Return inventory items for autocomplete suggestions."""
    items = db.query(Inventory).filter(Inventory.product_name.isnot(None)).all()
    return [
        {"product_name": i.product_name, "unit_price": i.unit_price or 0, "quantity": i.quantity or 0}
        for i in items
    ]


@router.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction)\
        .order_by(models.Transaction.date.desc())\
        .all()
    return transactions

@router.get("/transactions/{transaction_id}/items")
def get_transaction_items(transaction_id: str, db: Session = Depends(get_db)):
    items = db.query(TransactionItem)\
        .filter(TransactionItem.transaction_id == transaction_id)\
        .all()
    return items

