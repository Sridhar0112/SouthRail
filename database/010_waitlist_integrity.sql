-- Keep fresh Docker database initialization aligned with Flyway V10.
alter table bookings
  drop constraint if exists ck_bookings_reservation_status;
alter table bookings
  add constraint ck_bookings_reservation_status
  check (status in ('CONFIRMED', 'RAC', 'WAITLISTED', 'CANCELLED'));

alter table passengers
  drop constraint if exists ck_passengers_reservation_status;
alter table passengers
  add constraint ck_passengers_reservation_status
  check (status in ('CONFIRMED', 'RAC', 'WAITLISTED', 'CANCELLED'));

create index if not exists idx_bookings_active_queue_fifo
  on bookings (train_id, journey_date, upper(travel_class), status,
               queue_position, created_at, id)
  where status in ('RAC', 'WAITLISTED');
