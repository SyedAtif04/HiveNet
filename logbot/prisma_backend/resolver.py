"""
Name-to-ID resolver utilities.

Translates human-readable identifiers (product name, supplier name, alert type)
into internal UUIDs. All functions raise HTTP 404/409 on failure so callers
get actionable error messages.
"""

import sys
from pathlib import Path
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).parent.parent))

import core.models as m


def resolve_sku_id(name: str, db: Session) -> str:
    sku = db.query(m.LogSKU).filter_by(name=name).first()
    if not sku:
        raise HTTPException(status_code=404, detail=f"SKU '{name}' not found")
    return sku.id


def resolve_supplier_id(name: str, db: Session) -> str:
    supplier = db.query(m.LogSupplier).filter_by(name=name).first()
    if not supplier:
        raise HTTPException(status_code=404, detail=f"Supplier '{name}' not found")
    return supplier.id


def resolve_alert(product_name: str, alert_type: Optional[str], db: Session) -> m.LogAlert:
    sku = db.query(m.LogSKU).filter_by(name=product_name).first()
    if not sku:
        raise HTTPException(status_code=404, detail=f"SKU '{product_name}' not found")

    query = (
        db.query(m.LogAlert)
        .filter(m.LogAlert.sku_id == sku.id)
        .filter((m.LogAlert.resolved == False) | (m.LogAlert.resolved == None))
        .order_by(m.LogAlert.triggered_at.desc())
    )

    if alert_type:
        alert = query.filter(m.LogAlert.alert_type == alert_type).first()
        if not alert:
            raise HTTPException(
                status_code=404,
                detail=f"No active '{alert_type}' alert found for '{product_name}'",
            )
        return alert

    alerts = query.all()
    if not alerts:
        raise HTTPException(
            status_code=404,
            detail=f"No active alert found for '{product_name}'",
        )
    if len(alerts) > 1:
        active_types = [a.alert_type for a in alerts]
        raise HTTPException(
            status_code=409,
            detail=(
                f"Multiple active alerts exist for '{product_name}'. "
                f"Specify alert_type. Active types: {active_types}"
            ),
        )
    return alerts[0]
