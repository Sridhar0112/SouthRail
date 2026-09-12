-- Access tokens issued before a password change/reset must no longer authenticate.
alter table app_users
  add column if not exists credentials_version bigint not null default 0;
