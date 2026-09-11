#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL must be set to the existing PostgreSQL database" >&2
  exit 1
fi

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

# One transaction and stop-on-first-error make the controlled upgrade atomic.
psql "${DATABASE_URL}" \
  --set=ON_ERROR_STOP=1 \
  --single-transaction \
  --file="${PROJECT_ROOT}/database/004_foundation_schema.sql" \
  --file="${PROJECT_ROOT}/database/005_booking_concurrency.sql" \
  --file="${PROJECT_ROOT}/database/006_queue_and_token_concurrency.sql"
