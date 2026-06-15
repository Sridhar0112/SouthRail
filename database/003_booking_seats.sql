create extension if not exists "uuid-ossp";

create table if not exists booking_seats (
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
  updated_at timestamptz not null
);

create unique index if not exists uq_booking_seats_booking_passenger
  on booking_seats (booking_id, passenger_id);

create index if not exists idx_booking_seats_booking_id
  on booking_seats (booking_id);

create index if not exists idx_booking_seats_passenger_id
  on booking_seats (passenger_id);

create index if not exists idx_booking_seats_train_date_class
  on booking_seats (train_id, journey_date, travel_class);

create index if not exists idx_booking_seats_seat_date
  on booking_seats (train_id, journey_date, coach_id, seat_number);

create unique index if not exists uq_booking_seats_active_seat
  on booking_seats (train_id, journey_date, coach_id, seat_number)
  where status = 'BOOKED';

with active_passengers as (
  select
    p.id as passenger_id,
    p.booking_id,
    b.train_id,
    b.journey_date,
    b.travel_class,
    row_number() over (
      partition by b.train_id, b.journey_date, upper(b.travel_class)
      order by b.created_at, b.pnr, p.created_at, p.id
    ) as seat_rank
  from passengers p
  join bookings b on b.id = p.booking_id
  where b.status in ('CONFIRMED', 'RAC', 'WAITLISTED', 'PARTIALLY_CANCELLED')
    and not exists (
      select 1
      from booking_seats bs
      where bs.passenger_id = p.id
        and bs.status = 'BOOKED'
    )
),
seat_pool as (
  select
    c.train_id,
    c.travel_class,
    c.id as coach_id,
    c.coach_code,
    generated_seats.seat_number,
    case
      when upper(c.travel_class) in ('SL', '3A') then
        case ((generated_seats.seat_number - 1) % 8)
          when 0 then 'LB'
          when 1 then 'MB'
          when 2 then 'UB'
          when 3 then 'LB'
          when 4 then 'MB'
          when 5 then 'UB'
          when 6 then 'SL'
          else 'SU'
        end
      when upper(c.travel_class) = '2A' then
        case ((generated_seats.seat_number - 1) % 6)
          when 0 then 'LB'
          when 1 then 'UB'
          when 2 then 'LB'
          when 3 then 'UB'
          when 4 then 'SL'
          else 'SU'
        end
      when upper(c.travel_class) = '1A' then
        case when (generated_seats.seat_number % 2) = 0 then 'COUPE' else 'CABIN' end
      else 'GENERAL'
    end as berth_type,
    row_number() over (
      partition by c.train_id, upper(c.travel_class)
      order by c.coach_code, generated_seats.seat_number
    ) as seat_rank
  from coaches c
  cross join lateral generate_series(1, c.capacity) as generated_seats(seat_number)
)
insert into booking_seats (
  id,
  booking_id,
  passenger_id,
  coach_id,
  train_id,
  journey_date,
  travel_class,
  coach_code,
  seat_number,
  berth_type,
  status,
  created_at,
  updated_at
)
select
  uuid_generate_v5(uuid_ns_url(), 'booking-seat:' || active_passengers.passenger_id::text),
  active_passengers.booking_id,
  active_passengers.passenger_id,
  seat_pool.coach_id,
  active_passengers.train_id,
  active_passengers.journey_date,
  active_passengers.travel_class,
  seat_pool.coach_code,
  seat_pool.seat_number,
  seat_pool.berth_type,
  'BOOKED',
  now(),
  now()
from active_passengers
join seat_pool
  on seat_pool.train_id = active_passengers.train_id
  and upper(seat_pool.travel_class) = upper(active_passengers.travel_class)
  and seat_pool.seat_rank = active_passengers.seat_rank
on conflict do nothing;

select count(*) as booking_seat_rows from booking_seats;
