#!/bin/bash
# Quick setup script to add Supabase service role key

echo "╔════════════════════════════════════════════╗"
echo "║   Supabase Service Key Setup               ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "📋 To get your service role key:"
echo "   1. Go to: https://supabase.com/dashboard/project/hdtmpkicuxvtmvrmtybx/settings/api"
echo "   2. Find 'service_role' key (marked as secret)"
echo "   3. Click 'Reveal' and copy the key"
echo ""
read -p "Paste your service role key here: " SERVICE_KEY

if [ -z "$SERVICE_KEY" ]; then
    echo "❌ No key provided. Exiting."
    exit 1
fi

# Validate key format (should start with eyJ)
if [[ ! "$SERVICE_KEY" =~ ^eyJ ]]; then
    echo "⚠️  Warning: Key doesn't look like a JWT token (should start with 'eyJ')"
    read -p "Continue anyway? (y/n): " CONFIRM
    if [ "$CONFIRM" != "y" ]; then
        exit 1
    fi
fi

# Update .env file
if [ -f ".env" ]; then
    # Check if key already exists
    if grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env; then
        # Replace existing key
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY|" .env
        else
            # Linux
            sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY|" .env
        fi
        echo "✅ Updated existing service key in .env"
    else
        # Append new key
        echo "" >> .env
        echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY" >> .env
        echo "✅ Added service key to .env"
    fi
else
    echo "❌ .env file not found!"
    exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Restart your dev server: npm run dev"
echo "  2. Grant admin access: npm run grant-dev-admin"
echo ""
