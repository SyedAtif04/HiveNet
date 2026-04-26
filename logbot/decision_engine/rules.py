"""Rule-based reorder decision engine."""

from datetime import datetime, timezone
from typing import List, Dict

_PRIORITY_ORDER = ["critical", "high", "medium", "low"]


def check_reorder_needed(current_qty: float, rop: float) -> bool:
    """Return True when current stock is at or below the reorder point."""
    return current_qty <= rop


def generate_reorder_decisions(inventory_items: List[Dict]) -> List[Dict]:
    """
    Evaluate reorder decisions for a list of inventory items.

    Each item dict must contain:
        sku_id, sku_name, current_qty, reorder_point, eoq

    Returns a list of decision dicts sorted by priority (critical → low).
    """
    decisions = []

    for item in inventory_items:
        qty = float(item.get("current_qty", 0))
        rop = float(item.get("reorder_point", 0))
        eoq = float(item.get("eoq", 0))

        if qty <= 0:
            action, rationale, priority = (
                "URGENT_REORDER",
                "Stock fully depleted — immediate reorder required.",
                "critical",
            )
        elif qty <= rop:
            action, rationale, priority = (
                "REORDER",
                f"Quantity ({qty:.1f}) has reached or dropped below ROP ({rop:.1f}).",
                "high",
            )
        elif qty <= rop * 1.2:
            action, rationale, priority = (
                "MONITOR",
                f"Quantity ({qty:.1f}) is within 20% of ROP ({rop:.1f}). Consider reordering soon.",
                "medium",
            )
        else:
            action, rationale, priority = (
                "NO_ACTION",
                "Stock level is adequate.",
                "low",
            )

        decisions.append({
            "sku_id": item["sku_id"],
            "sku_name": item.get("sku_name", item["sku_id"]),
            "current_qty": qty,
            "reorder_point": rop,
            "recommended_order_qty": eoq if action in ("REORDER", "URGENT_REORDER") else 0,
            "action": action,
            "priority": priority,
            "rationale": rationale,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        })

    decisions.sort(key=lambda x: _PRIORITY_ORDER.index(x["priority"]))
    return decisions
