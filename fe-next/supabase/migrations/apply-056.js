#!/usr/bin/env node
/**
 * Apply migration 056_teacher_vocabulary_builder.sql
 * This is a one-time script to apply a specific migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

async function applyMigration() {
  console.log('🚀 Applying migration: 056_teacher_vocabulary_builder.sql\n');

  const sql = fs.readFileSync(
    path.join(__dirname, '056_teacher_vocabulary_builder.sql'),
    'utf8'
  );

  // Use fetch to call Supabase's REST API directly
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const text = await response.text();
    // If exec_sql doesn't exist, we need to use pgAdmin or Supabase dashboard
    if (text.includes('function') && text.includes('does not exist')) {
      console.log('⚠️  exec_sql RPC not available.');
      console.log('\n📋 To apply this migration:');
      console.log('1. Go to https://supabase.com/dashboard/project/[YOUR_PROJECT]/sql');
      console.log('2. Copy the contents of supabase/migrations/056_teacher_vocabulary_builder.sql');
      console.log('3. Paste and execute in the SQL Editor\n');
      console.log('✅ Migration file created successfully at:');
      console.log('   supabase/migrations/056_teacher_vocabulary_builder.sql\n');
      return;
    }
    throw new Error(`Migration failed: ${text}`);
  }

  console.log('✅ Migration applied successfully!\n');
}

applyMigration().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
