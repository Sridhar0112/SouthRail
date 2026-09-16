alter table app_users alter column password_hash drop not null;
alter table app_users add column if not exists auth_provider varchar(20);
alter table app_users add column if not exists provider_subject varchar(255);
create unique index if not exists uq_app_users_provider_identity
  on app_users(auth_provider, provider_subject)
  where auth_provider is not null and provider_subject is not null;

create table oauth_login_codes (
  id uuid primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  code_hash varchar(64) not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index idx_oauth_login_codes_expiry on oauth_login_codes(expires_at) where used_at is null;
