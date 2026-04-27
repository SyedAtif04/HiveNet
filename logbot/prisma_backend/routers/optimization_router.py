"""Inventory optimization — Safety Stock, ROP, EOQ, reorder decisions, supplier selection."""

import sys
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.database import get_db
import core.models as m
from optimization.calculations import (
    calculate_safety_stock,
    calculate_rop,
    calculate_eoq,
    run_full_analysis,
)
from decision_engine.rules import generate_reorder_decisions
from decision_engine.supplier_selection import select_optimal_supplier

router = APIRouter(prefix="/optimization", tags=["optimization"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    avg_daily_demand: float
    demand_std: float = 0.0
    lead_time_days: float
    lead_time_std: float = 1.0
    ordering_cost: float
    holding_cost_per_unit: float
    service_level: float = 0.95


class EOQRequest(BaseModel):
    annual_demand: float
    ordering_cost: float
    holding_cost_per_unit: float


class SafetyStockRequest(BaseModel):
    z_score: float = 1.645
    sigma_lead_time: float
    avg_demand: float


class ROPRequest(BaseModel):
    avg_demand: float
    lead_time: float
    safety_stock: float


class SupplierSelectionRequest(BaseModel):
    required_qty: float
    sku_name: Optional[str] = None     # filter by linked suppliers for this product
    weights: Optional[dict] = None


# ─── Calculation endpoints ────────────────────────────────────────────────────

@router.post("/analyze")
def full_analysis(req: AnalysisRequest):
    """Safety Stock + ROP + EOQ in one call."""
    try:
        return run_full_analysis(
            avg_daily_demand=req.avg_daily_demand,
            demand_std=req.demand_std,
            lead_time_days=req.lead_time_days,
            lead_time_std=req.lead_time_std,
            ordering_cost=req.ordering_cost,
            holding_cost_per_unit=req.holding_cost_per_unit,
            service_level=req.service_level,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/eoq")
def get_eoq(req: EOQRequest):
    try:
        return {"eoq": round(calculate_eoq(req.annual_demand, req.ordering_cost, req.holding_cost_per_unit), 2)}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/safety-stock")
def get_safety_stock(req: SafetyStockRequest):
    return {"safety_stock": round(calculate_safety_stock(req.z_score, req.sigma_lead_time, req.avg_demand), 2)}


@router.post("/rop")
def get_rop(req: ROPRequest):
    return {"reorder_point": round(calculate_rop(req.avg_demand, req.lead_time, req.safety_stock), 2)}


# ─── Decision engine endpoints ────────────────────────────────────────────────

@router.get("/decisions")
def get_reorder_decisions(db: Session = Depends(get_db)):
    """
    Rule-based reorder evaluation across ALL inventory rows (finbot + logbot).
    Only rows that have a reorder_point set will trigger REORDER actions.
    """
    items = db.query(m.Inventory).all()
    inventory_data = [
        {
            "sku_id": str(inv.id),
            "sku_name": inv.product_name,
            "current_qty": inv.quantity or 0,
            "reorder_point": inv.reorder_point or 0,
            "eoq": inv.eoq or 0,
        }
        for inv in items
    ]
    return generate_reorder_decisions(inventory_data)


@router.post("/select-supplier")
def select_supplier(req: SupplierSelectionRequest, db: Session = Depends(get_db)):
    """Select optimal supplier for a product using constraint-based optimization."""
    if req.sku_name:
        sku = db.query(m.LogSKU).filter_by(name=req.sku_name).first()
        if not sku:
            raise HTTPException(status_code=404, detail=f"SKU '{req.sku_name}' not found")
        links = db.query(m.LogSKUSupplier).filter_by(sku_id=sku.id).all()
        ids = [l.supplier_id for l in links]
        raw = db.query(m.LogSupplier).filter(m.LogSupplier.id.in_(ids)).all()
    else:
        raw = db.query(m.LogSupplier).all()

    if not raw:
        raise HTTPException(status_code=404, detail="No suppliers found")

    suppliers = [
        {
            "id": s.id,
            "name": s.name,
            "lead_time_days": s.lead_time_days,
            "min_order_qty": s.min_order_qty,
            "unit_cost": s.unit_cost,
            "reliability_score": s.reliability_score,
        }
        for s in raw
    ]
    return select_optimal_supplier(suppliers, req.required_qty, req.weights)
