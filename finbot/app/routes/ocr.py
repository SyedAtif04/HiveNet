from fastapi import APIRouter, UploadFile, File, Depends
import pytesseract
from PIL import Image
import io
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from app.models import TransactionItem, Inventory
from app.services.ocr_parser import parse_bill_text
from app.services.categorizer import categorize

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/ocr")
def extract_text(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = file.file.read()
    image = Image.open(io.BytesIO(contents))

    text = pytesseract.image_to_string(image)
    parsed = parse_bill_text(text)

    item_names = [item["product_name"] for item in parsed["items"]]
    category = categorize(item_names)

    # Create transaction record
    transaction = models.Transaction(
        type=parsed["type"],
        amount=parsed["amount"],
        category=category,
        description="Imported via OCR",
        date=datetime.now(timezone.utc)
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    # Create transaction items and update inventory
    for item in parsed["items"]:
        db.add(TransactionItem(
            transaction_id=transaction.id,
            product_name=item["product_name"],
            quantity=item["quantity"],
            price=item["price"]
        ))

        existing = db.query(Inventory).filter_by(
            product_name=item["product_name"]
        ).first()

        if not existing:
            existing = Inventory(product_name=item["product_name"], quantity=0)
            db.add(existing)

        existing.unit_price = item["price"]

        if transaction.type == "income":
            existing.quantity -= item["quantity"]
        else:
            existing.quantity += item["quantity"]

    db.commit()

    return {
        "text": text,
        "parsed": parsed,
        "transaction_id": str(transaction.id)
    }