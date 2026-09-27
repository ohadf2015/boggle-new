/**
 * fix-daily-puzzle.ts
 *
 * One-off recovery script for daily puzzle rows that violate the target-word
 * length cap (MAX_TARGET_WORD_LENGTH = 6). Usage:
 *
 *   npx tsx scripts/fix-daily-puzzle.ts <date> <language>
 *
 * Example:
 *   npx tsx scripts/fix-daily-puzzle.ts 2026-04-09 he
 *
 * What it does:
 *   1. Deletes the Supabase `daily_target_words` row for that date/language
 *      so the next generation isn't anchored to a bad stored word.
 *   2. Invalidates the Redis cache key so players don't keep seeing stale data.
 *   3. Calls regenerateDailyPuzzle() to force a fresh deterministic grid and
 *      write it back to Supabase immediately.
 *   4. Asserts the new target word length is within the cap before exiting.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { regenerateDailyPuzzle } from '../utils/dailyChallenge/gridGeneration.server';
import { invalidateDailyPuzzleCache } from '../backend/redis/dailyPuzzle';
import { getSupabase, isSupabaseConfigured } from '../backend/modules/supabase/client';
import { MAX_TARGET_WORD_LENGTH } from '../utils/dailyChallenge/constants';
import type { Language } from '../types';

async function main() {
  const [dateArg, langArg] = process.argv.slice(2);

  if (!dateArg || !langArg) {
    console.error('Usage: npx tsx scripts/fix-daily-puzzle.ts <date> <language>');
    console.error('Example: npx tsx scripts/fix-daily-puzzle.ts 2026-04-09 he');
    process.exit(1);
  }

  const dateString = dateArg;
  const language = langArg as Language;

  console.log(`\n[fix-daily-puzzle] Target: ${dateString} / ${language}\n`);

  // Step 1: Delete the stale Supabase row
  if (!isSupabaseConfigured()) {
    console.error('Supabase is not configured - check .env.local');
    process.exit(1);
  }
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Failed to get Supabase client');
    process.exit(1);
  }

  const { data: existing, error: fetchError } = await supabase
    .from('daily_target_words')
    .select('id, target_word, override_word, grid')
    .eq('puzzle_date', dateString)
    .eq('language', language)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Failed to fetch existing row:', fetchError.message);
    process.exit(1);
  }

  if (existing) {
    const currentWord = existing.override_word || existing.target_word;
    console.log(`  Existing row: word="${currentWord}" (${currentWord.length} chars), grid=${existing.grid ? 'present' : 'null'}`);

    const { error: deleteError } = await supabase
      .from('daily_target_words')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      console.error('Failed to delete stale row:', deleteError.message);
      process.exit(1);
    }
    console.log(`  ✓ Deleted stale Supabase row`);
  } else {
    console.log(`  No existing Supabase row - nothing to delete`);
  }

  // Step 2: Invalidate Redis cache
  const cacheCleared = await invalidateDailyPuzzleCache(dateString, language);
  console.log(`  ${cacheCleared ? '✓' : '✗'} Redis cache invalidation: ${cacheCleared ? 'success' : 'skipped/failed'}`);

  // Step 3: Force regeneration (writes new row + grid back to Supabase)
  console.log(`  → Regenerating puzzle deterministically...`);
  const puzzle = await regenerateDailyPuzzle(dateString, language);

  // Step 4: Assert length
  const newWord = puzzle.targetWord;
  console.log(`\n  New target word: "${newWord}" (${newWord.length} chars)`);
  console.log(`  Grid: ${puzzle.grid.length}x${puzzle.grid[0]?.length || 0}`);

  if (newWord.length > MAX_TARGET_WORD_LENGTH) {
    console.error(`\n  ✗ FAILED: new word exceeds cap of ${MAX_TARGET_WORD_LENGTH} chars`);
    process.exit(1);
  }

  console.log(`\n  ✓ Recovery complete. Cap (${MAX_TARGET_WORD_LENGTH}) respected.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('\n[fix-daily-puzzle] Fatal error:', err);
  process.exit(1);
});
