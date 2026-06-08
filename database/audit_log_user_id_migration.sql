ALTER TABLE audit_log
ADD COLUMN IF NOT EXISTS performed_by_user_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by_user_id
    ON audit_log(performed_by_user_id);
