#!/bin/sh

# Exit on error
set -e

echo "Starting Coolify Entrypoint..."

# Run migrations only for PostgreSQL deployments
if [ "$RUN_MIGRATIONS" = "true" ] && [ "$DB_CLIENT" != "sqlite" ] && [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  node scripts/migrate.js
else
  echo "Skipping migrations."
fi

# Start application
echo "Starting application..."
exec "$@"
