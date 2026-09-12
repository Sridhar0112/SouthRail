# SouthRail configuration contract

## Profiles and precedence

`application.yml` contains safe, environment-neutral defaults. `application-local.yml` supplies workstation PostgreSQL and diagnostic defaults, `application-test.yml` uses isolated H2 and deterministic logging, and `application-prod.yml` contains production-only Hikari, SQL logging, Swagger, and health-detail policy. No profile is activated in source. Activate exactly the intended profile externally with `SPRING_PROFILES_ACTIVE`; command-line arguments and environment variables override profile files, which override `application.yml`.

Production configuration is immutable per process. Do not use machine-local files except an intentionally mounted Spring external configuration source. Placeholder examples below are not credentials.

| Variable | Required in prod | Secret | Purpose/default |
|---|---:|---:|---|
| `SPRING_PROFILES_ACTIVE` | Yes | No | Must be `prod` in production. |
| `DB_URL` | Yes | No | PostgreSQL JDBC URL. |
| `DB_USERNAME` | Yes | Sensitive | Database identity. |
| `DB_PASSWORD` | Yes | Yes | Database credential. |
| `DB_POOL_MAX_SIZE` | No | No | Per-replica Hikari maximum; default 10, size against total PostgreSQL capacity. |
| `DB_POOL_MIN_IDLE` | No | No | Per-replica idle floor; default 2. |
| `DB_POOL_CONNECTION_TIMEOUT` | No | No | Pool acquisition timeout in milliseconds; default 30000. |
| `JWT_SECRET` | Yes | Yes | HMAC key, at least 32 UTF-8 bytes and not a shipped placeholder. |
| `JWT_ISSUER` | Yes | No | Token issuer; default `southrail` preserves the existing contract. |
| `JWT_ACCESS_TOKEN_TTL` | No | No | Positive access-token lifetime in minutes; default 20; legacy `JWT_ACCESS_MINUTES` remains a fallback. |
| `JWT_REFRESH_TOKEN_TTL` | No | No | Positive refresh-token lifetime in days; default 14; legacy `JWT_REFRESH_DAYS` remains a fallback. |
| `CORS_ALLOWED_ORIGINS` | Yes | No | Comma-separated explicit browser origins; `*` is forbidden with credentials. |
| `APP_FRONTEND_URL` | Yes | No | Public frontend base URL used in action links. |
| `AI_ENABLED` | No | No | Credential-enforcement switch: when true, prod requires a Gemini key. It does not remove `/chat` or disable Gemini beans; default false. |
| `GEMINI_API_KEY` | Conditional | Yes | Required when `AI_ENABLED=true`. |
| `GEMINI_BASE_URL` | No | No | Gemini endpoint; HTTPS vendor default. |
| `GEMINI_DEFAULT_MODEL` | No | No | Default model. |
| `GEMINI_CONNECT_TIMEOUT` | No | No | Positive milliseconds; default 3000. |
| `GEMINI_READ_TIMEOUT` | No | No | Positive milliseconds; default 10000. |
| `EMAIL_ENABLED` | Yes | No | Runtime delivery switch. `false` sends no outbound email; production requires `true` because registration requires verification. |
| `SMTP_HOST` / `SMTP_PORT` | Conditional | No | SMTP endpoint; localhost:1025 default is safe while disabled. Legacy `MAIL_HOST` / `MAIL_PORT` remain fallbacks. |
| `SMTP_USERNAME` | Conditional | Sensitive | Required when `EMAIL_ENABLED=true`. |
| `SMTP_PASSWORD` | Conditional | Yes | Required when `EMAIL_ENABLED=true`. |
| `MAIL_FROM` | Yes | No | Sender identity. |
| `SLOW_REQUEST_THRESHOLD` | No | No | Spring duration, default `2s`. |

Production fails before accepting traffic when PostgreSQL values are blank, JWT issuer/secret is blank, the key is weak/default, CORS is empty/wildcard, email is disabled, or SMTP credentials are missing. `AI_ENABLED=false` prevents Gemini calls and `EMAIL_ENABLED=false` prevents SMTP calls. Email may be disabled in local/test profiles, but not in production because that would create unverified accounts with no verification channel. Gemini and mail are excluded from readiness.

SMTP is an optional notification dependency. Spring Boot's built-in mail health indicator is disabled in every profile, so an unavailable SMTP server does not make aggregate health or readiness `DOWN`. Delivery attempts and their existing degraded-failure logs remain the source of SMTP failure visibility; this setting does not change email sending behavior.

Never commit populated `.env` files. Local defaults are explicitly non-production conveniences. Secrets should be injected by the deployment platform and rotated outside the application.
