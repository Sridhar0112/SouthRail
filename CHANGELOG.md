# Changelog

Notable user-facing and engineering changes will be documented here. This project intends to follow [Semantic Versioning](https://semver.org/) once releases begin.

## Unreleased

### Added

- Transaction-safe RAC/waitlist compaction and promotion with passenger-based RAC capacity.
- Single-active account-token database enforcement and serialized authentication state transitions.
- After-commit email delivery and runtime enforcement for AI/email feature flags.
- Backend GitHub Actions quality gate on Java 21.
- Verified architecture, operations, setup, testing and roadmap documentation.
- Contribution, issue and pull-request guidance.

## Proposed v0.1.0

First public preview of the SouthRail full-stack railway reservation platform:

- capability-oriented Spring Boot modular monolith and React/Vite interface;
- train search, reservations, PNR lookup, cancellation/refund review and PDF tickets;
- JWT access/refresh authentication, account recovery, RBAC and audit records;
- support tickets, SMTP notifications and Gemini assistance; and
- Docker Compose deployment with PostgreSQL and Nginx.

This proposed release is not yet tagged or published. Database migrations, concurrency hardening, broader integration tests, observability and deployment automation remain roadmap work.
