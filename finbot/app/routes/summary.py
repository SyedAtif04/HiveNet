from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal
from app import models
from app.services.finance import (
    calculate_summary,
    monthly_summary,
    predict_financials,
    generate_insights,
    category_summary,
    parse_date,
    format_finance_knowledge,
    get_embedding,
)
from app.models import KnowledgeBase
from app.services import chat_queries as cq
from app.services import response_templates as rt
from app.services.session import get_or_create_session, load_history, get_last_intent, save_turn
from app.services import intent_router as ir
from app.services.nlp import parse_query
import numpy as np
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/summary")
def get_summary(
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction)

    if start_date:
        query = query.filter(models.Transaction.date >= parse_date(start_date))

    if end_date:
        query = query.filter(models.Transaction.date <= parse_date(end_date))

    transactions = query.all()

    return calculate_summary(transactions)

@router.get("/summary/monthly")
def get_monthly_summary(
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction)

    if start_date:
        query = query.filter(models.Transaction.date >= parse_date(start_date))

    if end_date:
        query = query.filter(models.Transaction.date <= parse_date(end_date))

    transactions = query.all()

    return {"monthly": monthly_summary(transactions)}


@router.get("/summary/predict")
def get_prediction(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).all()

    monthly = monthly_summary(transactions)
    prediction = predict_financials(monthly)

    return prediction

@router.get("/summary/insights")
def get_full_insights(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).all()

    summary = calculate_summary(transactions)
    monthly = monthly_summary(transactions)
    prediction = predict_financials(monthly)
    insights = generate_insights(monthly)

    content = format_finance_knowledge(summary, monthly, prediction, insights)
    embedding = get_embedding(content)

    knowledge = KnowledgeBase(
    content=content,
    source="finance",
    embedding=embedding
)

    db.add(knowledge)
    db.commit()

    return {
        "summary": summary,
        "monthly": monthly,
        "prediction": prediction,
        "insights": insights
    }

@router.get("/summary/alerts")
def get_financial_alerts(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).all()
    if not transactions:
        return []

    alerts = []
    monthly = monthly_summary(transactions)
    summary = calculate_summary(transactions)
    cats = category_summary(transactions)

    # Expense spike: month-over-month > 15%
    for i in range(1, len(monthly)):
        prev_exp = monthly[i - 1]["expense"]
        curr_exp = monthly[i]["expense"]
        if prev_exp > 0:
            change = (curr_exp - prev_exp) / prev_exp * 100
            if change >= 15:
                alerts.append({
                    "level": "error",
                    "message": f"Expense spike in {monthly[i]['month']} — +{change:.0f}% vs prior month",
                    "time": monthly[i]["month"],
                })

    # Income drop: month-over-month > 20%
    for i in range(1, len(monthly)):
        prev_inc = monthly[i - 1]["income"]
        curr_inc = monthly[i]["income"]
        if prev_inc > 0:
            change = (curr_inc - prev_inc) / prev_inc * 100
            if change <= -20:
                alerts.append({
                    "level": "warning",
                    "message": f"Income dropped {abs(change):.0f}% in {monthly[i]['month']} vs prior month",
                    "time": monthly[i]["month"],
                })

    # Negative profit in the last 3 months
    for m in monthly[-3:]:
        profit = m["income"] - m["expense"]
        if profit < 0:
            alerts.append({
                "level": "warning",
                "message": f"Loss of ₹{abs(profit):,.0f} recorded in {m['month']}",
                "time": m["month"],
            })

    # Low overall profit margin
    if summary["total_income"] > 0:
        margin = summary["profit"] / summary["total_income"] * 100
        if margin < 10:
            alerts.append({
                "level": "warning",
                "message": f"Low profit margin — {margin:.1f}% overall (target: >10%)",
                "time": "overall",
            })

    # Single category dominates expenses (>65%)
    expenses = cats.get("expenses_by_category", [])
    total_exp = sum(e["amount"] for e in expenses)
    if expenses and total_exp > 0:
        top = expenses[0]
        pct = top["amount"] / total_exp * 100
        if pct >= 65:
            alerts.append({
                "level": "info",
                "message": f"{top['category']} makes up {pct:.0f}% of total expenses — consider diversifying",
                "time": "current",
            })

    # Positive: profit improving (last month better than first)
    if len(monthly) >= 2:
        first_profit = monthly[0]["income"] - monthly[0]["expense"]
        last_profit  = monthly[-1]["income"] - monthly[-1]["expense"]
        if last_profit > first_profit and last_profit > 0:
            alerts.append({
                "level": "info",
                "message": f"Profit improving — ₹{last_profit:,.0f} in {monthly[-1]['month']} vs ₹{first_profit:,.0f} in {monthly[0]['month']}",
                "time": "trend",
            })

    return alerts[:6]


@router.get("/summary/category")
def get_category_summary(
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction)

    if start_date:
        query = query.filter(models.Transaction.date >= parse_date(start_date))

    if end_date:
        query = query.filter(models.Transaction.date <= parse_date(end_date))

    transactions = query.all()

    return category_summary(transactions)

@router.get("/knowledge/search")
def search_knowledge(query: str, db: Session = Depends(get_db)):
    query_embedding = get_embedding(query)

    results = db.execute(
    text("""
        SELECT content,
               embedding <=> (:query_embedding)::vector AS distance
        FROM knowledge_base
        ORDER BY embedding <=> (:query_embedding)::vector
        LIMIT 3
    """),
    {"query_embedding": query_embedding}
).fetchall()

    return [
        {
            "content": r[0],
            "similarity": 1 - r[1]   # convert distance → similarity
        }
        for r in results
    ]


@router.post("/chat")
async def chat(request: Request, db: Session = Depends(get_db)):
    """Chat endpoint — accepts JSON body or legacy ?query= param."""
    # Support both JSON body and legacy query-param for backward compatibility
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

    # Session management
    session_id = get_or_create_session(session_id_in, "finbot", db)

    # Detect follow-up: resolve against previous intent when query is very short
    last_intent = get_last_intent(session_id, db)
    intent, data = _route_and_fetch(query_text, db, last_intent)

    response = _render(intent, data)

    save_turn(session_id, query_text, response, intent, db)
    return {"response": response, "session_id": session_id}


# ─── Keyword fallback table (used when semantic confidence < threshold) ──────

_INTENT_KEYWORDS: list[tuple[str, list[str]]] = [
    ("EXPENSE_TOP_CATEGORY", [
        "biggest expense", "largest expense", "highest expense", "top expense",
        "most spending", "where am i spending", "spending most",
    ]),
    ("PROFIT_TREND",         ["profit trend", "profit growth", "growing profit", "profit declining", "profit over time"]),
    ("FORECAST_NEXT",        ["forecast", "predict", "next month", "next quarter", "next year", "future income", "future expense"]),
    ("MONTHLY_INCOME_PEAK",  ["best month", "worst month", "highest month", "lowest month", "peak month", "monthly income"]),
    ("FINANCIAL_SUMMARY",    ["financial summary", "overview", "total income", "total expense", "how much profit", "net profit", "margin", "performance"]),
    ("CATEGORY_BREAKDOWN",   ["category breakdown", "break down", "breakdown by category", "spending by category", "expense categories"]),
    ("INVENTORY_STATUS",     ["inventory", "stock", "low stock", "out of stock", "products"]),
    ("TRANSACTION_RECENT",   ["recent transactions", "latest transactions", "last transactions", "show transactions", "transaction history"]),
    ("TOP_TRANSACTION",      ["biggest transaction", "largest transaction", "biggest invoice", "largest invoice", "highest invoice", "biggest payment", "most expensive"]),
    ("PROFIT_TREND",         ["profit", "trend", "growth", "revenue trend"]),
    ("FINANCIAL_SUMMARY",    ["income", "expense", "summary", "total", "how much"]),
]


def _detect_intent(query: str, last_intent: str | None, parsed=None) -> tuple[str, str | None]:
    """Return (intent, date_filter) using spaCy + semantic router + keyword fallback."""
    # 1. spaCy NLP pass
    if parsed is None:
        parsed = parse_query(query)

    # 2. Follow-up detection via spaCy
    if last_intent and parsed.is_followup:
        date_filter = parsed.dates[0] if parsed.dates else None
        return last_intent, date_filter

    # 3. Semantic router (primary)
    try:
        intent, confidence = ir.route(query)
        date_filter = parsed.dates[0] if parsed.dates else None
        if intent != "UNKNOWN":
            return intent, date_filter
    except Exception:
        pass

    # 4. Keyword fallback
    q = query.lower()
    date_filter = parsed.dates[0] if parsed.dates else None
    for intent, phrases in _INTENT_KEYWORDS:
        if any(phrase in q for phrase in phrases):
            return intent, date_filter

    return "UNKNOWN", date_filter


def _route_and_fetch(query: str, db: Session, last_intent: str | None) -> tuple[str, dict]:
    """Detect intent, call the right query function, return (intent, data)."""
    parsed = parse_query(query)
    intent, date_filter = _detect_intent(query, last_intent, parsed)

    if intent == "EXPENSE_TOP_CATEGORY":
        return intent, cq.query_top_expense_category(db, date_filter)
    if intent == "PROFIT_TREND":
        return intent, cq.query_profit_trend(db)
    if intent == "FORECAST_NEXT":
        return intent, cq.query_forecast(db)
    if intent == "MONTHLY_INCOME_PEAK":
        return intent, cq.query_monthly_peaks(db)
    if intent == "FINANCIAL_SUMMARY":
        return intent, cq.query_financial_summary(db, date_filter)
    if intent == "CATEGORY_BREAKDOWN":
        return intent, cq.query_category_breakdown(db, date_filter)
    if intent == "INVENTORY_STATUS":
        return intent, cq.query_inventory_status(db)
    if intent == "TRANSACTION_RECENT":
        return intent, cq.query_recent_transactions(db, date_filter=date_filter)
    if intent == "TOP_TRANSACTION":
        # detect income/expense preference from query text
        q = query.lower()
        tx_type = "income" if "income" in q or "sale" in q or "revenue" in q else \
                  "expense" if "expense" in q or "cost" in q or "payment" in q else None
        return intent, cq.query_top_transactions_by_amount(db, tx_type=tx_type)
    return "UNKNOWN", {}


def _render(intent: str, data: dict) -> str:
    """Dispatch to the correct template renderer."""
    if intent == "EXPENSE_TOP_CATEGORY":
        return rt.render_expense_top_category(data)
    if intent == "PROFIT_TREND":
        return rt.render_profit_trend(data)
    if intent == "FORECAST_NEXT":
        return rt.render_forecast_next(data)
    if intent == "MONTHLY_INCOME_PEAK":
        return rt.render_monthly_income_peak(data)
    if intent == "FINANCIAL_SUMMARY":
        return rt.render_financial_summary(data)
    if intent == "CATEGORY_BREAKDOWN":
        return rt.render_category_breakdown(data)
    if intent == "INVENTORY_STATUS":
        return rt.render_inventory_status(data)
    if intent == "TRANSACTION_RECENT":
        return rt.render_transaction_recent(data)
    if intent == "TOP_TRANSACTION":
        return rt.render_top_transaction(data)
    return rt.render_unknown()