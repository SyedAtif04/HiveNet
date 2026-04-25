RULES = {
    "Raw Materials": [
        "steel", "iron", "aluminium", "aluminum", "copper", "brass",
        "metal", "alloy", "wire", "rod", "sheet", "coil", "scrap",
        "zinc", "nickel", "tin", "lead", "chrome",
    ],
    "Finished Goods": [
        "dinner set", "utensil", "crockery", "cutlery", "cookware",
        "plate", "bowl", "glass", "cup", "tray", "pot", "pan",
        "spoon", "fork", "knife", "mug", "jug", "vessel", "container",
    ],
    "Packaging": [
        "box", "carton", "bag", "packaging", "wrap", "label", "tape",
        "pallet", "crate", "bubble",
    ],
    "Logistics": [
        "transport", "freight", "delivery", "courier", "shipping",
        "loading", "unloading", "handling", "cargo", "postage",
    ],
    "Utilities": [
        "electricity", "water", "gas", "fuel", "diesel", "power",
        "internet", "broadband", "telephone", "mobile",
    ],
    "Office": [
        "stationery", "printer", "paper", "pen", "office", "computer",
        "software", "subscription", "laptop", "keyboard", "monitor",
    ],
    "Salaries": [
        "salary", "wages", "payroll", "staff", "employee", "bonus",
        "allowance", "stipend",
    ],
}

FALLBACK = "Other"


def categorize(product_names: list, description: str = "") -> str:
    search = " ".join(product_names + [description]).lower()

    scores = {}
    for category, keywords in RULES.items():
        count = sum(1 for kw in keywords if kw in search)
        if count > 0:
            scores[category] = count

    if not scores:
        return FALLBACK

    return max(scores, key=scores.get)
