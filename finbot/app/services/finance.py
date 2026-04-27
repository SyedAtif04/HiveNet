from collections import defaultdict
import numpy as np
from datetime import datetime
from sentence_transformers import SentenceTransformer

_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def get_embedding(text: str):
    model = get_model()   # ✅ THIS LINE IS CRITICAL
    return model.encode(text).tolist()




def calculate_summary(transactions):
    total_income = sum(t.amount for t in transactions if t.type == "income")
    total_expense = sum(t.amount for t in transactions if t.type == "expense")
    profit = total_income - total_expense

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "profit": profit
    }

def monthly_summary(transactions):
    data = defaultdict(lambda: {"income": 0, "expense": 0})

    for t in transactions:
        month = t.date.strftime("%Y-%m")

        if t.type == "income":
            data[month]["income"] += t.amount
        else:
            data[month]["expense"] += t.amount

    result = []

    for month, values in data.items():
        result.append({
            "month": month,
            "income": values["income"],
            "expense": values["expense"]
        })

    result.sort(key=lambda x: x["month"])

    return result

def _forecast_linear(values, steps):
    if len(values) < 2:
        return [float(values[-1])] * steps if values else [0.0] * steps
    x = np.arange(len(values))
    coeffs = np.polyfit(x, np.array(values), 1)
    return [max(0.0, float(np.polyval(coeffs, len(values) + i))) for i in range(steps)]


def _forecast_arima(values, steps):
    from statsmodels.tsa.arima.model import ARIMA
    model = ARIMA(values, order=(1, 1, 0))
    fit = model.fit()
    pred = fit.forecast(steps=steps)
    return [max(0.0, float(v)) for v in pred]


def _forecast_prophet(dates, values, steps):
    from prophet import Prophet
    import pandas as pd
    df = pd.DataFrame({
        "ds": pd.to_datetime(dates, format="%Y-%m"),
        "y": values
    })
    m = Prophet(
        yearly_seasonality=(len(values) >= 12),
        weekly_seasonality=False,
        daily_seasonality=False
    )
    m.fit(df)
    last = pd.to_datetime(dates[-1], format="%Y-%m")
    future = pd.DataFrame({"ds": [last + pd.DateOffset(months=i + 1) for i in range(steps)]})
    result = m.predict(future)
    return [max(0.0, float(v)) for v in result["yhat"]]


def _forecast_best(dates, values, steps):
    """Try Prophet → ARIMA → linear. Returns (predictions, method_name)."""
    if len(values) >= 3:
        try:
            return _forecast_prophet(dates, values, steps), "prophet"
        except Exception:
            pass
    if len(values) >= 3:
        try:
            return _forecast_arima(values, steps), "arima"
        except Exception:
            pass
    return _forecast_linear(values, steps), "linear"


def predict_financials(monthly_data):
    dates = [m["month"] for m in monthly_data]
    incomes = [m["income"] for m in monthly_data]
    expenses = [m["expense"] for m in monthly_data]

    income_1,  method = _forecast_best(dates, incomes,  1)
    expense_1,      _  = _forecast_best(dates, expenses, 1)
    income_3,       _  = _forecast_best(dates, incomes,  3)
    expense_3,      _  = _forecast_best(dates, expenses, 3)
    income_12,      _  = _forecast_best(dates, incomes,  12)
    expense_12,     _  = _forecast_best(dates, expenses, 12)

    def build(inc, exp):
        return {
            "income":  sum(inc),
            "expense": sum(exp),
            "profit":  sum(inc) - sum(exp)
        }

    return {
        "next_month":   build(income_1,  expense_1),
        "next_quarter": build(income_3,  expense_3),
        "next_year":    build(income_12, expense_12),
        "method": method
    }

def generate_insights(monthly_data):
    insights = []

    if len(monthly_data) < 2:
        return ["Not enough data for insights"]

    incomes = [m["income"] for m in monthly_data]
    expenses = [m["expense"] for m in monthly_data]

    # trend checks
    if incomes[-1] > incomes[0]:
        insights.append("Income is increasing over time")
    else:
        insights.append("Income is declining or unstable")

    if expenses[-1] > expenses[0]:
        insights.append("Expenses are increasing")
    else:
        insights.append("Expenses are stable or decreasing")

    profit_trend = (incomes[-1] - expenses[-1]) - (incomes[0] - expenses[0])

    if profit_trend > 0:
        insights.append("Profit is improving")
    else:
        insights.append("Profit is shrinking")

    return insights

def category_summary(transactions):
    expense_data = defaultdict(float)
    income_data = defaultdict(float)

    for t in transactions:
        if t.type == "expense":
            expense_data[t.category] += t.amount
        else:
            income_data[t.category] += t.amount

    expenses = [
        {"category": k, "amount": v}
        for k, v in expense_data.items()
    ]

    income = [
        {"category": k, "amount": v}
        for k, v in income_data.items()
    ]

    # sort descending (most important first)
    expenses.sort(key=lambda x: x["amount"], reverse=True)
    income.sort(key=lambda x: x["amount"], reverse=True)

    return {
        "expenses_by_category": expenses,
        "income_by_category": income
    }

def parse_date(date_str):
    for fmt in ["%Y-%m-%d", "%d-%m-%Y"]:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Date format not recognized: {date_str}")

def format_finance_knowledge(summary, monthly, prediction, insights):
    monthly_text = "\n".join([
        f"{m['month']} → Income: {m['income']}, Expense: {m['expense']}"
        for m in monthly
    ])

    text = f"""
Financial Summary:
Income: {summary['total_income']}
Expense: {summary['total_expense']}
Profit: {summary['profit']}

Monthly Breakdown:
{monthly_text}

Prediction (Next Month):
Income: {prediction['next_month']['income']:.2f}
Expense: {prediction['next_month']['expense']:.2f}
Profit: {prediction['next_month']['profit']:.2f}

Insights:
{"; ".join(insights)}
    """

    return text.strip()