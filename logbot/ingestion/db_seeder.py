"""Seed all logbot DB tables from the processed CSV DataFrames."""

import json
import sys
import uuid
import statistics
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import pandas as pd

LOGBOT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(LOGBOT_ROOT))

import core.models as m
from .config import (
    RELIABLE_DELIVERY_STATUSES,
    STOCKOUT_TRAINING_DATA_PATH,
    DEFAULT_LEAD_TIME_DAYS,
)


def seed_database(df_daily: pd.DataFrame, df_clean: pd.DataFrame, db) -> Dict:
    """
    Seed LogSKU, Inventory, LogSupplier, LogSKUSupplier, and LogDemandHistory.
    Idempotent: deletes previous csv_import demand records before re-inserting.

    Returns counts of rows created/updated.
    """
    # ── Clear previous csv_import demand records ───────────────────────────────
    db.query(m.LogDemandHistory).filter(
        m.LogDemandHistory.source == 'csv_import'
    ).delete(synchronize_session=False)
    db.commit()

    # ── Compute per-SKU metadata ───────────────────────────────────────────────
    sku_meta: Dict[str, Dict] = {}
    for sku_name, grp in df_daily.groupby('sku_name'):
        sku_meta[str(sku_name)] = {
            'category': grp['category'].iloc[0] if 'category' in grp.columns else None,
            'department': str(grp['department'].iloc[0]) if 'department' in grp.columns else 'Unknown',
            'unit_price': float(grp['unit_price'].mean()) if 'unit_price' in grp.columns else 0.0,
        }

    # ── Compute per-department supplier stats (from raw transaction rows) ──────
    supplier_stats: Dict[str, Dict] = {}
    if 'department' in df_clean.columns and 'lead_time_days' in df_clean.columns:
        for dept, grp in df_clean.groupby('department'):
            on_time_rate = 0.0
            if 'delivery_status' in grp.columns:
                on_time_rate = float(
                    grp['delivery_status'].isin(RELIABLE_DELIVERY_STATUSES).mean()
                )
            supplier_stats[str(dept)] = {
                'lead_time_days': max(1, int(round(float(grp['lead_time_days'].mean())))),
                'unit_cost': round(float(grp['unit_price'].mean() if 'unit_price' in grp.columns else 1.0), 2),
                'reliability_score': round(on_time_rate, 4),
            }

    # ── 1. Seed LogSKU ─────────────────────────────────────────────────────────
    skus_created = 0
    sku_id_map: Dict[str, str] = {}  # sku_name → sku.id

    for sku_name, meta in sku_meta.items():
        existing = db.query(m.LogSKU).filter_by(name=sku_name).first()
        if existing:
            sku_id_map[sku_name] = existing.id
        else:
            sku_id = str(uuid.uuid4())
            sku = m.LogSKU(
                id=sku_id,
                name=sku_name,
                category=meta['category'],
                description=f"Department: {meta['department']}",
                unit_of_measure='units',
            )
            db.add(sku)
            sku_id_map[sku_name] = sku_id
            skus_created += 1

    db.flush()

    # ── 2. Upsert Inventory rows ───────────────────────────────────────────────
    inv_updated = 0
    for sku_name, meta in sku_meta.items():
        inv = db.query(m.Inventory).filter_by(product_name=sku_name).first()
        if not inv:
            inv = m.Inventory(product_name=sku_name, quantity=0)
            db.add(inv)
        if meta['unit_price'] > 0:
            inv.unit_price = round(meta['unit_price'], 2)
        inv_updated += 1

    db.commit()

    # ── 3. Seed LogSupplier ────────────────────────────────────────────────────
    suppliers_created = 0
    supplier_id_map: Dict[str, str] = {}  # dept_name → supplier.id

    for dept_name, stats in supplier_stats.items():
        existing = db.query(m.LogSupplier).filter_by(name=dept_name).first()
        if existing:
            supplier_id_map[dept_name] = existing.id
        else:
            supplier_id = str(uuid.uuid4())
            supplier = m.LogSupplier(
                id=supplier_id,
                name=dept_name,
                lead_time_days=stats['lead_time_days'],
                unit_cost=stats['unit_cost'],
                reliability_score=stats['reliability_score'],
                min_order_qty=1.0,
            )
            db.add(supplier)
            supplier_id_map[dept_name] = supplier_id
            suppliers_created += 1

    db.commit()

    # ── 4. Seed LogSKUSupplier links ───────────────────────────────────────────
    for sku_name, meta in sku_meta.items():
        dept = meta['department']
        if dept not in supplier_id_map:
            continue
        sku_id = sku_id_map[sku_name]
        supplier_id = supplier_id_map[dept]
        existing = db.query(m.LogSKUSupplier).filter_by(
            sku_id=sku_id, supplier_id=supplier_id
        ).first()
        if not existing:
            db.add(m.LogSKUSupplier(
                id=str(uuid.uuid4()),
                sku_id=sku_id,
                supplier_id=supplier_id,
                preferred=True,
            ))

    db.commit()

    # ── 5. Bulk-insert LogDemandHistory ────────────────────────────────────────
    demand_objects = []
    for _, row in df_daily.iterrows():
        sku_id = sku_id_map.get(str(row['sku_name']))
        if sku_id is None:
            continue
        date_val = row['date']
        if hasattr(date_val, 'to_pydatetime'):
            date_val = date_val.to_pydatetime()
        demand_objects.append(m.LogDemandHistory(
            id=str(uuid.uuid4()),
            sku_id=sku_id,
            date=date_val,
            quantity=float(row['quantity_used']),
            source='csv_import',
        ))

    chunk_size = 1000
    for i in range(0, len(demand_objects), chunk_size):
        db.bulk_save_objects(demand_objects[i:i + chunk_size])
    db.commit()

    return {
        'skus_created': skus_created,
        'suppliers_created': suppliers_created,
        'demand_records_inserted': len(demand_objects),
        'inventory_rows_updated': inv_updated,
    }


def generate_stockout_training_data(db) -> List[Dict]:
    """
    Simulate inventory trajectories for each SKU to produce labeled records
    for training the Logistic Regression stockout classifier.

    Feature keys match alerts/stockout_model.py::_FEATURE_KEYS exactly.
    """
    training_records: List[Dict] = []

    skus = db.query(m.LogSKU).all()

    for sku in skus:
        inv = db.query(m.Inventory).filter_by(product_name=sku.name).first()
        if not inv or inv.reorder_point is None or inv.safety_stock is None:
            continue

        history = (
            db.query(m.LogDemandHistory)
            .filter(
                m.LogDemandHistory.sku_id == sku.id,
                m.LogDemandHistory.source == 'csv_import',
            )
            .order_by(m.LogDemandHistory.date)
            .all()
        )
        if len(history) < 10:
            continue

        quantities = [float(h.quantity) for h in history]
        avg_daily = sum(quantities) / len(quantities)
        demand_std = statistics.stdev(quantities) if len(quantities) >= 2 else 1.0
        safety_stock = float(inv.safety_stock)
        rop = float(inv.reorder_point)
        eoq = float(inv.eoq) if inv.eoq else max(avg_daily * 30, 1.0)

        # Get lead time from preferred supplier
        link = db.query(m.LogSKUSupplier).filter_by(sku_id=sku.id, preferred=True).first()
        if link:
            supplier = db.query(m.LogSupplier).filter_by(id=link.supplier_id).first()
            lead_time = float(supplier.lead_time_days) if supplier else float(DEFAULT_LEAD_TIME_DAYS)
        else:
            lead_time = float(DEFAULT_LEAD_TIME_DAYS)

        # Simulate inventory trajectory day by day
        current_qty = max(safety_stock * 3.0, avg_daily * 30.0)
        days_since_last_reorder = 0

        for daily_qty in quantities:
            current_qty -= daily_qty
            days_since_last_reorder += 1

            if current_qty <= rop:
                current_qty += eoq
                days_since_last_reorder = 0

            # Label: stockout risk if remaining qty < expected demand over lead time
            stockout_occurred = 1 if current_qty < (avg_daily * lead_time) else 0

            training_records.append({
                'current_qty': round(float(current_qty), 2),
                'avg_daily_demand': round(avg_daily, 4),
                'lead_time_days': lead_time,
                'safety_stock': round(safety_stock, 2),
                'reorder_point': round(rop, 2),
                'days_since_last_reorder': days_since_last_reorder,
                'demand_std': round(demand_std, 4),
                'stockout_occurred': stockout_occurred,
            })

    return training_records


def save_stockout_training_data(data: List[Dict]) -> str:
    """Write stockout training records to disk. Returns the file path as a string."""
    STOCKOUT_TRAINING_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(STOCKOUT_TRAINING_DATA_PATH, 'w') as f:
        json.dump(data, f)
    return str(STOCKOUT_TRAINING_DATA_PATH)
