# SouthRail backend production audit (pre-v0.2.2 remediation snapshot, 2026-09-09)

> The critical/high findings in this snapshot are addressed by the focused
> v0.2.2 remediation described in `v0.2.2-backend-remediation.md`.

## OVERALL VERDICT: NOT SAFE TO CONTINUE DEVELOPMENT

The existing train-row lock and partial unique indexes materially improve booking serialization, and PNR ownership checks are present. However, cancellation leaves queue gaps that can make later bookings fail, RAC capacity is enforced per booking rather than per passenger, account-token issuance is not serialized, and production schema evolution is manual. These are blockers before feature work.

## CRITICAL

### C-1 — Cancelling a queued booking can permanently block the next booking

- **Severity:** CRITICAL (confirmed defect)
- **Exact file / symbol:** `BookingCancellationService.cancel`; `BookingService.create`; `BookingRepository.countByTrainIdAndJourneyDateAndTravelClassAndStatus`; `database/005_booking_concurrency.sql` indexes `uq_bookings_rac_queue_position` and `uq_bookings_waitlist_queue_position`.
- **Problem:** Cancellation changes a RAC/WL booking to `CANCELLED` but neither compacts the remaining queue nor promotes it. Creation derives the next position as `count(status) + 1`, which is not `max(position) + 1` and is unsafe once a gap exists.
- **Impact:** With WL positions 1 and 2, cancelling WL 1 leaves one WL row. The next booking computes position 2 and violates the partial unique index. The request returns `409 DATA_CONFLICT`; repeated attempts remain impossible until data is repaired. RAC has the same failure mode. Released confirmed inventory also never promotes RAC/WL.
- **Reproduction:** Fill confirmed inventory; create WL 1 and WL 2; cancel WL 1; create another waitlisted booking.
- **Recommended fix:** Under the same per-train/date/class lock, implement deterministic promotion and queue compaction. Lock affected queue rows in a consistent order; promote RAC to confirmed only when enough physical seats can be atomically allocated, move the first WL entry into RAC when space exists, and renumber all affected rows/labels safely (deferred uniqueness or a collision-free two-phase update). Add PostgreSQL concurrency tests.
- **Blocker before next feature work:** YES

## HIGH

### H-1 — RAC limit counts bookings, not passengers

- **Severity:** HIGH (confirmed defect)
- **Exact file / symbol:** `BookingService.create`; constant `RAC_LIMIT`; `BookingDtos.BookingRequest.passengers`; `database/005_booking_concurrency.sql` constraint `ck_bookings_rac_capacity`.
- **Problem:** RAC occupancy is `count(bookings)` and every passenger receives RAC status, while the request has no passenger-count upper bound. The database only constrains a booking's queue position to at most 10.
- **Impact:** Ten bookings containing an arbitrary number of passengers can all be RAC, grossly exceeding a ten-place RAC capacity; a single oversized request also amplifies memory/SQL/email work and may overflow the `numeric(10,2)` fare column.
- **Reproduction:** Exhaust confirmed seats and submit ten bookings with many passengers each; all ten booking rows fit positions 1–10 and all passengers are RAC.
- **Recommended fix:** Define queue semantics explicitly at passenger level (preferred), enforce a small request maximum (normally six), calculate remaining RAC slots by active RAC passengers, split mixed passenger outcomes if supported, and enforce invariants in PostgreSQL rather than only a booking-position check.
- **Blocker before next feature work:** YES

### H-2 — Concurrent account-token requests can leave multiple valid tokens

- **Severity:** HIGH (confirmed security/concurrency defect)
- **Exact file / symbol:** `AuthService.createAccountToken`, `forgotPassword`, `resendVerificationEmail`, `sendUnlockEmail`; `AccountTokenRepository.markOpenTokensUsed`.
- **Problem:** Issuance updates existing open tokens and inserts a new token without locking the user or enforcing one-open-token uniqueness. Two concurrent transactions can both run the update before either insert is visible, then both commit valid tokens. The five-minute throttle is likewise a check-then-act race.
- **Impact:** More than one reset, verification, or unlock link remains usable, defeating intended invalidation and allowing duplicate email bursts.
- **Reproduction:** Send two synchronized reset requests for the same user on PostgreSQL; both can observe no recent token, update zero rows, and insert distinct open tokens.
- **Recommended fix:** Lock the user row before throttle/invalidation/creation and add a database-enforced single-open-token invariant (for example, a dedicated current-token record or carefully designed unique index). Send mail after commit through an outbox.
- **Blocker before next feature work:** YES

### H-3 — Authentication lockout updates lose increments under concurrency

- **Severity:** HIGH (confirmed security defect)
- **Exact file / symbol:** `AuthService.login`; `UserRepository.findByEmailIgnoreCase`.
- **Problem:** `login` has no transaction-level serialization or atomic update. Concurrent failures read the same `failedLoginAttempts`, overwrite one another, and can keep the account below the threshold. A concurrent success can also race a failure and unpredictably clear or restore lock state.
- **Impact:** Distributed password guessing can bypass the advertised five-attempt lockout. The endpoint also has no IP/account rate limiter.
- **Reproduction:** Dispatch five bad-password requests simultaneously against an account at zero attempts; the final stored value can be less than five.
- **Recommended fix:** Use a short transactional, pessimistically locked account-state transition or an atomic conditional update. Keep BCrypt authentication outside long lock holds where possible, then apply a versioned/conditional state update; add gateway and per-account rate limiting.
- **Blocker before next feature work:** YES

### H-4 — Email is sent while booking/auth database transactions and the train lock are open

- **Severity:** HIGH (confirmed reliability defect)
- **Exact file / symbol:** `BookingService.create`; `AuthService.register`, `forgotPassword`, `resendVerificationEmail`, `sendUnlockEmail`; `EmailNotificationService.send*`.
- **Problem:** Blocking SMTP calls occur before transaction commit. Booking creation retains the pessimistic train lock throughout email rendering/network I/O. Catching mail exceptions does not solve latency or the send-before-commit inconsistency.
- **Impact:** Slow SMTP serializes all bookings for a train, exhausts request/DB pools, and increases deadlock/timeout exposure. A message can be delivered even if the enclosing transaction later rolls back; conversely, failures are only logged and never retried.
- **Reproduction:** Enable email with a server that accepts slowly, then issue concurrent bookings for one train; requests queue behind the locked transaction.
- **Recommended fix:** Persist an idempotent transactional outbox event, commit, then deliver asynchronously with bounded retry/backoff and deduplication. Do not expose raw tokens beyond the outbox payload's protected lifetime.
- **Blocker before next feature work:** YES

### H-5 — AI and email feature flags are not connected to runtime behavior

- **Severity:** HIGH (confirmed configuration/runtime defect)
- **Exact file / symbol:** `SouthRailFeatureProperties`; `AiAssistantService`; `EmailNotificationService`; `application.yml` properties `southrail.features.ai-enabled` and `email-enabled`.
- **Problem:** The flags are read only by `ProductionConfigurationValidator` to decide whether credentials are mandatory. Neither integration service checks them and neither bean/controller is conditional. Thus the default/explicit `false` values do not disable calls.
- **Impact:** `/chat` still makes anonymous Gemini requests with an empty key when AI is disabled, while registration, booking, reset, verification, and unlock still attempt SMTP when email is disabled. With the default localhost SMTP target, each transactional call can stall until timeout and then merely log a warning. Operators have a false safety control.
- **Reproduction:** Start with both default flags false, call `/chat` or register a user, and observe the outbound integration attempt.
- **Recommended fix:** Gate integration adapters/controllers with `@ConditionalOnProperty` and provide explicit disabled implementations/responses; add startup and endpoint tests for both flag values. Keep credential validation aligned with actual bean activation.
- **Blocker before next feature work:** YES

## MEDIUM

### M-1 — Production schema changes are neither automatically versioned nor verified

- **Severity:** MEDIUM (confirmed production reliability risk)
- **Exact file / config:** `application.yml` (`spring.flyway.enabled: false`, `ddl-auto: validate`); `database/001_schema.sql` through `005_booking_concurrency.sql`; `docker-compose.yml` PostgreSQL init mount.
- **Problem:** SQL runs automatically only when Docker initializes an empty volume. Existing environments require undocumented/manual ordering, while application startup merely validates the final mapping. There is no schema-history table, checksum, rollback policy, or migration test.
- **Impact:** A deployment against an existing v0.2.x database can fail startup or run with missing constraints/repairs. Operators cannot reliably determine which scripts ran. `003` and `005` contain production data rewrites whose results are not preflighted.
- **Recommended fix:** Baseline existing production state, convert scripts into immutable Flyway migrations, add preflight queries/backups for data repairs, and test empty-database plus upgrade paths on PostgreSQL/Testcontainers.
- **Blocker before next feature work:** YES

### M-2 — Public AI endpoints permit anonymous quota consumption

- **Severity:** MEDIUM (confirmed security/cost weakness)
- **Exact file / symbol:** `SecurityConfiguration.securityFilterChain`; `/chat` and `/chat/**`; `AiController.chat`, `getModels`; `GeminiClient.chat`.
- **Problem:** Both Gemini-backed endpoints are `permitAll` and have no rate limit, quota, request concurrency limit, or model allowlist. The configured feature flag is not enforced (H-5); with valid credentials any internet client can spend the server's API quota.
- **Impact:** Cost/quota exhaustion and blocked servlet threads (up to the configured read timeout) are trivial. Caller-controlled model names can select any syntactically allowed provider model.
- **Recommended fix:** Require authentication, enforce per-user/IP token and request budgets, cap concurrent upstream calls, allowlist models, and cache/protect model listing.
- **Blocker before next feature work:** NO (YES before enabling AI in production)

### M-3 — Public account flows enumerate account state

- **Severity:** MEDIUM (confirmed information disclosure)
- **Exact file / symbol:** `AuthService.register`, `forgotPassword`, `resendVerificationEmail`, `sendUnlockEmail`; `AuthController` public `/auth/**` endpoints.
- **Problem:** Responses distinguish unknown, registered, deleted, verified, unlocked, and locked accounts using 404/409/403/400/202. Forgot-password alone is mostly opaque for unknown users but discloses deleted users and throttling.
- **Impact:** Attackers can build a reliable user/account-state list for phishing and credential attacks.
- **Recommended fix:** Return the same accepted response and similar timing for all email-triggering flows; record internal reasons and apply IP/account rate limits. Registration collision UX may remain explicit only if product accepts enumeration risk.
- **Blocker before next feature work:** NO

### M-4 — Search fare and booking fare are different algorithms

- **Severity:** MEDIUM (confirmed API/domain inconsistency)
- **Exact file / symbol:** `TrainService.calculateFare` (distance × class rate); `BookingService.calculateFare` (fixed class base + charges/GST).
- **Problem:** The public search quote is distance-based, while review/create calculate a fixed fare independent of route distance.
- **Impact:** Customers see one price in search and a materially different price at review/booking; downstream reconciliation has no single authoritative fare policy.
- **Recommended fix:** Centralize one fare service and return an explicit quote identifier/version consumed atomically by booking, or clearly label estimates and test the contract.
- **Blocker before next feature work:** NO

### M-5 — Cancellation behavior and API claims do not support partial cancellation

- **Severity:** MEDIUM (confirmed missing domain behavior/contract defect)
- **Exact file / symbol:** `BookingCancellationService.cancel`; `BookingStatus.PARTIALLY_CANCELLED`; `BookingService.review` cancellation-policy text.
- **Problem:** The API advertises partial cancellation and the enum/inventory queries recognize `PARTIALLY_CANCELLED`, but there is no passenger-selection endpoint or transition. Cancellation always cancels the whole booking and releases every seat.
- **Impact:** Clients cannot perform advertised passenger-level cancellation; the dormant state is untested and legacy rows can have semantics the service cannot create or manage.
- **Recommended fix:** Either remove the claim/state until implemented or design an idempotent passenger-level cancellation command with locked booking/passengers, per-seat release, fare/refund persistence, and queue promotion.
- **Blocker before next feature work:** NO

### M-6 — Token lifetime arithmetic can overflow and TTL properties lack upper bounds

- **Severity:** MEDIUM (confirmed configuration weakness)
- **Exact file / symbol:** `AuthService.issueTokens`; `SouthRailSecurityProperties`; `application.yml` JWT TTL environment variables.
- **Problem:** `refreshDays * 24 * 60 * 60` is evaluated as `long` but accepts unbounded positive configuration; access minutes is similarly unbounded. Production validation checks secret/issuer but not sane TTL ranges.
- **Impact:** Misconfiguration can create extremely long-lived credentials or overflow date arithmetic and break login/refresh at runtime.
- **Recommended fix:** Add bounded Bean Validation constraints and use `Duration` plus checked arithmetic.
- **Blocker before next feature work:** NO

## LOW

### L-1 — PNR collisions are surfaced as generic conflicts without retry

- **Severity:** LOW (confirmed reliability edge case)
- **Exact file / symbol:** `BookingService.generatePnr`, `create`; unique `bookings.pnr`.
- **Problem:** Random ten-digit PNR creation does not retry a unique collision. The global data-integrity handler returns a generic 409.
- **Impact:** A valid booking occasionally fails as the table grows (birthday-bound collision probability), requiring the customer to resubmit.
- **Recommended fix:** Prefer a database sequence/check-digit scheme or bounded retry around only the named PNR constraint.
- **Blocker before next feature work:** NO

### L-2 — Queue and enum invariants are incomplete at the database boundary

- **Severity:** LOW (confirmed integrity hardening gap)
- **Exact file / SQL:** `database/001_schema.sql`; `database/005_booking_concurrency.sql`; status columns across bookings/passengers/booking_seats/support.
- **Problem:** Check constraints cover positive queued positions and RAC maximum only. They do not require nonqueued bookings to have null queue positions, validate enum strings, require positive coach capacity/seat number/fares/ages, or guarantee booking-seat train/class/date consistency with its booking and coach.
- **Impact:** Manual SQL, future code, or migration defects can persist states Hibernate cannot read or inventory code will count incorrectly.
- **Recommended fix:** Add staged `NOT VALID` checks, validate/repair data, then validate constraints; consider normalized inventory keys/triggers only where cross-row consistency cannot be modeled otherwise.
- **Blocker before next feature work:** NO

### L-3 — Public list endpoints allow arbitrary client sort fields and broad reads

- **Severity:** LOW (confirmed API hardening gap)
- **Exact file / symbol:** `TrainController.keyword`, `stationSuggestions`; Spring `Pageable` binding and global `PropertyReferenceException` translation.
- **Problem:** Page size is capped globally, but sort properties are not allowlisted and public search endpoints have no request throttling.
- **Impact:** Invalid sorts are cleanly rejected, but expensive/unindexed sorts and repeated wildcard searches can increase database load.
- **Recommended fix:** Map a small allowlist of sort keys and rate-limit public discovery endpoints; add indexes justified by query plans.
- **Blocker before next feature work:** NO

## IMPROVEMENT / TECHNICAL DEBT

1. **PostgreSQL integration coverage:** Current booking regression tests use mocks/H2 and do not prove `FOR UPDATE`, partial indexes, lock ordering, or migration behavior.
2. **Auth lifecycle coverage:** Add synchronized refresh/account-token consumption tests plus deleted/disabled/unverified/password-change access-token behavior and lockout state-machine tests.
3. **Persist cancellation/refund facts:** Refund is recomputed and PNR status approximates 82% rather than reading an immutable cancellation/refund ledger; store quote version, charge, refund, timestamp, and idempotency key.
4. **Module boundaries:** `admin` directly consumes repositories from account/train/booking, booking directly calls notification/email/audit, and the large email/PDF renderers combine templates with delivery/domain lookup. Introduce capability facades and domain events inside the modular monolith; microservices are not warranted.
5. **N+1/query shape:** Admin booking/route mapping, history, PNR, ticket, and support views traverse lazy relationships. Transactions prevent lazy-load failures with OSIV off, but explicit projections/entity graphs and query-count tests would stabilize performance.
6. **Audit durability and privacy:** Audit writes join caller transactions, so failed security/business operations are absent and successful logs roll back with the operation. Define which events must survive, avoid PNR/email in free-text descriptions where unnecessary, and use a dedicated after-commit/outbox policy.
7. **Operational metrics:** Existing JVM/Hikari/HTTP metrics are useful; add booking outcome, queue depth/promotion, lock wait, token-replay, auth-lockout, outbox lag, and upstream latency/failure counters with no PII labels.
8. **Java style:** Application code uses Java-8-compatible constructs in many places but formatting/import duplication and oversized render/service classes merit automated formatting and static analysis. Keep Java 21 and Spring Boot 3.3.5 as requested.

## TOP 5 NEXT IMPROVEMENTS

1. Correct and transactionally test cancellation promotion/queue compaction on PostgreSQL.
2. Model and enforce RAC/WL capacity per passenger, including a bounded passenger count.
3. Serialize account-token issuance and login lockout transitions; add public-endpoint rate limits.
4. Adopt tested, immutable Flyway upgrade migrations with production preflight/backup procedures.
5. Make integration flags real, move email delivery to an idempotent transactional outbox, and protect Gemini with authentication/quotas.

## Audit inventory and validation

- **Java files inspected:** 94 production Java files (controllers, services, repositories, entities, DTOs, configuration, security/JWT, web/error/observability, AI, email, PDF, support, audit, account, train, and booking/inventory).
- **Config/build files inspected:** `backend/pom.xml`, all four `application*.yml` files, `backend/Dockerfile`, root `docker-compose.yml`, CI workflow, and available environment/deployment documentation.
- **SQL scripts inspected:** 5 (`001_schema.sql`–`005_booking_concurrency.sql`).
- **Tests inspected:** 10 Java test files containing 46 `@Test` methods.
- **Tests executed:** Maven compile/test/verify could not resolve the Spring Boot parent because Maven Central returned HTTP 403 in this environment. This is a network/proxy limitation, not an application defect. No test process reached execution.
- **Total test results:** 0 executed; 0 failures; 0 errors; 0 skipped (46 discovered statically).
- **BUILD result:** NOT VALIDATED due solely to dependency download failure.
- **Remaining validation limitations:** No cached Maven dependency graph; no Docker/PostgreSQL/Testcontainers execution; no live SMTP/Gemini calls; no load, lock-wait, query-plan, or production-profile startup run. Findings that depend on PostgreSQL interleavings should be converted into deterministic integration tests before remediation is declared complete.

## Positive controls re-verified

- Booking creation locks a train row before availability and queue decisions; physical seat uniqueness is backed by a PostgreSQL partial unique index.
- Cancellation locks the booking row and releases only `BOOKED` seat allocations.
- Refresh-token and account-token consumption queries use pessimistic locks; token hashes rather than raw tokens are stored.
- PNR, cancellation, ticket, and support access paths perform owner/admin checks; OSIV is disabled and service read paths generally define transactions.
- JWT verification requires the configured signature and issuer, then reloads enabled/nondeleted account state and derives authorities from the database.
- Production configuration rejects weak/example JWT secrets, blank database settings, wildcard credentialed CORS, and missing enabled-integration credentials; external clients have finite connect/read/write timeouts.
