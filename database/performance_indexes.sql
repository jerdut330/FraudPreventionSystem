ALTER TABLE audit_log
ADD COLUMN IF NOT EXISTS performed_by_user_id VARCHAR(50);

CREATE TABLE IF NOT EXISTS admin_user (
    admin_user_id SERIAL PRIMARY KEY,
    admin_name VARCHAR(50) NOT NULL,
    admin_email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Fraud Analyst'
);

CREATE INDEX IF NOT EXISTS idx_admin_user_email
    ON admin_user(admin_email);

CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id
    ON transactions(merchant_id);

CREATE INDEX IF NOT EXISTS idx_transactions_date
    ON transactions(transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_status
    ON transactions(transaction_status);

CREATE INDEX IF NOT EXISTS idx_fraud_check_risk_level
    ON fraud_check(risk_level);

CREATE INDEX IF NOT EXISTS idx_alert_status
    ON alert(status);

CREATE INDEX IF NOT EXISTS idx_alert_transaction_id
    ON alert(transaction_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_transaction_id
    ON audit_log(transaction_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by_user_id
    ON audit_log(performed_by_user_id);
