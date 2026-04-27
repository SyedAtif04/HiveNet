"""Threshold-based supply chain alert generation."""

from datetime import datetime, timezone
from typing import List, Dict


def check_thresholds(inventory_items: List[Dict]) -> List[Dict]:
    """
    Evaluate threshold rules across all inventory items.

    Each item dict must contain:
        sku_id, sku_name, current_qty, reorder_point, safety_stock

    Returns a list of alert dicts (not yet persisted to DB).
    """
    alerts = []

    for item in inventory_items:
        sku_id = item["sku_id"]
        name = item.get("sku_name", sku_id)
        qty = float(item.get("current_qty", 0))
        rop = float(item.get("reorder_point", 0))
        ss = float(item.get("safety_stock", 0))
        now = datetime.now(timezone.utc).isoformat()

        if qty <= 0:
            alerts.append({
                "sku_id": sku_id,
                "sku_name": name,
                "alert_type": "out_of_stock",
                "severity": "critical",
                "message": f"[OUT OF STOCK] {name} — quantity is {qty}.",
                "triggered_at": now,
            })
        elif ss > 0 and qty <= ss:
            alerts.append({
                "sku_id": sku_id,
                "sku_name": name,
                "alert_type": "below_safety_stock",
                "severity": "high",
                "message": f"[BELOW SAFETY STOCK] {name} — qty {qty:.1f} < safety stock {ss:.1f}.",
                "triggered_at": now,
            })
        elif rop > 0 and qty <= rop:
            alerts.append({
                "sku_id": sku_id,
                "sku_name": name,
                "alert_type": "reorder_needed",
                "severity": "medium",
                "message": f"[REORDER NEEDED] {name} — qty {qty:.1f} has reached ROP {rop:.1f}.",
                "triggered_at": now,
            })

    return alerts
