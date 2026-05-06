"""Structured query functions for the LogBot chat pipeline.

Each function queries the database via SQLAlchemy ORM and returns a typed dict.
No LLM is involved — all data is real and deterministic.
"""

import json
import sys
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import func

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import core.models as m
from decision_engine.rules import generate_reorder_decisions
from alerts.stockout_model import predict_stockout_probability


# ─── Query functions ──────────────────────────────────────────────────────────

def query_stockout_risk(db: Session) -> dict:
    """Items at risk of stockout, using the trained model where available."""
    items = db.query(m.Inventory).all()
    if not items:
        return {"status": "no_data", "message": "No inventory data found."}

    critical, at_risk, safe = [], [], []

    for inv in items:
        qty = float(inv.quantity or 0)
        ss = float(inv.safety_stock or 0)
        rop = float(inv.reorder_point or 0)

        # Try ML model first; fall back to threshold comparison
        prob = predict_stockout_probability({
            "current_qty": qty,
            "avg_daily_demand": 0,
            "lead_time_days": 0,
            "safety_stock": ss,
            "reorder_point": rop,
            "days_since_last_reorder": 30,
            "demand_std": 0,
        })

        entry = {
            "name": inv.product_name,
            "qty": qty,
            "safety_stock": ss,
            "reorder_point": rop,
            "stockout_prob": prob if prob >= 0 else None,
        }

        if qty <= 0:
            critical.append(entry)
        elif (ss > 0 and qty <= ss) or (prob >= 0.7):
            at_risk.append(entry)
        else:
            safe.append(entry)

    return {
        "critical": critical,
        "at_risk": at_risk,
        "safe_count": len(safe),
        "total_items": len(items),
    }


def query_reorder_decisions(db: Session) -> dict:
    """Rule-based reorder classification for all inventory items."""
    items = db.query(m.Inventory).all()
    if not items:
        return {"status": "no_data", "message": "No inventory data found."}

    inventory_data = [
        {
            "sku_id": str(inv.id),
            "sku_name": inv.product_name,
            "current_qty": float(inv.quantity or 0),
            "reorder_point": float(inv.reorder_point or 0),
            "eoq": float(inv.eoq or 0),
        }
        for inv in items
    ]

    decisions = generate_reorder_decisions(inventory_data)

    urgent = [d for d in decisions if d["action"] == "URGENT_REORDER"]
    reorder = [d for d in decisions if d["action"] == "REORDER"]
    monitor = [d for d in decisions if d["action"] == "MONITOR"]
    no_action = [d for d in decisions if d["action"] == "NO_ACTION"]

    return {
        "urgent": urgent,
        "reorder": reorder,
        "monitor": monitor,
        "no_action_count": len(no_action),
        "total_items": len(decisions),
    }


def query_inventory_overview(db: Session) -> dict:
    """High-level inventory summary across all SKUs."""
    items = db.query(m.Inventory).all()
    if not items:
        return {"status": "no_data", "message": "No inventory data found."}

    # Join with log_skus for category info
    skus = db.query(m.LogSKU).all()
    sku_map = {s.name: s for s in skus}

    total_qty = sum(inv.quantity or 0 for inv in items)
    inventory_value = sum(
        (inv.quantity or 0) * (inv.unit_price or 0) for inv in items
    )

    critical = [
        inv for inv in items
        if (inv.quantity or 0) <= 0
        or (inv.safety_stock and (inv.quantity or 0) <= inv.safety_stock)
    ]
    low = [
        inv for inv in items
        if (inv.quantity or 0) > 0
        and inv.reorder_point
        and (inv.quantity or 0) <= inv.reorder_point
        and inv not in critical
    ]

    # Category breakdown
    cat_qty: dict = {}
    for inv in items:
        sku = sku_map.get(inv.product_name)
        cat = sku.category if sku and sku.category else "Uncategorized"
        cat_qty[cat] = cat_qty.get(cat, 0) + (inv.quantity or 0)

    categories = sorted(
        [{"category": k, "qty": v} for k, v in cat_qty.items()],
        key=lambda x: x["qty"],
        reverse=True,
    )

    return {
        "total_skus": len(items),
        "total_qty": total_qty,
        "critical_count": len(critical),
        "low_count": len(low),
        "inventory_value": round(inventory_value, 2),
        "categories": categories,
    }


def query_supplier_performance(db: Session) -> dict:
    """Supplier ranking by reliability score."""
    suppliers = db.query(m.LogSupplier).all()
    if not suppliers:
        return {"status": "no_data", "message": "No suppliers found."}

    ranked = sorted(suppliers, key=lambda s: s.reliability_score or 0, reverse=True)
    avg_lead = (
        sum(s.lead_time_days or 0 for s in suppliers) / len(suppliers)
        if suppliers else 0
    )

    return {
        "suppliers": [
            {
                "name": s.name,
                "lead_time_days": s.lead_time_days,
                "reliability_pct": round((s.reliability_score or 0) * 100, 1),
                "unit_cost": s.unit_cost,
                "min_order_qty": s.min_order_qty,
            }
            for s in ranked
        ],
        "avg_lead_time_days": round(avg_lead, 1),
        "best_supplier": ranked[0].name if ranked else None,
        "worst_supplier": ranked[-1].name if len(ranked) > 1 else None,
        "total_suppliers": len(suppliers),
    }


def query_demand_forecast(db: Session) -> dict:
    """Read the most recent forecast result JSON without triggering a new run."""
    results_dir = Path(__file__).parent.parent / "results"
    candidates = [
        ("90d", results_dir / "forecast_comprehensive_90d.json"),
        ("180d", results_dir / "forecast_comprehensive_180d.json"),
        ("365d", results_dir / "forecast_comprehensive_365d.json"),
    ]

    for horizon, path in candidates:
        if path.exists():
            try:
                data = json.loads(path.read_text())
                forecasts = data.get("forecasts") or data.get("predictions") or []
                if not forecasts:
                    continue

                # Total projected demand across all SKUs
                total_projected = sum(
                    f.get("total_demand", 0) or f.get("predicted_demand", 0)
                    for f in forecasts
                )
                # Top SKU by projected demand
                top = max(
                    forecasts,
                    key=lambda f: f.get("total_demand", 0) or f.get("predicted_demand", 0),
                    default=None,
                )

                return {
                    "horizon": horizon,
                    "total_projected": round(total_projected, 0),
                    "top_sku": top.get("material") or top.get("sku_name") if top else None,
                    "top_sku_demand": round(
                        (top.get("total_demand", 0) or top.get("predicted_demand", 0)), 0
                    ) if top else 0,
                    "num_skus_forecast": len(forecasts),
                }
            except Exception:
                continue

    return {
        "status": "no_forecast",
        "message": "No forecast results found. Upload a CSV and run a forecast from the Forecasts page first.",
    }


def query_active_alerts(db: Session) -> dict:
    """All unresolved supply chain alerts grouped by severity."""
    alerts = (
        db.query(m.LogAlert)
        .filter((m.LogAlert.resolved == False) | (m.LogAlert.resolved == None))
        .order_by(m.LogAlert.triggered_at.desc())
        .all()
    )

    if not alerts:
        return {"status": "no_alerts", "message": "No active alerts. All inventory levels are within thresholds."}

    def fmt(a):
        sku = db.query(m.LogSKU).filter_by(id=a.sku_id).first()
        return {
            "id": a.id,
            "product": sku.name if sku else "unknown",
            "alert_type": a.alert_type,
            "message": a.message,
            "triggered_at": a.triggered_at.strftime("%d-%m-%Y %H:%M") if a.triggered_at else "—",
        }

    critical = [fmt(a) for a in alerts if a.severity == "critical"]
    high = [fmt(a) for a in alerts if a.severity == "high"]
    medium = [fmt(a) for a in alerts if a.severity == "medium"]
    low = [fmt(a) for a in alerts if a.severity not in ("critical", "high", "medium")]

    skus_affected = len({a.sku_id for a in alerts})

    return {
        "critical": critical,
        "high": high,
        "medium": medium,
        "low": low,
        "total_count": len(alerts),
        "skus_affected": skus_affected,
    }


def query_optimization_metrics(db: Session) -> dict:
    """Summary of items with and without optimization parameters."""
    items = db.query(m.Inventory).all()
    if not items:
        return {"status": "no_data", "message": "No inventory data found."}

    with_rop = [inv for inv in items if inv.reorder_point]
    without_rop = [inv for inv in items if not inv.reorder_point]

    eoq_vals = [inv.eoq for inv in items if inv.eoq]
    ss_vals = [inv.safety_stock for inv in items if inv.safety_stock]

    return {
        "total_items": len(items),
        "items_with_optimization": len(with_rop),
        "items_missing_optimization": len(without_rop),
        "missing_optimization_names": [inv.product_name for inv in without_rop[:10]],
        "avg_safety_stock": round(sum(ss_vals) / len(ss_vals), 2) if ss_vals else 0,
        "avg_eoq": round(sum(eoq_vals) / len(eoq_vals), 2) if eoq_vals else 0,
        "items_with_rop": [
            {"name": inv.product_name, "rop": inv.reorder_point,
             "ss": inv.safety_stock, "eoq": inv.eoq}
            for inv in sorted(with_rop, key=lambda x: x.reorder_point or 0, reverse=True)[:10]
        ],
    }


def query_specific_sku(db: Session, sku_name: str) -> dict:
    """Deep-dive data for a single product."""
    inv = db.query(m.Inventory).filter_by(product_name=sku_name).first()
    if not inv:
        # Try case-insensitive partial match
        inv = (
            db.query(m.Inventory)
            .filter(m.Inventory.product_name.ilike(f"%{sku_name}%"))
            .first()
        )
    if not inv:
        return {"status": "not_found", "message": f"Product '{sku_name}' not found in inventory."}

    sku = db.query(m.LogSKU).filter_by(name=inv.product_name).first()

    # Active alerts for this SKU
    alerts = []
    if sku:
        raw_alerts = (
            db.query(m.LogAlert)
            .filter_by(sku_id=sku.id)
            .filter((m.LogAlert.resolved == False) | (m.LogAlert.resolved == None))
            .all()
        )
        alerts = [{"type": a.alert_type, "severity": a.severity, "message": a.message} for a in raw_alerts]

    # Supplier links
    supplier_links = []
    if sku:
        links = db.query(m.LogSKUSupplier).filter_by(sku_id=sku.id).all()
        for link in links:
            sup = db.query(m.LogSupplier).filter_by(id=link.supplier_id).first()
            if sup:
                supplier_links.append({
                    "supplier": sup.name,
                    "lead_time_days": sup.lead_time_days,
                    "unit_cost": sup.unit_cost,
                    "preferred": link.preferred,
                })

    return {
        "product_name": inv.product_name,
        "quantity": inv.quantity or 0,
        "unit_price": inv.unit_price,
        "reorder_point": inv.reorder_point,
        "safety_stock": inv.safety_stock,
        "eoq": inv.eoq,
        "warehouse_location": inv.warehouse_location,
        "category": sku.category if sku else None,
        "unit_of_measure": sku.unit_of_measure if sku else "units",
        "active_alerts": alerts,
        "suppliers": supplier_links,
    }
