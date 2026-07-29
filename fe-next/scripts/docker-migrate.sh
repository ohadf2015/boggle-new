#!/bin/bash
set -e

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⏭️  SUPABASE_ACCESS_TOKEN not set, skipping migrations"
    exit 0
fi

echo "🚀 Running Supabase migrations..."
cd /app/supabase

# Link to project
supabase link --project-ref hdtmpkicuxvtmvrmtybx

# Push migrations
supabase db push

echo "✅ Migrations complete!"
