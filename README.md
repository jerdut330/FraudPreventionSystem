# Fraud Prevention System

An independent pre-gateway fraud prevention system for small e-commerce
merchants. The system analyzes submitted transactions before payment processing,
assigns a fraud risk score, and classifies each transaction as low, medium, or
high risk.

## Features

- Transaction submission form
- Merchant and customer selection from PostgreSQL
- Rule-based fraud scoring
- Scikit-learn fraud probability prediction
- Final risk classification
- Automatic transaction decision:
  - Low Risk: approved
  - Medium Risk: pending review
  - High Risk: rejected
- Fraud alert and monitoring dashboard
- Transaction detail and audit log views

## Tech Stack

- Frontend: React + Vite
- Backend: FastAPI
- Database: PostgreSQL
- Machine Learning: scikit-learn
- Deployment config: Railway

## Project Structure

```text
FraudPreventionSystem-new/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── fraud_logic.py
│   ├── ml_model.py
│   ├── train_model.py
│   ├── ml_training_data.csv
│   └── requirements.txt
├── database/
│   ├── schema.sql
│   └── sample_data.sql
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env
└── README.md
```

## Fraud Analysis Method

The system uses a hybrid fraud detection approach:

1. Rule-based scoring checks explainable risk indicators from the transaction.
2. A scikit-learn model predicts fraud probability from the same transaction
   features.
3. The backend combines both outputs into one final fraud risk score.

The final score uses this weighting, while keeping the rule-based score as the
minimum explainable risk:

```text
Blended Score = 60% rule-based score + 40% machine-learning score
Final Risk Score = max(rule-based score, blended score)
```

Risk levels:

```text
0-29   = Low Risk
30-69  = Medium Risk
70-100 = High Risk
```

The rule-based score considers:

- Transaction amount
- Billing and shipping address mismatch
- IP location and shipping location mismatch
- Higher-risk product categories
- New customer account

The amount rule uses a proportional score instead of a fixed hard threshold.
The multiplier is adjusted by product category because a high value is more
normal for categories such as jewelry, luxury goods, and travel than for
groceries:

```text
Amount score = min(round((amount / 100000) * category_multiplier), 40)
```

```text
Groceries: 1.8
Fashion/Home/Beauty/Books: 1.2
Electronics/Travel: 0.9
Jewelry/Luxury: 0.6
Default: 1.2
```

This means transaction amount contributes gradually to risk and is capped so
amount alone does not dominate the full fraud decision.

## References For Scoring Approach

This project uses a prototype scoring design inspired by commercial fraud
decisioning systems. The exact thresholds are project-defined and tuned for the
available transaction features and test cases.

- Stripe Radar uses fraud risk scores and risk levels such as normal, elevated,
  and high risk.
- Stripe Radar rules allow merchants to define fraud rules using transaction
  attributes such as amount, location, and custom metadata.
- SEON describes fraud scoring where rules and machine learning contribute to a
  score that determines approve, review, or decline decisions.

References:

- https://docs.stripe.com/radar/risk-evaluation
- https://docs.stripe.com/radar/rules/reference
- https://docs.seon.io/getting-started/scoring-and-decisioning

## Prerequisites

Install these before running the project:

- Python 3.9 or newer, recommended: Python 3.12
- Node.js
- PostgreSQL
- pgAdmin, optional but recommended

On Windows, if `python` still points to an old Python version, use `py` instead:

```powershell
py --version
```

## Database Setup

Create a PostgreSQL database. The local development database used during testing
was:

```text
fraud_prevention_system
```

Then run the SQL files in this order:

1. `database/schema.sql`
2. `database/sample_data.sql`

The sample data creates one merchant and one customer so the transaction form
can load dropdown options.

## Backend Environment Setup

Create a local environment file:

```text
backend/.env
```

Example:

```env
DB_HOST=localhost
DB_NAME=fraud_prevention_system
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_PORT=5432
```

`backend/.env` is ignored by Git because it contains local credentials.

## Run The Backend

From the project root:

```powershell
cd backend
py -m pip install -r requirements.txt
py train_model.py
py -m uvicorn main:app --reload
```

The backend should run at:

```text
http://127.0.0.1:8000
```

If Windows has socket issues with reload, run without reload:

```powershell
py -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Run The Frontend

Make sure `frontend/.env` points to the local backend:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Then open a second terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

The frontend should run at:

```text
http://localhost:5173
```

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

## Test Cases

### Low Risk

```text
Amount: 100000
Product Category: Groceries
Billing Address: Jakarta
Shipping Address: Jakarta
IP Location: Jakarta
New customer: unchecked
```

Expected result: Low Risk, approved.

### Medium Risk

```text
Amount: 3000000
Product Category: Groceries
Billing Address: Jakarta
Shipping Address: Jakarta
IP Location: Jakarta
New customer: unchecked
```

Expected result: Medium Risk, pending review.

### High Risk

```text
Amount: 5000000
Product Category: Jewelry
Billing Address: Jakarta
Shipping Address: Bandung
IP Location: Surabaya
New customer: checked
```

Expected result: High Risk, rejected.

### Suspicious Low Amount

```text
Amount: 250000
Product Category: Electronics
Billing Address: Jakarta
Shipping Address: Medan
IP Location: Surabaya
New customer: checked
```

Expected result: Medium Risk.

## Notes

The current machine-learning model is trained using a small prototype dataset in
`backend/ml_training_data.csv`. For production use, the model should be trained
with real historical transaction data and confirmed fraud labels.

Software Engineering Project
