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

-- Repair rows produced by the previous backfill, which treated RAC/WL as
-- physical reservations. Keeping the rows as RELEASED preserves history.
update booking_seats bs
set status = 'RELEASED',
    updated_at = now()
from passengers p, bookings b
where bs.passenger_id = p.id
  and bs.booking_id = b.id
  and bs.status = 'BOOKED'
  and (p.status <> 'CONFIRMED' or b.status not in ('CONFIRMED', 'PARTIALLY_CANCELLED'));

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
  -- RAC, waitlist and cancelled passengers deliberately receive no physical seat.
  where p.status = 'CONFIRMED'
    and b.status in ('CONFIRMED', 'PARTIALLY_CANCELLED')
    and not exists (
      select 1
      from booking_seats bs
      where bs.passenger_id = p.id
        and bs.status = 'BOOKED'
    )
),
journey_inventory as (
  select distinct train_id, journey_date, travel_class
  from active_passengers
),
seat_pool as (
  select
    c.train_id,
    journey_inventory.journey_date,
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
      partition by c.train_id, journey_inventory.journey_date, upper(c.travel_class)
      order by c.coach_code, generated_seats.seat_number
    ) as seat_rank
  from journey_inventory
  join coaches c
    on c.train_id = journey_inventory.train_id
    and upper(c.travel_class) = upper(journey_inventory.travel_class)
  cross join lateral generate_series(1, c.capacity) as generated_seats(seat_number)
  where not exists (
    select 1 from booking_seats occupied
    where occupied.train_id = c.train_id
      and occupied.journey_date = journey_inventory.journey_date
      and occupied.coach_id = c.id
      and occupied.seat_number = generated_seats.seat_number
      and occupied.status = 'BOOKED'
  )
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
  and seat_pool.journey_date = active_passengers.journey_date
  and upper(seat_pool.travel_class) = upper(active_passengers.travel_class)
  and seat_pool.seat_rank = active_passengers.seat_rank
on conflict do nothing;

select count(*) as booking_seat_rows from booking_seats;
