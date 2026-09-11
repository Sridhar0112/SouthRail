-- Repair legacy RAC overflow first. Promotion is intentionally out of scope;
-- overflow rows retain their relative order at the end of the waitlist.
with ranked_rac as (
  select id,
         row_number() over (
           partition by train_id, journey_date, upper(travel_class)
           order by created_at, pnr, id
         ) as rac_position
  from bookings
  where status = 'RAC'
)
update bookings b
set status = 'WAITLISTED'
from ranked_rac
where b.id = ranked_rac.id
  and ranked_rac.rac_position > 10;

-- Repair legacy duplicate queue positions before enforcing serialization at
-- the database boundary.
with ranked as (
  select id,
         row_number() over (
           partition by train_id, journey_date, upper(travel_class), status
           order by created_at, pnr, id
         ) as new_position
  from bookings
  where status in ('RAC', 'WAITLISTED')
)
update bookings b
set queue_position = ranked.new_position,
    reservation_label = case
      when b.status = 'RAC' then 'RAC ' || ranked.new_position
      else 'WL ' || ranked.new_position
    end
from ranked
where b.id = ranked.id;

create unique index if not exists uq_bookings_rac_queue_position
  on bookings (train_id, journey_date, upper(travel_class), queue_position)
  where status = 'RAC';

create unique index if not exists uq_bookings_waitlist_queue_position
  on bookings (train_id, journey_date, upper(travel_class), queue_position)
  where status = 'WAITLISTED';

alter table bookings
  drop constraint if exists ck_bookings_queue_position_positive;

alter table bookings
  add constraint ck_bookings_queue_position_positive
  check (status not in ('RAC', 'WAITLISTED') or (queue_position is not null and queue_position > 0));

-- RAC capacity is passenger-based. A booking-level queue-position upper bound
-- incorrectly rejects valid positions when earlier parties contain multiple
-- passengers, so capacity is enforced transactionally while the train row is
-- locked. The positive/non-null queue invariant remains database-enforced.
alter table bookings
  drop constraint if exists ck_bookings_rac_capacity;
