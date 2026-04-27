"""Inventory management — SKUs, suppliers, stock levels, demand history."""

import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.database import get_db
import core.models as m
from resolver import resolve_supplier_id

router = APIRouter(prefix="/inventory", tags=["inventory"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class SKUCreate(BaseModel):
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    unit_of_measure: str = "units"


class SupplierCreate(BaseModel):
    name: str
    lead_time_days: int = 7
    min_order_qty: float = 1.0
    unit_cost: float
    reliability_score: float = 1.0
    contact_info: Optional[str] = None


class LinkSupplierRequest(BaseModel):
    sku_name: str        # matches inventory.product_name
    supplier_name: str
    preferred: bool = False


class StockUpdate(BaseModel):
    product_name: str    # shared key with finbot
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    reorder_point: Optional[float] = None
    safety_stock: Optional[float] = None
    eoq: Optional[float] = None
    warehouse_location: Optional[str] = None


class DemandRecord(BaseModel):
    sku_name: str        # matches inventory.product_name / log_skus.name
    date: str            # YYYY-MM-DD
    quantity: float
    source: str = "manual"


# ─── SKU endpoints ───────────────────────────────────────────────────────────

@router.post("/skus", status_code=201)
def create_sku(data: SKUCreate, db: Session = Depends(get_db)):
    """
    Creates a log_skus metadata row AND upserts an inventory row.
    This makes the product visible to both finbot and logbot immediately.
    """
    # log_skus metadata
    sku = db.query(m.LogSKU).filter_by(name=data.name).first()
    if not sku:
        sku = m.LogSKU(**data.model_dump())
        db.add(sku)

    # shared inventory row
    inv = db.query(m.Inventory).filter_by(product_name=data.name).first()
    if not inv:
        inv = m.Inventory(product_name=data.name, quantity=0)
        db.add(inv)

    db.commit()
    db.refresh(sku)
    return {"sku": sku, "inventory_product_name": data.name}


@router.get("/skus")
def list_skus(db: Session = Depends(get_db)):
    return db.query(m.LogSKU).all()


@router.get("/skus/{sku_name}")
def get_sku(sku_name: str, db: Session = Depends(get_db)):
    sku = db.query(m.LogSKU).filter_by(name=sku_name).first()
    if not sku:
        raise HTTPException(status_code=404, detail=f"SKU '{sku_name}' not found")
    inv = db.query(m.Inventory).filter_by(product_name=sku.name).first()
    return {"sku": sku, "inventory": inv}


# ─── Supplier endpoints ───────────────────────────────────────────────────────

@router.post("/suppliers", status_code=201)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    supplier = m.LogSupplier(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/suppliers")
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(m.LogSupplier).all()


@router.post("/suppliers/link")
def link_supplier(data: LinkSupplierRequest, db: Session = Depends(get_db)):
    sku = db.query(m.LogSKU).filter_by(name=data.sku_name).first()
    if not sku:
        raise HTTPException(status_code=404, detail=f"SKU '{data.sku_name}' not found in log_skus")
    supplier_id = resolve_supplier_id(data.supplier_name, db)
    link = m.LogSKUSupplier(sku_id=sku.id, supplier_id=supplier_id, preferred=data.preferred)
    db.add(link)
    db.commit()
    return {"status": "linked", "sku_name": data.sku_name, "supplier_name": data.supplier_name}


# ─── Stock level endpoints ────────────────────────────────────────────────────

@router.get("/stock")
def get_all_stock(db: Session = Depends(get_db)):
    """Returns the full shared inventory table — includes finbot-imported products."""
    return db.query(m.Inventory).all()


@router.get("/stock/{product_name}")
def get_stock(product_name: str, db: Session = Depends(get_db)):
    inv = db.query(m.Inventory).filter_by(product_name=product_name).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Product not found in inventory")
    return inv


@router.post("/stock")
def update_stock(data: StockUpdate, db: Session = Depends(get_db)):
    """Update any inventory field by product_name. Creates the row if missing."""
    inv = db.query(m.Inventory).filter_by(product_name=data.product_name).first()
    if not inv:
        inv = m.Inventory(product_name=data.product_name, quantity=0)
        db.add(inv)

    if data.quantity is not None:
        inv.quantity = data.quantity
    if data.unit_price is not None:
        inv.unit_price = data.unit_price
    if data.reorder_point is not None:
        inv.reorder_point = data.reorder_point
    if data.safety_stock is not None:
        inv.safety_stock = data.safety_stock
    if data.eoq is not None:
        inv.eoq = data.eoq
    if data.warehouse_location is not None:
        inv.warehouse_location = data.warehouse_location

    inv.last_updated = datetime.now(timezone.utc)
    db.commit()
    db.refresh(inv)
    return inv


# ─── Demand history endpoints ─────────────────────────────────────────────────

@router.post("/demand", status_code=201)
def record_demand(data: DemandRecord, db: Session = Depends(get_db)):
    sku = db.query(m.LogSKU).filter_by(name=data.sku_name).first()
    if not sku:
        raise HTTPException(status_code=404, detail=f"SKU '{data.sku_name}' not found. Create it first via POST /inventory/skus")
    record = m.LogDemandHistory(
        sku_id=sku.id,
        date=datetime.strptime(data.date, "%Y-%m-%d"),
        quantity=data.quantity,
        source=data.source,
    )
    db.add(record)
    db.commit()
    return {"status": "recorded", "sku_name": data.sku_name, "date": data.date}


@router.get("/demand/{sku_name}")
def get_demand_history(sku_name: str, db: Session = Depends(get_db)):
    sku = db.query(m.LogSKU).filter_by(name=sku_name).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    return db.query(m.LogDemandHistory).filter_by(sku_id=sku.id).order_by(m.LogDemandHistory.date).all()
