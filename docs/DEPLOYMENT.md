# Production Deployment Guide

## Backend profiles and operational contract

SouthRail keeps shared safe behavior in `application.yml` and uses explicit `local`, `test`, and `prod` profiles. Start a workstation instance with `SPRING_PROFILES_ACTIVE=local`. Production must use `SPRING_PROFILES_ACTIVE=prod`; that profile requires external database, JWT, frontend/CORS, and mail-sender values and disables Swagger.

For Compose, copy `.env.example` to `.env` and replace every placeholder. The populated file is ignored by Git. Multiple CORS origins can be supplied as a comma-separated list; wildcard origins are intentionally unsupported because browser credentials are enabled.

Health probes are available at `/api/actuator/health/liveness` and `/api/actuator/health/readiness`. Only health is anonymous, metrics and info require an administrator, health details are hidden in production, and graceful shutdown allows 30 seconds for in-flight work.

The current database lifecycle still uses ordered SQL scripts rather than Flyway. Fresh Compose databases apply `database/001_schema.sql` through `database/005_booking_concurrency.sql` automatically. Existing databases must apply `database/004_foundation_schema.sql` and `database/005_booking_concurrency.sql` in order during a controlled maintenance step before starting this backend version; Hibernate remains on `ddl-auto=validate` and will not mutate production tables.

Every API response carries `X-Correlation-ID`. Clients may supply a safe value in that header or let the backend generate one. Include it in incident reports, but never include JWTs, passwords, reset links, API keys, or request bodies.

## Environment Variables

Backend:

```bash
DB_URL=jdbc:postgresql://postgres:5432/southrail
DB_USERNAME=southrail
DB_PASSWORD=<strong-password>
JWT_SECRET=<at-least-32-characters-random-secret>
JWT_ACCESS_MINUTES=20
JWT_REFRESH_DAYS=14
CORS_ALLOWED_ORIGINS=https://rail.example.com
MAIL_HOST=<smtp-host>
MAIL_PORT=587
```

Frontend:

```bash
VITE_API_URL=https://rail.example.com/api
```

## Recommended Topology

1. Nginx or cloud load balancer terminates TLS.
2. React static build is served by Nginx.
3. `/api` traffic is proxied to Spring Boot.
4. PostgreSQL runs in a managed database service when possible.
5. Spring Boot uses simple in-memory caching for read-heavy train search and train detail responses.
6. Metrics are scraped from Actuator by Prometheus or an equivalent collector.

Redis is not required for this project. PostgreSQL is required. Mailpit is optional for local email testing, and Gmail SMTP or another SMTP provider is optional for real email delivery.

## Database

Run schema creation through a migration tool before first deployment. The SQL files in `database/` are ready to convert to Flyway naming such as `V1__schema.sql` and `V2__seed_south_india.sql`.

Critical indexes already included:

- Station code lookup
- Train number lookup
- Route stop ordering
- Booking lookup by user and PNR
- Journey availability lookup
- Refresh-token hash lookup

## Hardening Checklist

- Use HTTPS only.
- Rotate `JWT_SECRET` through a secret manager.
- Store refresh tokens hashed only.
- Rate-limit login, forgot-password, and PNR tracking.
- Enforce strong password policy and optional MFA.
- Restrict Actuator endpoints by network policy.
- Enable structured JSON logging in production if logs are shipped to ELK or OpenSearch.
- Add request correlation IDs at the edge.

## Scaling

- Run multiple backend replicas behind the reverse proxy.
- Keep backend stateless; JWT and hashed refresh-token persistence already support this.
- Read-heavy train search and train detail responses use simple in-memory Spring cache. For multiple backend replicas, each replica maintains its own local cache.
- Partition high-volume booking/audit tables by date when traffic grows.
- Add queue-backed email and SMS notification delivery.

## CI/CD

Suggested pipeline:

1. Backend: `mvn test`
2. Frontend: `npm ci && npm run build`
3. Build Docker images.
4. Run security scans.
5. Apply database migrations.
6. Deploy backend and frontend images.
7. Verify `/api/actuator/health` and smoke-test search/login.
