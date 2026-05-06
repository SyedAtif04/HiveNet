"""f-string response templates for each FinBot chat intent.

Each render_* function accepts the dict returned by the matching chat_queries function
and returns a formatted markdown string ready to send to the user.
"""


def _date_suffix(date_filter: str | None) -> str:
    return f" (filtered to: {date_filter})" if date_filter else ""


def render_expense_top_category(data: dict) -> str:
    if data.get("status") == "no_data":
        return f"No expense transactions found{_date_suffix(data.get('date_filter'))}."

    suffix = _date_suffix(data.get("date_filter"))
    top = data["top_category"]
    amount = data["amount"]
    pct = data["pct_of_total"]

    lines = [f"**Top Expense Category{suffix}**\n"]
    lines.append(f"Your highest expense is **{top}** — ₹{amount:,.2f} ({pct}% of total expenses).\n")

    cats = data.get("all_categories", [])
    if len(cats) > 1:
        lines.append("**Full breakdown:**")
        for i, c in enumerate(cats[:7], 1):
            lines.append(f"{i}. {c['category']} — ₹{c['amount']:,.2f} ({c['pct']}%)")

    return "\n".join(lines)


def render_profit_trend(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No transactions found to analyse profit trend."
    if data.get("status") == "insufficient_data":
        return "Need at least 2 months of transaction history to show profit trend."

    direction = data["trend_direction"]
    pct = abs(data["pct_change"])
    first = data["first_month"]
    last = data["last_month"]

    lines = [f"**Profit Trend** ({first} → {last})\n"]
    arrow = "↑" if direction == "growing" else "↓"
    lines.append(f"Profit is **{direction}** {arrow} by {pct:.1f}% over this period.\n")

    monthly = data.get("monthly", [])
    if monthly:
        lines.append("**Monthly snapshot (last 6 months):**")
        for m in monthly[-6:]:
            profit_sign = "+" if m["profit"] >= 0 else ""
            lines.append(
                f"  {m['month']} — Income: ₹{m['income']:,.0f}  |  "
                f"Expenses: ₹{m['expense']:,.0f}  |  "
                f"Profit: {profit_sign}₹{m['profit']:,.0f}"
            )

    if "next_month_profit" in data:
        method = data.get("forecast_method", "linear")
        nm_profit = data["next_month_profit"]
        sign = "+" if nm_profit >= 0 else ""
        lines.append(f"\n**Next month forecast** ({method}): {sign}₹{nm_profit:,.2f}")

    return "\n".join(lines)


def render_monthly_income_peak(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No transactions found to identify monthly peaks."

    best = data["best_month"]
    best_inc = data["best_income"]
    worst = data["worst_month"]
    worst_inc = data["worst_income"]

    lines = [
        "**Monthly Income Analysis**\n",
        f"🏆 **Best month**: {best} — ₹{best_inc:,.2f}",
        f"📉 **Lowest month**: {worst} — ₹{worst_inc:,.2f}\n",
    ]

    months = data.get("all_months", [])
    if months:
        lines.append("**All months:**")
        for m in months:
            lines.append(
                f"  {m['month']} — Income: ₹{m['income']:,.0f}  |  "
                f"Expense: ₹{m['expense']:,.0f}  |  "
                f"Profit: ₹{m['profit']:,.0f}"
            )

    return "\n".join(lines)


def render_financial_summary(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No transactions found in the database."

    suffix = _date_suffix(data.get("date_filter"))
    inc = data["total_income"]
    exp = data["total_expense"]
    profit = data["profit"]
    margin = data["margin_pct"]
    count = data["transaction_count"]

    profit_sign = "+" if profit >= 0 else ""

    return (
        f"**Financial Summary{suffix}**\n\n"
        f"💰 **Total Income:** ₹{inc:,.2f}\n"
        f"💸 **Total Expenses:** ₹{exp:,.2f}\n"
        f"📊 **Net Profit:** {profit_sign}₹{profit:,.2f}\n"
        f"📈 **Profit Margin:** {margin}%\n"
        f"🧾 **Transactions:** {count}"
    )


def render_forecast_next(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No transactions found. Add transactions to enable forecasting."
    if data.get("status") == "insufficient_data":
        return "Need at least 2 months of transaction history to generate a forecast."
    if data.get("status") == "error":
        return f"Forecast error: {data.get('message', 'unknown error')}"

    method = data.get("method", "linear")
    nm = data["next_month"]
    nq = data["next_quarter"]
    ny = data["next_year"]
    months = data.get("based_on_months", "?")

    def row(label, d):
        sign = "+" if d["profit"] >= 0 else ""
        return (
            f"**{label}**\n"
            f"  Income: ₹{d['income']:,.2f}  |  "
            f"Expenses: ₹{d['expense']:,.2f}  |  "
            f"Profit: {sign}₹{d['profit']:,.2f}"
        )

    return (
        f"**Financial Forecast** (method: {method}, based on {months} months)\n\n"
        + row("Next Month", nm) + "\n\n"
        + row("Next Quarter", nq) + "\n\n"
        + row("Next Year", ny)
    )


def render_category_breakdown(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No transactions found."

    suffix = _date_suffix(data.get("date_filter"))
    lines = [f"**Category Breakdown{suffix}**\n"]

    expenses = data.get("expenses_by_category", [])
    if expenses:
        lines.append(f"**Expenses** (total: ₹{data['total_expense']:,.2f}):")
        for e in expenses[:8]:
            lines.append(f"  • {e['category']} — ₹{e['amount']:,.2f} ({e['pct']}%)")

    income_cats = data.get("income_by_category", [])
    if income_cats:
        lines.append(f"\n**Income sources** (total: ₹{data['total_income']:,.2f}):")
        for i in income_cats[:5]:
            lines.append(f"  • {i['category']} — ₹{i['amount']:,.2f} ({i['pct']}%)")

    return "\n".join(lines)


def render_inventory_status(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No inventory products found."

    total = data["total_products"]
    out = data["out_of_stock"]
    low = data["low_stock"]

    lines = [f"**Inventory Status** ({total} products total)\n"]

    if out:
        lines.append(f"🔴 **Out of stock** ({len(out)}):")
        for item in out[:10]:
            lines.append(f"  • {item['name']} — {item['qty']} units")
    else:
        lines.append("✅ No products are out of stock.")

    if low:
        lines.append(f"\n⚠️  **Low stock / below reorder point** ({len(low)}):")
        for item in low[:10]:
            rp = item.get("reorder_point", "—")
            lines.append(f"  • {item['name']} — {item['qty']} units (ROP: {rp})")
    else:
        lines.append("✅ All products are above their reorder points.")

    return "\n".join(lines)


def render_transaction_recent(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No transactions found."

    suffix = _date_suffix(data.get("date_filter"))
    txns = data["transactions"]
    lines = [f"**Recent Transactions{suffix}** (showing {len(txns)})\n"]

    for t in txns:
        sign = "+" if t["type"] == "income" else "-"
        lines.append(
            f"  {t['date']}  [{t['type'].upper()}]  "
            f"{sign}₹{abs(t['amount']):,.2f}  — {t['category']} / {t['description']}"
        )

    return "\n".join(lines)


def render_top_transaction(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No transactions found."

    txns = data["transactions"]
    tx_type = data.get("tx_type")
    label = f" ({tx_type.upper()})" if tx_type else ""
    lines = [f"**Largest Transactions by Amount{label}** (top {len(txns)})\n"]

    for i, t in enumerate(txns, 1):
        sign = "+" if t["type"] == "income" else "-"
        lines.append(
            f"{i}. {t['date']}  [{t['type'].upper()}]  "
            f"{sign}₹{abs(t['amount']):,.2f}  — {t['category']} / {t['description']}"
        )

    return "\n".join(lines)


def render_unknown(data: dict | None = None) -> str:
    return (
        "I can help you with the following:\n\n"
        "• **Expense analysis** — 'What is my biggest expense category?'\n"
        "• **Profit trend** — 'Show me profit trend over time'\n"
        "• **Monthly peaks** — 'Which month had the highest income?'\n"
        "• **Financial summary** — 'Give me a financial overview'\n"
        "• **Forecasts** — 'Predict my income for next quarter'\n"
        "• **Category breakdown** — 'Break down my expenses by category'\n"
        "• **Inventory status** — 'Show low stock items'\n"
        "• **Recent transactions** — 'Show me recent transactions'\n\n"
        "You can also filter by time period, e.g. 'expenses in March 2026'."
    )
