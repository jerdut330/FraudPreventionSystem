CREATE TABLE merchant (
    merchant_id SERIAL PRIMARY KEY,
    merchant_name VARCHAR(50) NOT NULL,
    merchant_email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    business_type VARCHAR(50)
);

CREATE TABLE customer (
    customer_id SERIAL PRIMARY KEY,
    customer_name VARCHAR(50) NOT NULL,
    customer_email VARCHAR(100) NOT NULL UNIQUE,
    customer_pnumber VARCHAR(20),
    customer_address TEXT
);

CREATE TABLE admin_user (
    admin_user_id SERIAL PRIMARY KEY,
    admin_name VARCHAR(50) NOT NULL,
    admin_email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Fraud Analyst'
);

CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    merchant_id INT NOT NULL,
    customer_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    product_category VARCHAR(50),
    billing_address TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    ip_location VARCHAR(100),
    transaction_status VARCHAR(50) NOT NULL,
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_transaction_merchant
        FOREIGN KEY (merchant_id)
        REFERENCES merchant(merchant_id),

    CONSTRAINT fk_transaction_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer(customer_id)
);

CREATE TABLE fraud_check (
    fraud_check_id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL UNIQUE,
    risk_score INT NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    decision VARCHAR(20),
    reason TEXT,

    CONSTRAINT fk_fraud_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(transaction_id)
);

CREATE TABLE alert (
    alert_id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    alert_message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,

    CONSTRAINT fk_alert_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(transaction_id)
);

CREATE TABLE delivery_log (
    delivery_id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL UNIQUE,
    courier_name VARCHAR(50),
    tracking_number VARCHAR(50),
    delivery_status VARCHAR(20),
    proof_of_delivery TEXT,

    CONSTRAINT fk_delivery_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(transaction_id)
);

CREATE TABLE audit_log (
    audit_id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by VARCHAR(50),
    performed_by_user_id VARCHAR(50),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id
    ON transactions(merchant_id);

CREATE INDEX IF NOT EXISTS idx_admin_user_email
    ON admin_user(admin_email);

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
