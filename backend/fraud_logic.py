def calculate_fraud_score(transaction):
    risk_score = 0
    reasons = []

    if transaction.amount > 1000000:
        risk_score += 20
        reasons.append("High transaction amount")

    if transaction.billing_address.lower() != transaction.shipping_address.lower():
        risk_score += 25
        reasons.append("Billing and shipping address mismatch")

    if transaction.new_customer:
        risk_score += 10
        reasons.append("New customer account")

    if risk_score <= 30:
        risk_level = "Low Risk"
    elif risk_score <= 60:
        risk_level = "Medium Risk"
    else:
        risk_level = "High Risk"

    return risk_score, risk_level, reasons