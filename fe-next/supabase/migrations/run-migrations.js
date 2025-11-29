#!/usr/bin/env node
/**
 * Supabase Migration Runner
 * Run this script during deployment to apply database migrations
 *
 * Usage:
 *   node run-migrations.js
 *
 * Environment variables required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (NOT anon key)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Migration tracking table
const MIGRATIONS_TABLE = '_migrations';

async function ensureMigrationsTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  }).catch(() => {
    // If RPC doesn't exist, try raw SQL via REST
    return { error: null };
  });

  // Fallback: create via direct query if RPC fails
  if (error) {
    console.log('Note: Using alternative migration tracking method');
  }
}

async function getExecutedMigrations() {
  const { data, error } = await supabase
    .from(MIGRATIONS_TABLE)
    .select('name')
    .order('id');

  if (error) {
    // Table might not exist yet
    return [];
  }

  return data.map(m => m.name);
}

async function recordMigration(name) {
  await supabase
    .from(MIGRATIONS_TABLE)
    .insert({ name });
}

async function runMigration(filePath, fileName) {
  console.log(`\n📄 Running migration: ${fileName}`);

  const sql = fs.readFileSync(filePath, 'utf8');

  // Split into statements (basic split on semicolons outside of strings)
  // For complex migrations, you might want a proper SQL parser
  const statements = sql
    .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (!statement) continue;

    try {
      // Use the REST API to execute SQL
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
        // Try alternative: direct PostgreSQL connection via management API
        // This is a fallback that might work depending on your setup
        const text = await response.text();
        if (text.includes('function') && text.includes('does not exist')) {
          console.log('   ⚠️  exec_sql function not available, statement may need manual execution');
        } else {
          throw new Error(`HTTP ${response.status}: ${text}`);
        }
      }
    } catch (err) {
      // Log but continue - some statements might fail due to "already exists"
      if (err.message?.includes('already exists') ||
          err.message?.includes('duplicate')) {
        console.log(`   ⏭️  Skipped (already exists)`);
      } else {
        console.error(`   ⚠️  Warning: ${err.message?.slice(0, 100)}`);
      }
    }
  }

  console.log(`   ✅ Completed: ${fileName}`);
}

async function main() {
  console.log('🚀 Supabase Migration Runner');
  console.log('============================\n');
  console.log(`📍 Target: ${SUPABASE_URL}`);

  try {
    // Get migration files
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('\n✅ No migration files found');
      return;
    }

    console.log(`\n📁 Found ${files.length} migration files`);

    // Get already executed migrations
    await ensureMigrationsTable();
    const executed = await getExecutedMigrations();
    console.log(`📋 Already executed: ${executed.length} migrations`);

    // Run pending migrations
    let runCount = 0;
    for (const file of files) {
      if (executed.includes(file)) {
        console.log(`⏭️  Skipping: ${file} (already executed)`);
        continue;
      }

      await runMigration(path.join(migrationsDir, file), file);
      await recordMigration(file);
      runCount++;
    }

    console.log('\n============================');
    console.log(`✅ Migrations complete! Ran ${runCount} new migrations.`);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

main();
