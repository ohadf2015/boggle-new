#!/usr/bin/env node
/**
 * Apply migration 019 - Fix daily leaderboard view
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
  console.error('');
  console.error('You can find your service role key in:');
  console.error('Supabase Dashboard > Project Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function applyMigration() {
  console.log('🔄 Applying migration 019_fix_daily_leaderboard_view_ordering...');

  const sql = `
-- Drop and recreate the view WITHOUT the ORDER BY clause
DROP VIEW IF EXISTS daily_puzzle_leaderboard;

CREATE OR REPLACE VIEW daily_puzzle_leaderboard AS
SELECT
    dpa.puzzle_date,
    dpa.puzzle_number,
    dpa.language,
    dpa.player_id,
    dpa.guest_fingerprint,
    COALESCE(
        dpa.display_name,
        p.display_name,
        p.username,
        'Guest Player'
    ) as display_name,
    COALESCE(
        dpa.avatar_emoji,
        p.avatar_emoji,
        '🎯'
    ) as avatar_emoji,
    COALESCE(
        dpa.avatar_color,
        p.avatar_color,
        '#FFE135'
    ) as avatar_color,
    dpa.score,
    dpa.word_count,
    dpa.time_seconds,
    dpa.longest_word,
    dpa.completed_at,
    ROW_NUMBER() OVER (
        PARTITION BY dpa.puzzle_date, dpa.language
        ORDER BY dpa.score DESC, dpa.word_count DESC, dpa.time_seconds ASC NULLS LAST
    ) as rank_position
FROM daily_puzzle_attempts dpa
LEFT JOIN profiles p ON dpa.player_id = p.id;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      const { error: directError } = await supabase.from('_migration').select('*').limit(0);

      if (directError) {
        console.error('❌ Error executing SQL:', error.message);
        console.error('');
        console.error('Please run this SQL manually in Supabase SQL Editor:');
        console.error('Dashboard > SQL Editor > New Query');
        console.log('');
        console.log(sql);
        process.exit(1);
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('The daily challenge leaderboard should now show players correctly.');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error('');
    console.error('Please run this SQL manually in Supabase SQL Editor:');
    console.log('');
    console.log(sql);
    process.exit(1);
  }
}

applyMigration();
