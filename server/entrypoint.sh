#!/bin/sh

# Exit on error
set -e

echo "Starting Coolify Entrypoint..."

# Run migrations
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  node scripts/migrate.js
fi

# Start application
echo "Starting application..."
exec "$@"
