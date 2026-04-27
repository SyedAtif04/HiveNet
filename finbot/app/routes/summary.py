from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal
from app import models
from app.services.finance import (
    calculate_summary,
    monthly_summary,
    predict_financials,
    generate_insights
)
from app.services.finance import category_summary
from app.services.finance import parse_date
from app.models import KnowledgeBase
from app.services.finance import format_finance_knowledge
from app.services.finance import get_embedding
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
def chat(query: str, db: Session = Depends(get_db)):
    """Chat endpoint that returns financial insights."""
    response = _generate_response(query, db)
    return {"response": response}


def _generate_response(query: str, db: Session) -> str:
    """Generate a response based on query and financial data."""
    query_lower = query.lower()

    # Get fresh data for responses
    transactions = db.query(models.Transaction).all()
    summary = calculate_summary(transactions)
    monthly = monthly_summary(transactions)
    prediction = predict_financials(monthly)

    # Response templates based on query intent
    if any(word in query_lower for word in ["biggest", "largest", "highest", "top"]) and any(word in query_lower for word in ["expense", "category"]):
        categories = category_summary(transactions)
        if categories.get('expenses_by_category'):
            top_cat = max(categories['expenses_by_category'], key=lambda x: x['amount'])
            total_exp = sum(c['amount'] for c in categories['expenses_by_category'])
            pct = (top_cat['amount'] / total_exp * 100) if total_exp > 0 else 0
            return f"Your biggest expense category is **{top_cat['category']}** at ₹{top_cat['amount']:,.0f} ({pct:.1f}% of total expenses)."
        return "No expense data available yet."

    elif any(word in query_lower for word in ["profit", "trend", "growth"]):
        if len(monthly) >= 2:
            first_profit = monthly[0]['income'] - monthly[0]['expense']
            last_profit = monthly[-1]['income'] - monthly[-1]['expense']
            growth = ((last_profit - first_profit) / abs(first_profit) * 100) if first_profit != 0 else 0
            trend = "📈 upward" if growth > 0 else "📉 downward"
            return f"Your profit trend is **{trend}** with {abs(growth):.1f}% change. Forecast predicts {prediction['method']} for next month."
        return f"Need more months of data to show trend. Using {prediction['method']} forecast method."

    elif any(word in query_lower for word in ["month", "income", "revenue", "highest"]):
        if monthly:
            best_month = max(monthly, key=lambda m: m['income'])
            worst_month = min(monthly, key=lambda m: m['income'])
            return f"**Best month**: {best_month['month']} (₹{best_month['income']:,.0f}) | **Worst month**: {worst_month['month']} (₹{worst_month['income']:,.0f})"
        return "No monthly data available yet."

    elif any(word in query_lower for word in ["summary", "overview", "total", "performance", "all"]):
        margin = (summary['profit'] / summary['income'] * 100) if summary['income'] > 0 else 0
        return f"**Financial Summary:**\n- Income: ₹{summary['income']:,.0f}\n- Expenses: ₹{summary['expense']:,.0f}\n- Profit: ₹{summary['profit']:,.0f}\n- Margin: {margin:.1f}%"

    elif any(word in query_lower for word in ["forecast", "predict", "next"]):
        return f"**Next Month Forecast** ({prediction['method']} method):\n- Income: ₹{prediction['next_month']['income']:,.0f}\n- Expenses: ₹{prediction['next_month']['expense']:,.0f}\n- Profit: ₹{prediction['next_month']['profit']:,.0f}"

    else:
        margin = (summary['profit'] / summary['income'] * 100) if summary['income'] > 0 else 0
        return f"**Current Finances:**\n- Total Income: ₹{summary['income']:,.0f}\n- Total Expenses: ₹{summary['expense']:,.0f}\n- Net Profit: ₹{summary['profit']:,.0f}\n- Margin: {margin:.1f}%\n\nAsk me about expenses, profit trends, monthly performance, or forecasts!"