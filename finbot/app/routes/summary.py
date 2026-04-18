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
def predict_summary(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).all()

    monthly_data = monthly_summary(transactions)

    return predict_financials(monthly_data)

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