# SouthRail Reservation Platform

SouthRail is a production-oriented railway reservation platform inspired by IRCTC and focused on South Indian routes. It includes a Java 21 Spring Boot backend, React frontend, PostgreSQL schema, in-memory Spring caching, JWT refresh-token security, Swagger, Actuator, Docker, and Nginx.

## Stack

- Backend: Java 21, Spring Boot 3, Spring Security, JWT, PostgreSQL, Maven
- Frontend: React, Material UI, Redux Toolkit, Axios interceptors, responsive routing
- Operations: Docker Compose, Nginx reverse proxy, Actuator, SLF4J and Logback
- Docs: Swagger at `/api/swagger-ui.html`, Postman collection in `docs/`

## Run With Docker

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:8088
- Backend health: http://localhost:8080/api/actuator/health
- Swagger: http://localhost:8080/api/swagger-ui.html

## Run Locally

Start PostgreSQL, then load:

```bash
psql -U southrail -d southrail -f database/001_schema.sql
psql -U southrail -d southrail -f database/002_seed.sql
```

Backend:

```bash
cd backend
mvn spring-boot:run
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Architecture

The backend follows layered architecture:

- `controller`: REST endpoints and request validation
- `service`: transactions, fare calculation, PNR generation, business rules
- `repository`: Spring Data JPA persistence
- `entity`: normalized domain model
- `dto`: request and response contracts
- `security`: JWT parsing, refresh-token flow, RBAC
- `exception`: global error handling

The frontend follows feature-based organization:

- `features/auth`: login, registration, token state
- `features/trains`: search, station suggestions, availability, fare, and route result comparison
- `features/booking`: passenger booking and PNR tracking
- `features/dashboard`: user and admin dashboards
- `components`: shell, protected routes, error boundary
- `services`: Axios client with refresh interceptor
- `theme`: light/dark Material UI theme

## Included Features

- User registration, login, JWT access token, refresh token
- Forgot password, reset password, and email verification with database-backed account tokens
- Role-based access for admin endpoints
- Train search by source, destination, date, class, and quota
- Station suggestions backed by the stations table
- Train details with route stops, timing, platform, distance
- Fare calculation and availability from configured coach capacity and existing bookings
- Multi-passenger booking with berth preference
- PNR generation, tracking, cancellation, refund estimate
- Booking history and upcoming bookings dashboard
- Admin management dashboard for users, trains, routes, stations, and bookings
- PostgreSQL schema with indexes for common high-volume paths
- Simple in-memory Spring caching on search and train detail reads
- Skeleton loaders, responsive design, dark mode, accessible controls

## Production Notes

- Replace `JWT_SECRET` with a strong 256-bit secret.
- Configure `APP_FRONTEND_URL`, `MAIL_FROM`, and SMTP credentials before enabling account emails in production.
- Redis is not required. PostgreSQL is required. Mailpit is useful for local email testing, and Gmail SMTP or another SMTP provider can be configured for real email delivery.
- Add a payment provider adapter before enabling real payments.
- Run database migrations with Flyway or Liquibase in production.
- Keep `/actuator/health` public and protect metrics/loggers behind network or gateway policy.

## Test Strategy

- Unit test service logic such as fare calculation, token refresh, and cancellation.
- Integration test repositories with Testcontainers PostgreSQL.
- API contract test controllers through Spring MVC.
- Frontend test key flows: search, auth, protected routes, booking submit, and PNR lookup.
