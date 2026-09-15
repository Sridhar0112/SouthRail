CREATE TABLE payments (
 id UUID PRIMARY KEY, booking_id UUID NOT NULL REFERENCES bookings(id), provider VARCHAR(20) NOT NULL,
 provider_order_id VARCHAR(64), provider_payment_id VARCHAR(64), amount NUMERIC(12,2) NOT NULL CHECK(amount > 0),
 currency VARCHAR(3) NOT NULL CHECK(currency = 'INR'), status VARCHAR(24) NOT NULL,
 idempotency_key VARCHAR(128) NOT NULL, failure_code VARCHAR(80), failure_description VARCHAR(500),
 authorized_at TIMESTAMPTZ, captured_at TIMESTAMPTZ, failed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_reconciliation ON payments(status, updated_at, created_at)
 WHERE status IN ('CREATED','PENDING','AUTHORIZED');
CREATE UNIQUE INDEX uq_payments_order ON payments(provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE UNIQUE INDEX uq_payments_provider_payment ON payments(provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE UNIQUE INDEX uq_payments_idempotency ON payments(idempotency_key);
CREATE UNIQUE INDEX uq_payments_one_successful_booking ON payments(booking_id)
 WHERE status IN ('CREATED','PENDING','AUTHORIZED','CAPTURED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED');

CREATE TABLE payment_refunds (
 id UUID PRIMARY KEY, payment_id UUID NOT NULL REFERENCES payments(id), booking_id UUID NOT NULL REFERENCES bookings(id),
 provider_refund_id VARCHAR(64), amount NUMERIC(12,2) NOT NULL CHECK(amount > 0), status VARCHAR(20) NOT NULL,
 idempotency_key VARCHAR(128) NOT NULL, reason VARCHAR(250), completed_at TIMESTAMPTZ, failed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_refunds_booking ON payment_refunds(booking_id);
CREATE UNIQUE INDEX uq_refunds_provider_id ON payment_refunds(provider_refund_id) WHERE provider_refund_id IS NOT NULL;
CREATE UNIQUE INDEX uq_refunds_idempotency ON payment_refunds(idempotency_key);

CREATE TABLE payment_webhook_events (
 id UUID PRIMARY KEY, provider VARCHAR(20) NOT NULL, event_id VARCHAR(100) NOT NULL, event_type VARCHAR(80) NOT NULL,
 received_at TIMESTAMPTZ NOT NULL, processed_at TIMESTAMPTZ, processing_status VARCHAR(20) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
 CONSTRAINT uq_webhook_provider_event UNIQUE(provider,event_id)
);
CREATE INDEX idx_webhook_received ON payment_webhook_events(received_at);
