#!/usr/bin/env node
/**
 * Fix Daily Challenge Leaderboard
 * Run this script to apply the database view fix
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load from .env file
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL) {
  try {
    const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    if (urlMatch) SUPABASE_URL = urlMatch[1].trim();
  } catch (e) {
    // .env file not found
  }
}

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[2];

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in .env');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  console.error('');
  console.error('Run this script with your service key:');
  console.error('  node fix-leaderboard.js YOUR_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Or set it in your .env file:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  console.error('');
  console.error('Find your service key at:');
  console.error('  Supabase Dashboard > Settings > API > service_role');
  process.exit(1);
}

console.log('🔄 Connecting to Supabase...');
console.log(`   URL: ${SUPABASE_URL}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function fixLeaderboard() {
  console.log('');
  console.log('📊 Fixing daily puzzle leaderboard view...');

  const sql = `
DROP VIEW IF EXISTS daily_puzzle_leaderboard;

CREATE OR REPLACE VIEW daily_puzzle_leaderboard AS
SELECT
    dpa.puzzle_date,
    dpa.puzzle_number,
    dpa.language,
    dpa.player_id,
    dpa.guest_fingerprint,
    COALESCE(dpa.display_name, p.display_name, p.username, 'Guest Player') as display_name,
    COALESCE(dpa.avatar_emoji, p.avatar_emoji, '🎯') as avatar_emoji,
    COALESCE(dpa.avatar_color, p.avatar_color, '#FFE135') as avatar_color,
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
    // Execute raw SQL via Supabase
    const { error } = await supabase.rpc('exec', { sql });

    if (error && error.message.includes('function exec')) {
      // exec RPC doesn't exist, we need to use a workaround
      console.log('⚠️  Cannot execute SQL directly via Supabase client');
      console.log('');
      console.log('Please run this SQL in Supabase Dashboard > SQL Editor:');
      console.log('━'.repeat(60));
      console.log(sql);
      console.log('━'.repeat(60));
      process.exit(1);
    }

    if (error) {
      throw error;
    }

    console.log('✅ View updated successfully!');

    // Verify the fix by testing a query
    const today = new Date().toISOString().split('T')[0];
    const { data, error: testError } = await supabase
      .from('daily_puzzle_leaderboard')
      .select('*')
      .eq('puzzle_date', today)
      .eq('language', 'en')
      .limit(5);

    if (testError) {
      console.log('⚠️  View created but test query failed:', testError.message);
    } else {
      console.log(`✅ Test query successful! Found ${data?.length || 0} entries for today`);
    }

    console.log('');
    console.log('🎉 Daily challenge leaderboard is now fixed!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('');
    console.log('Please run this SQL manually in Supabase Dashboard > SQL Editor:');
    console.log('━'.repeat(60));
    console.log(sql);
    console.log('━'.repeat(60));
    process.exit(1);
  }
}

fixLeaderboard();
