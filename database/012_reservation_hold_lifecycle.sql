CREATE TABLE reservation_holds (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES app_users(id), train_id UUID NOT NULL REFERENCES trains(id),
 source_station_id UUID NOT NULL REFERENCES stations(id), destination_station_id UUID NOT NULL REFERENCES stations(id),
 journey_date DATE NOT NULL, travel_class VARCHAR(5) NOT NULL, quota VARCHAR(20) NOT NULL,
 total_fare NUMERIC(10,2) NOT NULL CHECK (total_fare > 0), status VARCHAR(20) NOT NULL,
 provisional_status VARCHAR(20) NOT NULL, reservation_label VARCHAR(30) NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL, idempotency_key VARCHAR(128) NOT NULL,
 request_fingerprint VARCHAR(64) NOT NULL, booking_id UUID UNIQUE REFERENCES bookings(id),
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
 CONSTRAINT ck_reservation_hold_status CHECK (status IN ('ACTIVE','CONFIRMED','EXPIRED','CANCELLED')),
 CONSTRAINT ck_reservation_hold_provisional CHECK (provisional_status IN ('CONFIRMED','RAC','WAITLISTED')),
 CONSTRAINT ck_reservation_hold_expiry CHECK (expires_at > created_at),
 CONSTRAINT uq_reservation_hold_user_key UNIQUE (user_id, idempotency_key)
);
CREATE INDEX idx_reservation_holds_inventory ON reservation_holds(train_id, journey_date, travel_class, expires_at)
 WHERE status = 'ACTIVE';
CREATE INDEX idx_reservation_holds_expiry ON reservation_holds(expires_at) WHERE status = 'ACTIVE';

CREATE TABLE reservation_hold_passengers (
 id UUID PRIMARY KEY, hold_id UUID NOT NULL REFERENCES reservation_holds(id) ON DELETE CASCADE,
 passenger_order INTEGER NOT NULL CHECK (passenger_order >= 0), full_name VARCHAR(100) NOT NULL,
 age INTEGER NOT NULL CHECK (age BETWEEN 1 AND 125), gender VARCHAR(20) NOT NULL,
 berth_preference VARCHAR(20), created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
 CONSTRAINT uq_hold_passenger_order UNIQUE(hold_id, passenger_order)
);

ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN reservation_hold_id UUID REFERENCES reservation_holds(id);
ALTER TABLE payments ADD CONSTRAINT ck_payment_owner CHECK (
  booking_id IS NOT NULL OR reservation_hold_id IS NOT NULL
);
CREATE INDEX idx_payments_hold ON payments(reservation_hold_id);
CREATE UNIQUE INDEX uq_payments_one_active_hold ON payments(reservation_hold_id)
 WHERE reservation_hold_id IS NOT NULL AND status IN ('CREATED','PENDING','AUTHORIZED','CAPTURED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED');
ALTER TABLE payment_refunds ALTER COLUMN booking_id DROP NOT NULL;
