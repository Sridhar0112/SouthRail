# `main` production-readiness review — 2026-09-16

## Scope, revision, and evidence limits

This review covers the complete repository snapshot at `cc8db47` (`fix: reference
app_users in reservation hold migration`), including all backend and frontend source,
Flyway and duplicate operator SQL, tests, CI, Docker/deployment configuration, and the
visible linear commit history. The local checkout has no remote-tracking refs or merge
commits. Attempts to query GitHub search/API and fetch `main` and PR refs through the
available integration/network failed with HTTP 401/403. Consequently, GitHub PR review
threads for #57–#59 and current Actions job results could not be independently retrieved.
The source/commit assessment below is exact for `cc8db47`; claims about PR numbering and
latest hosted Actions are explicitly marked unverified rather than guessed.

The review does **not** treat compilation or a green unit suite as evidence that the
payment/booking invariants are correct. In particular, the default test profile disables
Flyway and uses H2 `create-drop`, while only a subset of tests use PostgreSQL containers.

## Executive conclusion

**The reviewed `main` snapshot is not safe for production.** An authenticated caller can
still create a confirmed ticket and consume a seat without creating a hold or paying
(F-01). The newly added late-capture refund path also conflicts with its JPA mapping and
is likely to roll back the capture webhook/reconciliation transaction exactly when the
system owes money (F-02). These are release blockers. Refund event loss, unbounded hold
inventory denial, deployment configuration omissions, and missing end-to-end race tests
add substantial P1/P2 operational risk.

No P0 (immediate unauthenticated system-wide compromise or irreversible loss proven from
source alone) was identified. There are two P1 confirmed/source-backed blockers and two
additional P1 risks requiring PostgreSQL/provider runtime confirmation.

## Confirmed defects

### F-01 — P1: authenticated clients bypass hold and payment and obtain a real PNR/seat

1. **Location:** `backend/src/main/java/com/southrail/reservation/controller/booking/BookingController.java`,
   `BookingController.create`; `backend/src/main/java/com/southrail/reservation/service/booking/BookingService.java`,
   `BookingService.create`.
2. **Evidence:** `POST /bookings` remains authenticated but unrestricted and directly
   invokes `bookingService.create`. That method computes availability, persists a booking
   and passengers, allocates physical seats for `CONFIRMED`, emits confirmation, and
   returns `paymentStatus = "NOT_COLLECTED"`. There is no hold ID, captured payment, or
   internal-only authorization precondition. The frontend now uses `/reservation-holds`,
   but server correctness cannot depend on that client.
3. **Reproduction:** register/login; submit a valid future-journey body directly to
   `POST /api/bookings` with any/new `Idempotency-Key`; observe HTTP 201 with PNR and
   `CONFIRMED`; retrieve `/api/pnr/{pnr}` or the ticket PDF without ever calling a payment
   endpoint.
4. **Status:** confirmed from source. A live API run is only needed to demonstrate impact.
5. **Fix:** remove/publicly reject `POST /bookings`; expose booking creation only as an
   internal finalization operation accepting a locked `ReservationHold` and `Payment` in
   `CAPTURED`. Encode that invariant in the service/domain layer, not just routing. Migrate
   or explicitly grandfather legacy unpaid bookings.
6. **Automated test:** a `MockMvc` authenticated integration test must assert
   `POST /bookings` is 404/410/403 and creates no `bookings`, `passengers`, or
   `booking_seats`; a PostgreSQL finalization test must assert only a captured payment can
   create exactly one booking/PNR.

### F-02 — P1: expired-hold refund obligations violate the JPA association contract

1. **Location:** `backend/src/main/java/com/southrail/reservation/entity/payment/PaymentRefund.java`,
   `PaymentRefund.booking` and `PaymentRefund.request`; `backend/src/main/java/com/southrail/reservation/service/booking/ReservationHoldFinalizationService.java`,
   `requestExpiryRefund`; `backend/src/main/resources/db/migration/V13__reservation_hold_lifecycle.sql`.
2. **Evidence:** V13 deliberately drops `payment_refunds.booking_id` `NOT NULL`, and an
   expired hold has no booking. `PaymentRefund.request` therefore assigns `null` from
   `payment.getBooking()`. The entity nevertheless declares the association
   `@ManyToOne(optional = false)`. Hibernate's nullability contract conflicts with the
   schema and the new domain flow; flush can raise `PropertyValueException`. Because
   finalization occurs inside the payment capture transaction, the capture status and
   refund obligation can both roll back and the webhook can return an error.
3. **Reproduction:** on PostgreSQL, create a hold/order, advance `expires_at` into the
   past, deliver a correctly signed `payment.captured` webhook, and force flush/commit.
   Observe failure rather than durable `REFUND_PENDING` plus a refund row with null
   `booking_id` (exact exception should be runtime-confirmed).
4. **Status:** mapping/schema/domain mismatch confirmed; exact Hibernate exception needs
   runtime testing.
5. **Fix:** make the booking association optional (`@ManyToOne(fetch = LAZY)` and nullable
   join column), retain non-null `payment_id`, and strengthen SQL with an ownership check
   suitable for booking- and hold-backed refunds. Add a real PostgreSQL migration/JPA
   validation test.
6. **Automated test:** Testcontainers + Flyway: persist a captured hold payment with no
   booking, call `finalizeCaptured` after expiry, flush and commit, then assert hold
   `EXPIRED`, payment `REFUND_PENDING`, one refund with null `booking_id`, and a subsequent
   dispatcher claim succeeds.

### F-03 — P2: profile UI calls an API that does not exist

1. **Location:** `frontend/src/components/ProfilePage.jsx`, notification-preference save
   handler; `backend/src/main/java/com/southrail/reservation/controller/account/ProfileController.java`.
2. **Evidence:** the frontend sends `PUT /users/me/notification-preferences`; the backend
   controller exposes only GET/PUT/DELETE `/users/me` and PUT `/users/me/password`.
3. **Reproduction:** sign in, edit notification preferences, save, and observe 404/405.
4. **Status:** confirmed from source.
5. **Fix:** either implement a persisted, owned preferences endpoint/DTO/migration or
   remove/disable the control until supported. Document the contract in OpenAPI.
6. **Automated test:** frontend MSW/component test asserting the exact supported request,
   plus `MockMvc` contract test for `PUT /users/me/notification-preferences` returning 200
   and a subsequent GET reflecting the values.

### F-04 — P2: frontend lint is non-reproducible and frontend has no CI coverage

1. **Location:** `frontend/eslint.config.js`; `frontend/package.json`; `.github/workflows/backend-ci.yml`.
2. **Evidence:** ESLint imports `eslint-plugin-react`, but it is absent from both dependency
   groups/lockfile; `npm run lint` fails with `ERR_MODULE_NOT_FOUND`. The only workflow is
   backend-only and its path filters omit `frontend/**`, so frontend lint/build can regress
   without a required check. The production build currently succeeds independently.
3. **Reproduction:** from a clean checkout run `cd frontend && npm ci && npm run lint`.
4. **Status:** confirmed locally (the existing `node_modules` also lacks the plugin).
5. **Fix:** add/pin `eslint-plugin-react` (and any other explicitly imported plugins), use
   `npm ci` in the Docker build, and add a frontend workflow running `npm ci`, lint, tests,
   and build on frontend changes.
6. **Automated test:** required GitHub job with exact command
   `cd frontend && npm ci && npm run lint && npm run build`.

### F-05 — P2: Compose cannot configure the payment subsystem

1. **Location:** `docker-compose.yml`, `backend.environment`; `backend/src/main/resources/application.yml`,
   `razorpay` configuration.
2. **Evidence:** the app reads `RAZORPAY_ENABLED`, key ID, key secret, webhook secret, base
   URL, and reconciliation tuning. Compose forwards none of them, so a Compose production
   deployment always receives the default `enabled=false` regardless of values in the
   operator `.env`. The new payment UI then reaches `RAZORPAY_UNAVAILABLE`.
3. **Reproduction:** set valid `RAZORPAY_*` values in `.env`, run
   `docker compose config`, and observe none under `services.backend.environment`; start
   the stack and attempt order creation.
4. **Status:** confirmed from source/config expansion.
5. **Fix:** forward all required Razorpay variables, require secrets when enabled, validate
   them at prod startup, and prefer secrets injection rather than plain environment where
   the platform supports it.
6. **Automated test:** render Compose with sentinel variables and use `yq` to assert the
   backend container contains them; add a prod-profile context test that rejects
   `RAZORPAY_ENABLED=true` with blank/placeholder secrets.

### F-06 — P3: operator SQL and Flyway histories have diverged

1. **Location:** `database/011_payment_lifecycle.sql` versus
   `backend/src/main/resources/db/migration/V11__payment_lifecycle.sql` and
   `V12__payment_reconciliation_index.sql`.
2. **Evidence:** operator SQL 011 includes `idx_payments_reconciliation`; Flyway V11 does
   not because it was split into V12. Applying both operator SQL and Flyway is therefore a
   different history (even if `CREATE INDEX` is harmless in this instance), and the naming
   is now offset (`database/012` corresponds to Flyway V13). This invites drift and false
   runbook assumptions.
3. **Reproduction:** diff the paired files or inventory versions in a database built by
   each documented mechanism.
4. **Status:** confirmed from source.
5. **Fix:** declare Flyway the single authority; generate any operator bundle from Flyway
   migrations and checksum it. Do not hand-maintain two version sequences.
6. **Automated test:** CI creates two empty PostgreSQL databases, applies each supported
   installation path, and compares normalized `pg_dump --schema-only` output.

## Unverified risks requiring runtime/provider testing

### R-01 — P1: an early refund webhook is permanently acknowledged and discarded

1. **Location:** `PaymentWebhookService.handleRefund`; `RefundDispatcher.dispatch`;
   `RefundPersistenceService.providerAccepted`.
2. **Evidence:** refund lookup is only by `provider_refund_id`, which is written only after
   the outbound Razorpay call returns. A webhook racing ahead finds nothing, returns
   `false`, and the enclosing event is committed as `IGNORED`. There is no refund-fetch or
   refund-reconciliation API/path; the dispatcher merely reissues the refund request after
   a five-minute lease.
3. **Reproduction:** block the outbound refund response after Razorpay creates the refund;
   deliver `refund.processed` before `providerAccepted`; then release a response reporting
   `pending` and inspect local status/event over multiple leases.
4. **Status:** source race is confirmed; whether Razorpay ordering/idempotent retry
   behavior self-heals it requires sandbox testing.
5. **Fix:** correlate webhooks through payment ID/notes when the refund ID is not yet stored,
   persist unmatched signed events for retry, and implement provider refund reconciliation
   (`fetchRefund`) rather than repeated creation as the only recovery.
6. **Automated test:** deterministic latches around fake gateway response and webhook
   delivery; assert the event is retryable (not terminal `IGNORED`) and ends with refund
   `PROCESSED` exactly once.

### R-02 — P1: authenticated users can reserve the entire inventory with unlimited holds

1. **Location:** `ReservationHoldService.create`; `ReservationHoldRepository.countConfirmedHeldPassengers`.
2. **Evidence:** every distinct per-user idempotency key can create another ten-minute
   active hold, and active confirmed holds subtract from availability. There is no active
   hold quota per user/device/journey, no explicit release endpoint, and no rate limit.
3. **Reproduction:** one account submits capacity-many one-passenger holds with unique keys
   for the same inventory; another user sees zero confirmed availability until expiry.
4. **Status:** confirmed design exposure; severity/throughput requires load testing.
5. **Fix:** cap active holds per user and inventory key, supersede/release abandoned holds,
   rate-limit creation, and monitor hold-to-capture ratios. Consider a DB-enforced quota or
   serialized counter rather than process-local controls.
6. **Automated test:** concurrent PostgreSQL integration test submits `limit + 1` distinct
   keys for one user and asserts the final request is 429/409 and cannot reduce inventory.

### R-03 — P2: stale authorized payments are polled forever; configured creation expiry is unused

1. **Location:** `PaymentReconciliationService.reconcileStalePayments`/`remotePayment`;
   `PaymentReconciliationPersistenceService.apply`;
   `PaymentReconciliationProperties`; `application.yml`.
2. **Evidence:** candidates are only `PENDING`/`AUTHORIZED`. For an already `AUTHORIZED`
   local payment whose provider remains `authorized`, `apply` makes no change, leaving the
   old `updated_at`, so it is selected every scheduler run indefinitely. The configured
   `creation-expiry` is passed only as an ignored legacy argument and no terminal expiry or
   operator escalation exists.
3. **Reproduction:** seed an old `AUTHORIZED` payment and return `authorized` on every fake
   gateway fetch; run the scheduler repeatedly and count calls/status/timestamp.
4. **Status:** confirmed from source; provider capture policy determines production impact.
5. **Fix:** define an explicit authorized-payment SLA and capture/refund/manual-review
   transition, backoff/retry metadata, bounded attempts, and alerting. Remove or implement
   `creation-expiry` honestly.
6. **Automated test:** fixed-clock scheduler test verifies bounded calls/backoff and the
   specified terminal/manual-review outcome after the SLA.

### R-04 — P2: hold expiry batching can retain inventory indefinitely under sustained backlog

1. **Location:** `ReservationHoldExpiryProcessor.expire`; `ReservationHoldRepository.findExpiredCandidates`.
2. **Evidence:** one batch of at most 50 is processed per fixed 15-second delay. There is no
   loop/drain, `SKIP LOCKED`, lag metric, or multi-node claim protocol. Availability queries
   correctly ignore expired timestamps even if status is still ACTIVE, so seat inventory
   is not numerically blocked, but stale rows and operational lag can grow without bound.
3. **Reproduction:** insert thousands of expired holds, run one scheduler tick, and inspect
   remaining ACTIVE rows and lock contention with concurrent payment capture.
4. **Status:** source behavior confirmed; production throughput requires load testing.
5. **Fix:** drain bounded batches per tick with time budget, use PostgreSQL claim semantics
   (`FOR UPDATE SKIP LOCKED`) for multiple replicas, and emit oldest-expired age/count.
6. **Automated test:** Testcontainers load test with two processors proves every row is
   expired once, no deadlock occurs, and backlog drains within the defined SLA.

### R-05 — P2: no end-to-end test proves the new hold/payment state machine

1. **Location:** `backend/src/test/**`; specifically the payment unit tests and
   `PaymentFlywayIntegrationTest`.
2. **Evidence:** the hold feature added production entities/controllers/services and V13,
   but there are no `ReservationHold*Test` classes and no test visible for hold creation
   races, hold expiry versus capture, late refund persistence, or one-booking finalization.
   The normal test profile disables Flyway and uses H2.
3. **Reproduction:** list test classes and test names; run coverage/test inventory.
4. **Status:** confirmed coverage gap; resulting failures are covered separately as risks.
5. **Fix:** add PostgreSQL/Flyway integration tests around the whole state machine with
   deterministic clocks/latches and signed webhook fixtures.
6. **Automated test:** parameterized state-machine suite covering ACTIVE→CONFIRMED,
   ACTIVE→EXPIRED, capture/expiry both orders, duplicate verify/webhook/reconciliation,
   concurrent order keys, and cancellation after finalization.

## Already-fixed or substantially mitigated issues

Because PR metadata was unavailable, this section maps the visible commit clusters that
appear to correspond to the requested reviews; the **PR-number attribution remains
unverified**.

### Likely PR #57 payment lifecycle cluster (`9d9bc78` through `faba2d0`)

* **Fixed:** checkout signature uses constant-time HMAC comparison; verification also
  fetches the provider payment and validates order, amount, currency, and provider ID.
* **Fixed:** webhook signatures use the raw request bytes converted as UTF-8 and webhook
  deduplication is backed by `(provider,event_id)` uniqueness.
* **Fixed:** order creation avoids holding a database transaction over provider I/O;
  idempotency and one-active-payment constraints handle concurrent requests.
* **Fixed:** booking cancellation obtains the inventory/booking locks and creates a durable
  refund obligation in the same local transaction; provider I/O is asynchronous.
* **Still open:** direct `/bookings` bypass (F-01), early refund event loss (R-01), and no
  provider-side end-to-end sandbox proof.

### Likely PR #58 reconciliation cluster (`b2ed9e1` through `a85dd89`)

* **Fixed:** reconciliation selects only provider-backed `PENDING`/`AUTHORIZED` records,
  rechecks staleness under a row lock, validates every provider field, and rejects a
  provider payment ID already linked elsewhere.
* **Fixed:** it no longer marks ambiguous/missing provider results failed merely because a
  local timer elapsed.
* **Still open:** perpetually authorized records and unused creation expiry (R-03), plus no
  refund reconciliation (R-01).

### Likely PR #59 hold lifecycle cluster (`0489393`, `cc8db47`)

* **Fixed:** V13's user foreign key now correctly references `app_users`, not `users`.
* **Fixed in design:** hold creation and booking finalization use the same PostgreSQL
  advisory inventory scope; active confirmed holds are included in availability; capture
  and expiry serialize on the hold row; duplicate hold/payment keys are constrained.
* **Still open:** nullable refund mapping (F-02), unlimited active holds (R-02), test gap
  (R-05), and the legacy direct-booking escape hatch (F-01).

## Authentication, authorization, and exposure assessment

No additional ownership bypass was confirmed in the reviewed paths. Payment status,
verification, active attempt lookup, hold lookup/order creation, PNR, cancellation, and
ticket generation all derive the authenticated principal and perform owner checks (with
documented admin access where applicable). The Razorpay webhook is public by necessity and
validates its signature before parsing/processing. Admin controllers use both route rules
and method/class authorization. Public train/review responses do not expose account or
payment secrets.

Residual concerns are business authorization rather than identity authorization: every
authenticated user is authorized to invoke the legacy ticket-issuing endpoint (F-01), and
every user can create unlimited inventory-affecting holds (R-02).

## Build, migration, Docker, deployment, and Actions assessment

* Local frontend production build succeeds, though the main JS chunk is roughly 552 kB
  before gzip and Vite warns it exceeds the default chunk threshold.
* Local frontend lint fails due to the missing plugin (F-04).
* Maven verification could not start because this environment received HTTP 403 fetching
  the uncached Spring Boot parent. This is an environment/network limitation, not a source
  pass or failure.
* The backend Dockerfile deliberately packages with tests skipped; correctness therefore
  depends on CI. The sole workflow runs Maven backend verification, but not frontend lint,
  frontend build, Docker builds, Compose rendering, Flyway CLI validation, or a deployed
  smoke test.
* The production datasource uses `ddl-auto=validate` and Flyway, which is appropriate, but
  most ordinary tests bypass both with H2. `baseline-on-migrate=true` at version 8 should
  be used only for the explicitly supported legacy schema; against an arbitrary non-empty
  database it can falsely bless missing V1–V8 objects.
* Hosted Actions results and PR checks could not be retrieved under the integration's
  401/403 limitation. They must be checked before merge/release; their absence here is not
  interpreted as failure or success.

## Top five checks to run next

1. **Full backend suite with Docker/Testcontainers available**

   ```bash
   cd backend && mvn --batch-mode --no-transfer-progress clean verify
   ```

2. **Flyway on a truly empty PostgreSQL 16 database, followed by schema validation**

   ```bash
   docker run --rm -d --name southrail-audit-pg -e POSTGRES_PASSWORD=audit \
     -e POSTGRES_DB=southrail_audit -p 55432:5432 postgres:16-alpine
   until docker exec southrail-audit-pg pg_isready -U postgres -d southrail_audit; do sleep 1; done
   cd backend && DB_URL=jdbc:postgresql://localhost:55432/southrail_audit \
     DB_USERNAME=postgres DB_PASSWORD=audit JWT_SECRET=01234567890123456789012345678901 \
     mvn --batch-mode --no-transfer-progress -DskipTests spring-boot:run \
     -Dspring-boot.run.arguments=--spring.main.web-application-type=none
   docker exec southrail-audit-pg psql -U postgres -d southrail_audit -c \
     "select installed_rank,version,description,success from flyway_schema_history order by installed_rank;"
   ```

3. **Direct-booking bypass API test (must fail after remediation)**

   ```bash
   curl -i -X POST "$BASE_URL/api/bookings" \
     -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
     -H 'Idempotency-Key: bypass-proof-1' --data @/tmp/valid-booking.json
   # Required result: 404/410/403, and zero matching booking/seat rows in PostgreSQL.
   ```

4. **Late capture/expiry/refund race against PostgreSQL and signed webhook**

   ```bash
   docker exec southrail-audit-pg psql -U postgres -d southrail_audit -c \
     "update reservation_holds set expires_at=now()-interval '1 second' where id='$HOLD_ID';"
   SIG=$(printf '%s' "$WEBHOOK_JSON" | openssl dgst -sha256 -hmac "$RAZORPAY_WEBHOOK_SECRET" -hex | awk '{print $2}')
   curl -i -X POST "$BASE_URL/api/payments/webhooks/razorpay" \
     -H 'Content-Type: application/json' -H "X-Razorpay-Signature: $SIG" \
     -H 'X-Razorpay-Event-Id: audit-late-capture-1' --data-binary "$WEBHOOK_JSON"
   docker exec southrail-audit-pg psql -U postgres -d southrail_audit -c \
     "select h.status,p.status,r.status,r.booking_id from reservation_holds h join payments p on p.reservation_hold_id=h.id left join payment_refunds r on r.payment_id=p.id where h.id='$HOLD_ID';"
   ```

5. **Clean frontend contract/build check and rendered deployment configuration**

   ```bash
   rm -rf frontend/node_modules && npm --prefix frontend ci && npm --prefix frontend run lint \
     && npm --prefix frontend run build
   RAZORPAY_ENABLED=true RAZORPAY_KEY_ID=a RAZORPAY_KEY_SECRET=b \
     RAZORPAY_WEBHOOK_SECRET=c DB_USERNAME=a DB_PASSWORD=b \
     JWT_SECRET=01234567890123456789012345678901 JWT_ISSUER=southrail \
     CORS_ALLOWED_ORIGINS=https://example.test APP_FRONTEND_URL=https://example.test \
     MAIL_FROM=noreply@example.test docker compose config | yq '.services.backend.environment'
   ```

## Release gate

Do not deploy until F-01 and F-02 are fixed and proven with PostgreSQL integration tests.
Before production traffic, also close or explicitly accept R-01/R-02, pass the five checks
above, verify PR #57–#59 review threads against their exact merge SHAs, and inspect the
latest `main` Actions run/job logs in GitHub. A green Maven job alone is insufficient
because it neither exercises the public flow bypass nor the complete hold/refund race and
does not test the frontend or Compose configuration.
