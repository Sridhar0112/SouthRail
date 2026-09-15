CREATE INDEX idx_payments_reconciliation
  ON payments(status, updated_at, created_at)
  WHERE status IN ('CREATED', 'PENDING', 'AUTHORIZED');
