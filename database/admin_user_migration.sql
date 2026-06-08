CREATE TABLE IF NOT EXISTS admin_user (
    admin_user_id SERIAL PRIMARY KEY,
    admin_name VARCHAR(50) NOT NULL,
    admin_email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Fraud Analyst'
);

CREATE INDEX IF NOT EXISTS idx_admin_user_email
    ON admin_user(admin_email);

INSERT INTO admin_user (
    admin_name,
    admin_email,
    password_hash,
    role
)
VALUES (
    'Admin',
    'admin@fraudshield.com',
    'sha256:240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'Fraud Analyst'
)
ON CONFLICT (admin_email) DO NOTHING;
