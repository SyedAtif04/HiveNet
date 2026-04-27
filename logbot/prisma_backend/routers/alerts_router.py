"""Supply chain alerts — threshold monitoring, stockout risk, alert management."""

import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.database import get_db
import core.models as m
from alerts.thresholds import check_thresholds
from alerts.stockout_model import predict_stockout_probability, train_stockout_model

sys.path.insert(0, str(Path(__file__).parent.parent))
from resolver import resolve_alert as _resolve_alert

router = APIRouter(prefix="/alerts", tags=["alerts"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class StockoutRiskRequest(BaseModel):
    product_name: str
    current_qty: float
    avg_daily_demand: float
    lead_time_days: float
    safety_stock: float = 0.0
    reorder_point: float = 0.0
    days_since_last_reorder: float = 30.0
    demand_std: float = 0.0


class TrainingRecord(BaseModel):
    current_qty: float
    avg_daily_demand: float
    lead_time_days: float
    safety_stock: float = 0.0
    reorder_point: float = 0.0
    days_since_last_reorder: float = 30.0
    demand_std: float = 0.0
    stockout_occurred: int


class ResolveAlertRequest(BaseModel):
    product_name: str
    alert_type: Optional[str] = None


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("")
def get_alerts(resolved: bool = False, db: Session = Depends(get_db)):
    """List alerts. ?resolved=true includes resolved ones."""
    query = db.query(m.LogAlert)
    if not resolved:
        query = query.filter(
            (m.LogAlert.resolved == False) | (m.LogAlert.resolved == None)
        )
    return query.order_by(m.LogAlert.triggered_at.desc()).all()


@router.post("/check")
def run_threshold_checks(db: Session = Depends(get_db)):
    """
    Scan the shared inventory table and create alerts for any product
    that is out of stock, below safety stock, or at/below reorder point.

    Resolves all previously open alerts first so the table always
    reflects current inventory state — no duplicates, no stale entries.
    """
    now = datetime.now(timezone.utc)

    # Load every open alert and resolve them individually via ORM so
    # the session cache stays consistent within this transaction.
    open_alerts = db.query(m.LogAlert).filter(
        (m.LogAlert.resolved == False) | (m.LogAlert.resolved == None)
    ).all()
    for alert in open_alerts:
        alert.resolved = True
        alert.resolved_at = now

    # Push resolved state to DB before creating new alerts.
    db.flush()

    items = db.query(m.Inventory).all()
    inventory_data = [
        {
            "sku_id": str(inv.id),
            "sku_name": inv.product_name,
            "current_qty": float(inv.quantity or 0),
            "reorder_point": float(inv.reorder_point or 0),
            "safety_stock": float(inv.safety_stock or 0),
        }
        for inv in items
    ]

    new_alerts = check_thresholds(inventory_data)
    created = []

    for a in new_alerts:
        sku = db.query(m.LogSKU).filter_by(name=a["sku_name"]).first()
        if not sku:
            sku = m.LogSKU(name=a["sku_name"])
            db.add(sku)
            db.flush()

        alert = m.LogAlert(
            sku_id=sku.id,
            alert_type=a["alert_type"],
            message=a["message"],
            severity=a["severity"],
        )
        db.add(alert)
        created.append(a)

    db.commit()
    return {
        "checked": len(inventory_data),
        "stale_alerts_resolved": len(open_alerts),
        "alerts_created": len(created),
        "items_ok": len(inventory_data) - len(created),
        "alerts": created,
    }


@router.post("/resolve")
def resolve_alert_by_name(req: ResolveAlertRequest, db: Session = Depends(get_db)):
    """Resolve the active alert for a product by name (and optional alert_type)."""
    alert = _resolve_alert(req.product_name, req.alert_type, db)
    alert.resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "resolved", "product_name": req.product_name, "alert_type": alert.alert_type}


@router.post("/{alert_id}/resolve", deprecated=True)
def resolve_alert_by_id(alert_id: str, db: Session = Depends(get_db)):
    """Deprecated: use POST /alerts/resolve with product_name instead."""
    alert = db.query(m.LogAlert).filter_by(id=alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "resolved", "alert_id": alert_id}


@router.post("/stockout-risk")
def get_stockout_risk(req: StockoutRiskRequest):
    """Predict stockout probability using the trained Logistic Regression model."""
    data = req.model_dump()
    data["sku_id"] = data.pop("product_name")
    prob = predict_stockout_probability(data)

    if prob < 0:
        return {
            "product_name": req.product_name,
            "stockout_probability": None,
            "risk_level": "unknown",
            "message": "Model not trained yet. POST labelled records to /alerts/train.",
        }

    risk = "low" if prob < 0.3 else "medium" if prob < 0.6 else "high"
    return {
        "product_name": req.product_name,
        "stockout_probability": prob,
        "risk_level": risk,
        "message": f"{prob * 100:.1f}% estimated stockout probability.",
    }


@router.post("/train")
def train_model(records: List[TrainingRecord]):
    """Train (or retrain) the Logistic Regression stockout classifier."""
    try:
        return train_stockout_model([r.model_dump() for r in records])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
