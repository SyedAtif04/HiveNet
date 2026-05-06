"""Structured query functions for the FinBot chat pipeline.

Each function queries the database directly via SQLAlchemy ORM and returns
a typed dict. No LLM is involved — all data is real and deterministic.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Transaction, TransactionItem, Inventory
from app.services.finance import (
    calculate_summary,
    monthly_summary,
    category_summary,
    predict_financials,
)


# ─── Date filter helper ───────────────────────────────────────────────────────

_MONTH_NAMES = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _apply_date_filter(query, date_str: str | None):
    """Filter a SQLAlchemy query on Transaction.date by a date string extracted by spaCy.

    Handles: "March", "March 2026", "Q1 2026", "2026-03", year-only "2026".
    Returns the query unchanged if the date string cannot be parsed.
    """
    if not date_str:
        return query
    d = date_str.lower().strip()

    # Quarter: Q1/Q2/Q3/Q4 optionally followed by year
    if d.startswith("q") and len(d) >= 2 and d[1].isdigit():
        q = int(d[1])
        month_start = (q - 1) * 3 + 1
        month_end = q * 3
        year = None
        parts = d.split()
        if len(parts) > 1 and parts[1].isdigit():
            year = int(parts[1])
        if year:
            from sqlalchemy import extract
            return query.filter(
                extract("year", Transaction.date) == year,
                extract("month", Transaction.date) >= month_start,
                extract("month", Transaction.date) <= month_end,
            )
        else:
            from sqlalchemy import extract
            return query.filter(
                extract("month", Transaction.date) >= month_start,
                extract("month", Transaction.date) <= month_end,
            )

    # Month name optionally followed by year
    parts = d.split()
    month_num = _MONTH_NAMES.get(parts[0])
    if month_num:
        from sqlalchemy import extract
        year = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
        q = query.filter(extract("month", Transaction.date) == month_num)
        if year:
            q = q.filter(extract("year", Transaction.date) == year)
        return q

    # YYYY-MM
    if len(d) == 7 and d[4] == "-":
        try:
            year, month = int(d[:4]), int(d[5:])
            from sqlalchemy import extract
            return query.filter(
                extract("year", Transaction.date) == year,
                extract("month", Transaction.date) == month,
            )
        except ValueError:
            pass

    # Year only
    if d.isdigit() and len(d) == 4:
        from sqlalchemy import extract
        return query.filter(extract("year", Transaction.date) == int(d))

    return query


def _load_transactions(db: Session, date_filter: str | None = None):
    q = db.query(Transaction)
    q = _apply_date_filter(q, date_filter)
    return q.order_by(Transaction.date.asc()).all()


# ─── Query functions ──────────────────────────────────────────────────────────

def query_top_expense_category(db: Session, date_filter: str | None = None) -> dict:
    transactions = _load_transactions(db, date_filter)
    if not transactions:
        return {"status": "no_data", "message": "No transactions found."}

    cats = category_summary(transactions)
    expenses = cats["expenses_by_category"]
    if not expenses:
        return {"status": "no_data", "message": "No expense transactions found."}

    total_expense = sum(e["amount"] for e in expenses)
    top = expenses[0]
    return {
        "top_category": top["category"],
        "amount": round(top["amount"], 2),
        "pct_of_total": round((top["amount"] / total_expense * 100) if total_expense else 0, 1),
        "all_categories": [
            {**e, "amount": round(e["amount"], 2),
             "pct": round(e["amount"] / total_expense * 100, 1) if total_expense else 0}
            for e in expenses
        ],
        "date_filter": date_filter,
    }


def query_profit_trend(db: Session) -> dict:
    transactions = _load_transactions(db)
    if not transactions:
        return {"status": "no_data", "message": "No transactions found."}

    monthly = monthly_summary(transactions)
    if len(monthly) < 2:
        return {"status": "insufficient_data", "monthly": monthly,
                "message": "Need at least 2 months of data for trend analysis."}

    first_profit = monthly[0]["income"] - monthly[0]["expense"]
    last_profit = monthly[-1]["income"] - monthly[-1]["expense"]
    pct_change = ((last_profit - first_profit) / abs(first_profit) * 100) if first_profit else 0
    trend_direction = "growing" if pct_change >= 0 else "declining"

    forecast = {}
    forecast_method = "none"
    try:
        pred = predict_financials(monthly)
        nm = pred["next_month"]
        forecast = {
            "next_month_income": round(nm["income"], 2),
            "next_month_expense": round(nm["expense"], 2),
            "next_month_profit": round(nm["profit"], 2),
        }
        forecast_method = pred["method"]
    except Exception:
        pass

    return {
        "trend_direction": trend_direction,
        "pct_change": round(pct_change, 1),
        "first_month": monthly[0]["month"],
        "last_month": monthly[-1]["month"],
        "monthly": [
            {**m, "profit": round(m["income"] - m["expense"], 2),
             "income": round(m["income"], 2), "expense": round(m["expense"], 2)}
            for m in monthly
        ],
        "forecast_method": forecast_method,
        **forecast,
    }


def query_monthly_peaks(db: Session) -> dict:
    transactions = _load_transactions(db)
    if not transactions:
        return {"status": "no_data", "message": "No transactions found."}

    monthly = monthly_summary(transactions)
    if not monthly:
        return {"status": "no_data", "message": "No monthly data available."}

    best = max(monthly, key=lambda m: m["income"])
    worst = min(monthly, key=lambda m: m["income"])

    return {
        "best_month": best["month"],
        "best_income": round(best["income"], 2),
        "worst_month": worst["month"],
        "worst_income": round(worst["income"], 2),
        "all_months": [
            {**m, "profit": round(m["income"] - m["expense"], 2),
             "income": round(m["income"], 2), "expense": round(m["expense"], 2)}
            for m in monthly
        ],
    }


def query_financial_summary(db: Session, date_filter: str | None = None) -> dict:
    transactions = _load_transactions(db, date_filter)
    if not transactions:
        return {"status": "no_data", "message": "No transactions found."}

    summary = calculate_summary(transactions)
    total_income = summary["total_income"]
    total_expense = summary["total_expense"]
    profit = summary["profit"]
    margin_pct = round((profit / total_income * 100) if total_income else 0, 1)

    return {
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "profit": round(profit, 2),
        "margin_pct": margin_pct,
        "transaction_count": len(transactions),
        "date_filter": date_filter,
    }


def query_forecast(db: Session) -> dict:
    transactions = _load_transactions(db)
    if not transactions:
        return {"status": "no_data", "message": "No transactions found."}

    monthly = monthly_summary(transactions)
    if len(monthly) < 2:
        return {"status": "insufficient_data",
                "message": "Need at least 2 months of transaction history to forecast."}

    try:
        pred = predict_financials(monthly)
        return {
            "next_month": {k: round(v, 2) for k, v in pred["next_month"].items()},
            "next_quarter": {k: round(v, 2) for k, v in pred["next_quarter"].items()},
            "next_year": {k: round(v, 2) for k, v in pred["next_year"].items()},
            "method": pred["method"],
            "based_on_months": len(monthly),
        }
    except Exception as e:
        return {"status": "error", "message": f"Forecast failed: {e}"}


def query_category_breakdown(db: Session, date_filter: str | None = None) -> dict:
    transactions = _load_transactions(db, date_filter)
    if not transactions:
        return {"status": "no_data", "message": "No transactions found."}

    cats = category_summary(transactions)
    total_expense = sum(e["amount"] for e in cats["expenses_by_category"])
    total_income = sum(i["amount"] for i in cats["income_by_category"])

    return {
        "expenses_by_category": [
            {**e, "amount": round(e["amount"], 2),
             "pct": round(e["amount"] / total_expense * 100, 1) if total_expense else 0}
            for e in cats["expenses_by_category"]
        ],
        "income_by_category": [
            {**i, "amount": round(i["amount"], 2),
             "pct": round(i["amount"] / total_income * 100, 1) if total_income else 0}
            for i in cats["income_by_category"]
        ],
        "total_expense": round(total_expense, 2),
        "total_income": round(total_income, 2),
        "date_filter": date_filter,
    }


def query_inventory_status(db: Session) -> dict:
    items = db.query(Inventory).all()
    if not items:
        return {"status": "no_data", "message": "No inventory items found."}

    out_of_stock = [
        {"name": i.product_name, "qty": i.quantity}
        for i in items if (i.quantity or 0) <= 0
    ]
    low_stock = [
        {"name": i.product_name, "qty": i.quantity,
         "reorder_point": i.reorder_point}
        for i in items
        if (i.quantity or 0) > 0
        and i.reorder_point
        and (i.quantity or 0) <= i.reorder_point
    ]
    return {
        "total_products": len(items),
        "out_of_stock": out_of_stock,
        "low_stock": low_stock,
    }


def query_recent_transactions(
    db: Session, limit: int = 10, date_filter: str | None = None
) -> dict:
    q = db.query(Transaction)
    q = _apply_date_filter(q, date_filter)
    rows = q.order_by(Transaction.date.desc()).limit(limit).all()
    if not rows:
        return {"status": "no_data", "message": "No transactions found."}

    return {
        "transactions": [
            {
                "date": t.date.strftime("%d-%m-%Y") if t.date else "—",
                "type": t.type,
                "category": t.category or "—",
                "description": t.description or "—",
                "amount": round(t.amount, 2),
            }
            for t in rows
        ],
        "total_shown": len(rows),
        "date_filter": date_filter,
    }


def query_top_transactions_by_amount(
    db: Session, limit: int = 5, tx_type: str | None = None
) -> dict:
    """Return the largest transactions by amount, optionally filtered to income or expense."""
    q = db.query(Transaction)
    if tx_type in ("income", "expense"):
        q = q.filter(Transaction.type == tx_type)
    rows = q.order_by(Transaction.amount.desc()).limit(limit).all()
    if not rows:
        return {"status": "no_data", "message": "No transactions found."}

    return {
        "transactions": [
            {
                "date": t.date.strftime("%d-%m-%Y") if t.date else "—",
                "type": t.type,
                "category": t.category or "—",
                "description": t.description or "—",
                "amount": round(t.amount, 2),
            }
            for t in rows
        ],
        "total_shown": len(rows),
        "tx_type": tx_type,
    }


def query_top_selling_products(db: Session, limit: int = 5) -> dict:
    """Aggregate transaction_items from income transactions to find top-selling products."""
    rows = (
        db.query(
            TransactionItem.product_name,
            func.sum(TransactionItem.quantity).label("total_qty"),
            func.sum(TransactionItem.quantity * TransactionItem.price).label("total_revenue"),
        )
        .join(Transaction, Transaction.id == TransactionItem.transaction_id)
        .filter(Transaction.type == "income")
        .group_by(TransactionItem.product_name)
        .order_by(func.sum(TransactionItem.quantity * TransactionItem.price).desc())
        .limit(limit)
        .all()
    )
    if not rows:
        return {"status": "no_data", "message": "No sales data found in transaction items."}

    return {
        "top_products": [
            {
                "product_name": r.product_name,
                "total_qty_sold": int(r.total_qty or 0),
                "total_revenue": round(float(r.total_revenue or 0), 2),
            }
            for r in rows
        ],
        "ranked_by": "total_revenue",
    }
