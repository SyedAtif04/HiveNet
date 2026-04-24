import re

def parse_bill_text(text: str):
    lines = text.split("\n")

    items = []
    total = 0

    for line in lines:
        line = line.strip()

        # 🔹 detect item line (more flexible)
        if "kgs" in line.lower() or "kg" in line.lower():
            numbers = re.findall(r"\d+\.?\d*", line)

            if len(numbers) >= 3:
                qty = float(numbers[0])
                price = float(numbers[1])

                # extract name (everything before numbers)
                name = re.split(r"\d", line)[0].strip()

                items.append({
                    "product_name": name,
                    "quantity": int(qty),
                    "price": price
                })

        # 🔹 detect total
        if "grand total" in line.lower():
            numbers = re.findall(r"\d+\.?\d*", line.replace(",", ""))
            if numbers:
                total = float(numbers[-1])

    return {
        "items": items,
        "amount": total
    }