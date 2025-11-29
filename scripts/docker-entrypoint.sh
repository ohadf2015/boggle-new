#!/bin/bash
set -e

# Run migrations if credentials are available
if [ -n "$SUPABASE_ACCESS_TOKEN" ] && [ -n "$SUPABASE_DB_PASSWORD" ]; then
    echo "🔄 Running database migrations..."
    /app/scripts/docker-migrate.sh || echo "⚠️  Migration failed, continuing anyway"
fi

# Start the server
echo "🚀 Starting server..."
exec node server.js
