/**
 * Initialize Daily Buzz Feature Flags
 *
 * Run this script to set up the initial feature flag for Daily Buzz images.
 * This enables admin-only visibility by default.
 *
 * Usage:
 * npx tsx scripts/init-feature-flags.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface FeatureFlagConfig {
  flag_name: string;
  enabled: boolean;
  admin_only: boolean;
  rollout_percentage: number;
  description: string;
}

const FEATURE_FLAGS: FeatureFlagConfig[] = [
  {
    flag_name: 'daily_buzz_images',
    enabled: true,
    admin_only: true,
    rollout_percentage: 0,
    description: 'Enable AI-generated hero images for Daily Buzz challenges (admin-only by default)',
  },
];

async function initializeFeatureFlags() {
  console.log('🚀 Initializing Daily Buzz feature flags...\n');

  for (const flag of FEATURE_FLAGS) {
    try {
      console.log(`📝 Setting up: ${flag.flag_name}`);
      console.log(`   Description: ${flag.description}`);
      console.log(`   Enabled: ${flag.enabled}`);
      console.log(`   Admin Only: ${flag.admin_only}`);
      console.log(`   Rollout: ${flag.rollout_percentage}%`);

      // Upsert the feature flag
      const { error } = await supabase
        .from('feature_flags')
        .upsert({
          flag_name: flag.flag_name,
          enabled: flag.enabled,
          admin_only: flag.admin_only,
          rollout_percentage: flag.rollout_percentage,
        }, {
          onConflict: 'flag_name',
        });

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        console.log('   ✅ Success!\n');
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
    }
  }

  console.log('✨ Feature flag initialization complete!\n');
  console.log('📚 Next steps:');
  console.log('   1. To enable images for all users:');
  console.log('      UPDATE feature_flags SET admin_only = false WHERE flag_name = \'daily_buzz_images\';');
  console.log('');
  console.log('   2. To gradually roll out (e.g., 50% of users):');
  console.log('      UPDATE feature_flags SET rollout_percentage = 50 WHERE flag_name = \'daily_buzz_images\';');
  console.log('');
  console.log('   3. To disable completely:');
  console.log('      UPDATE feature_flags SET enabled = false WHERE flag_name = \'daily_buzz_images\';');
}

// Run initialization
initializeFeatureFlags()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
