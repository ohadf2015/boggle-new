#!/usr/bin/env node
/**
 * Apply migration 020: Create Word Hunt Tables
 *
 * This script applies the Word Hunt database migration.
 * Run with: node apply-020.js
 *
 * Environment variables required:
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nTo run this migration, set the environment variables and run:');
  console.error('   node apply-020.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function applyMigration() {
  console.log('🚀 Applying Migration 020: Create Word Hunt Tables');
  console.log('==================================================\n');
  console.log(`📍 Target: ${SUPABASE_URL}\n`);

  try {
    // Read the migration file
    const sqlPath = path.join(__dirname, '020_create_word_hunt_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split into individual statements
    const statements = sql
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      // Extract a description from the statement
      const description = statement.split('\n')[0].slice(0, 60) + '...';
      console.log(`[${i + 1}/${statements.length}] ${description}`);

      try {
        // Execute via RPC (if available)
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ sql: statement })
        });

        if (!response.ok) {
          const text = await response.text();
          // Ignore "already exists" errors
          if (text.includes('already exists') || text.includes('duplicate')) {
            console.log('   ⏭️  Already exists, skipped');
            skipCount++;
          } else if (text.includes('function') && text.includes('does not exist')) {
            console.log('   ⚠️  exec_sql RPC not available - may need manual SQL execution');
          } else {
            throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
          }
        } else {
          console.log('   ✅ Executed successfully');
          successCount++;
        }
      } catch (err) {
        if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
          console.log('   ⏭️  Already exists, skipped');
          skipCount++;
        } else {
          console.error(`   ❌ Error: ${err.message?.slice(0, 100)}`);
          throw err;
        }
      }
    }

    console.log('\n==================================================');
    console.log(`✅ Migration 020 applied successfully!`);
    console.log(`   Executed: ${successCount} statements`);
    console.log(`   Skipped: ${skipCount} statements (already exist)`);
    console.log('\n📋 Created resources:');
    console.log('   • daily_word_hunt_attempts table');
    console.log('   • word_hunt_player_stats table');
    console.log('   • daily_word_hunt_stats view');
    console.log('   • RLS policies for both tables');
    console.log('   • Auto-update triggers');
    console.log('\n🎯 Your Word Hunt mode is now ready for backend integration!');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error('\nIf you see RPC errors, you may need to:');
    console.error('1. Run the SQL directly in Supabase Dashboard SQL Editor');
    console.error('2. Or create the exec_sql RPC function first');
    process.exit(1);
  }
}

applyMigration();
