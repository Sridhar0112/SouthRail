-- v0.2.2: support collision-free in-transaction queue resequencing and ensure
-- no two open account tokens exist for the same user and purpose.

-- Migration 005 enforced RAC capacity against booking queue positions. RAC
-- capacity is passenger-based in v0.2.2, so remove the obsolete constraint on
-- both fresh and existing databases before repairing the queue.
alter table bookings
  drop constraint if exists ck_bookings_rac_capacity;

-- Temporarily allow negative positions. Existing valid queue positions are
-- positive, so negative values provide a collision-free namespace without
-- assuming that an arbitrary positive offset is unused.
alter table bookings
  drop constraint if exists ck_bookings_queue_position_positive;

-- Repair RAC using passenger occupancy, preserving whole-booking FIFO semantics.
-- Existing waitlist rows are moved aside first to avoid immediate unique-index
-- collisions while overflow RAC parties join the queue.
update bookings
set queue_position = (-(queue_position::bigint))::integer
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

-- First move every combined waitlist row to a fresh negative range below all
-- currently used absolute values. PostgreSQL's checked integer cast aborts the
-- surrounding migration transaction instead of wrapping if the domain is exhausted.
with waitlist_order as (
  select id,
         row_number() over (
           partition by train_id, journey_date, upper(travel_class)
           order by case when queue_position < 0 then 0 else 1 end,
                    abs(queue_position::bigint), created_at, pnr, id
         ) as new_position,
         max(abs(queue_position::bigint)) over () as global_max
  from bookings
  where status = 'WAITLISTED'
)
update bookings b
set queue_position = (-(ranked.global_max + ranked.new_position))::integer
from waitlist_order ranked
where b.id = ranked.id;

with ranked_waitlist as (
  select id,
         row_number() over (
           partition by train_id, journey_date, upper(travel_class)
           order by abs(queue_position::bigint), created_at, pnr, id
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
set queue_position = (-(queue_position::bigint))::integer
where status = 'RAC';

with ranked_rac as (
  select id,
         row_number() over (
           partition by train_id, journey_date, upper(travel_class)
           order by abs(queue_position::bigint), created_at, pnr, id
         ) as new_position
  from bookings
  where status = 'RAC'
)
update bookings b
set queue_position = ranked.new_position,
    reservation_label = 'RAC ' || ranked.new_position
from ranked_rac ranked
where b.id = ranked.id;

alter table bookings
  add constraint ck_bookings_queue_position_positive
  check (status not in ('RAC', 'WAITLISTED') or (queue_position is not null and queue_position > 0));

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
