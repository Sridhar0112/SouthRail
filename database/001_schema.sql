create extension if not exists "uuid-ossp";

create table app_users (
  id uuid primary key,
  email varchar(120) not null unique,
  full_name varchar(120) not null,
  password_hash varchar(255) not null,
  phone varchar(15),
  email_verified boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table roles (
  id uuid primary key,
  name varchar(40) not null unique,
  description varchar(160) not null
);

create table user_roles (
  user_id uuid not null references app_users(id) on delete cascade,
  role_name varchar(40) not null,
  primary key (user_id, role_name)
);

create table stations (
  id uuid primary key,
  code varchar(10) not null unique,
  name varchar(120) not null,
  city varchar(80) not null,
  state varchar(80) not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table trains (
  id uuid primary key,
  number varchar(10) not null unique,
  name varchar(140) not null,
  category varchar(60) not null,
  active boolean not null default true,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table routes (
  id uuid primary key,
  train_id uuid not null references trains(id) on delete cascade,
  route_name varchar(140) not null,
  source_station_id uuid not null references stations(id),
  destination_station_id uuid not null references stations(id),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table route_stops (
  id uuid primary key,
  train_id uuid not null references trains(id) on delete cascade,
  station_id uuid not null references stations(id),
  stop_order integer not null,
  arrival_time time,
  departure_time time,
  day_offset integer not null default 0,
  distance_km integer not null default 0,
  platform varchar(255),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (train_id, stop_order),
  unique (train_id, station_id)
);

create table coaches (
  id uuid primary key,
  train_id uuid not null references trains(id) on delete cascade,
  coach_code varchar(4) not null,
  travel_class varchar(5) not null,
  capacity integer not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (train_id, coach_code)
);

create table bookings (
  id uuid primary key,
  pnr varchar(12) not null unique,
  user_id uuid not null references app_users(id),
  train_id uuid not null references trains(id),
  source_station_id uuid not null references stations(id),
  destination_station_id uuid not null references stations(id),
  journey_date date not null,
  travel_class varchar(5) not null,
  quota varchar(20) not null,
  status varchar(30) not null,
  total_fare numeric(10, 2) not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table passengers (
  id uuid primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  full_name varchar(100) not null,
  age integer not null,
  gender varchar(20) not null,
  berth_preference varchar(20),
  status varchar(30) not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table booking_seats (
  id uuid primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  passenger_id uuid not null references passengers(id) on delete cascade,
  coach_id uuid not null references coaches(id),
  train_id uuid not null references trains(id),
  journey_date date not null,
  travel_class varchar(5) not null,
  coach_code varchar(10) not null,
  seat_number integer not null,
  berth_type varchar(20),
  status varchar(30) not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (booking_id, passenger_id)
);

create table notifications (
  id uuid primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  channel varchar(40) not null,
  title varchar(140) not null,
  message varchar(800) not null,
  read_flag boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table refresh_tokens (
  id uuid primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  token_hash varchar(255) not null unique,
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table account_tokens (
  id uuid primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  token_type varchar(40) not null,
  token_hash varchar(255) not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index idx_station_code on stations (upper(code));
create index idx_train_number on trains (number);
create index idx_route_train_order on route_stops (train_id, stop_order);
create index idx_route_station on route_stops (station_id);
create index idx_booking_user_created on bookings (user_id, created_at desc);
create index idx_booking_pnr on bookings (pnr);
create index idx_booking_journey on bookings (train_id, journey_date, travel_class, quota);
create index idx_booking_seats_booking_id on booking_seats (booking_id);
create index idx_booking_seats_passenger_id on booking_seats (passenger_id);
create index idx_booking_seats_train_date_class on booking_seats (train_id, journey_date, travel_class);
create index idx_booking_seats_seat_date on booking_seats (train_id, journey_date, coach_id, seat_number);
create unique index uq_booking_seats_active_seat
  on booking_seats (train_id, journey_date, coach_id, seat_number)
  where status = 'BOOKED';
create index idx_refresh_token_hash on refresh_tokens (token_hash);
create index idx_account_token_hash on account_tokens (token_hash);
create index idx_account_token_user_type on account_tokens (user_id, token_type, used_at);
