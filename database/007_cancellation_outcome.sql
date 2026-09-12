-- Preserve the cancellation quote actually applied so later PNR and review
-- responses do not recompute or invent a refund as time advances.
alter table bookings
  add column if not exists refund_amount numeric(10, 2),
  add column if not exists cancellation_charge numeric(10, 2);

alter table bookings
  drop constraint if exists ck_bookings_cancellation_amounts;

alter table bookings
  add constraint ck_bookings_cancellation_amounts check (
    (refund_amount is null and cancellation_charge is null)
    or (
      refund_amount is not null
      and cancellation_charge is not null
      and refund_amount >= 0
      and cancellation_charge >= 0
      and refund_amount + cancellation_charge = total_fare
    )
  );
