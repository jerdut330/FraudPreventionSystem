from pathlib import Path
import re

import joblib

from train_model import MODEL_PATH, train_model


_model = None


def normalize_text(value):
    return str(value or "").strip().lower()


def location_tokens(value):
    text = normalize_text(value)
    return {token for token in re.split(r"[^a-z0-9]+", text) if len(token) > 2}


def has_location_mismatch(first_location, second_location):
    first_tokens = location_tokens(first_location)
    second_tokens = location_tokens(second_location)

    if not first_tokens or not second_tokens:
        return 0

    return int(first_tokens.isdisjoint(second_tokens))


def extract_features(transaction):
    billing_address = getattr(transaction, "billing_address", "")
    shipping_address = getattr(transaction, "shipping_address", "")
    ip_location = getattr(transaction, "ip_location", "")

    return {
        "amount": float(getattr(transaction, "amount", 0) or 0),
        "product_category": normalize_text(
            getattr(transaction, "product_category", "unknown")
        ) or "unknown",
        "address_mismatch": int(
            normalize_text(billing_address) != normalize_text(shipping_address)
        ),
        "ip_shipping_mismatch": has_location_mismatch(ip_location, shipping_address),
        "new_customer": int(bool(getattr(transaction, "new_customer", False))),
    }


def get_model():
    global _model

    if _model is None:
        if not Path(MODEL_PATH).exists():
            train_model()

        _model = joblib.load(MODEL_PATH)

    return _model


def classify_probability(probability):
    if probability >= 0.70:
        return "High Risk"
    if probability >= 0.40:
        return "Medium Risk"
    return "Low Risk"


def predict_fraud_ml(transaction):
    features = extract_features(transaction)
    model = get_model()
    fraud_probability = float(model.predict_proba([features])[0][1])

    return {
        "ml_features": features,
        "ml_fraud_probability": round(fraud_probability, 4),
        "ml_risk_level": classify_probability(fraud_probability),
    }
