from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from fraud_logic import calculate_fraud_score
from database import get_connection


app = FastAPI(title="Fraud Prevention System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/dashboard/summary")
def get_dashboard_summary():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                COUNT(*) AS total_transactions,
                COUNT(*) FILTER (WHERE transaction_status = 'approved') AS approved_transactions,
                COUNT(*) FILTER (WHERE transaction_status = 'pending_review') AS pending_review,
                COUNT(*) FILTER (WHERE transaction_status = 'rejected') AS rejected_transactions,
                COUNT(*) FILTER (WHERE transaction_status = 'frozen') AS frozen_transactions,
                COALESCE(SUM(amount), 0) AS total_transaction_value
            FROM transactions;
        """)

        transaction_summary = cursor.fetchone()

        cursor.execute("""
            SELECT
                COUNT(*) AS total_alerts,
                COUNT(*) FILTER (WHERE status = 'Unread') AS unread_alerts,
                COUNT(*) FILTER (WHERE status = 'Reviewed') AS reviewed_alerts
            FROM alert;
        """)

        alert_summary = cursor.fetchone()

        cursor.execute("""
            SELECT
                COUNT(*) FILTER (WHERE risk_level ILIKE '%High%') AS high_risk,
                COUNT(*) FILTER (WHERE risk_level ILIKE '%Medium%') AS medium_risk,
                COUNT(*) FILTER (WHERE risk_level ILIKE '%Low%') AS low_risk
            FROM fraud_check;
        """)

        risk_summary = cursor.fetchone()

        return {
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

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()

@app.get("/dashboard/trends")
def get_dashboard_trends():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                DATE(transaction_date) AS date,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE transaction_status = 'approved') AS approved,
                COUNT(*) FILTER (WHERE transaction_status = 'pending_review') AS pending_review,
                COUNT(*) FILTER (WHERE transaction_status = 'rejected') AS rejected,
                COUNT(*) FILTER (WHERE transaction_status = 'frozen') AS frozen
            FROM transactions
            GROUP BY DATE(transaction_date)
            ORDER BY DATE(transaction_date) ASC;
        """)

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

        return {"trends": trends}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()

@app.get("/merchants")
def get_merchants():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT 
                merchant_id,
                merchant_name,
                merchant_email,
                business_type
            FROM merchant
            ORDER BY merchant_name ASC;
        """)

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


@app.get("/customers")
def get_customers():
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


@app.post("/transactions")
def create_transaction(transaction: NewTransaction):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        risk_score, risk_level, reasons = calculate_fraud_score(transaction)

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
            transaction.merchant_id,
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
                performed_by
            )
            VALUES (%s, %s, %s);
        """, (
            transaction_id,
            "Transaction submitted and analyzed.",
            "System"
        ))

        conn.commit()

        return {
            "message": "Transaction submitted successfully",
            "transaction_id": transaction_id,
            "transaction_date": transaction_date.isoformat(),
            "transaction_status": transaction_status,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "decision": decision,
            "reasons": reasons
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.get("/transactions")
def get_transactions():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
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
            ORDER BY t.transaction_date DESC;
        """)

        rows = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]

        transactions = []

        for row in rows:
            transaction = dict(zip(column_names, row))
            transaction["amount"] = float(transaction["amount"])

            if transaction["transaction_date"]:
                transaction["transaction_date"] = transaction["transaction_date"].isoformat()

            transactions.append(transaction)

        return {"transactions": transactions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.get("/transactions/{transaction_id}")
def get_transaction_detail(transaction_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
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
            WHERE t.transaction_id = %s;
        """, (transaction_id,))

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
def get_alerts():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
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
            ORDER BY a.alert_id DESC;
        """)

        rows = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]

        alerts = []

        for row in rows:
            alert = dict(zip(column_names, row))
            alert["amount"] = float(alert["amount"])

            if alert["transaction_date"]:
                alert["transaction_date"] = alert["transaction_date"].isoformat()

            alerts.append(alert)

        return {"alerts": alerts}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@app.post("/alerts/{alert_id}/review")
def mark_alert_reviewed(alert_id: int):
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
                performed_by
            )
            VALUES (%s, %s, %s);
        """, (
            transaction_id,
            "Alert marked as reviewed.",
            "Admin"
        ))

        conn.commit()

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


def update_transaction_decision(transaction_id: int, transaction_status: str, decision: str, action: str):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT transaction_id
            FROM transactions
            WHERE transaction_id = %s;
        """, (transaction_id,))

        existing_transaction = cursor.fetchone()

        if existing_transaction is None:
            raise HTTPException(status_code=404, detail="Transaction not found")

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
                performed_by
            )
            VALUES (%s, %s, %s);
        """, (
            transaction_id,
            action,
            "Admin"
        ))

        conn.commit()

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
def approve_transaction(transaction_id: int):
    return update_transaction_decision(
        transaction_id=transaction_id,
        transaction_status="approved",
        decision="Approved",
        action="Transaction approved and forwarded to payment gateway."
    )


@app.post("/transactions/{transaction_id}/reject")
def reject_transaction(transaction_id: int):
    return update_transaction_decision(
        transaction_id=transaction_id,
        transaction_status="rejected",
        decision="Rejected",
        action="Transaction rejected and blocked before payment processing."
    )


@app.post("/transactions/{transaction_id}/freeze")
def freeze_transaction(transaction_id: int):
    return update_transaction_decision(
        transaction_id=transaction_id,
        transaction_status="frozen",
        decision="Frozen",
        action="Transaction frozen for further investigation."
    )