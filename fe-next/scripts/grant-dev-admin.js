#!/usr/bin/env node
/**
 * Dev Admin Grant Script
 *
 * Safely grants admin access to authenticated user in DEVELOPMENT ONLY
 *
 * Usage: npm run grant-dev-admin
 *
 * Safety Features:
 * - Only runs in development environment
 * - Requires explicit user confirmation
 * - Validates Supabase connection
 * - Idempotent (safe to run multiple times)
 * - Cannot accidentally affect production
 */

const readline = require('readline');

// ============================================
// SAFETY CHECK: Environment Validation
// ============================================
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production') {
  console.error('\n❌ ERROR: This script cannot run in production!');
  console.error('   This is a development-only tool.\n');
  process.exit(1);
}

// Check for production indicators
const PROD_INDICATORS = [
  process.env.RAILWAY_ENVIRONMENT,
  process.env.VERCEL_ENV === 'production',
  process.env.RENDER_SERVICE_NAME,
  process.env.HEROKU_APP_NAME,
];

if (PROD_INDICATORS.some(Boolean)) {
  console.error('\n❌ ERROR: Production environment detected!');
  console.error('   This script is for local development only.\n');
  process.exit(1);
}

// ============================================
// Configuration
// ============================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n❌ ERROR: Missing Supabase configuration!');
  console.error('   Required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n   Make sure your .env.local file is configured.\n');
  process.exit(1);
}

// ============================================
// Interactive Prompt
// ============================================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// ============================================
// Main Script
// ============================================
async function grantDevAdmin() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   LexiClash Dev Admin Grant Tool          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('⚠️  This will grant admin access to your user account.');
  console.log('    Environment: DEVELOPMENT');
  console.log(`    Supabase: ${SUPABASE_URL}\n`);

  // Step 1: Get user email/ID
  console.log('📝 How would you like to identify the user?\n');
  console.log('   1. Email address');
  console.log('   2. User ID (UUID)');
  console.log('   3. Current authenticated session\n');

  const choice = await prompt('Select option (1-3): ');

  let userId = null;
  let userEmail = null;

  try {
    // Dynamic import of Supabase (ESM module)
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (choice === '1') {
      // Grant by email
      userEmail = await prompt('Enter user email: ');

      const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.error('\n❌ Error fetching users:', authError.message);
        process.exit(1);
      }

      const user = authUser.users.find(u => u.email === userEmail);
      if (!user) {
        console.error(`\n❌ No user found with email: ${userEmail}`);
        process.exit(1);
      }

      userId = user.id;
      console.log(`✓ Found user: ${user.email} (${userId})`);

    } else if (choice === '2') {
      // Grant by UUID
      userId = await prompt('Enter user ID (UUID): ');

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error('\n❌ Invalid UUID format');
        process.exit(1);
      }

      // Verify user exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', userId)
        .single();

      if (profile) {
        userEmail = profile.email;
        console.log(`✓ Found user: ${profile.username || profile.email}`);
      }

    } else if (choice === '3') {
      console.error('\n⚠️  Session-based grant not yet implemented.');
      console.error('   Please use option 1 (email) or 2 (user ID).\n');
      process.exit(1);
    } else {
      console.error('\n❌ Invalid option selected');
      process.exit(1);
    }

    // Step 2: Confirm action
    console.log('\n⚠️  CONFIRMATION REQUIRED\n');
    console.log(`   This will grant admin access to:`);
    console.log(`   User ID: ${userId}`);
    if (userEmail) console.log(`   Email: ${userEmail}`);
    console.log(`   Environment: DEVELOPMENT ONLY\n`);

    const confirm = await prompt('   Type "grant admin" to confirm: ');

    if (confirm.trim().toLowerCase() !== 'grant admin') {
      console.log('\n❌ Action cancelled.\n');
      process.exit(0);
    }

    // Step 3: Grant admin access
    console.log('\n🔧 Granting admin access...');

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('\n❌ Error granting admin access:', error.message);
      process.exit(1);
    }

    // Success!
    console.log('\n✅ SUCCESS! Admin access granted.\n');
    console.log('═══════════════════════════════════════════\n');
    console.log('🎉 You now have admin access!\n');
    console.log('📍 Access the admin dashboard at:');
    console.log(`   http://localhost:3001/en/admin\n`);
    console.log('⚠️  Note: You may need to:');
    console.log('   1. Refresh your browser');
    console.log('   2. Log out and log back in');
    console.log('   3. Clear application cache\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// ============================================
// Execute Script
// ============================================
grantDevAdmin().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
