from pathlib import Path
import csv

import joblib
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


BASE_DIR = Path(__file__).resolve().parent
TRAINING_DATA_PATH = BASE_DIR / "ml_training_data.csv"
MODEL_PATH = BASE_DIR / "fraud_model.joblib"


def load_training_rows():
    with TRAINING_DATA_PATH.open(newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))

    features = []
    labels = []

    for row in rows:
        features.append({
            "amount": float(row["amount"]),
            "product_category": row["product_category"],
            "address_mismatch": int(row["address_mismatch"]),
            "ip_shipping_mismatch": int(row["ip_shipping_mismatch"]),
            "new_customer": int(row["new_customer"]),
        })
        labels.append(int(row["is_fraud"]))

    return features, labels


def train_model():
    features, labels = load_training_rows()

    model = Pipeline(
        steps=[
            ("vectorizer", DictVectorizer(sparse=False)),
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(max_iter=1000, C=0.6)),
        ]
    )

    model.fit(features, labels)
    joblib.dump(model, MODEL_PATH)
    return MODEL_PATH


if __name__ == "__main__":
    saved_path = train_model()
    print(f"Saved fraud model to {saved_path}")
