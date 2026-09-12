# SouthRail operations runbook

## Endpoint and health contract

All paths below include the configured `/api` servlet context.

| Endpoint | Local | Test | Prod | Anonymous | Purpose |
|---|---|---|---|---|---|
| `/actuator/health/liveness` | exposed | exposed | exposed | yes | Process/application availability only; never checks external dependencies. |
| `/actuator/health/readiness` | exposed | exposed | exposed | yes | Application readiness plus lightweight JDBC health. |
| `/actuator/health` | exposed | exposed | exposed | no | Protected aggregate; authorized administrators can see components/details. |
| `/actuator/health/dependencies` | exposed | exposed | exposed | no | Protected DB and disk operational view. |
| `/actuator/info` | exposed | exposed | exposed | no | Safe application/build/Git identity. |
| `/actuator/metrics` | exposed | not exposed | exposed | no | Standard Micrometer metric names/snapshots. |
| `/actuator/prometheus` | exposed | not exposed | exposed | no | Prometheus-format scrape; no server is bundled. |
| `env`, `configprops`, `heapdump`, `beans`, `mappings`, `loggers`, `threaddump` | not exposed | not exposed | not exposed | no | Deliberately unavailable. |

The current security model has no separate infrastructure operator authority. Consequently only the two exact probe endpoints are anonymous and disclose status only; other exposed endpoints require the existing admin authority and may show health components/details. They should additionally be network-restricted. Management stays on the application port because the current Compose/frontend topology does not safely route a second port. Customer-facing CORS is not applied to `/actuator` paths: a browser preflight carrying a customer origin is rejected with `403 Invalid CORS request` and no CORS allow headers before authentication is evaluated, while a direct unauthenticated request to a protected Actuator endpoint receives the normal `401` response.

```bash
curl -fsS http://HOST:8080/api/actuator/health/liveness
curl -fsS http://HOST:8080/api/actuator/health/readiness
```

A PostgreSQL outage makes readiness `DOWN` while liveness remains `UP`; drain the instance and investigate DB reachability/pool metrics rather than restarting a healthy JVM repeatedly. Gemini or SMTP outages do not change either probe. `AI_ENABLED=false` prevents Gemini calls and `EMAIL_ENABLED=false` prevents SMTP calls. Production requires email enabled with valid SMTP credentials because registration requires verification. Health checks never generate content or send mail.

## Incident workflow

* Read `/actuator/info` with authorized monitoring credentials to identify service version, build timestamp, short/full commit, and environment.
* Search structured production stdout by `correlationId`. The service validates or replaces `X-Correlation-ID`, returns it, puts it in MDC for the request, and always clears it.
* `event=HTTP_SLOW_REQUEST` is the single WARN completion event for successful requests over `SLOW_REQUEST_THRESHOLD`. Failures use `HTTP_REQUEST_FAILED` with `slow=true` when applicable, faster successes are DEBUG, and health/metrics/Swagger traffic is excluded from access logging. An unexpected exception already logged with its stack trace by the exception boundary is not duplicated at WARN. Raw query strings and bodies are never included.
* Inspect standard `hikaricp.connections.active`, `hikaricp.connections.pending`, `hikaricp.connections.max`, and acquisition metrics. Pending connections near capacity indicate pool/database pressure; do not simply increase every replica's pool.
* Gemini client calls have finite connect/read timeouts. Public AI errors remain sanitized. SMTP connect/read/write timeouts are finite. Never log upstream bodies, prompts, email bodies, or action links.
* Unexpected exceptions have one authoritative ERROR stack trace in `GlobalExceptionHandler`. Expected validation/domain failures and Gemini failures remain safe responses without ERROR stack traces. Unknown routes, disabled Actuator paths, and missing static resources return the standard safe `RESOURCE_NOT_FOUND` 404 envelope. Application logs are not the durable audit trail.

## Logging and privacy

Production logs are UTC JSON on stdout; local/test logs are human-readable console output. INFO is lifecycle/high-value normal activity, WARN is recoverable abnormal behavior, ERROR is unexpected investigation-worthy failure, and DEBUG/TRACE are disabled in production. Temporary DEBUG requires a controlled configuration override and replica restart because the `loggers` endpoint is intentionally not exposed; target a narrow package, time-box it, and revert it.

Never log passwords, access/refresh JWTs, Authorization or Cookie headers, signing/API/SMTP/DB secrets, reset/verification/unlock tokens, OTPs, private keys, request/response bodies, Gemini prompts/responses, or email bodies. Minimize email, phone, passenger name, address, date of birth, identity numbers, PNR, and query parameters. Prefer internal resource IDs in logs but never use user, booking, PNR, email, correlation, raw URL, train number, exception message, or query values as metric tags.

## Startup and shutdown

After readiness, one `APPLICATION_STARTED` event reports safe profile, Java, version, commit, and startup duration. SIGTERM triggers Spring Boot graceful shutdown: readiness changes to refusing traffic, new requests stop, in-flight requests receive a bounded 30-second phase, then resources close. `APPLICATION_STOPPING` marks the transition. Compose grants 40 seconds so the JVM can use that window.

Schema changes remain controlled SQL outside Hibernate (`ddl-auto=validate`). Establishing a proven Flyway baseline is the next database-hardening step.
