import re


def normalize_text(value):
    return str(value or "").strip().lower()


def location_tokens(value):
    text = normalize_text(value)
    return {token for token in re.split(r"[^a-z0-9]+", text) if len(token) > 2}


def has_location_mismatch(first_location, second_location):
    first_tokens = location_tokens(first_location)
    second_tokens = location_tokens(second_location)

    if not first_tokens or not second_tokens:
        return False

    return first_tokens.isdisjoint(second_tokens)


def get_amount_multiplier(product_category):
    category = normalize_text(product_category)

    if category == "groceries":
        return 1.5

    if category in {"fashion", "home", "beauty", "books"}:
        return 1.2

    if category in {"electronics", "travel"}:
        return 0.9

    if category in {"jewelry", "luxury"}:
        return 0.6

    return 1.2


def calculate_amount_score(amount, product_category):
    multiplier = get_amount_multiplier(product_category)
    return min(round((amount / 100000) * multiplier), 40)


def calculate_fraud_score(transaction):
    risk_score = 0
    reasons = []

    amount = float(getattr(transaction, "amount", 0) or 0)
    product_category = normalize_text(getattr(transaction, "product_category", ""))
    billing_address = getattr(transaction, "billing_address", "")
    shipping_address = getattr(transaction, "shipping_address", "")
    ip_location = getattr(transaction, "ip_location", "")

    amount_score = calculate_amount_score(amount, product_category)

    if amount_score > 0:
        risk_score += amount_score

        if amount_score >= 35:
            reasons.append("Very high transaction amount")
        elif amount_score >= 20:
            reasons.append("High transaction amount")
        elif amount_score >= 10:
            reasons.append("Elevated transaction amount")

    if normalize_text(billing_address) != normalize_text(shipping_address):
        risk_score += 20
        reasons.append("Billing and shipping address mismatch")

    if has_location_mismatch(ip_location, shipping_address):
        risk_score += 15
        reasons.append("IP location differs from shipping location")

    if product_category in {"electronics", "jewelry", "luxury", "travel"}:
        risk_score += 10
        reasons.append("Higher-risk product category")

    if transaction.new_customer:
        risk_score += 10
        reasons.append("New customer account")

    risk_score = min(risk_score, 100)

    if risk_score < 35:
        risk_level = "Low Risk"
    elif risk_score < 70:
        risk_level = "Medium Risk"
    else:
        risk_level = "High Risk"

    return risk_score, risk_level, reasons
