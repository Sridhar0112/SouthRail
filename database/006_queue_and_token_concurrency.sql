-- v0.2.2: support collision-free in-transaction queue resequencing and ensure
-- no two open account tokens exist for the same user and purpose.

-- Queue positions are temporarily shifted upward while a locked queue is
-- compacted. Only committed state is visible to other transactions.
alter table bookings
  drop constraint if exists ck_bookings_queue_position_positive;

alter table bookings
  add constraint ck_bookings_queue_position_positive
  check (status not in ('RAC', 'WAITLISTED') or (queue_position is not null and queue_position > 0));

-- Repair RAC using passenger occupancy, preserving whole-booking FIFO semantics.
-- Existing waitlist rows are moved aside first to avoid immediate unique-index
-- collisions while overflow RAC parties join the queue.
update bookings
set queue_position = queue_position + 1000000
where status = 'WAITLISTED';

with rac_parties as (
  select b.id,
         sum(count(p.id)) over (
           partition by b.train_id, b.journey_date, upper(b.travel_class)
           order by b.queue_position, b.created_at, b.pnr, b.id
         ) as cumulative_passengers
  from bookings b
  join passengers p on p.booking_id = b.id
  where b.status = 'RAC'
  group by b.id, b.train_id, b.journey_date, b.travel_class,
           b.queue_position, b.created_at, b.pnr
)
update bookings b
set status = 'WAITLISTED',
    queue_position = 2000000 + b.queue_position,
    reservation_label = 'WL'
from rac_parties ranked
where b.id = ranked.id
  and ranked.cumulative_passengers > 10;

update passengers p
set status = 'WAITLISTED',
    updated_at = now()
from bookings b
where p.booking_id = b.id
  and b.status = 'WAITLISTED'
  and p.status = 'RAC';

with ranked_waitlist as (
  select id,
         row_number() over (
           partition by train_id, journey_date, upper(travel_class)
           order by queue_position, created_at, pnr, id
         ) as new_position
  from bookings
  where status = 'WAITLISTED'
)
update bookings b
set queue_position = ranked.new_position,
    reservation_label = 'WL ' || ranked.new_position
from ranked_waitlist ranked
where b.id = ranked.id;

update bookings
set queue_position = queue_position + 1000000
where status = 'RAC';

with ranked_rac as (
  select id,
         row_number() over (
           partition by train_id, journey_date, upper(travel_class)
           order by queue_position, created_at, pnr, id
         ) as new_position
  from bookings
  where status = 'RAC'
)
update bookings b
set queue_position = ranked.new_position,
    reservation_label = 'RAC ' || ranked.new_position
from ranked_rac ranked
where b.id = ranked.id;

-- Repair duplicates defensively before adding the invariant. The newest token
-- stays open and all older tokens become consumed.
with ranked_open_tokens as (
  select id,
         row_number() over (
           partition by user_id, token_type
           order by created_at desc, id desc
         ) as token_rank
  from account_tokens
  where used_at is null
)
update account_tokens token
set used_at = now(),
    updated_at = now()
from ranked_open_tokens ranked
where token.id = ranked.id
  and ranked.token_rank > 1;

create unique index if not exists uq_account_tokens_one_open_per_type
  on account_tokens (user_id, token_type)
  where used_at is null;
