import re
from typing import Optional

UNIT_KEYWORDS = {
    "kg", "kgs", "kilogram", "kilograms",
    "g", "gm", "gms",
    "pcs", "pc", "piece", "pieces",
    "set", "sets",
    "nos", "no",
    "unit", "units",
    "box", "boxes",
    "ltr", "ml", "mtr"
}

# Priority order: most specific first
TOTAL_KEYWORDS = [
    "grand total", "grandtotal", "total payable", "amount payable",
    "net amount", "total amount", "invoice total", "total"
]

# Lines starting with these are summary/tax lines — never item lines
SKIP_LINE_PREFIXES = [
    "grand total", "grandtotal", "total", "subtotal", "sub total",
    "cgst", "sgst", "igst", "tax", "add :", "add:", "vat",
    "amount chargeable", "rupees", "inr", "hsn", "hsncode",
]

EXPENSE_SIGNALS = ["billed to", "bill to", "buyer", "consignee", "ship to", "shipped to"]
INCOME_SIGNALS  = ["sold to", "sale receipt", "delivery challan", "customer copy"]


def parse_number(s: str) -> Optional[float]:
    try:
        return float(s.strip().replace(",", ""))
    except (ValueError, AttributeError):
        return None


def is_hsn_code_str(s: str) -> bool:
    """
    HSN/SAC codes are 4-10 digit integers with NO decimal point.
    Extending to 10 digits covers 9-digit OCR artifacts (e.g., "939241090").
    Prices always carry a decimal in Indian invoices, so this never conflicts.
    """
    s_clean = s.strip().replace(",", "")
    if "." in s_clean:
        return False
    try:
        n = int(s_clean)
        return 1000 <= n <= 9_999_999_999
    except ValueError:
        return False


def clean_text(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = text.replace("₹", "").replace("Rs.", "").replace("Rs ", "")
    return text


def _is_non_item_line(line: str) -> bool:
    """Return True for total/tax/header lines that must not be parsed as items."""
    ll = line.strip().lower()
    return any(ll.startswith(p) for p in SKIP_LINE_PREFIXES)


def _parse_item_line(line: str) -> Optional[dict]:
    # Exclude total, tax, and summary lines before any other work
    if _is_non_item_line(line):
        return None

    original_words = line.split()
    if not original_words:
        return None

    words_lower = [w.lower() for w in original_words]

    # ── Step 1: locate all HSN/SAC codes ─────────────────────────────────────
    # Unit keywords inside product names (e.g. "121 Pcs Dinner Set") appear
    # BEFORE the HSN code. The real order-quantity unit appears AFTER it.
    # So we only search for the unit keyword from after the last HSN code.
    hsn_positions = [i for i, w in enumerate(words_lower) if is_hsn_code_str(w)]
    search_from = (max(hsn_positions) + 1) if hsn_positions else 0

    # ── Step 2: find the unit keyword ────────────────────────────────────────
    unit_idx = None
    hsn_before_unit = False

    for i in range(search_from, len(words_lower)):
        clean_word = words_lower[i].strip(".,()[]:|")
        if clean_word not in UNIT_KEYWORDS:
            continue
        if i == 0:
            continue

        prev_word = words_lower[i - 1].strip(".,()[]:|")
        prev_n = parse_number(prev_word)

        if prev_n is not None and prev_n > 0:
            unit_idx = i
            hsn_before_unit = is_hsn_code_str(prev_word)
            break

        # M.R. Metals layout — unit sits immediately after HSN with no qty before it
        if hsn_positions and i == max(hsn_positions) + 1:
            unit_idx = i
            hsn_before_unit = True
            break

    if unit_idx is None:
        return None

    # ── Step 3: extract qty and price ────────────────────────────────────────
    if hsn_before_unit:
        # Layout: Name | HSN | Unit | Qty | Price | LineTotal
        after_valid = []
        for i in range(unit_idx + 1, len(words_lower)):
            w = words_lower[i]
            if not is_hsn_code_str(w):
                n = parse_number(w)
                if n is not None and n > 0:
                    after_valid.append(n)
                    if len(after_valid) == 2:
                        break
        if len(after_valid) < 2:
            return None
        qty, price = after_valid[0], after_valid[1]
        name_words = original_words[:unit_idx - 1]   # exclude HSN word

    else:
        # Layout: Name | (HSN) | Qty | Unit | Price | LineTotal
        qty = parse_number(words_lower[unit_idx - 1])
        if qty is None or qty <= 0:
            return None

        price = None
        for i in range(unit_idx + 1, len(words_lower)):
            w = words_lower[i]
            if not is_hsn_code_str(w):
                n = parse_number(w)
                if n is not None and n > 0:
                    price = n
                    break
        if price is None:
            return None

        name_words = original_words[:unit_idx - 1]   # everything before qty word

    if qty <= 0 or price <= 0:
        return None

    # ── Step 4: clean product name ───────────────────────────────────────────
    name = " ".join(name_words).strip()
    name = re.sub(r"^[^a-zA-Z]+", "", name)              # strip leading non-letters (serials, pipes)
    name = re.sub(r"\s+\d{4,10}\s*$", "", name.strip())  # strip trailing HSN/SAC code
    name = name.strip()

    if not name:
        name = "Unknown Item"

    return {
        "product_name": name,
        "quantity": int(qty),
        "price": float(price)
    }


def extract_items(lines: list) -> list:
    items = []
    for line in lines:
        item = _parse_item_line(line)
        if item:
            items.append(item)
    return items


def extract_total(lines: list) -> float:
    """
    Find the grand total using keyword priority.

    Takes the LARGEST number across ALL lines matching a keyword.
    Invoices often have two 'Total' rows: the real invoice total and a
    smaller tax-summary table row below it. The actual grand total is
    always the largest amount, so max() reliably picks the right one.
    """
    for keyword in TOTAL_KEYWORDS:
        matching = [l for l in lines if keyword in l.lower()]
        if not matching:
            continue

        best = 0.0
        for line in matching:
            for n_str in re.findall(r"[\d,]+\.?\d*", line):
                val = parse_number(n_str)
                if val and val > best:
                    best = val

        if best > 0:
            return best

    return 0.0


def classify_bill(text: str) -> str:
    text_lower = text.lower()
    expense_score = sum(1 for kw in EXPENSE_SIGNALS if kw in text_lower)
    income_score  = sum(1 for kw in INCOME_SIGNALS  if kw in text_lower)

    for strong in ["billed to", "consignee"]:
        if strong in text_lower:
            expense_score += 1

    return "income" if income_score > expense_score else "expense"


def parse_bill_text(text: str) -> dict:
    text = clean_text(text)
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    return {
        "items": extract_items(lines),
        "amount": extract_total(lines),
        "type": classify_bill(text)
    }
