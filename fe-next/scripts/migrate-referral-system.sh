#!/bin/bash

###############################################################################
# Referral System Migration Script
# Best Practice: Uses Supabase CLI with proper error handling and validation
###############################################################################

set -e  # Exit on error

echo "🚀 Referral System Migration"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to project directory
cd "$(dirname "$0")/.."
echo "📁 Working directory: $(pwd)"
echo ""

# Step 1: Check Supabase CLI is installed
echo "1️⃣  Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install with: brew install supabase/tap/supabase"
    exit 1
fi
echo -e "${GREEN}✅ Supabase CLI installed${NC}"
SUPABASE_VERSION=$(supabase --version)
echo "   Version: $SUPABASE_VERSION"
echo ""

# Step 2: Check if logged in
echo "2️⃣  Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase${NC}"
    echo ""
    echo "Please login to Supabase:"
    echo -e "${BLUE}supabase login${NC}"
    echo ""
    echo "Then run this script again."
    exit 1
fi
echo -e "${GREEN}✅ Authenticated with Supabase${NC}"
echo ""

# Step 3: Check if project is linked
echo "3️⃣  Checking project link..."
if [ ! -d ".supabase" ]; then
    echo -e "${YELLOW}⚠️  Project not linked${NC}"
    echo ""
    echo "Linking project: hdtmpkicuxvtmvrmtybx"

    if supabase link --project-ref hdtmpkicuxvtmvrmtybx; then
        echo -e "${GREEN}✅ Project linked successfully${NC}"
    else
        echo -e "${RED}❌ Failed to link project${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Project already linked${NC}"
fi
echo ""

# Step 4: Check for pending migrations
echo "4️⃣  Checking for pending migrations..."
PENDING=$(supabase db diff --use-migra 2>&1 || true)
if echo "$PENDING" | grep -q "021_referral_system"; then
    echo -e "${YELLOW}⚠️  Migration 021 pending${NC}"
else
    echo -e "${GREEN}✅ Migration files detected${NC}"
fi
echo ""

# Step 5: Dry run migration
echo "5️⃣  Running dry-run..."
echo "This will show what changes will be made without applying them."
echo ""

if supabase db push --dry-run; then
    echo ""
    echo -e "${GREEN}✅ Dry-run successful - no errors detected${NC}"
else
    echo ""
    echo -e "${RED}❌ Dry-run failed - please fix errors before proceeding${NC}"
    exit 1
fi
echo ""

# Step 6: Confirm before applying
echo "6️⃣  Ready to apply migration..."
echo ""
echo "The following will be created:"
echo "  • referral_code, referred_by, referral_count columns on profiles"
echo "  • referrals table for tracking"
echo "  • referral_rewards table for reward history"
echo "  • Auto-generation triggers"
echo "  • Performance indexes"
echo "  • Backfill referral codes for existing users"
echo ""
read -p "Apply migration to production? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

# Step 7: Apply migration
echo ""
echo "7️⃣  Applying migration..."
if supabase db push; then
    echo ""
    echo -e "${GREEN}✅ Migration applied successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi
echo ""

# Step 8: Verify migration
echo "8️⃣  Verifying migration..."
echo ""
echo "Running verification checks..."

# Source environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Run verification script
if [ -f "supabase/migrations/verify-021.js" ]; then
    node supabase/migrations/verify-021.js
else
    echo -e "${YELLOW}⚠️  Verification script not found, skipping...${NC}"
fi

echo ""
echo "===================================="
echo -e "${GREEN}🎉 Migration Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Add <ReferralCard /> to your profile page"
echo "2. Integrate referral tracking in registration flow"
echo "3. Call milestone API after game completions"
echo ""
echo "Documentation: GAME_IMPROVEMENTS_COMPLETE.md"
echo ""
