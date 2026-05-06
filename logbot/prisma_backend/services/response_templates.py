"""f-string response templates for each LogBot chat intent.

Each render_* function accepts the dict returned by the matching chat_queries function
and returns a formatted markdown string ready to send to the user.
"""


def render_stockout_risk(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No inventory data found."

    critical = data["critical"]
    at_risk = data["at_risk"]
    safe_count = data["safe_count"]
    total = data["total_items"]

    lines = [f"**Stockout Risk Report** ({total} items analysed)\n"]

    if critical:
        lines.append(f"🔴 **Critical — Out of stock** ({len(critical)}):")
        for item in critical[:8]:
            lines.append(f"  • {item['name']} — {item['qty']:.0f} units")
    else:
        lines.append("✅ No items are fully out of stock.")

    if at_risk:
        lines.append(f"\n⚠️  **At risk — below safety stock** ({len(at_risk)}):")
        for item in at_risk[:8]:
            prob_str = f"  (stockout risk: {item['stockout_prob']*100:.0f}%)" if item.get("stockout_prob") is not None else ""
            lines.append(
                f"  • {item['name']} — {item['qty']:.0f} units "
                f"(Safety Stock: {item['safety_stock']:.0f}){prob_str}"
            )
    else:
        lines.append("\n✅ No items are below their safety stock level.")

    lines.append(f"\n✅ **Safe:** {safe_count} items are fully stocked.")

    return "\n".join(lines)


def render_reorder_decisions(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No inventory data found."

    urgent = data["urgent"]
    reorder = data["reorder"]
    monitor = data["monitor"]
    no_action = data["no_action_count"]

    lines = [f"**Reorder Decisions** ({data['total_items']} items)\n"]

    if urgent:
        lines.append(f"🚨 **URGENT REORDER** ({len(urgent)}):")
        for d in urgent[:6]:
            qty_str = f" — order {d['recommended_order_qty']:.0f} units" if d["recommended_order_qty"] else ""
            lines.append(f"  • {d['sku_name']} — {d['current_qty']:.0f} units in stock{qty_str}")

    if reorder:
        lines.append(f"\n🔴 **REORDER** ({len(reorder)}):")
        for d in reorder[:6]:
            qty_str = f" — order {d['recommended_order_qty']:.0f} units (EOQ)" if d["recommended_order_qty"] else ""
            lines.append(
                f"  • {d['sku_name']} — {d['current_qty']:.0f} units "
                f"(ROP: {d['reorder_point']:.0f}){qty_str}"
            )

    if monitor:
        lines.append(f"\n⚠️  **MONITOR** ({len(monitor)}):")
        for d in monitor[:4]:
            lines.append(f"  • {d['sku_name']} — {d['current_qty']:.0f} units (approaching ROP: {d['reorder_point']:.0f})")

    lines.append(f"\n✅ **No action needed:** {no_action} items")

    return "\n".join(lines)


def render_inventory_overview(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No inventory data found."

    val_str = f"₹{data['inventory_value']:,.2f}" if data["inventory_value"] else "N/A"

    lines = [
        "**Inventory Overview**\n",
        f"📦 **Total SKUs:** {data['total_skus']}",
        f"🔢 **Total Units:** {data['total_qty']:,}",
        f"💰 **Inventory Value:** {val_str}",
        f"🔴 **Critical items:** {data['critical_count']}",
        f"⚠️  **Low stock items:** {data['low_count']}",
    ]

    cats = data.get("categories", [])
    if cats:
        lines.append("\n**Stock by category:**")
        for c in cats[:6]:
            lines.append(f"  • {c['category']}: {c['qty']:,} units")

    return "\n".join(lines)


def render_supplier_performance(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No suppliers found. Add suppliers via the Inventory page first."

    lines = [
        f"**Supplier Performance** ({data['total_suppliers']} suppliers)\n",
        f"📊 Average lead time: **{data['avg_lead_time_days']} days**",
        f"🏆 Best supplier: **{data['best_supplier']}**\n",
        "**Ranked by reliability:**",
    ]

    for i, s in enumerate(data["suppliers"], 1):
        lines.append(
            f"  {i}. {s['name']} — {s['reliability_pct']}% reliability  |  "
            f"Lead: {s['lead_time_days']}d  |  Cost: ₹{s['unit_cost']:.2f}/unit"
        )

    return "\n".join(lines)


def render_demand_forecast(data: dict) -> str:
    if data.get("status") == "no_forecast":
        return (
            "No forecast results available yet.\n\n"
            "To generate a forecast:\n"
            "1. Go to the **Upload** page and upload a demand CSV\n"
            "2. Go to the **Forecasts** page and run a forecast\n"
            "3. Come back here and ask again."
        )

    lines = [
        f"**Demand Forecast** ({data['horizon']} horizon)\n",
        f"📈 **Total projected demand:** {data['total_projected']:,.0f} units across {data['num_skus_forecast']} SKUs",
    ]

    if data.get("top_sku"):
        lines.append(
            f"🏆 **Highest demand SKU:** {data['top_sku']} "
            f"({data['top_sku_demand']:,.0f} units projected)"
        )

    lines.append(
        "\nFor a full breakdown, visit the **Forecasts** page where you can see "
        "per-SKU predictions with confidence intervals."
    )

    return "\n".join(lines)


def render_active_alerts(data: dict) -> str:
    if data.get("status") == "no_alerts":
        return "✅ No active alerts. All inventory levels are within thresholds."

    total = data["total_count"]
    affected = data["skus_affected"]
    lines = [f"**Active Alerts** ({total} total, {affected} SKUs affected)\n"]

    critical = data["critical"]
    if critical:
        lines.append(f"🔴 **Critical** ({len(critical)}):")
        for a in critical[:5]:
            lines.append(f"  • **{a['product']}** — {a['message']}")

    high = data["high"]
    if high:
        lines.append(f"\n⚠️  **High severity** ({len(high)}):")
        for a in high[:5]:
            lines.append(f"  • {a['product']} — {a['message']}")

    medium = data["medium"]
    if medium:
        lines.append(f"\n🔵 **Medium severity** ({len(medium)}):")
        for a in medium[:4]:
            lines.append(f"  • {a['product']} — {a['message']}")

    lines.append(
        "\nYou can resolve alerts by going to the **Alerts** page "
        "and clicking **Resolve** on each item after restocking."
    )

    return "\n".join(lines)


def render_optimization_metrics(data: dict) -> str:
    if data.get("status") == "no_data":
        return "No inventory data found."

    total = data["total_items"]
    with_opt = data["items_with_optimization"]
    missing = data["items_missing_optimization"]
    avg_ss = data["avg_safety_stock"]
    avg_eoq = data["avg_eoq"]

    lines = [
        f"**Inventory Optimization Metrics** ({total} items)\n",
        f"✅ **Items with ROP/SS/EOQ set:** {with_opt}",
        f"⚠️  **Items missing optimization:** {missing}",
        f"📊 **Avg. Safety Stock:** {avg_ss:.1f} units",
        f"📦 **Avg. EOQ:** {avg_eoq:.1f} units",
    ]

    missing_names = data.get("missing_optimization_names", [])
    if missing_names:
        lines.append(f"\n**Items needing optimization setup** ({len(missing_names)} shown):")
        for name in missing_names[:8]:
            lines.append(f"  • {name}")
        lines.append("\nRun a full analysis via POST /optimization/analyze to set these values.")

    top_items = data.get("items_with_rop", [])
    if top_items:
        lines.append("\n**Top items by reorder point:**")
        for item in top_items[:5]:
            lines.append(
                f"  • {item['name']} — ROP: {item['rop']:.0f}  |  "
                f"SS: {item['ss'] or 0:.0f}  |  EOQ: {item['eoq'] or 0:.0f}"
            )

    return "\n".join(lines)


def render_specific_sku(data: dict) -> str:
    if data.get("status") == "not_found":
        return data.get("message", "Product not found.")

    name = data["product_name"]
    qty = data["quantity"]
    price = f"₹{data['unit_price']:,.2f}" if data.get("unit_price") else "N/A"
    rop = f"{data['reorder_point']:.0f}" if data.get("reorder_point") else "not set"
    ss = f"{data['safety_stock']:.0f}" if data.get("safety_stock") else "not set"
    eoq = f"{data['eoq']:.0f}" if data.get("eoq") else "not set"
    location = data.get("warehouse_location") or "—"
    cat = data.get("category") or "—"
    uom = data.get("unit_of_measure", "units")

    lines = [
        f"**{name}**\n",
        f"📦 **Stock:** {qty} {uom}",
        f"💰 **Unit price:** {price}",
        f"📍 **Location:** {location}",
        f"🏷️  **Category:** {cat}",
        f"🔁 **Reorder Point:** {rop}",
        f"🛡️  **Safety Stock:** {ss}",
        f"📐 **EOQ:** {eoq}",
    ]

    alerts = data.get("active_alerts", [])
    if alerts:
        lines.append(f"\n⚠️  **Active alerts** ({len(alerts)}):")
        for a in alerts:
            lines.append(f"  • [{a['severity'].upper()}] {a['message']}")
    else:
        lines.append("\n✅ No active alerts for this product.")

    suppliers = data.get("suppliers", [])
    if suppliers:
        lines.append(f"\n🏭 **Suppliers** ({len(suppliers)}):")
        for s in suppliers:
            pref = " ★ preferred" if s["preferred"] else ""
            lines.append(
                f"  • {s['supplier']} — {s['lead_time_days']}d lead time  |  "
                f"₹{s['unit_cost']:.2f}/unit{pref}"
            )
    else:
        lines.append("\n🏭 No suppliers linked yet.")

    return "\n".join(lines)


def render_unknown(data: dict | None = None) -> str:
    return (
        "I can help you with the following:\n\n"
        "• **Stockout risk** — 'Which items are at risk of running out?'\n"
        "• **Reorder decisions** — 'What do I need to reorder urgently?'\n"
        "• **Inventory overview** — 'Give me an inventory summary'\n"
        "• **Supplier performance** — 'Which supplier is most reliable?'\n"
        "• **Demand forecast** — 'What is the demand forecast?'\n"
        "• **Active alerts** — 'Show me all active supply chain alerts'\n"
        "• **Optimization metrics** — 'Show safety stock and EOQ values'\n"
        "• **Specific product** — 'Tell me about Steel Rod 10mm'\n\n"
        "Try asking about a specific product by name for a detailed breakdown."
    )
