# Waitlist and automatic promotion

## Overview and lifecycle

SouthRail uses the existing booking and passenger statuses to represent a queue; it does not
create placeholder seats. A multi-passenger booking is an indivisible queue party, so all of its
passengers share its `RAC` or `WAITLISTED` state and visible position.

```text
                    +-------------+
                    | WAITLISTED  |
                    +------+------+
                           |
              +------------+------------+
              |                         |
       capacity becomes available   user cancels
              |                         |
              v                         v
       +------+-----+             +-----+-----+
       | RAC /      |             | CANCELLED|
       | CONFIRMED  |             +-----------+
       +------------+
```

Journey departure is the lifecycle boundary: booking validation prevents joining for an invalid
journey and cancellation/promotion cannot be initiated after departure. The current domain has no
scheduled journey instance or expiration worker, so persisted queues are retained for history
rather than inventing a scheduler or an `EXPIRED` state.

## Business flow

1. Booking takes a PostgreSQL transaction-scoped advisory lock for train, journey date and class.
2. The existing seat allocator is queried. A party receives `CONFIRMED` and physical seats only
   when the whole party fits and no older queued party exists.
3. Otherwise the existing RAC tier is filled (up to ten passengers), then the party receives the
   next `WL n` position. The same lock serializes concurrent joins.
4. Cancellation locks the same inventory scope and PNR, applies the existing refund policy, and
   releases booked seats.
5. Locked FIFO queries promote whole parties. Seat allocation, booking/passenger transitions,
   queue compaction and audit records share the cancellation transaction.
6. A promotion event is published in that transaction. Its listener runs only after commit and
   creates an in-app notification in a new transaction. Delivery failure is logged and cannot
   corrupt the confirmed reservation.

The queue is scoped exactly like the current physical inventory: train, operating date and class.
Although source and destination are validated and returned, the current seat model reserves a seat
for the complete train run and does not persist per-segment occupancy. Consequently queues are
deliberately conservative across intermediate segments; introducing segment reuse requires a
separate inventory-model migration, not a waitlist-only shortcut.

## Concurrency and database integrity

PostgreSQL advisory transaction locks serialize booking/cancellation for an inventory scope.
Candidate queues are additionally selected with pessimistic write locks. The partial unique seat
index prevents two active allocations for one physical seat, and partial unique queue indexes
prevent duplicate visible positions. FIFO uses position, creation time, PNR and ID as deterministic
tie-breakers. V10 adds status checks and a targeted active-queue FIFO index.

Positions are materialized because this was the existing public API and database invariant.
Compaction stages values outside the live range before rewriting them, avoiding transient unique
constraint collisions. A future high-volume version could derive ranks instead, but changing that
contract is intentionally outside this feature.

## API additions

No new endpoint or authorization rule is introduced. Authenticated users continue to use the PNR
endpoint and can only read their own booking (administrators retain their existing access). The
response keeps legacy `passengerStatuses`, `reservationLabel`, and `queuePosition` fields and adds
structured passenger details:

```json
{
  "pnr": "SR123456789",
  "status": "WAITLISTED",
  "queuePosition": 2,
  "passengers": [{
    "name": "Passenger",
    "status": "WAITLISTED",
    "waitlistPosition": 2,
    "seatNumber": null
  }]
}
```

After confirmation, `waitlistPosition` becomes `null` and `seatNumber` is formatted as
`coach/number`, for example `A1/15`.

## Assumptions

- RAC remains an existing SouthRail business tier and is not bypassed.
- A party is promoted only when every passenger fits; smaller parties do not jump an older party.
- Existing cancellation/refund rules are unchanged for confirmed, RAC and waitlisted bookings.
- Promotion notification currently uses the persisted in-app channel. The transactional email
  outbox remains used for initial booking confirmations and was not replaced.
