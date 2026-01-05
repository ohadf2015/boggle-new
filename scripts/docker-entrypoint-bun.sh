#!/bin/bash
set -e

echo "🔧 Bun version: $(bun --version)"
echo "📦 Node environment: $NODE_ENV"

# Run migrations if credentials are available
if [ -n "$SUPABASE_ACCESS_TOKEN" ] && [ -n "$SUPABASE_DB_PASSWORD" ]; then
    echo "🔄 Running database migrations..."
    /app/scripts/docker-migrate.sh || echo "⚠️  Migration failed, continuing anyway"
fi

# Start the server with Bun
# Using --smol for reduced memory footprint in production containers
echo "🚀 Starting server with Bun..."
exec bun --smol server.ts
