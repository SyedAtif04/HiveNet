"""Chat/AI Assistant for logistics insights."""

import sys
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.database import get_db
from core.models import Inventory, LogAlert

router = APIRouter(prefix="", tags=["chat"])


@router.post("/chat")
async def chat(query: str, db: Session = Depends(get_db)):
    """AI chat endpoint for logistics insights."""
    response = _generate_logistics_response(query, db)
    return {"response": response}


def _generate_logistics_response(query: str, db: Session) -> str:
    """Generate response based on logistics data and query intent."""
    query_lower = query.lower()

    try:
        inventory = db.query(Inventory).all()
    except Exception:
        inventory = []

    try:
        alerts = db.query(LogAlert).all()
    except Exception:
        alerts = []

    # Stock risk queries
    if any(word in query_lower for word in ["stockout", "risk", "critical", "out of stock"]):
        critical = [inv for inv in inventory if inv.quantity <= 0 or (inv.quantity and inv.reorder_point and inv.quantity <= inv.reorder_point)]
        if critical:
            msg = f"**{len(critical)} items** at risk:\n\n"
            for i, inv in enumerate(critical[:3], 1):
                msg += f"{i}. **{inv.product_name}** — Qty: {inv.quantity}, ROP: {inv.reorder_point or 'N/A'}\n"
            return msg
        return "No items at stockout risk currently."

    # Demand/forecast queries
    elif any(word in query_lower for word in ["demand", "forecast", "predict", "quarter", "month"]):
        total_qty = sum(inv.quantity or 0 for inv in inventory)
        return f"**Total inventory**: {total_qty:,.0f} units across {len(inventory)} SKUs. Check the Forecasts page for detailed demand projections."

    # Reorder queries
    elif any(word in query_lower for word in ["reorder", "order", "purchase", "decision"]):
        low_stock = [inv for inv in inventory if inv.quantity and inv.reorder_point and inv.quantity < inv.reorder_point]
        msg = f"**Items needing reorder**: {len(low_stock)}\n\n"
        if low_stock:
            for inv in low_stock[:3]:
                msg += f"• {inv.product_name} — {inv.quantity} units (ROP: {inv.reorder_point})\n"
        else:
            msg += "All items are above reorder point."
        return msg

    # Supplier queries
    elif any(word in query_lower for word in ["supplier", "vendor", "performance"]):
        return "Check the Inventory page for supplier details and performance metrics."

    # SKU/inventory queries
    elif any(word in query_lower for word in ["sku", "product", "inventory", "stock"]):
        low_stock = [inv for inv in inventory if inv.quantity and inv.reorder_point and inv.quantity < inv.reorder_point]
        msg = f"**Inventory Overview:**\n- Total SKUs: {len(inventory)}\n- Low stock: {len(low_stock)}\n"
        if low_stock:
            msg += f"\n**Items below reorder point:**\n"
            for inv in low_stock[:3]:
                msg += f"• {inv.product_name} — {inv.quantity} units\n"
        return msg

    # Default summary
    else:
        low_stock = [inv for inv in inventory if inv.quantity and inv.reorder_point and inv.quantity < inv.reorder_point]
        critical = [inv for inv in inventory if inv.quantity and inv.quantity <= 0]
        return f"**Supply Chain Summary:**\n- Total SKUs: {len(inventory)}\n- Critical items: {len(critical)}\n- Low stock: {len(low_stock)}\n\nAsk about stockout risks, reorders, forecasts, or inventory status."
