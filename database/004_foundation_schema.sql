-- Brings the manually managed schema in line with the entities that pre-date
-- Flyway adoption. This script is idempotent for fresh Compose databases and
-- must be applied explicitly to existing environments before deploying.

alter table app_users
  add column if not exists failed_login_attempts integer not null default 0,
  add column if not exists account_locked_until timestamptz,
  add column if not exists deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

alter table bookings
  add column if not exists queue_position integer,
  add column if not exists reservation_label varchar(20);

create table if not exists audit_logs (
  id uuid primary key,
  user_id uuid,
  username varchar(255),
  action varchar(255),
  module varchar(255),
  description text,
  ip_address varchar(255),
  user_agent text,
  created_at timestamptz
);

create table if not exists support_tickets (
  id uuid primary key,
  full_name varchar(120) not null,
  email varchar(120) not null,
  booking_reference varchar(20),
  topic varchar(120) not null,
  description varchar(5000) not null,
  status varchar(20) not null,
  created_at timestamp not null
);

create table if not exists support_ticket_messages (
  id uuid primary key,
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  sender_type varchar(20) not null,
  sender_name varchar(120) not null,
  sender_email varchar(120) not null,
  message text not null,
  created_at timestamp not null
);

create index if not exists idx_audit_logs_created_at
  on audit_logs (created_at desc);

create index if not exists idx_support_tickets_email_created_at
  on support_tickets (email, created_at desc);

create index if not exists idx_support_ticket_messages_ticket_created_at
  on support_ticket_messages (ticket_id, created_at);
