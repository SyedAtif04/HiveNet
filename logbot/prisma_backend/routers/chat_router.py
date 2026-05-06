"""Chat/AI Assistant for logistics insights."""

import sys
from pathlib import Path

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.database import get_db
from core.models import Inventory
from services import chat_queries as cq
from services import response_templates as rt
from services.session import get_or_create_session, get_last_intent, save_turn
from services import intent_router as ir
from services.nlp import parse_query, fuzzy_match_sku

router = APIRouter(prefix="", tags=["chat"])


@router.post("/chat")
async def chat(request: Request, db: Session = Depends(get_db)):
    """Chat endpoint — accepts JSON body or legacy ?query= param."""
    query_text = request.query_params.get("query", "")
    session_id_in = None

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            query_text = body.get("query", query_text)
            session_id_in = body.get("session_id")
        except Exception:
            pass

    if not query_text:
        return {"response": "Please provide a query.", "session_id": None}

    session_id = get_or_create_session(session_id_in, "logbot", db)

    last_intent = get_last_intent(session_id, db)
    intent, data = _route_and_fetch(query_text, db, last_intent)

    response = _render(intent, data)

    save_turn(session_id, query_text, response, intent, db)
    return {"response": response, "session_id": session_id}


# ─── Intent routing table ────────────────────────────────────────────────────

_INTENT_KEYWORDS: list[tuple[str, list[str]]] = [
    ("STOCKOUT_RISK", [
        "stockout", "out of stock", "stock risk", "running out", "critical stock",
        "at risk", "going to run out", "which items are at risk",
    ]),
    ("REORDER_DECISIONS", [
        "reorder", "what to reorder", "purchase order", "order decisions",
        "what needs to be ordered", "urgent order", "what should i order",
    ]),
    ("SUPPLIER_PERFORMANCE", [
        "supplier", "vendor", "supplier performance", "reliable supplier",
        "best supplier", "worst supplier", "lead time", "supplier ranking",
    ]),
    ("DEMAND_FORECAST", [
        "demand forecast", "forecast", "predict demand", "projected demand",
        "demand prediction", "future demand", "demand next",
    ]),
    ("ACTIVE_ALERTS", [
        "active alerts", "alerts", "warnings", "supply chain alerts",
        "show alerts", "critical alerts", "unresolved alerts",
    ]),
    ("OPTIMIZATION_METRICS", [
        "safety stock", "eoq", "reorder point", "economic order quantity",
        "optimization", "rop", "ss values", "optimization metrics",
    ]),
    ("SPECIFIC_SKU", [
        "tell me about", "show me", "details for", "info on", "what about",
        "how much stock", "stock level for",
    ]),
    ("INVENTORY_OVERVIEW", [
        "inventory overview", "inventory summary", "total inventory",
        "inventory status", "stock overview", "total skus", "all products",
        "inventory", "stock", "products",
    ]),
]


def _extract_sku_hint(query: str) -> str | None:
    """Extract a potential product name from the query using regex trigger words."""
    import re
    m = re.search(r"\b(?:about|for|on|me|regarding|details?|info(?:rmation)?)\s+(.+)", query.lower())
    return m.group(1).strip() if m else None


def _detect_intent(query: str, last_intent: str | None, parsed=None) -> tuple[str, str | None]:
    """Return (intent, sku_hint) using spaCy + semantic router + keyword fallback."""
    if parsed is None:
        parsed = parse_query(query)

    # Follow-up detection via spaCy
    if last_intent and parsed.is_followup:
        return last_intent, None

    # Try semantic router first
    sku_hint = _extract_sku_hint(query)
    # Also check spaCy entities for SKU hints
    if parsed.entities and not sku_hint:
        sku_hint = parsed.entities[0]

    try:
        intent, confidence = ir.route(query)
        if intent != "UNKNOWN":
            if intent == "SPECIFIC_SKU" and not sku_hint:
                pass  # fall through — can't do SPECIFIC_SKU without a product name
            else:
                return intent, sku_hint
    except Exception:
        pass

    # Keyword fallback
    q = query.lower()
    for intent, phrases in _INTENT_KEYWORDS:
        if any(phrase in q for phrase in phrases):
            if intent == "SPECIFIC_SKU" and not sku_hint:
                continue
            return intent, sku_hint

    return "UNKNOWN", sku_hint


def _route_and_fetch(query: str, db: Session, last_intent: str | None) -> tuple[str, dict]:
    """Detect intent, call the right query function, return (intent, data)."""
    parsed = parse_query(query)
    intent, sku_hint = _detect_intent(query, last_intent, parsed)

    if intent == "STOCKOUT_RISK":
        return intent, cq.query_stockout_risk(db)
    if intent == "REORDER_DECISIONS":
        return intent, cq.query_reorder_decisions(db)
    if intent == "INVENTORY_OVERVIEW":
        return intent, cq.query_inventory_overview(db)
    if intent == "SUPPLIER_PERFORMANCE":
        return intent, cq.query_supplier_performance(db)
    if intent == "DEMAND_FORECAST":
        return intent, cq.query_demand_forecast(db)
    if intent == "ACTIVE_ALERTS":
        return intent, cq.query_active_alerts(db)
    if intent == "OPTIMIZATION_METRICS":
        return intent, cq.query_optimization_metrics(db)
    if intent == "SPECIFIC_SKU":
        # Fuzzy-match the hint against known inventory names
        if sku_hint:
            known = [inv.product_name for inv in db.query(Inventory).all()]
            matched = fuzzy_match_sku(sku_hint, known)
            sku_hint = matched or sku_hint
        return intent, cq.query_specific_sku(db, sku_hint or "")
    return "UNKNOWN", {}


def _render(intent: str, data: dict) -> str:
    """Dispatch to the correct template renderer."""
    if intent == "STOCKOUT_RISK":
        return rt.render_stockout_risk(data)
    if intent == "REORDER_DECISIONS":
        return rt.render_reorder_decisions(data)
    if intent == "INVENTORY_OVERVIEW":
        return rt.render_inventory_overview(data)
    if intent == "SUPPLIER_PERFORMANCE":
        return rt.render_supplier_performance(data)
    if intent == "DEMAND_FORECAST":
        return rt.render_demand_forecast(data)
    if intent == "ACTIVE_ALERTS":
        return rt.render_active_alerts(data)
    if intent == "OPTIMIZATION_METRICS":
        return rt.render_optimization_metrics(data)
    if intent == "SPECIFIC_SKU":
        return rt.render_specific_sku(data)
    return rt.render_unknown()
