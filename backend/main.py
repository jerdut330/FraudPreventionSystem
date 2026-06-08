import hashlib
import os
import time
from typing import Optional

import bcrypt
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from psycopg.errors import UniqueViolation

from fraud_logic import calculate_amount_score, calculate_fraud_score
from ml_model import predict_fraud_ml
from database import get_connection


app = FastAPI(title="Fraud Prevention System API")
dashboard_cache = {}
rate_limit_store = {}


def get_allowed_origins():
    raw_origins = os.environ.get("ALLOWED_ORIGINS") or os.environ.get("FRONTEND_URL")

    if raw_origins:
        return [
            origin.strip()
            for origin in raw_origins.split(",")
            if origin.strip()
        ]

    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Transaction(BaseModel):
    amount: float
    billing_address: str
    shipping_address: str
    new_customer: bool


class NewTransaction(BaseModel):
    merchant_id: int
    customer_id: int
    amount: float
    product_category: str
    billing_address: str
    shipping_address: str
    ip_location: str
    new_customer: bool


class NewMerchant(BaseModel):
    merchant_name: str
    merchant_email: str
    password: Optional[str] = None
    business_type: Optional[str] = None


class NewCustomer(BaseModel):
    customer_name: str
    customer_email: str
    customer_pnumber: Optional[str] = None
    customer_address: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class ChangePasswordRequest(BaseModel):
    email: str
    current_password: str
    new_password: str


def get_auth_secret():
    return os.environ.get("AUTH_TOKEN_SECRET", "fraudshield-demo-secret")


def create_auth_token(user):
    issued_at = int(time.time())
    expires_at = issued_at + int(os.environ.get("AUTH_TOKEN_TTL_SECONDS", "86400"))
    payload = {
        "sub": str(user["id"]),
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "account_type": user["account_type"],
        "iat": issued_at,
        "exp": expires_at
    }

    return jwt.encode(payload, get_auth_secret(), algorithm="HS256")


def verify_auth_token(token):
    try:
        return jwt.decode(token, get_auth_secret(), algorithms=["HS256"])
    except ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Auth token expired")
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid auth token") from exc


def get_authenticated_user(authorization: Optional[str] = None):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    return verify_auth_token(token)


def get_authenticated_scope(authorization, prefix=None):
    authenticated_user = get_authenticated_user(authorization)

    if authenticated_user.get("account_type") == "merchant":
        merchant_id = authenticated_user.get("id")
        column_name = f"{prefix}.merchant_id" if prefix else "merchant_id"
        return authenticated_user, f" WHERE {column_name} = %s", (merchant_id,)

    return authenticated_user, "", ()


def get_client_identifier(request: Request):
    forwarded_for = request.headers.get("x-forwarded-for")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    if request.client:
        return request.client.host

    return "unknown"


def check_rate_limit(request: Request, bucket: str, max_requests: int, window_seconds: int):
    now = time.time()
    client_id = get_client_identifier(request)
    rate_key = (bucket, client_id)
    request_times = rate_limit_store.get(rate_key, [])
    request_times = [
        request_time
        for request_time in request_times
        if now - request_time < window_seconds
    ]

    if len(request_times) >= max_requests:
        retry_after = max(1, int(window_seconds - (now - request_times[0])))
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)}
        )

    request_times.append(now)
    rate_limit_store[rate_key] = request_times


def get_rate_limit_config(prefix, default_max, default_window):
    max_requests = int(os.environ.get(f"{prefix}_MAX_REQUESTS", str(default_max)))
    window_seconds = int(os.environ.get(f"{prefix}_WINDOW_SECONDS", str(default_window)))
    return max_requests, window_seconds


def hash_password(password):
    password_bytes = password.encode("utf-8")
    hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return "bcrypt:" + hashed_password.decode("utf-8")


def hash_password_sha256(password):
    return "sha256:" + hashlib.sha256(password.encode("utf-8")).hexdigest()


def generate_merchant_password(email):
    email_name = email.split("@")[0]
    safe_name = "".join(char for char in email_name if char.isalnum()).lower()
    return f"{safe_name or 'merchant'}123"


def verify_password(password, stored_password):
    if not stored_password:
        return False

    if stored_password.startswith("bcrypt:"):
        bcrypt_hash = stored_password.removeprefix("bcrypt:").encode("utf-8")
        return bcrypt.checkpw(password.encode("utf-8"), bcrypt_hash)

    if stored_password.startswith("sha256:"):
        return stored_password == hash_password_sha256(password)

    if stored_password.startswith("placeholder_hash_"):
        return stored_password == f"placeholder_hash_{password}"

    if stored_password == "hashed_password_example":
        return password == "merchant123"

    return stored_password == password


def classify_combined_score(score):
    if score < 30:
        return "Low Risk"
    if score < 70:
        return "Medium Risk"
    return "High Risk"


def classify_breakdown_score(score):
    if score < 15:
        return "Low"
    if score < 30:
        return "Moderate"
    return "High"


def build_risk_breakdown(transaction):
    amount = float(getattr(transaction, "amount", 0) or 0)
    product_category = str(getattr(transaction, "product_category", "") or "").lower()
    billing_address = str(getattr(transaction, "billing_address", "") or "").strip().lower()
    shipping_address = str(getattr(transaction, "shipping_address", "") or "").strip().lower()
    ip_location = str(getattr(transaction, "ip_location", "") or "").strip().lower()

    amount_score = calculate_amount_score(amount, product_category)
    location_score = 0
    customer_score = 0

    if billing_address != shipping_address:
        location_score += 20

    if ip_location and shipping_address and ip_location != shipping_address:
        location_score += 15

    if product_category in {"electronics", "jewelry", "luxury", "travel"}:
        customer_score += 10

    if transaction.new_customer:
        customer_score += 10

    return [
        {
            "label": "Amount Risk",
            "level": classify_breakdown_score(amount_score),
            "score": amount_score
        },
        {
            "label": "Location Risk",
            "level": classify_breakdown_score(location_score),
            "score": min(location_score, 40)
        },
        {
            "label": "Customer & Product Risk",
            "level": classify_breakdown_score(customer_score),
            "score": customer_score
        }
    ]


def get_recommended_action(risk_level):
    if "High" in risk_level:
        return "Reject or freeze this transaction before payment processing."
    if "Medium" in risk_level:
        return "Send this transaction for manual review before fulfillment."
    return "Approve this transaction and continue normal order processing."


def get_actor_label(performed_by=None):
    actor = str(performed_by or "").strip()
    return actor[:50] if actor else "Admin"


def get_actor_user_id(authenticated_user=None, fallback="system"):
    if authenticated_user and authenticated_user.get("id") is not None:
        return str(authenticated_user.get("id"))[:50]

    return fallback[:50]


def require_admin_user(authenticated_user):
    if authenticated_user.get("account_type") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin users can perform this action."
        )


def get_cache_ttl():
    return int(os.environ.get("DASHBOARD_CACHE_TTL_SECONDS", "30"))


def get_dashboard_cache(cache_name, account_type=None, merchant_id=None):
    cache_key = (cache_name, account_type or "admin", merchant_id)
    cached_value = dashboard_cache.get(cache_key)

    if not cached_value:
        return None

    cached_at, data = cached_value

    if time.time() - cached_at > get_cache_ttl():
        dashboard_cache.pop(cache_key, None)
        return None

    return data


def set_dashboard_cache(cache_name, data, account_type=None, merchant_id=None):
    cache_key = (cache_name, account_type or "admin", merchant_id)
    dashboard_cache[cache_key] = (time.time(), data)


def clear_dashboard_cache():
    dashboard_cache.clear()


def analyze_fraud(transaction):
    rule_score, rule_risk_level, reasons = calculate_fraud_score(transaction)
    ml_result = predict_fraud_ml(transaction)
    ml_score = round(ml_result["ml_fraud_probability"] * 100)
    combined_score = max(rule_score, round((rule_score * 0.6) + (ml_score * 0.4)))
    combined_risk_level = classify_combined_score(combined_score)

    analysis_reasons = list(reasons)

    if ml_score >= 70:
        analysis_reasons.append("Machine learning model found strong risk indicators")
    elif ml_score >= 40:
        analysis_reasons.append("Machine learning model found moderate risk indicators")

    return {
        "risk_score": combined_score,
        "risk_level": combined_risk_level,
        "reasons": analysis_reasons,
        "rule_score": rule_score,
        "rule_risk_level": rule_risk_level,
        "recommended_action": get_recommended_action(combined_risk_level),
        "risk_breakdown": build_risk_breakdown(transaction),
        **ml_result
    }


@app.get("/")
def root():
    return {"message": "Fraud Prevention System API Running"}


@app.post("/auth/login")
def login(payload: LoginRequest, request: Request):
    max_requests, window_seconds = get_rate_limit_config(
        "LOGIN_RATE_LIMIT",
        10,
        60
    )
    check_rate_limit(request, "auth_login", max_requests, window_seconds)

    email = payload.email.strip().lower()
    password = payload.password

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT to_regclass('public.admin_user');")
        admin_table_exists = cursor.fetchone()[0] is not None

        if admin_table_exists:
            cursor.execute("""
                SELECT
                    admin_user_id,
                    admin_name,
                    admin_email,
                    password_hash,
                    role
                FROM admin_user
                WHERE admin_email = %s;
            """, (email,))

            admin_user = cursor.fetchone()

            if admin_user is not None and verify_password(password, admin_user[3]):
                user = {
                    "id": f"admin:{admin_user[0]}",
                    "name": admin_user[1],
                    "email": admin_user[2],
                    "role": admin_user[4],
                    "account_type": "admin"
                }

                return {
                    "message": "Login successful",
                    "user": user,
                    "token": create_auth_token(user)
                }

        cursor.execute("""
            SELECT
                merchant_id,
                merchant_name,
                merchant_email,
                password_hash,
                business_type
            FROM merchant
            WHERE merchant_email = %s;
        """, (email,))

        merchant = cursor.fetchone()

        if merchant is None or not verify_password(password, merchant[3]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user = {
            "id": merchant[0],
            "name": merchant[1],
            "email": merchant[2],
            "role": merchant[4] or "Merchant",
            "account_type": "merchant"
        }

        return {
            "message": "Login successful",
            "user": user,
            "token": create_auth_token(user)
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.post("/auth/change-password")
def change_password(payload: ChangePasswordRequest):
    email = payload.email.strip().lower()

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 6 characters"
        )

    if email == "admin@fraudshield.com":
        raise HTTPException(
            status_code=403,
            detail="Demo admin password cannot be changed from the app"
        )

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT merchant_id, password_hash
            FROM merchant
            WHERE merchant_email = %s;
        """, (email,))

        merchant = cursor.fetchone()

        if merchant is None or not verify_password(
            payload.current_password,
            merchant[1]
        ):
            raise HTTPException(status_code=401, detail="Current password is incorrect")

        cursor.execute("""
            UPDATE merchant
            SET password_hash = %s
            WHERE merchant_id = %s;
        """, (hash_password(payload.new_password), merchant[0]))

        conn.commit()

        return {"message": "Password changed successfully"}

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.post("/analyze")
def analyze_transaction(transaction: Transaction):
    return analyze_fraud(transaction)


@app.get("/dashboard/summary")
def get_dashboard_summary(authorization: Optional[str] = Header(default=None)):
    authenticated_user, transaction_where, transaction_params = get_authenticated_scope(
        authorization
    )
    _, joined_where, joined_params = get_authenticated_scope(authorization, "t")
    cache_account_type = authenticated_user.get("account_type")
    cache_merchant_id = (
        authenticated_user.get("id")
        if cache_account_type == "merchant"
        else None
    )
    cached_summary = get_dashboard_cache(
        "summary",
        cache_account_type,
        cache_merchant_id
    )

    if cached_summary is not None:
        return cached_summary

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(f"""
            SELECT
                COUNT(*) AS total_transactions,
                COUNT(*) FILTER (WHERE transaction_status = 'approved') AS approved_transactions,
                COUNT(*) FILTER (WHERE transaction_status = 'pending_review') AS pending_review,
                COUNT(*) FILTER (WHERE transaction_status = 'rejected') AS rejected_transactions,
                COUNT(*) FILTER (WHERE transaction_status = 'frozen') AS frozen_transactions,
                COALESCE(SUM(amount), 0) AS total_transaction_value
            FROM transactions
            {transaction_where};
        """, transaction_params)

        transaction_summary = cursor.fetchone()

        cursor.execute(f"""
            SELECT
                COUNT(*) AS total_alerts,
                COUNT(*) FILTER (WHERE status = 'Unread') AS unread_alerts,
                COUNT(*) FILTER (WHERE status = 'Reviewed') AS reviewed_alerts
            FROM alert a
            JOIN transactions t
                ON a.transaction_id = t.transaction_id
            {joined_where};
        """, joined_params)

        alert_summary = cursor.fetchone()

        cursor.execute(f"""
            SELECT
                COUNT(*) FILTER (WHERE risk_level ILIKE '%%High%%') AS high_risk,
                COUNT(*) FILTER (WHERE risk_level ILIKE '%%Medium%%') AS medium_risk,
                COUNT(*) FILTER (WHERE risk_level ILIKE '%%Low%%') AS low_risk
            FROM fraud_check fc
            JOIN transactions t
                ON fc.transaction_id = t.transaction_id
            {joined_where};
        """, joined_params)

        risk_summary = cursor.fetchone()

        summary = {
            "total_transactions": transaction_summary[0],
            "approved_transactions": transaction_summary[1],
            "pending_review": transaction_summary[2],
            "rejected_transactions": transaction_summary[3],
            "frozen_transactions": transaction_summary[4],
            "total_transaction_value": float(transaction_summary[5]),
            "total_alerts": alert_summary[0],
            "unread_alerts": alert_summary[1],
            "reviewed_alerts": alert_summary[2],
            "high_risk": risk_summary[0],
            "medium_risk": risk_summary[1],
            "low_risk": risk_summary[2]
        }

        set_dashboard_cache("summary", summary, cache_account_type, cache_merchant_id)

        return summary

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()

@app.get("/dashboard/trends")
def get_dashboard_trends(authorization: Optional[str] = Header(default=None)):
    authenticated_user, transaction_where, transaction_params = get_authenticated_scope(
        authorization
    )
    cache_account_type = authenticated_user.get("account_type")
    cache_merchant_id = (
        authenticated_user.get("id")
        if cache_account_type == "merchant"
        else None
    )
    cached_trends = get_dashboard_cache(
        "trends",
        cache_account_type,
        cache_merchant_id
    )

    if cached_trends is not None:
        return cached_trends

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(f"""
            SELECT
                DATE(transaction_date) AS date,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE transaction_status = 'approved') AS approved,
                COUNT(*) FILTER (WHERE transaction_status = 'pending_review') AS pending_review,
                COUNT(*) FILTER (WHERE transaction_status = 'rejected') AS rejected,
                COUNT(*) FILTER (WHERE transaction_status = 'frozen') AS frozen
            FROM transactions
            {transaction_where}
            GROUP BY DATE(transaction_date)
            ORDER BY DATE(transaction_date) ASC;
        """, transaction_params)

        rows = cursor.fetchall()

        trends = []
        for row in rows:
            trends.append({
                "date": row[0].isoformat(),
                "total": row[1],
                "approved": row[2],
                "pending_review": row[3],
                "rejected": row[4],
                "frozen": row[5]
            })

        trend_response = {"trends": trends}
        set_dashboard_cache(
            "trends",
            trend_response,
            cache_account_type,
            cache_merchant_id
        )

        return trend_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()

@app.get("/merchants")
def get_merchants(authorization: Optional[str] = Header(default=None)):
    authenticated_user = get_authenticated_user(authorization)
    conn = get_connection()
    cursor = conn.cursor()

    try:
        merchant_where = ""
        params = ()

        if authenticated_user.get("account_type") == "merchant":
            merchant_where = "WHERE merchant_id = %s"
            params = (authenticated_user.get("id"),)

        cursor.execute(f"""
            SELECT 
                merchant_id,
                merchant_name,
                merchant_email,
                business_type
            FROM merchant
            {merchant_where}
            ORDER BY merchant_name ASC;
        """, params)

        rows = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]

        merchants = []

        for row in rows:
            merchants.append(dict(zip(column_names, row)))

        return {"merchants": merchants}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.post("/merchants")
def create_merchant(
    merchant: NewMerchant,
    authorization: Optional[str] = Header(default=None)
):
    authenticated_user = get_authenticated_user(authorization)
    require_admin_user(authenticated_user)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        merchant_email = merchant.merchant_email.strip().lower()
        initial_password = merchant.password or generate_merchant_password(merchant_email)

        cursor.execute("""
            INSERT INTO merchant (
                merchant_name,
                merchant_email,
                password_hash,
                business_type
            )
            VALUES (%s, %s, %s, %s)
            RETURNING merchant_id, merchant_name, merchant_email, business_type;
        """, (
            merchant.merchant_name.strip(),
            merchant_email,
            hash_password(initial_password),
            merchant.business_type.strip() if merchant.business_type else None
        ))

        row = cursor.fetchone()
        conn.commit()
        clear_dashboard_cache()

        return {
            "message": "Merchant created successfully",
            "initial_password": initial_password,
            "merchant": {
                "merchant_id": row[0],
                "merchant_name": row[1],
                "merchant_email": row[2],
                "business_type": row[3]
            }
        }

    except UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Merchant email already exists")

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.get("/customers")
def get_customers(authorization: Optional[str] = Header(default=None)):
    get_authenticated_user(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT 
                customer_id,
                customer_name,
                customer_email,
                customer_pnumber,
                customer_address
            FROM customer
            ORDER BY customer_name ASC;
        """)

        rows = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]

        customers = []

        for row in rows:
            customers.append(dict(zip(column_names, row)))

        return {"customers": customers}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.post("/customers")
def create_customer(
    customer: NewCustomer,
    authorization: Optional[str] = Header(default=None)
):
    authenticated_user = get_authenticated_user(authorization)
    require_admin_user(authenticated_user)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO customer (
                customer_name,
                customer_email,
                customer_pnumber,
                customer_address
            )
            VALUES (%s, %s, %s, %s)
            RETURNING customer_id, customer_name, customer_email, customer_pnumber, customer_address;
        """, (
            customer.customer_name.strip(),
            customer.customer_email.strip().lower(),
            customer.customer_pnumber.strip() if customer.customer_pnumber else None,
            customer.customer_address.strip() if customer.customer_address else None
        ))

        row = cursor.fetchone()
        conn.commit()
        clear_dashboard_cache()

        return {
            "message": "Customer created successfully",
            "customer": {
                "customer_id": row[0],
                "customer_name": row[1],
                "customer_email": row[2],
                "customer_pnumber": row[3],
                "customer_address": row[4]
            }
        }

    except UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Customer email already exists")

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.post("/transactions")
def create_transaction(
    transaction: NewTransaction,
    request: Request,
    authorization: Optional[str] = Header(default=None)
):
    max_requests, window_seconds = get_rate_limit_config(
        "TRANSACTION_RATE_LIMIT",
        30,
        60
    )
    check_rate_limit(request, "create_transaction", max_requests, window_seconds)

    authenticated_user = get_authenticated_user(authorization)
    effective_merchant_id = transaction.merchant_id

    if authenticated_user.get("account_type") == "merchant":
        effective_merchant_id = int(authenticated_user.get("id"))

        if transaction.merchant_id != effective_merchant_id:
            raise HTTPException(
                status_code=403,
                detail="Merchant users can only submit transactions for their own account."
            )

    transaction_for_analysis = transaction.model_copy(
        update={"merchant_id": effective_merchant_id}
    )

    conn = get_connection()
    cursor = conn.cursor()

    try:
        fraud_analysis = analyze_fraud(transaction_for_analysis)
        risk_score = fraud_analysis["risk_score"]
        risk_level = fraud_analysis["risk_level"]
        reasons = fraud_analysis["reasons"]

        if "High" in risk_level:
            transaction_status = "rejected"
            decision = "Rejected"
        elif "Medium" in risk_level:
            transaction_status = "pending_review"
            decision = "Manual Review"
        else:
            transaction_status = "approved"
            decision = "Approved"

        reason_text = ", ".join(reasons)

        cursor.execute("""
            INSERT INTO transactions (
                merchant_id,
                customer_id,
                amount,
                product_category,
                billing_address,
                shipping_address,
                ip_location,
                transaction_status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING transaction_id, transaction_date;
        """, (
            effective_merchant_id,
            transaction.customer_id,
            transaction.amount,
            transaction.product_category,
            transaction.billing_address,
            transaction.shipping_address,
            transaction.ip_location,
            transaction_status
        ))

        new_transaction = cursor.fetchone()
        transaction_id = new_transaction[0]
        transaction_date = new_transaction[1]

        cursor.execute("""
            INSERT INTO fraud_check (
                transaction_id,
                risk_score,
                risk_level,
                decision,
                reason
            )
            VALUES (%s, %s, %s, %s, %s);
        """, (
            transaction_id,
            risk_score,
            risk_level,
            decision,
            reason_text
        ))

        if "Medium" in risk_level or "High" in risk_level:
            cursor.execute("""
                INSERT INTO alert (
                    transaction_id,
                    alert_type,
                    alert_message,
                    status
                )
                VALUES (%s, %s, %s, %s);
            """, (
                transaction_id,
                risk_level,
                "Transaction requires merchant review due to suspicious indicators.",
                "Unread"
            ))

        cursor.execute("""
            INSERT INTO audit_log (
                transaction_id,
                action,
                performed_by,
                performed_by_user_id
            )
            VALUES (%s, %s, %s, %s);
        """, (
            transaction_id,
            "Transaction submitted and analyzed.",
            get_actor_label(authenticated_user.get("email")),
            get_actor_user_id(authenticated_user)
        ))

        conn.commit()
        clear_dashboard_cache()

        return {
            "message": "Transaction submitted successfully",
            "transaction_id": transaction_id,
            "transaction_date": transaction_date.isoformat(),
            "transaction_status": transaction_status,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "decision": decision,
            "recommended_action": fraud_analysis["recommended_action"],
            "risk_breakdown": fraud_analysis["risk_breakdown"],
            "reasons": reasons,
            "rule_score": fraud_analysis["rule_score"],
            "rule_risk_level": fraud_analysis["rule_risk_level"],
            "ml_fraud_probability": fraud_analysis["ml_fraud_probability"],
            "ml_risk_level": fraud_analysis["ml_risk_level"],
            "ml_features": fraud_analysis["ml_features"]
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.get("/transactions")
def get_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    authorization: Optional[str] = Header(default=None)
):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        _, transaction_where, transaction_params = get_authenticated_scope(
            authorization,
            "t"
        )
        offset = (page - 1) * page_size

        cursor.execute(f"""
            SELECT COUNT(*)
            FROM transactions t
            {transaction_where};
        """, transaction_params)

        total_transactions = cursor.fetchone()[0]

        cursor.execute(f"""
            SELECT 
                t.transaction_id,
                m.merchant_name,
                c.customer_name,
                c.customer_email,
                t.amount,
                t.product_category,
                t.billing_address,
                t.shipping_address,
                t.ip_location,
                t.transaction_status,
                t.transaction_date,
                COALESCE(fc.risk_score, 0) AS risk_score,
                COALESCE(fc.risk_level, 'Not Checked') AS risk_level,
                COALESCE(fc.decision, 'Pending') AS decision,
                COALESCE(fc.reason, '') AS reason
            FROM transactions t
            JOIN merchant m 
                ON t.merchant_id = m.merchant_id
            JOIN customer c 
                ON t.customer_id = c.customer_id
            LEFT JOIN fraud_check fc 
                ON t.transaction_id = fc.transaction_id
            {transaction_where}
            ORDER BY t.transaction_date DESC
            LIMIT %s OFFSET %s;
        """, (*transaction_params, page_size, offset))

        rows = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]

        transactions = []

        for row in rows:
            transaction = dict(zip(column_names, row))
            transaction["amount"] = float(transaction["amount"])

            if transaction["transaction_date"]:
                transaction["transaction_date"] = transaction["transaction_date"].isoformat()

            transactions.append(transaction)

        return {
            "transactions": transactions,
            "page": page,
            "page_size": page_size,
            "total": total_transactions
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.get("/transactions/{transaction_id}")
def get_transaction_detail(
    transaction_id: int,
    authorization: Optional[str] = Header(default=None)
):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        authenticated_user = get_authenticated_user(authorization)
        merchant_condition = ""
        params = [transaction_id]

        if authenticated_user.get("account_type") == "merchant":
            merchant_condition = " AND t.merchant_id = %s"
            params.append(authenticated_user.get("id"))

        cursor.execute(f"""
            SELECT 
                t.transaction_id,
                m.merchant_name,
                m.merchant_email,
                m.business_type,
                c.customer_name,
                c.customer_email,
                c.customer_pnumber,
                c.customer_address,
                t.amount,
                t.product_category,
                t.billing_address,
                t.shipping_address,
                t.ip_location,
                t.transaction_status,
                t.transaction_date,
                COALESCE(fc.risk_score, 0) AS risk_score,
                COALESCE(fc.risk_level, 'Not Checked') AS risk_level,
                COALESCE(fc.decision, 'Pending') AS decision,
                COALESCE(fc.reason, '') AS reason,
                dl.courier_name,
                dl.tracking_number,
                dl.delivery_status,
                dl.proof_of_delivery
            FROM transactions t
            JOIN merchant m 
                ON t.merchant_id = m.merchant_id
            JOIN customer c 
                ON t.customer_id = c.customer_id
            LEFT JOIN fraud_check fc 
                ON t.transaction_id = fc.transaction_id
            LEFT JOIN delivery_log dl
                ON t.transaction_id = dl.transaction_id
            WHERE t.transaction_id = %s
            {merchant_condition};
        """, tuple(params))

        row = cursor.fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Transaction not found")

        column_names = [desc[0] for desc in cursor.description]
        transaction = dict(zip(column_names, row))

        transaction["amount"] = float(transaction["amount"])

        if transaction["transaction_date"]:
            transaction["transaction_date"] = transaction["transaction_date"].isoformat()

        cursor.execute("""
            SELECT 
                audit_id,
                action,
                performed_by,
                performed_by_user_id,
                timestamp
            FROM audit_log
            WHERE transaction_id = %s
            ORDER BY timestamp DESC;
        """, (transaction_id,))

        audit_rows = cursor.fetchall()
        audit_columns = [desc[0] for desc in cursor.description]

        audit_logs = []

        for audit_row in audit_rows:
            audit = dict(zip(audit_columns, audit_row))

            if audit["timestamp"]:
                audit["timestamp"] = audit["timestamp"].isoformat()

            audit_logs.append(audit)

        transaction["audit_logs"] = audit_logs

        return {"transaction": transaction}

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.get("/alerts")
def get_alerts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    authorization: Optional[str] = Header(default=None)
):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        _, transaction_where, transaction_params = get_authenticated_scope(
            authorization,
            "t"
        )
        offset = (page - 1) * page_size

        cursor.execute(f"""
            SELECT COUNT(*)
            FROM alert a
            JOIN transactions t
                ON a.transaction_id = t.transaction_id
            {transaction_where};
        """, transaction_params)

        total_alerts = cursor.fetchone()[0]

        cursor.execute(f"""
            SELECT
                a.alert_id,
                a.transaction_id,
                a.alert_type,
                a.alert_message,
                a.status,
                t.amount,
                t.product_category,
                t.transaction_status,
                t.transaction_date,
                c.customer_name,
                m.merchant_name,
                COALESCE(fc.risk_score, 0) AS risk_score,
                COALESCE(fc.risk_level, 'Not Checked') AS risk_level,
                COALESCE(fc.reason, '') AS reason
            FROM alert a
            JOIN transactions t
                ON a.transaction_id = t.transaction_id
            JOIN customer c
                ON t.customer_id = c.customer_id
            JOIN merchant m
                ON t.merchant_id = m.merchant_id
            LEFT JOIN fraud_check fc
                ON t.transaction_id = fc.transaction_id
            {transaction_where}
            ORDER BY a.alert_id DESC
            LIMIT %s OFFSET %s;
        """, (*transaction_params, page_size, offset))

        rows = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]

        alerts = []

        for row in rows:
            alert = dict(zip(column_names, row))
            alert["amount"] = float(alert["amount"])

            if alert["transaction_date"]:
                alert["transaction_date"] = alert["transaction_date"].isoformat()

            alerts.append(alert)

        return {
            "alerts": alerts,
            "page": page,
            "page_size": page_size,
            "total": total_alerts
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.post("/alerts/{alert_id}/review")
def mark_alert_reviewed(
    alert_id: int,
    performed_by: Optional[str] = None,
    authorization: Optional[str] = Header(default=None)
):
    authenticated_user = get_authenticated_user(authorization)
    require_admin_user(authenticated_user)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT transaction_id
            FROM alert
            WHERE alert_id = %s;
        """, (alert_id,))

        alert = cursor.fetchone()

        if alert is None:
            raise HTTPException(status_code=404, detail="Alert not found")

        transaction_id = alert[0]

        cursor.execute("""
            UPDATE alert
            SET status = %s
            WHERE alert_id = %s;
        """, ("Reviewed", alert_id))

        cursor.execute("""
            INSERT INTO audit_log (
                transaction_id,
                action,
                performed_by,
                performed_by_user_id
            )
            VALUES (%s, %s, %s, %s);
        """, (
            transaction_id,
            "Alert marked as reviewed.",
            get_actor_label(performed_by or authenticated_user.get("email")),
            get_actor_user_id(authenticated_user)
        ))

        conn.commit()
        clear_dashboard_cache()

        return {
            "alert_id": alert_id,
            "transaction_id": transaction_id,
            "status": "Reviewed",
            "message": "Alert marked as reviewed."
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


def update_transaction_decision(
    transaction_id: int,
    transaction_status: str,
    decision: str,
    action: str,
    performed_by: Optional[str] = None,
    authenticated_user=None
):
    require_admin_user(authenticated_user or {})

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT transaction_id, transaction_status
            FROM transactions
            WHERE transaction_id = %s;
        """, (transaction_id,))

        existing_transaction = cursor.fetchone()

        if existing_transaction is None:
            raise HTTPException(status_code=404, detail="Transaction not found")

        current_status = existing_transaction[1]

        if current_status != "pending_review":
            raise HTTPException(
                status_code=409,
                detail=f"Transaction is already {current_status} and cannot be changed."
            )

        cursor.execute("""
            UPDATE transactions
            SET transaction_status = %s
            WHERE transaction_id = %s;
        """, (transaction_status, transaction_id))

        cursor.execute("""
            UPDATE fraud_check
            SET decision = %s
            WHERE transaction_id = %s;
        """, (decision, transaction_id))

        cursor.execute("""
            UPDATE alert
            SET status = %s
            WHERE transaction_id = %s;
        """, ("Reviewed", transaction_id))

        cursor.execute("""
            INSERT INTO audit_log (
                transaction_id,
                action,
                performed_by,
                performed_by_user_id
            )
            VALUES (%s, %s, %s, %s);
        """, (
            transaction_id,
            action,
            get_actor_label(performed_by or authenticated_user.get("email")),
            get_actor_user_id(authenticated_user)
        ))

        conn.commit()
        clear_dashboard_cache()

        return {
            "transaction_id": transaction_id,
            "transaction_status": transaction_status,
            "decision": decision,
            "alert_status": "Reviewed",
            "message": action
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.post("/transactions/{transaction_id}/approve")
def approve_transaction(
    transaction_id: int,
    performed_by: Optional[str] = None,
    authorization: Optional[str] = Header(default=None)
):
    authenticated_user = get_authenticated_user(authorization)

    return update_transaction_decision(
        transaction_id=transaction_id,
        transaction_status="approved",
        decision="Approved",
        action="Transaction approved.",
        performed_by=performed_by,
        authenticated_user=authenticated_user
    )


@app.post("/transactions/{transaction_id}/reject")
def reject_transaction(
    transaction_id: int,
    performed_by: Optional[str] = None,
    authorization: Optional[str] = Header(default=None)
):
    authenticated_user = get_authenticated_user(authorization)

    return update_transaction_decision(
        transaction_id=transaction_id,
        transaction_status="rejected",
        decision="Rejected",
        action="Transaction rejected.",
        performed_by=performed_by,
        authenticated_user=authenticated_user
    )


@app.post("/transactions/{transaction_id}/freeze")
def freeze_transaction(
    transaction_id: int,
    performed_by: Optional[str] = None,
    authorization: Optional[str] = Header(default=None)
):
    authenticated_user = get_authenticated_user(authorization)

    return update_transaction_decision(
        transaction_id=transaction_id,
        transaction_status="frozen",
        decision="Frozen",
        action="Transaction frozen for review.",
        performed_by=performed_by,
        authenticated_user=authenticated_user
    )
