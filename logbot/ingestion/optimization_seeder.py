"""Compute Safety Stock, ROP, and EOQ for every SKU and persist to Inventory."""

import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

LOGBOT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(LOGBOT_ROOT))

import core.models as m
from optimization.calculations import run_full_analysis
from .config import (
    ORDERING_COST,
    HOLDING_COST_RATE,
    DEFAULT_SERVICE_LEVEL,
    DEFAULT_LEAD_TIME_STD,
    DEFAULT_LEAD_TIME_DAYS,
)


def seed_optimization_params(db) -> List[Dict]:
    """
    For every SKU that has csv_import demand history:
      1. Compute avg_daily_demand and demand_std from LogDemandHistory
      2. Look up lead_time_days from the preferred LogSupplier
      3. Derive holding_cost_per_unit from unit_price (HOLDING_COST_RATE × price / 365)
      4. Call run_full_analysis() → write reorder_point, safety_stock, eoq to Inventory

    Returns a list of result dicts (one per SKU processed).
    """
    results: List[Dict] = []

    for sku in db.query(m.LogSKU).all():
        # Pull demand history (csv_import source only)
        history = (
            db.query(m.LogDemandHistory)
            .filter(
                m.LogDemandHistory.sku_id == sku.id,
                m.LogDemandHistory.source == 'csv_import',
            )
            .all()
        )
        if len(history) < 2:
            continue

        quantities = [float(h.quantity) for h in history]
        avg_daily = sum(quantities) / len(quantities)
        if avg_daily <= 0:
            continue

        demand_std = statistics.stdev(quantities) if len(quantities) >= 2 else 1.0

        # Inventory row — needed for unit_price and to write results back
        inv = db.query(m.Inventory).filter_by(product_name=sku.name).first()
        if not inv:
            continue

        unit_price = float(inv.unit_price or 1.0)
        holding_cost = max(0.01, HOLDING_COST_RATE * unit_price / 365.0)

        # Preferred supplier → lead time
        link = db.query(m.LogSKUSupplier).filter_by(sku_id=sku.id, preferred=True).first()
        if link:
            supplier = db.query(m.LogSupplier).filter_by(id=link.supplier_id).first()
            lead_time = float(supplier.lead_time_days) if supplier else float(DEFAULT_LEAD_TIME_DAYS)
        else:
            lead_time = float(DEFAULT_LEAD_TIME_DAYS)

        try:
            params = run_full_analysis(
                avg_daily_demand=avg_daily,
                demand_std=demand_std,
                lead_time_days=lead_time,
                lead_time_std=DEFAULT_LEAD_TIME_STD,
                ordering_cost=ORDERING_COST,
                holding_cost_per_unit=holding_cost,
                service_level=DEFAULT_SERVICE_LEVEL,
            )
        except Exception:
            continue

        inv.reorder_point = params['reorder_point']
        inv.safety_stock = params['safety_stock']
        inv.eoq = params['eoq']
        inv.last_updated = datetime.now(timezone.utc)

        results.append({'sku': sku.name, **params})

    db.commit()
    return results
