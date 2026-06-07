INSERT INTO merchant (merchant_id, merchant_name, merchant_email, password_hash, business_type)
VALUES
(1, 'Jeri Electronics', 'merchant@example.com', 'placeholder_hash_merchant123', 'Electronics'),
(2, 'Budi Fashion Store', 'budi.fashion@example.com', 'placeholder_hash_budifashion123', 'Fashion'),
(3, 'Sari Jewelry', 'sari.jewelry@example.com', 'placeholder_hash_sarijewelry123', 'Jewelry'),
(4, 'Nusantara Travel', 'travel@example.com', 'placeholder_hash_travel123', 'Travel')
ON CONFLICT (merchant_email) DO NOTHING;

INSERT INTO customer (customer_id, customer_name, customer_email, customer_pnumber, customer_address)
VALUES
(1, 'Andi Wijaya', 'andi@example.com', '08123456789', 'Jakarta, Indonesia'),
(2, 'Maya Putri', 'maya@example.com', '082233445566', 'Bandung, Indonesia'),
(3, 'Rizky Pratama', 'rizky@example.com', '083344556677', 'Surabaya, Indonesia'),
(4, 'Dewi Lestari', 'dewi@example.com', '084455667788', 'Medan, Indonesia'),
(5, 'Tono Santoso', 'tono@example.com', '085566778899', 'Yogyakarta, Indonesia')
ON CONFLICT (customer_email) DO NOTHING;

SELECT setval('merchant_merchant_id_seq', GREATEST((SELECT MAX(merchant_id) FROM merchant), 1));
SELECT setval('customer_customer_id_seq', GREATEST((SELECT MAX(customer_id) FROM customer), 1));

INSERT INTO transactions (
    transaction_id,
    merchant_id,
    customer_id,
    amount,
    product_category,
    billing_address,
    shipping_address,
    ip_location,
    transaction_status,
    transaction_date
)
VALUES
(1, 1, 1, 120000.00, 'Groceries', 'Jakarta', 'Jakarta', 'Jakarta', 'approved', CURRENT_TIMESTAMP - INTERVAL '6 days'),
(2, 1, 2, 3000000.00, 'Groceries', 'Jakarta', 'Jakarta', 'Jakarta', 'pending_review', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(3, 2, 3, 900000.00, 'Fashion', 'Jakarta', 'Bandung', 'Bandung', 'pending_review', CURRENT_TIMESTAMP - INTERVAL '4 days'),
(4, 3, 4, 5000000.00, 'Jewelry', 'Jakarta', 'Bandung', 'Surabaya', 'rejected', CURRENT_TIMESTAMP - INTERVAL '3 days'),
(5, 4, 5, 250000.00, 'Travel', 'Jakarta', 'Medan', 'Surabaya', 'pending_review', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(6, 2, 1, 800000.00, 'RandomStuff', 'Jakarta', 'Jakarta', 'Jakarta', 'approved', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (transaction_id) DO NOTHING;

SELECT setval('transactions_transaction_id_seq', GREATEST((SELECT MAX(transaction_id) FROM transactions), 1));

INSERT INTO fraud_check (
    transaction_id,
    risk_score,
    risk_level,
    decision,
    reason
)
VALUES
(1, 3, 'Low Risk', 'Approved', ''),
(2, 32, 'Medium Risk', 'Manual Review', 'Very high transaction amount'),
(3, 31, 'Medium Risk', 'Manual Review', 'Elevated transaction amount, Billing and shipping address mismatch'),
(4, 96, 'High Risk', 'Rejected', 'Very high transaction amount, Billing and shipping address mismatch, IP location differs from shipping location, Higher-risk product category'),
(5, 57, 'Medium Risk', 'Manual Review', 'Billing and shipping address mismatch, IP location differs from shipping location, Higher-risk product category'),
(6, 9, 'Low Risk', 'Approved', 'Elevated transaction amount')
ON CONFLICT (transaction_id) DO NOTHING;

INSERT INTO alert (
    transaction_id,
    alert_type,
    alert_message,
    status
)
VALUES
(2, 'Medium Risk', 'Transaction requires merchant review due to suspicious indicators.', 'Unread'),
(3, 'Medium Risk', 'Transaction requires merchant review due to suspicious indicators.', 'Reviewed'),
(4, 'High Risk', 'Transaction requires merchant review due to suspicious indicators.', 'Unread'),
(5, 'Medium Risk', 'Transaction requires merchant review due to suspicious indicators.', 'Unread')
ON CONFLICT DO NOTHING;

INSERT INTO delivery_log (
    transaction_id,
    courier_name,
    tracking_number,
    delivery_status,
    proof_of_delivery
)
VALUES
(1, 'JNE', 'JNE-10001', 'Delivered', 'Signed by customer'),
(6, 'SiCepat', 'SCP-10006', 'In Transit', NULL)
ON CONFLICT (transaction_id) DO NOTHING;

INSERT INTO audit_log (
    transaction_id,
    action,
    performed_by,
    timestamp
)
VALUES
(1, 'Transaction submitted and analyzed.', 'System', CURRENT_TIMESTAMP - INTERVAL '6 days'),
(2, 'Transaction submitted and analyzed.', 'System', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(3, 'Transaction submitted and analyzed.', 'System', CURRENT_TIMESTAMP - INTERVAL '4 days'),
(3, 'Alert reviewed by fraud analyst.', 'Admin', CURRENT_TIMESTAMP - INTERVAL '3 days 20 hours'),
(4, 'Transaction submitted and analyzed.', 'System', CURRENT_TIMESTAMP - INTERVAL '3 days'),
(5, 'Transaction submitted and analyzed.', 'System', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(6, 'Transaction submitted and analyzed.', 'System', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT DO NOTHING;
