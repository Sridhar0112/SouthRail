# Production Deployment Guide

## Backend profiles and operational contract

SouthRail keeps shared safe behavior in `application.yml` and uses explicit `local`, `test`, and `prod` profiles. Start a workstation instance with `SPRING_PROFILES_ACTIVE=local`. Production must use `SPRING_PROFILES_ACTIVE=prod`; that profile requires external database, JWT, frontend/CORS, and mail-sender values and disables Swagger.

For Compose, copy `.env.example` to `.env` and replace every placeholder. The populated file is ignored by Git. Multiple CORS origins can be supplied as a comma-separated list; wildcard origins are intentionally unsupported because browser credentials are enabled.

Production requires `EMAIL_ENABLED=true` and valid SMTP credentials. With `EMAIL_ENABLED=false` the application performs no outbound email delivery, which is suitable for tests but incompatible with the production registration flow because new accounts require email verification; production startup therefore fails fast for that configuration.

Health probes are available at `/api/actuator/health/liveness` and `/api/actuator/health/readiness`. Only health is anonymous, metrics and info require an administrator, health details are hidden in production, and graceful shutdown allows 30 seconds for in-flight work.

Flyway owns schema evolution from `backend/src/main/resources/db/migration`. Empty databases start with no application tables; Spring Boot then applies V1 through the latest migration. Hibernate remains on `ddl-auto=validate`.

For the first Flyway deployment to an existing database, use this supported sequence:

1. Take and verify a database backup.
2. Stop every backend instance and other database writer.
3. Verify that manual migrations 001 through 008 have all been applied. Apply any missing scripts in numeric order before starting the Flyway-enabled application.
4. Deploy and start the application. Because the database is non-empty, Flyway baselines it at version 8 and then applies V9 and later migrations.

`deploy/upgrade_v0.2.2.sh` is only a historical helper for applying migration 006 from the project root with a privileged migration connection:

```bash
DATABASE_URL='postgresql://user:password@host:5432/southrail' \
  ./deploy/upgrade_v0.2.2.sh
```

The helper uses `psql --single-transaction` and `ON_ERROR_STOP` to apply only `006_queue_and_token_concurrency.sql` atomically. It does not apply 004, 005, 007, or 008, so running it alone does **not** satisfy the version-8 baseline prerequisite for an older database.

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

Do not manually replay schema or seed scripts. Flyway validates checksums and applies only pending migrations at application startup.

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
- Extend the existing transactional email outbox to additional notification channels if needed.

## CI/CD

Suggested pipeline:

1. Backend: `mvn test`
2. Frontend: `npm ci && npm run build`
3. Build Docker images.
4. Run security scans.
5. Apply database migrations.
6. Deploy backend and frontend images.
7. Verify `/api/actuator/health` and smoke-test search/login.
