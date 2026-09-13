-- Remove the unimplemented aggregate status without inventing passenger-level cancellation.
update bookings set status = 'CANCELLED', reservation_label = 'CANCELLED', queue_position = null
where status = 'PARTIALLY_CANCELLED';
update passengers set status = 'CANCELLED'
where booking_id in (select id from bookings where status = 'CANCELLED')
  and status = 'PARTIALLY_CANCELLED';

alter table bookings add column if not exists idempotency_key varchar(128);
create unique index if not exists uq_bookings_user_idempotency_key
  on bookings(user_id, idempotency_key) where idempotency_key is not null;

create table if not exists email_outbox (
  id uuid primary key,
  mime_message bytea,
  status varchar(20) not null default 'PENDING',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error varchar(500),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint ck_email_outbox_status check (status in ('PENDING', 'DELIVERED', 'FAILED')),
  constraint ck_email_outbox_attempts check (attempts >= 0)
);
create index if not exists idx_email_outbox_delivery
  on email_outbox(next_attempt_at, created_at) where status = 'PENDING';
