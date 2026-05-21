from fastapi import FastAPI
from pydantic import BaseModel
from fraud_logic import calculate_fraud_score

app = FastAPI(title="Fraud Prevention System API")

class Transaction(BaseModel):
    amount: float
    billing_address: str
    shipping_address: str
    new_customer: bool

@app.get("/")
def root():
    return {"message": "Fraud Prevention System API Running"}

@app.post("/analyze")
def analyze_transaction(transaction: Transaction):
    risk_score, risk_level, reasons = calculate_fraud_score(transaction)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "reasons": reasons
    }

@app.post("/transactions/{transaction_id}/approve")
def approve_transaction(transaction_id: int):
    return {
        "transaction_id": transaction_id,
        "decision": "Approved",
        "message": "Transaction approved and forwarded to payment gateway."
    }

@app.post("/transactions/{transaction_id}/reject")
def reject_transaction(transaction_id: int):
    return {
        "transaction_id": transaction_id,
        "decision": "Rejected",
        "message": "Transaction rejected and blocked before payment processing."
    }
