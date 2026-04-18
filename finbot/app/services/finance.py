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

def predict_next(values):
    if len(values) < 2:
        return values[-1] if values else 0

    x = np.arange(len(values))
    y = np.array(values)

    # linear regression
    coeffs = np.polyfit(x, y, 1)

    next_value = np.polyval(coeffs, len(values))

    return max(0, float(next_value))

def predict_financials(monthly_data):
    incomes = [m["income"] for m in monthly_data]
    expenses = [m["expense"] for m in monthly_data]

    predicted_income = predict_next(incomes)
    predicted_expense = predict_next(expenses)

    return {
        "predicted_income": predicted_income,
        "predicted_expense": predicted_expense,
        "predicted_profit": predicted_income - predicted_expense
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
    return datetime.strptime(date_str, "%d-%m-%Y")

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

Prediction:
Next Income: {prediction['predicted_income']}
Next Expense: {prediction['predicted_expense']}
Next Profit: {prediction['predicted_profit']}

Insights:
{"; ".join(insights)}
    """

    return text.strip()