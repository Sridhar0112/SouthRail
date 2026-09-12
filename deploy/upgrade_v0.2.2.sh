#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL must be set to the existing PostgreSQL database" >&2
  exit 1
fi

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

# This helper upgrades an existing database that is already through migration
# 005. One transaction and stop-on-first-error make migration 006 atomic.
psql "${DATABASE_URL}" \
  --set=ON_ERROR_STOP=1 \
  --single-transaction \
  --file="${PROJECT_ROOT}/database/006_queue_and_token_concurrency.sql"
