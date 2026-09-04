# SouthRail backend foundation audit

Audit date: 2026-09-04. Scope: the Maven backend, database scripts, container configuration, API contracts, and the frontend API client used to verify compatibility. This assessment was completed before the hardening implementation in this change set.

## Workflow assessment

* **Authentication:** `/auth/login` reaches `AuthService`, Spring's `AuthenticationManager`, `UserRepository`, JWT creation and persisted hashed refresh tokens. Subsequent requests pass through `JwtAuthenticationFilter`, which reloads the user and authorities on every request.
* **Booking:** authenticated requests reach `BookingService`, resolve user/train/stations, calculate availability, persist booking/passengers, allocate seats, write a business audit record, then send SMTP while the database transaction is still open.
* **Cancellation:** `BookingCancellationService` verifies ownership and state, calculates the refund, updates the booking and seat allocations, writes an audit record, and creates a notification in the same transaction.
* **External work:** Gemini calls use `RestClient`; email uses `JavaMailSender`; PDF generation reads booking data and renders in-memory. Gemini had no timeout and built API-key-bearing URLs in application code. SMTP and PDF failures had inconsistent exception/logging behavior.

## Findings

Each disposition describes the repository-specific action rather than prescribing a generic package layout.

### 1. Architecture / responsibilities

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| HIGH | `BookingService#create` | Persistence, seat allocation, audit and SMTP execute in one transaction. | Slow/unavailable SMTP extends a seat-booking transaction and consumes DB connections. | Commit the booking before best-effort mail delivery in a later phase using an after-commit boundary; immediately stop logging passenger/seat objects. | REQUIRED (follow-up) |
| MEDIUM | `AuditLogController` | Controller directly queries and maps the repository while an `AuditLogService` exists. | Pagination policy and mapping are duplicated at the HTTP boundary. | Move the read operation into the existing service; no new abstraction is needed. | RECOMMENDED |
| MEDIUM | `SupportController` / `SupportTicket` | Admin responses expose a JPA entity directly while other endpoints use DTOs. | Entity changes can silently change the public contract and expose fields. | Add the one response DTO the admin contract needs. | RECOMMENDED |

### 2. Configuration / Spring Profiles

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| HIGH | `application.yml` | Local defaults, production behavior, verbose SQL/security logging and sensitive settings share one file. | Accidental production debug logging can leak SQL/bind data; unsafe defaults are easy to deploy. | Keep neutral common settings and add explicit `local`, `test`, and `prod` profile files; require secrets in prod. | REQUIRED |
| HIGH | `docker-compose.yml` | A known JWT secret and DB password are written directly in deployment configuration. | Deploying unchanged produces predictable credentials. | Resolve credentials from an ignored `.env`; provide only placeholder names in `.env.example`. Rotate any deployed values. | REQUIRED |
| MEDIUM | `GeminiConfig`, JWT/mail constructors | Typed configuration is used only for Gemini while related application settings use scattered `@Value`. | Validation and discoverability are inconsistent. | Keep Gemini typed configuration and add only cohesive security/HTTP properties when refactoring those components. | RECOMMENDED |

### 3. Logging strategy

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| HIGH | `AccountEmailService` | Uses `System.out`, `System.err`, `printStackTrace`, and logs recipient addresses. | Bypasses log policy and exposes personal data. | Use SLF4J with event identifiers and exception stack traces; do not log addresses or content. | REQUIRED |
| HIGH | `application.yml` | Application, web, Hibernate bind, and security logs are globally DEBUG/TRACE. | High-volume logs expose query parameters and make incidents harder to search. | Profile-specific levels; INFO/WARN defaults and readable local overrides. | REQUIRED |
| MEDIUM | booking/cancellation services | Exceptions are ignored or concatenated without structured context. | Downstream failure becomes invisible or loses its stack trace. | Log business identifiers and exception objects at the boundary that deliberately degrades. | REQUIRED |

### 4. Filter / Interceptor strategy

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| MEDIUM | Web stack | No servlet request context filter or MVC lifecycle logger exists. | Operators cannot reliably connect controller latency/status to an incident. | Use one ordered filter only for correlation/MDC and one interceptor only for access completion timing. | REQUIRED |

### 5. Correlation IDs / MDC

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| HIGH | Entire request path | No `X-Correlation-ID`, MDC population, response propagation, or cleanup. | One request cannot be followed across security, service and error logs. | Validate/reuse a bounded safe header, otherwise generate UUID; populate and always clear MDC. | REQUIRED |

### 6. Validation

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| HIGH | `AIDtos.ChatRequest`, `AIController` | Public chat accepts an unvalidated body/message. | Large/empty input can consume an optional paid dependency. | Apply `@Valid`, nonblank and bounded message/model constraints; authentication decision is separate. | REQUIRED |
| HIGH | `SupportDtos.SupportTicketRequest` | Fields have no request validation; validation annotations incorrectly live on the entity. | Oversized or invalid user content reaches persistence. | Put size/nonblank constraints on the request contract and DB-aligned constraints on columns. | REQUIRED |
| MEDIUM | `BookingDtos.BookingRequest` | Passenger list has no maximum; codes/classes have no bounds. | A single request can create excessive rows/work and inconsistent values. | Bound codes/classes now. Define and enforce a passenger maximum only after aligning the currently unbounded frontend workflow and product rule. | RECOMMENDED (passenger limit deferred) |

### 7. Exception handling

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| CRITICAL | `GlobalExceptionHandler` | Catch-all returns a safe body but never logs the exception. | Unexpected production failures leave no diagnostic stack trace. | Log unexpected failures once with method/path/correlation ID; return a stable error code. | REQUIRED |
| HIGH | `ApiException` / handler | Error bodies are mutable maps, expose no stable code/correlation ID, and validation returns only the first error. | Clients must parse messages and support cannot match client reports to logs. | Introduce a typed backward-compatible error response with code, correlation ID and field errors. | REQUIRED |
| MEDIUM | MVC/security boundary | Malformed JSON, type mismatches, constraint violations, 401 and 403 do not share one contract. | Similar failures produce incompatible responses. | Translate common MVC failures and configure security entry/denial handlers with the same safe schema. | REQUIRED |

### 8. Security

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| HIGH | `SecurityConfig` | Chat and production Swagger are publicly accessible; auth failures use framework defaults. | Optional paid AI can be abused and errors are inconsistent. | Keep chat compatibility in this phase but make exposure/profile policy explicit; standardize 401/403 and disable docs in prod. | REQUIRED |
| MEDIUM | `JwtAuthenticationFilter` | Invalid JWT is logged with a stack trace at DEBUG and silently continued. | Debug logs are noisy and exception details add little value; client ultimately gets an unrelated default 401. | Log only the failure category at debug and let a standardized entry point respond; never include token values. | REQUIRED |
| MEDIUM | `SecurityConfig` CORS | Correlation headers are neither accepted nor exposed. | Browser clients cannot send/read the incident identifier. | Add/expose `X-Correlation-ID`; retain explicit credentialed origins. | REQUIRED |

### 9. Actuator / health

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| HIGH | `application.yml`, `SecurityConfig` | `loggers` and a non-functional `prometheus` endpoint are exposed; only health is authorized. | Operational surface is larger than required and configuration is confusing. | Expose `health,info,metrics`, restrict non-health endpoints, enable liveness/readiness, never show prod details. | REQUIRED |

### 10. API consistency

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| MEDIUM | `SupportController` | Uses wildcard `ResponseEntity<?>`, returns 200 for admin message creation, and exposes entities. | OpenAPI/client contracts are weak and create semantics vary. | Use concrete DTO types and 201 for creation, after checking frontend compatibility. | RECOMMENDED |
| MEDIUM | pageable controllers | Client controls unbounded page sizes. | Expensive list requests can exhaust memory/DB time. | Configure a global maximum page size without changing response shape. | REQUIRED |

### 11. Service quality

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| HIGH | `AccountEmailService` | A 500+ line class embeds repeated HTML templates and inconsistent failure behavior. | Changes are risky and failures are hard to test. | First normalize logging/exceptions; later split rendering from delivery only if templates continue growing. | REQUIRED / RECOMMENDED |
| MEDIUM | `TrainService#calculateAvailableSeats` | Reloads a train already loaded from each route row. | Search causes avoidable repeated repository calls. | Pass the existing `Train` to seat availability. | REQUIRED |

### 12. Transactions

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| HIGH | `BookingService#create` | SMTP occurs before transaction completion. | Email can announce a booking that later rolls back, while mail latency holds locks. | Register after-commit delivery or orchestrate persistence and delivery outside the transaction. | REQUIRED (follow-up) |
| MEDIUM | `TicketPdfService#generateTicket` | CPU-heavy PDF generation and audit write occur in a read-only transaction. | Holds a connection during rendering and the audit write has confusing transaction semantics. | Load a projection, end the read transaction, then render/audit. | RECOMMENDED |

### 13. JPA / database

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| CRITICAL | SQL scripts vs entities | Manual numbered scripts are not managed by Flyway and the base schema lacks later support/audit/queue changes. | Fresh and upgraded databases are not reproducible; `ddl-auto=validate` can fail. | Consolidate current baseline carefully, then adopt Flyway with a documented baseline strategy; do not auto-run incompatible scripts blindly. | REQUIRED (follow-up migration project) |
| HIGH | `BookingService#create` | Availability/RAC/WL counts are read then written without a serialization strategy. | Concurrent requests can over-allocate or duplicate queue positions. | Existing seat unique index protects seats partially; implement locking/idempotency in the explicitly deferred concurrency phase. | REQUIRED (next phase) |
| MEDIUM | `SupportTicket` | `@Data` generates equality/string methods across mutable entity state and timestamps use `LocalDateTime`. | Logging/equality can be unstable and time zone meaning is ambiguous. | Replace entity `@Data`; use constrained columns and migrate technical timestamps to `Instant` consistently. | REQUIRED / RECOMMENDED |

### 14. External integrations

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| CRITICAL | `GeminiConfig` / `GeminiChatService` | Default `RestClient` has no connect/read timeout. | A downstream stall can indefinitely occupy request threads. | Configure explicit timeouts and translate downstream failures to a safe 503. | REQUIRED |
| HIGH | Gemini URLs | API key is appended to URLs. | URLs may be captured by proxies/diagnostics. | Prefer the provider-supported API-key header and ensure logs never include it. | REQUIRED |
| MEDIUM | Mail configuration | SMTP timeouts are absent. | Mail operations can hold request/DB threads too long. | Configure connection/read/write timeouts through properties. | REQUIRED |

### 15. Dependency management

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| MEDIUM | `pom.xml` | Full WebFlux starter is retained although code uses synchronous MVC `RestClient`; `spring-dotenv` duplicates normal external configuration. | Adds an unnecessary reactive server/client surface and nonstandard config behavior. | Use the narrower client dependency only when supported by Boot management; remove dotenv after documenting env loading. | RECOMMENDED |
| LOW | Testcontainers | PostgreSQL module exists but no Testcontainers test uses it. | Slower dependency resolution and misleading test maturity. | Retain only when the planned repository integration test is added; otherwise remove. | OPTIONAL |

### 16. Dead / unused code

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| MEDIUM | tracked `.idea` trees | IDE metadata is committed despite ignore rules. | User-specific churn and tooling noise pollute reviews. | Remove tracked IDE metadata. | REQUIRED |
| LOW | `GeminiConfig` | Unused `ObjectMapper` import; broadly named `restClient` bean. | Minor hygiene and future bean ambiguity. | Remove the import and name/qualify the integration client. | RECOMMENDED |

### 17. Testing foundation

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| HIGH | test source | Only an empty context-load test exists and requires real configuration/infrastructure. | Security/error/filter regressions reach production undetected. | Add focused unit/MVC tests for correlation, validation/error representation, 401/403 and configuration binding. | REQUIRED |

### 18. Production operational concerns

| Severity | File/class | Current implementation and problem | Production impact | Recommendation | Disposition |
|---|---|---|---|---|---|
| HIGH | server config | No graceful shutdown or forward-header/error-detail policy. | Deployments can terminate in-flight bookings and proxy metadata may be interpreted incorrectly. | Enable graceful shutdown, bounded shutdown phase, native forwarded headers and safe error settings. | REQUIRED |
| MEDIUM | Docker health | Backend container has no healthcheck while Postgres does. | Compose cannot distinguish a running JVM from a ready application. | Probe the readiness endpoint using a tool available in the runtime image. | RECOMMENDED |

## Implementation plan

### P0 — correctness, security, dangerous production issues

1. Remove committed deployment credentials, require production secrets, and remove tracked IDE metadata.
2. Add bounded external HTTP/SMTP timeouts and safe downstream exception translation.
3. Ensure unexpected exceptions are logged internally and return no implementation detail.
4. Add a standardized security 401/403 response and constrain production operational endpoints.

### P1 — production foundation

1. Split neutral, local, test and production configuration; enable graceful shutdown and health probes.
2. Add one correlation filter, MDC-safe cleanup, response header propagation and one MVC access-log interceptor.
3. Add a typed, backward-compatible API error contract covering validation, malformed requests and conflicts.
4. Strengthen actual booking, support and AI request constraints without renaming fields or routes.

### P2 — maintainability and observability

1. Remove console logging, add contextual business/downstream logs, avoid personal data.
2. Remove the redundant train lookup and replace unsafe Lombok entity generation.
3. Add focused filter, exception, security and validation tests.
4. Move audit reads to the service and replace support entity responses with DTOs.

### P3 — optional / deliberately deferred

1. Establish Flyway only after reconciling every deployed schema and choosing a baseline version.
2. Move email and PDF work outside database transactions with after-commit correctness tests.
3. Address concurrent booking/idempotency in the next phase, based on the existing seat uniqueness design.
4. Consider structured JSON logs, Resilience4j and metrics export only when the deployment/monitoring stack requires them.
