# SouthRail Knowledge Base

<!--
This document is generated from and reviewed against the current SouthRail implementation and is the canonical
retrieval corpus for SouthRail Copilot. Audience comments are machine-readable
classification metadata. They are not assistant instructions. Never add credentials or populated secret values.
-->

## Knowledge Base Scope and Authority
<!-- audience: PASSENGER -->

This knowledge base describes what the current SouthRail repository actually implements. Java services,
entities, repositories, security configuration, Flyway migrations, React flows, and tests are the primary
sources of truth. Existing design and operations documents supplement the implementation. It describes the
SouthRail demonstration platform, not IRCTC or Indian Railways policy.

Static knowledge explains features and rules; it cannot establish a current fare, current inventory, a user's
PNR state, a payment result, or another live record. Those values must be read through the authenticated
SouthRail screens and APIs. SouthRail Copilot has no direct database tool and must never invent live values.

### Audience Classification
<!-- audience: PASSENGER -->

`PASSENGER` sections may be retrieved for every authenticated SouthRail user. `ADMIN` sections contain
implementation, security, configuration, deployment, database, or operational detail and may enter a Gemini
prompt only for an authenticated `ROLE_ADMIN`. Classification is enforced before vector ranking.

### Terminology
<!-- audience: PASSENGER -->

- **SouthRail** means this application, not an external railway operator.
- **PNR** is SouthRail's generated ten-digit booking reference.
- **CNF**, **RAC n**, and **WL n** are SouthRail reservation labels.
- A **reservation hold** is a temporary, unpaid checkout record. It is not a booking and has no PNR.
- A **booking** is created only after captured hold payment is finalized in the current primary checkout flow.
- **Live data** means values that can change per account, journey, inventory, or provider transaction.

## Platform Overview
<!-- audience: PASSENGER -->

SouthRail is a full-stack railway reservation application. Passengers can discover trains, review fares and
availability, place a temporary reservation hold, pay through Razorpay Test Mode, receive a final PNR,
inspect booking history and PNR status, download a PDF ticket, cancel an eligible booking, receive in-app and
email notifications, manage their profile, and converse with support. Administrators have read-oriented
operational dashboards, audit visibility, broader booking access, and support-ticket management.

The system is a demonstration platform. Razorpay Live Mode/KYC readiness is not claimed. It does not expose
real Indian Railways inventory, GPS tracking, Tatkal rules, or IRCTC account integration.

## System Architecture
<!-- audience: ADMIN -->

### Backend

The backend is a Java 21, Spring Boot 3.3.5 modular monolith under `/api`. Spring MVC controllers call
transactional application services, Spring Data JPA repositories persist PostgreSQL entities, and one process
hosts account, authentication, train, booking, payment, notification, support, admin, audit, and AI modules.
It uses synchronous `RestClient` integrations rather than WebFlux.

### Frontend

The frontend is a React 18/Vite single-page application using MUI 6, Redux Toolkit, Axios, React Router,
React Hook Form, and Zod. Routes are lazy-loaded. Nginx serves the production static bundle and proxies
`/api` traffic to Spring Boot. Authentication tokens are stored in browser local storage by the current client.

### Database

PostgreSQL 16 is the production database. Hibernate uses `ddl-auto=validate`; Flyway owns schema evolution.
Tests use H2 in PostgreSQL compatibility mode where suitable and Testcontainers for PostgreSQL-specific
locking/queue behavior. UUIDs are the normal entity identifiers.

### External Integrations

- Google Gemini supplies model discovery, query/document embeddings, and response generation.
- Razorpay Test Mode supplies order, payment, and refund operations.
- Google OAuth provides an OpenID Connect login option.
- SMTP sends account and booking messages through a transactional outbox.
- OpenPDF generates ticket PDFs.
- Actuator and Micrometer expose health and standard metrics; Prometheus format is available in configured profiles.

## Authentication
<!-- audience: PASSENGER -->

### Registration

Local registration normalizes email to lowercase, BCrypt-hashes the password, creates an unverified enabled
account with `ROLE_USER`, and issues a single-use email-verification token valid for two days. Public responses
are deliberately non-enumerating. Re-registering an active email returns the same generic result. Re-registering
a soft-deleted account restores it, resets lock state and credentials, revokes old tokens, and restores only
`ROLE_USER`; old privileged roles are not resurrected.

### Email Verification

Verification tokens are random values stored only as SHA-256 hashes. Creating a new token consumes older open
tokens of the same type. Verification marks the email verified. Resend is silently ignored for unknown,
ineligible, or already verified accounts and is throttled to one token per five minutes.

### Login

Local login locks the user row while checking account state. Deleted or disabled accounts cannot log in.
Unverified accounts are rejected after password authentication. Five failed password attempts lock the account
for 15 minutes. A successful login clears the failure counter, writes an audit event, and issues an access token
plus refresh token.

### Account Unlock

A locked local account can request an unlock email. Unknown, deleted, disabled, or currently unlocked accounts
receive no state disclosure. Unlock tokens last 30 minutes and are throttled to one per five minutes. Consuming
a valid token clears the failed-attempt count and lock deadline and records an audit event.

### Password Reset

Forgot-password requests do not disclose whether an email exists. Eligible local-password accounts receive a
30-minute single-use token, no more often than every five minutes. Resetting the password increments the
credentials version, clears lock state, revokes active refresh tokens, consumes all open account tokens, and
invalidates earlier access tokens through credentials-version checking.

### Refresh Tokens and Logout

Refresh tokens are opaque random values stored as SHA-256 hashes. Refresh locks and consumes the presented
token, checks current account eligibility and expiry, and rotates to a new access/refresh pair. Logout revokes
the presented refresh token without disclosing whether it existed.

### Google OAuth

Google sign-in requires a verified Google email. SouthRail serializes first-account creation by provider subject
and email using PostgreSQL advisory locks. It refuses to auto-link an OAuth identity to an existing local email.
A new Google user receives `ROLE_USER`, is email-verified, and has no local password. The backend sends the
browser a hashed, single-use exchange code valid for 90 seconds; the frontend exchanges it for SouthRail JWTs.
Temporary OAuth sessions exist only for state validation and do not become the API authentication mechanism.

### Profile and Account Lifecycle

Authenticated users can read and update their full name and phone. Email is not changed by the profile update.
Local-password users can change password after confirming the current password; the new password must differ.
Password change increments credentials version and revokes active refresh/account tokens. Account deletion is
a password-confirmed soft delete that disables the user and revokes tokens. Google-only accounts cannot use
password change or password-confirmed deletion because they have no local password.

## JWT and Authorization
<!-- audience: ADMIN -->

Access JWTs are HMAC-signed with the configured issuer and expiry. Claims include subject email, user ID,
roles, and credentials version. Every bearer request parses the signature and issuer, reloads the current user
from the database, requires enabled/verified/non-deleted state, and compares the token credentials version.
The database, not stale JWT role claims, supplies granted authorities.

The only application roles are `ROLE_USER` and `ROLE_ADMIN`. `/auth/**`, OAuth callbacks, the Razorpay webhook,
Swagger routes, and exact liveness/readiness probes have special exposure. Train discovery endpoints are public.
Other application endpoints require authentication. `/admin/**`, audit logs, admin support routes, non-probe
Actuator routes, and internal AI knowledge require `ROLE_ADMIN` as configured.

## Train and Station Discovery
<!-- audience: PASSENGER -->

### Station Suggestions

`GET /trains/stations` searches station code, name, or city case-insensitively and returns pageable code, name,
city, and state options. Stations also store optional latitude and longitude, but those coordinates are not part
of the suggestion response.

### Train Keyword Search

`GET /trains?q=...` searches train number or name case-insensitively. This endpoint returns paged train entities.
Train records have a number, name, category, and active flag.

### Route Search

`POST /trains/search` finds active trains whose source stop precedes the destination stop. It excludes a result
when the source departure for the requested operating date/day offset is not in the future. Results contain
train identity, selected station codes, departure and arrival clock times, duration, one-passenger fare,
confirmed-seat availability, and an availability label.

Duration uses each stop's day offset, so overnight travel is represented. A train detail response returns its
ordered stop list, times, distance, and platform. Train details are cached in the process-local Spring cache.

### Schedules and Operating Dates

A route stop stores an order, arrival/departure times, day offset, cumulative distance, and platform. SouthRail
does not model recurring calendars, exceptions, or separate scheduled journey entities. The requested journey
date combined with source day offset and departure time defines the departure instant in the configured railway
time zone. The current utility uses Asia/Kolkata.

### Availability

Physical capacity is the sum of configured coach capacities for a train and travel class. Active `BOOKED` seat
assignments and legacy confirmed passengers without seat rows reduce availability. Active, unexpired confirmed
reservation holds also reserve capacity. If any RAC or waitlist queue exists for the same train/date/class,
search and review expose zero immediately available confirmed seats so a newcomer cannot bypass the queue.

Availability is scoped to the entire train, operating date, and class—not source/destination segments. A seat
reserved between two intermediate stops remains unavailable for the whole run.

## Fare Calculation
<!-- audience: PASSENGER -->

SouthRail calculates static booking quotes from route distance, travel class, and passenger count:

- Base fare = positive route distance × class rate × passenger count.
- Per-kilometre class rates are 1A ₹4.20, 2A ₹2.80, 3A ₹2.00, CC ₹1.70, SL ₹0.75, and 2S ₹0.45.
- Reservation charge is ₹40 per passenger.
- Convenience fee is ₹24 per booking.
- GST is 5% of base fare.
- Components are rounded to two decimal places using half-up rounding where applicable.

Search results quote one passenger. Booking review quotes the submitted party. These are SouthRail application
rules, not IRCTC tariffs. A request for a current journey fare is live data and must be checked through train
search or booking review; Copilot must not calculate or promise a current price from this document.

## Booking Lifecycle
<!-- audience: PASSENGER -->

### Primary Checkout Journey

The current frontend implements `SEARCH → BOOKING REVIEW → RESERVATION HOLD → RAZORPAY PAYMENT → CAPTURE →
FINAL BOOKING/PNR`. Review validates the train, route order, future departure, travel class, passengers, fare,
and provisional availability. Creating a hold requires authentication and an `Idempotency-Key`.

A hold stores the proposed user, train, route endpoints, date, class, quota, fare, passengers, provisional
CNF/RAC/WAITLISTED state, request fingerprint, and expiry. It does not allocate a final PNR. The default hold
window is ten minutes. Repeating the same user/key/request returns the same hold; reusing the key with different
content is a conflict.

A captured hold payment is finalized transactionally. If the hold is still active and unexpired, finalization
uses the existing booking service, scoped inventory lock, queue policy, fresh fare validation, seat allocation,
and email outbox. It links the payment and hold to the resulting booking and PNR. If capture loses the race to
expiry, SouthRail records a durable full-refund obligation instead of creating a booking.

### Booking Validation

The selected train must exist and be active. Source and destination must exist on its route, differ, and appear
in forward order. The source must have a departure time; its computed departure must be in the future. The
selected class must have configured coach capacity. Passenger DTO validation governs party size and fields.

### Booking Idempotency and PNR

Final booking supports an optional user-scoped idempotency key and SHA-256 request fingerprint. Identical retries
return the existing booking; different content conflicts. PNR generation is serialized with a PostgreSQL
transaction advisory lock, chooses a ten-digit numeric value, checks uniqueness, and retries up to 100 times.

### Passenger and Party Semantics

Every passenger belongs to one booking and initially shares the booking's CNF, RAC, or WAITLISTED status. A
queued multi-passenger booking is indivisible: it is assigned or promoted only when the whole party fits. A
senior passenger over age 58 receives a LOWER berth suggestion during review; otherwise the selected preference
or NO_PREFERENCE is suggested. Suggestions do not guarantee allocation.

## Reservation Holds
<!-- audience: PASSENGER -->

Active unexpired holds with provisional confirmed status count against physical availability. A scheduled worker
checks expired active holds in configurable batches and marks them `EXPIRED`; on-demand hold reads also expire
stale records. Hold statuses are `ACTIVE`, `CONFIRMED`, `EXPIRED`, and `CANCELLED` (the current flows use the
first three). Only the owner may read or pay a hold; administrative payment access does not bypass hold ownership.

Payment recovery can reload the active payment attempt for a hold. A confirmed hold response links the final
booking ID, PNR, and booking status. Expired-hold captures are retained and refunded rather than discarded.

## Seat Allocation
<!-- audience: PASSENGER -->

Confirmed passengers receive concrete seat rows. Allocation builds the configured coach/seat pool, removes
active seats for the same train/date/class, and assigns enough seats for the entire party or fails. The database
has a partial unique index preventing two active `BOOKED` rows for the same physical seat on an operating date.
Cancellation changes booked rows to `RELEASED`; history is retained.

Berth types are derived by seat pattern: SL/3A use LB, MB, UB, side-lower and side-upper cycles; 2A uses lower,
upper and side berths; 1A alternates cabin/coupe labels; other classes use GENERAL. Allocation preference is
best-effort and correctness prioritizes unique inventory.

## RAC
<!-- audience: PASSENGER -->

### RAC Capacity and Assignment

RAC is a queue tier, not a physical seat assignment. It is capped at ten passengers per train/date/class, not
ten bookings. A new whole party enters RAC only when no waitlist already exists and the cumulative RAC passenger
count including that party is at most ten. Otherwise it enters waitlist. Labels and queue positions are assigned
in deterministic order.

### RAC Promotion

After cancellation, the oldest whole RAC party is considered first. It becomes confirmed only when every party
member fits current physical capacity; a smaller later party cannot jump it. Seats are allocated before the
party state changes to avoid legacy inventory double-counting. Passenger states become confirmed, queue position
is cleared, and label becomes CNF.

## Waitlist
<!-- audience: PASSENGER -->

### Waitlist Assignment and Ordering

A party enters waitlist when confirmed capacity is unavailable and it cannot enter RAC, or when any waitlist
already exists. Queue scope is train, operating date, and class. FIFO order is queue position, creation time,
PNR, then ID. PostgreSQL advisory and pessimistic locks serialize joins, cancellations, and promotion.

### Promotion Rules

Cancellation rebalances repeatedly. It first promotes RAC parties into available physical seats. It then moves
oldest whole waitlist parties into available RAC passenger capacity, preserving party order. The loop repeats
because each move can create capacity in another tier. Queue positions are compacted collision-safely through a
temporary range and rewritten as RAC/WL labels.

A promoted party generates audit records. Confirmation promotions publish an event inside the transaction;
after commit, a separate transaction creates an in-app notification. Notification failure cannot roll back an
already committed promotion.

### Cancellation Effects

Cancelling a confirmed booking releases seats and can trigger RAC confirmation and waitlist movement. Cancelling
a RAC or waitlisted booking removes that party and compacts its queue. All passengers in a booking are cancelled
together; partial passenger cancellation is not implemented.

## PNR and Booking History
<!-- audience: PASSENGER -->

PNR lookup requires authentication. A user can read only their booking; `ROLE_ADMIN` may read any booking.
Responses include route, journey, class, quota, booking status, fare, stored cancellation refund, reservation
label, queue position, and per-passenger status/seat. Waitlisted passenger detail repeats the booking queue
position. Confirmed seats are formatted `coach/number` such as `A1/15`.

Booking history is paged newest-first for the authenticated owner. PDF ticket download applies the same
owner-or-admin authorization and includes booking, passengers, seat/queue, fare, and status information.
Copilot cannot look up a PNR or history record; users must use the PNR or dashboard feature.

## Payments
<!-- audience: PASSENGER -->

### Provider and Mode

Payments use a provider abstraction with a Razorpay adapter. The repository claims Test Mode support only.
Provider secrets remain server-side. All monetary amounts sent to Razorpay are exact two-decimal rupee values
converted to integer paise.

### Order Creation

Creating an order requires authentication and an `Idempotency-Key`. The server hashes a user-scoped key, checks
hold/booking ownership and eligibility, prevents multiple active attempts, persists a local `CREATED` payment,
then calls Razorpay outside the short preparation transaction. It validates provider order ID, amount, and
currency before transitioning to `PENDING`. Mismatches fail the attempt.

The primary frontend pays a reservation hold. Legacy booking-payment endpoints remain implemented for bookings
created through older/direct flows. A payment is associated with exactly one hold or booking.

### Verification

Browser verification checks that order IDs match, verifies the Razorpay checkout signature using constant-time
HMAC-SHA256, fetches the payment server-side, and validates provider payment ID, order, amount, and currency.
An authorized provider payment becomes `AUTHORIZED`; a captured payment becomes `CAPTURED` and triggers hold
finalization or activates an existing refund obligation. Re-verifying the same captured payment is idempotent.

### Webhooks

The public Razorpay webhook verifies the signature over exact raw bytes. Supported payment/refund event payloads
are parsed and validated against locally stored order, amount, currency, and provider IDs. Provider event IDs,
or a body-hash fallback, are uniquely persisted so redelivery is harmless. Row locks serialize webhook/browser
races. Invalid signatures or mismatched provider data are rejected.

### Payment States

Payment transitions are constrained: `CREATED → PENDING/FAILED`; `PENDING → AUTHORIZED/CAPTURED/FAILED`;
`AUTHORIZED → CAPTURED/FAILED`; `CAPTURED → REFUND_PENDING`; `REFUND_PENDING → PARTIALLY_REFUNDED/REFUNDED`;
and partially refunded payments may return to refund-pending or become fully refunded. Terminal invalid
transitions throw rather than silently mutate state.

### Recovery and Reconciliation

The frontend can recover an active hold or booking payment. Pending orders resume checkout; created/authorized
attempts use bounded polling and explicit status checks rather than automatically creating a replacement order.
A scheduled reconciliation worker examines stale `PENDING` and `AUTHORIZED` payments, fetches a known payment
or unambiguously matches a provider order payment, validates all financial fields, and applies captured,
authorized, or failed state. Provider I/O occurs outside the persistence transaction.

Copilot cannot inspect Razorpay or a user's payment row. “Has my payment completed?” is live data and must be
answered by directing the user to the payment recovery/status UI.

### Idempotency

Payment idempotency keys are user-scoped SHA-256 hashes. Database uniqueness protects idempotency keys,
provider order/payment IDs, and one successful captured/refunding payment per booking. Active-attempt conflicts
return explicit error codes instead of creating parallel orders.

## Cancellation and Refunds
<!-- audience: PASSENGER -->

### Eligibility

Only an owner or administrator can review/cancel a booking. CNF, RAC, and WAITLISTED bookings can be cancelled
before the source departure instant. Already cancelled, unsupported-state, and departed bookings are rejected.
Cancellation always applies to the complete booking.

### Charges

The current SouthRail cancellation policy is calculated at review and stored when applied:

- More than 48 hours before departure: 90% refund.
- From 24 hours through 48 hours: 75% refund.
- From 4 hours through 24 hours: 50% refund.
- Less than 4 hours: no refund.

Refund and cancellation charge sum to the stored total fare. Once cancelled, the applied amounts are persisted
so later reads do not recompute a different result as time advances. These are SouthRail rules, not an assertion
about IRCTC policy.

### Cancellation Transaction

Cancellation acquires the inventory-scope advisory lock and booking row lock, stores the refund outcome, marks
the booking and all passengers cancelled, releases active seats, clears queue metadata, creates any local refund
obligation, rebalances RAC/waitlist queues, and writes audit records in one local transaction. It then attempts
an in-app cancellation notification; notification failure is logged without undoing cancellation.

### Refund Dispatch

A positive refund creates at most one durable obligation for an eligible pending, authorized, or captured
financial payment. Captured payments enter `REFUND_PENDING`; pre-capture obligations wait and activate after a
later valid capture. A scheduled worker claims requested, failed, or stale-processing refunds with a five-minute
lease, calls Razorpay outside the claim transaction, and persists provider acceptance/failure. Failed refunds
are retryable. Signed webhooks reconcile final processed/failed state without regressing a processed refund.

## Notifications and Email
<!-- audience: PASSENGER -->

Persisted in-app notifications currently cover booking cancellation and waitlist confirmation. The notification
list is owner-scoped, newest-first, and currently has no exposed mark-read endpoint.

Email covers verification, password reset, account unlock, and confirmed-booking messages. Email is serialized
to a transactional database outbox so booking/account transactions do not perform SMTP I/O. A scheduled worker
claims pending/stale messages, retries with bounded attempts/backoff, and records delivery or safe error detail.
Email can be disabled in local/test, but production validation requires it because registration needs verification.

## Support Tickets
<!-- audience: PASSENGER -->

Authenticated users create tickets using their account name/email plus optional booking reference, topic, and
description. Creation also stores the description as the first `USER` message. Users see only tickets matching
their email and may add messages unless closed. Replying to a resolved ticket reopens it.

Administrators list all tickets, view conversations, reply as `ADMIN`, and set OPEN, IN_PROGRESS, RESOLVED, or
CLOSED. An admin reply moves OPEN or RESOLVED to IN_PROGRESS. Neither side can add a message to CLOSED.

## User Dashboard and Frontend Journeys
<!-- audience: PASSENGER -->

The dashboard summarizes the authenticated user's bookings and notifications. Booking history and ticket views
support status labels, cancellation review/dialog, PDF download, and payment navigation. The home page supports
station autocomplete and route search. Booking collects multiple passengers, requests a server review, then
creates a hold and navigates to payment. Payment loads hold details, creates/recovers an order, opens Razorpay,
verifies success, polls status when needed, and navigates to the final booking.

Protected routes include PNR, booking, payment, dashboard, profile, booking history, support, and support-ticket
detail. Admin routes additionally require `ROLE_ADMIN`. Axios attaches the access token, performs at most one
refresh/retry on a 401 for non-auth requests, rotates local tokens, and clears browser authentication when
refresh fails.

## Admin Features
<!-- audience: ADMIN -->

The admin dashboard is read-oriented. It exposes counts and pageable users, trains, stations, routes, bookings,
and audit logs. Frontend analytics derive revenue/status, route/train performance, journey-period, user-health,
and recent-record views client-side from paged API data. The repository does not currently expose admin train,
station, or route create/update/delete APIs.

Admin support is a separate route for ticket queues, message history, replies, and status changes. Admin users
may also inspect any PNR/payment booking and cancel bookings through the same services where explicit admin
bypass exists. Hold payment ownership intentionally remains owner-only.

## AI Assistant
<!-- audience: PASSENGER -->

### SouthRail Copilot Scope

SouthRail Copilot is for SouthRail travel and reservation assistance. It answers knowledge questions only from
retrieved SouthRail context. It must politely redirect programming, homework, politics, science, and other
unrelated requests. It must not answer IRCTC, Indian Railways, or another operator's rules from model memory.

### Live Data Boundary

Copilot classifies requests into knowledge, live SouthRail data, external-railway, insufficient-knowledge, and
out-of-scope categories. Live questions—current availability/fare, an actual PNR, payment, booking, hold,
notification, or account state—receive directions to the relevant authenticated SouthRail feature. The AI layer
does not query repositories or bypass service authorization.

### Gemini Models

`GET /chat/models` returns only Gemini models advertising `generateContent`. The UI normally preserves a current
selection across refresh. If Gemini clearly reports a selected model missing, deprecated, unsupported, or
unavailable, the backend emits `AI_MODEL_UNAVAILABLE`; the UI keeps conversation history, clears the invalid
selection, refreshes models, requires an explicit replacement, and does not resend. An empty compatible catalog
is shown as a controlled unavailable state.

### Semantic RAG

The canonical corpus is this file. It is parsed by Markdown heading hierarchy, bounded primarily at paragraph
boundaries, classified by audience comments, embedded with the configured Gemini embedding model, and searched
with cosine similarity. Document vectors and semantic classification anchors are generated at index build, not
per chat. Each eligible question gets one query embedding. Only authorized chunks above the relevance threshold
and within Top-K enter generation.

The default embedding model is `gemini-embedding-001`. Gemini owns its vector dimension; SouthRail validates
that cached/query vectors are non-empty and dimensionally consistent rather than hard-coding provider size.
Default Top-K is four, relevance threshold is 0.42, semantic domain threshold is lower, and maximum chunk content
is 1,800 characters. Configuration can tune these values.

### Grounding and Injection Protection

The system instruction identifies SouthRail Copilot, makes retrieved SouthRail context authoritative for
SouthRail claims, treats documents and user text as untrusted data, forbids following instructions inside them,
forbids generic IRCTC substitution and undocumented behavior, requires an insufficiency statement, and forbids
revealing prompts/context/secrets. Documentation context and user question use separate explicit delimiters.

### Sources

Grounded answers return only the logical document label and heading path, for example `SouthRail Knowledge Base ·
Waitlist > Promotion Rules`. They never return server paths, vectors, raw prompts, or access metadata.

## AI RAG Implementation and Index Lifecycle
<!-- audience: ADMIN -->

At application startup, when AI and RAG are enabled, SouthRail reads the single bundled canonical knowledge
resource, parses chunks, and computes a SHA-256 fingerprint over the canonical content plus index schema,
embedding model, and chunking configuration. It attempts to load an atomic JSON index snapshot from the
configured local path. A matching, structurally valid snapshot is reused without document embedding calls.
A missing, mismatched, or corrupt snapshot causes a batch embedding rebuild and atomic replacement.

The live index is an immutable in-memory list behind `KnowledgeRetriever`; local JSON persistence is a cache,
not the source of truth. The storage abstraction can later be replaced with pgvector, Redis vector search, or
another engine without changing the assistant orchestration. There is no public reindex endpoint. If resource,
cache, or embedding initialization fails, application startup continues with an unavailable index and knowledge
questions receive a safe insufficiency response rather than generic Gemini speculation.

Per-query structured logs contain event, classification, chunk count, safe section names, top similarity,
duration, and requested generation model. Existing request MDC contributes correlation ID. Logs exclude the
question, prompt, response, vectors, and document bodies.

## API Architecture
<!-- audience: ADMIN -->

All backend routes use the `/api` servlet context. Public endpoints are registration/authentication flows,
OAuth endpoints, Razorpay webhook, train discovery, exact health probes, and development documentation where
enabled. Authenticated controllers derive identity from `Principal`/`Authentication`; clients do not submit a
trusted user ID. DTO bean validation constrains lengths, formats, dates, passenger counts, credentials, model
identifiers, and payment payloads.

The main route groups are `/auth`, `/users/me`, `/trains`, `/bookings`, `/reservation-holds`, `/pnr`, `/payments`,
`/notifications`, `/support`, `/admin`, `/admin/audit-logs`, and `/chat`. Pagination uses Spring Data defaults
with a configured maximum page size of 100.

## Database Model
<!-- audience: ADMIN -->

Core tables include users and roles; refresh/account/OAuth tokens; stations, trains, routes, route stops, and
coaches; bookings, passengers, booking seats, reservation holds and hold passengers; payments, refunds, webhook
events; notifications and email outbox; audit logs; support tickets and messages.

Important invariants include unique normalized business identities, PNR, active seat allocation, queue position
per inventory scope/tier, user/idempotency keys, open account token per purpose, provider order/payment/refund
IDs, webhook event ID, hold user/key, hold passenger order, and one active/successful financial attempt where
partial indexes apply. Financial amounts have positivity/currency checks; cancellation amounts must reconcile
to fare; status checks constrain hold and outbox states.

## Database Migrations
<!-- audience: ADMIN -->

- V1 establishes the original users, rail, booking, passenger, notification, refresh/account-token schema.
- V2 seeds demonstration stations, trains, routes, stops, coaches, and sample accounts/data.
- V3 adds durable booking-seat allocation, indexes, uniqueness, and repairs legacy confirmed seats.
- V4 adds account lock/deletion, queue metadata, audit, and support schema.
- V5 adds queue uniqueness and initial queue constraints/repair.
- V6 corrects RAC to passenger-based capacity, repairs FIFO queues, enables collision-safe resequencing, and
  enforces one open account token per user/type.
- V7 persists cancellation refund/charge outcomes with reconciliation constraints.
- V8 adds credentials version for access-token invalidation.
- V9 removes the unimplemented partial-cancellation state, adds booking idempotency, and adds email outbox.
- V10 strengthens waitlist/status integrity and FIFO indexing.
- V11 adds payments, refunds, webhook events, provider/idempotency uniqueness, and lifecycle constraints.
- V12 adds a partial reconciliation candidate index.
- V13 adds reservation holds/passengers, hold ownership for payments, and expiry/inventory indexes.
- V14 adds Google provider identity and one-time OAuth exchange codes.

The separate `database/` scripts mirror operator/bootstrap history but have had numbering drift in historical
reviews. Flyway resources are authoritative for runtime migration.

## Validation and Exception Handling
<!-- audience: ADMIN -->

Request DTOs use Jakarta validation and the global handler returns a stable `ApiErrorResponse` containing UTC
timestamp, HTTP status/reason, application error code, safe message, path, correlation ID, optional lock expiry,
and optional field validation errors. Malformed bodies, invalid sorts, constraint conflicts, missing resources,
and expected domain exceptions receive controlled responses. Unexpected errors have one authoritative ERROR
stack trace and return no implementation detail.

AI errors preserve provider isolation: unavailable/timeouts/rate limits map to `AI_SERVICE_UNAVAILABLE`, clear
selected generation-model retirement maps to `AI_MODEL_UNAVAILABLE`, other upstream 4xx rejection maps to a
safe gateway error, and malformed provider responses are sanitized.

## Logging, Audit, and Correlation IDs
<!-- audience: ADMIN -->

The highest-precedence filter accepts only a safe 1–64 character `X-Correlation-ID` or generates a UUID, returns
it in the response, places it in MDC, and clears it after the request. The interceptor logs route templates,
method, status, duration, authenticated flag, handler, slow/failure state, and safe error code. It never logs
query strings or bodies. Production uses UTC JSON stdout with MDC; local/test use a human-readable pattern.

Audit logs are durable domain/security records distinct from application logs. Actions cover authentication,
password/account lifecycle, bookings, waitlist, holds, payments/refunds, and related events. Sensitive raw
tokens and provider secrets are never audit content.

## Security Controls
<!-- audience: ADMIN -->

Spring Security disables CSRF for the stateless API, applies explicit credentialed CORS origins, uses a null
security-context repository for JWT requests, and allows an HTTP session only for OAuth state. BCrypt protects
passwords; refresh/account/OAuth codes are hashed at rest; HMAC validation protects JWTs, Razorpay checkout,
and webhooks. Ownership checks exist in booking, PNR, payment, hold, profile, and support services.

Production validation rejects blank database/JWT/frontend/CORS/mail settings, weak/example JWT secrets,
wildcard credentialed CORS, disabled required email, missing enabled provider credentials, and other unsafe
configuration. Error responses and logs exclude stack traces, provider bodies, credentials, and prompts.

## Configuration
<!-- audience: ADMIN -->

Shared safe defaults live in `application.yml`; `local`, `test`, and `prod` profiles override environment-specific
behavior. No profile is activated in source. Important conceptual settings cover datasource/Flyway/JPA,
JWT issuer/secret/token TTLs, explicit CORS/frontend URL, email and outbox, OAuth, Razorpay and reconciliation,
reservation-hold duration/batch scheduling, Gemini key/base/generation/embedding models and timeouts, AI/RAG
thresholds/cache path, logging threshold, management exposure, and feature flags. Actual secret values must be
injected externally and never placed in this knowledge base.

## Docker and Deployment
<!-- audience: ADMIN -->

Compose runs PostgreSQL, a multi-stage Maven/Java backend image, and a Vite-build/Nginx frontend. The backend
build context includes this approved knowledge file as a classpath resource. Containers run as non-root users.
Nginx serves the SPA and proxies `/api`. PostgreSQL data uses a named volume. Backend graceful shutdown allows
30 seconds; Compose grants a longer stop window.

Production requires the `prod` profile, external PostgreSQL, strong JWT configuration, explicit frontend/CORS,
email credentials, and any enabled provider credentials. Flyway applies migrations at startup and Hibernate
validates the result. Swagger is disabled in production. TLS termination and additional Actuator network
restriction belong at the reverse proxy/platform layer.

## Operations and Health
<!-- audience: ADMIN -->

Exact liveness and readiness probes are anonymous and do not expose details. Liveness reports process health;
readiness includes database/disk dependencies. Other exposed Actuator endpoints require admin. Gemini and SMTP
are deliberately not readiness dependencies. A database outage should drain readiness without repeatedly
restarting a live JVM. Provider failures use controlled logs and responses.

Scheduled work includes email outbox delivery, reservation-hold expiry, stale payment reconciliation, refund
dispatch, and OAuth exchange-code cleanup. Each worker uses bounded batches/leases and catches recoverable
provider failures so one item does not stop the scheduler.

## Known Limitations and Implementation Discrepancies
<!-- audience: PASSENGER -->

- SouthRail inventory is local demonstration data, not connected to IRCTC or Indian Railways.
- There is no Tatkal implementation, live running status, GPS, recurring operating calendar, segment-level seat
  reuse, coach-layout administration, or partial passenger cancellation.
- Search/booking fare rules are application formulas, not external tariffs.
- Copilot does not access live user records and cannot confirm a fare, seat, PNR, payment, or booking state.
- The admin dashboard is read-oriented; master-data mutation APIs are not implemented.
- In-app notifications cannot currently be marked read through an exposed endpoint.
- Razorpay support is Test Mode; Live Mode readiness is not claimed.

### Documentation Discrepancies Found During Repository Review
<!-- audience: ADMIN -->

The older `PAYMENTS.md` describes “Option A” as creating a booking before a separate payment. Legacy endpoints
and services for that flow still exist, but the current frontend and reservation-hold implementation use
hold-first checkout and create the PNR after capture. This knowledge base documents hold-first as the primary
current user journey while acknowledging the legacy booking-payment API.

The README roadmap still lists an explicit payment state machine and payment-confirmation work as planned even
though migrations V11–V13 and current services implement a substantial payment/hold state machine. The README's
testing paragraph says frontend automation is a follow-up, while lint/build scripts exist but no frontend test
suite/CI job exists. Historical audit/readiness documents are snapshots and may describe defects already fixed;
they are not canonical runtime behavior.

The operations document says the current domain has no queue expiration scheduler. That remains true for RAC and
waitlist bookings, but reservation holds now have an independent expiry worker. Queue entries persist for
history and do not automatically expire at departure.

## Important User Journeys
<!-- audience: PASSENGER -->

### Search and Purchase

1. Search by source, destination, date, and class.
2. Choose an active future train result.
3. Enter party details and obtain a server-authoritative booking review.
4. Create an idempotent temporary reservation hold.
5. Pay/recover through Razorpay Test Mode before hold expiry.
6. Server verifies capture and atomically converts the hold to a booking.
7. Receive PNR/status; confirmed parties receive seats and booking email.

### Check a Booking

Use authenticated booking history for owned records or enter the SouthRail PNR in the PNR feature. Review
status, queue position, passenger state, seats, route, fare, and stored refund information. Download the PDF
when needed. Do not ask Copilot to guess the current record.

### Cancel and Refund

Open cancellation review to obtain the current policy quote, confirm complete-booking cancellation before
departure, then use booking/payment screens and notifications to monitor the durable refund workflow. Released
capacity may promote queued parties.

### Recover Payment

Return to the payment route for the same hold. SouthRail looks for a recoverable attempt, resumes pending
checkout or polls/checks created/authorized state, and never creates a replacement silently. If the hold expired
a late capture becomes a refund obligation.

### Get Help

Use Copilot for static SouthRail feature/rule explanations. Use the PNR, train search, booking, payment, profile,
or dashboard UI for live data. Create a support ticket when account-specific assistance is required.
