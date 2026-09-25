#!/bin/bash
set -e

# Migrations run through the CI Management-API migrator. Booting the server must
# never `supabase db push` production just because credentials are present —
# opt in explicitly with RUN_MIGRATIONS_ON_START=true.
if [ "$RUN_MIGRATIONS_ON_START" = "true" ] && [ -n "$SUPABASE_ACCESS_TOKEN" ] && [ -n "$SUPABASE_DB_PASSWORD" ]; then
    echo "🔄 Running database migrations..."
    /app/scripts/docker-migrate.sh || echo "⚠️  Migration failed, continuing anyway"
fi

# Start the server
echo "🚀 Starting server..."
exec node dist/server.cjs
