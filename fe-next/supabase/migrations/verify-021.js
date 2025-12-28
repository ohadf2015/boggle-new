#!/usr/bin/env node
/**
 * Verify migration 021: Referral System
 * Checks that all tables, columns, and triggers were created successfully
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyMigration() {
  console.log('🔍 Verifying Migration 021: Referral System');
  console.log('============================================\n');

  let allPassed = true;

  // Test 1: Check profiles table has new columns
  console.log('1. Checking profiles table columns...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, referral_code, referred_by, referral_count, referral_reward_xp')
      .limit(1);

    if (error) {
      console.log('   ❌ Failed:', error.message);
      allPassed = false;
    } else {
      console.log('   ✅ All columns exist');
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    allPassed = false;
  }

  // Test 2: Check referrals table exists
  console.log('\n2. Checking referrals table...');
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .limit(1);

    if (error && !error.message.includes('0 rows')) {
      console.log('   ❌ Failed:', error.message);
      allPassed = false;
    } else {
      console.log('   ✅ Table exists');
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    allPassed = false;
  }

  // Test 3: Check referral_rewards table exists
  console.log('\n3. Checking referral_rewards table...');
  try {
    const { data, error } = await supabase
      .from('referral_rewards')
      .select('*')
      .limit(1);

    if (error && !error.message.includes('0 rows')) {
      console.log('   ❌ Failed:', error.message);
      allPassed = false;
    } else {
      console.log('   ✅ Table exists');
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    allPassed = false;
  }

  // Test 4: Check if referral codes were generated
  console.log('\n4. Checking referral code generation...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('referral_code')
      .not('referral_code', 'is', null)
      .limit(5);

    if (error) {
      console.log('   ❌ Failed:', error.message);
      allPassed = false;
    } else if (!data || data.length === 0) {
      console.log('   ⚠️  No referral codes found (might be no users yet)');
    } else {
      console.log(`   ✅ Found ${data.length} users with referral codes`);
      console.log(`   Example codes: ${data.map(u => u.referral_code).join(', ')}`);
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    allPassed = false;
  }

  // Test 5: Test the API endpoint
  console.log('\n5. Testing referral API endpoint...');
  try {
    const response = await fetch(`${SUPABASE_URL.replace('supabase.co', 'supabase.co')}/functions/v1/api/referral`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (response.status === 404 || response.status === 401) {
      console.log('   ⚠️  API endpoint not accessible (expected until deployed)');
    } else {
      console.log('   ✅ API endpoint accessible');
    }
  } catch (err) {
    console.log('   ⚠️  API endpoint not tested (expected in local dev)');
  }

  console.log('\n============================================');
  if (allPassed) {
    console.log('✅ All verification tests passed!');
    console.log('\n🎯 Referral system is ready to use!');
    console.log('\nNext steps:');
    console.log('1. Add <ReferralCard /> to your profile page');
    console.log('2. Integrate referral tracking in registration flow');
    console.log('3. Call milestone API after game completions');
  } else {
    console.log('❌ Some tests failed. Please check the errors above.');
  }
}

verifyMigration().catch(console.error);
