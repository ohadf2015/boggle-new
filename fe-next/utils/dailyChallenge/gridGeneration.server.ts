/**
 * Daily Challenge Grid Generation - SERVER ONLY
 *
 * Server-side functions for database operations and async puzzle generation
 * This file imports backend modules and MUST NOT be imported by client components
 */

import type { Language, LetterGrid } from '@/types';
import type { DailyPuzzle } from './types';
import { getPuzzleNumber } from './dateUtils';
import { generateDailyPuzzle, isWordOnGrid } from './gridGeneration';
import { MAX_TARGET_WORD_LENGTH } from './constants';
import { loadNounList, createSafeReadFile } from '@/backend/dictionaryLoaders';
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';
import logger from '@/utils/logger';

// ==========================================
// Database Operations
// ==========================================

/**
 * Data returned from the database for a daily puzzle
 */
interface DailyPuzzleData {
  targetWord: string;
  grid: LetterGrid | null;
  gridGeneratedAt: string | null;
}

/**
 * Fetch pre-selected target word and stored grid from the database
 * Returns null if not found (will fall back to deterministic selection)
 */
async function fetchDailyPuzzleData(
  dateString: string,
  language: Language
): Promise<DailyPuzzleData | null> {
  try {
    // Dynamic import to prevent bundling server-only code
    const { getSupabase, isSupabaseConfigured } = await import('@/backend/modules/supabase/client');

    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('daily_target_words')
      .select('target_word, override_word, grid, grid_generated_at')
      .eq('puzzle_date', dateString)
      .eq('language', language)
      .single();

    if (error || !data) {
      return null;
    }

    // Use override_word if set, otherwise use target_word
    return {
      targetWord: data.override_word || data.target_word,
      grid: data.grid as LetterGrid | null,
      gridGeneratedAt: data.grid_generated_at,
    };
  } catch {
    // Silently fail and fall back to deterministic
    return null;
  }
}

/**
 * Save the generated grid to the database
 * This ensures all players get the same grid for the same puzzle
 */
async function saveGridToDatabase(
  dateString: string,
  language: Language,
  grid: LetterGrid,
  targetWord: string
): Promise<boolean> {
  try {
    // Dynamic import to prevent bundling server-only code
    const { getSupabase, isSupabaseConfigured } = await import('@/backend/modules/supabase/client');

    if (!isSupabaseConfigured()) {
      return false;
    }

    const supabase = getSupabase();
    if (!supabase) return false;

    // First check if the entry exists
    const { data: existing } = await supabase
      .from('daily_target_words')
      .select('id')
      .eq('puzzle_date', dateString)
      .eq('language', language)
      .single();

    if (existing) {
      // Update existing entry
      const { error } = await supabase
        .from('daily_target_words')
        .update({
          grid,
          grid_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('puzzle_date', dateString)
        .eq('language', language);

      if (error) {
        logger.error('[Daily Puzzle] Failed to update grid:', error.message);
        return false;
      }
    } else {
      // Create new entry
      const { error } = await supabase.from('daily_target_words').insert({
        puzzle_date: dateString,
        language,
        puzzle_number: getPuzzleNumber(dateString),
        target_word: targetWord,
        grid,
        grid_generated_at: new Date().toISOString(),
        ai_selected: false,
        ai_reason: 'Auto-generated with grid',
      });

      if (error) {
        logger.error('[Daily Puzzle] Failed to insert grid:', error.message);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('[Daily Puzzle] Failed to save grid:', error);
    return false;
  }
}

// ==========================================
// Noun List Loading (for board enrichment)
// ==========================================

const nounListCache = new Map<string, string[]>();

async function loadNounWordsForLanguage(language: Language): Promise<string[]> {
  if (nounListCache.has(language)) return nounListCache.get(language)!;

  try {
    const normalizer = language === 'he'
      ? (w: string) => normalizeHebrewWord(w.trim())
      : (w: string) => w.trim().toUpperCase();
    const safeReadFile = createSafeReadFile();
    const nounSet = await loadNounList(safeReadFile, language, normalizer);
    const words = Array.from(nounSet);
    nounListCache.set(language, words);
    return words;
  } catch {
    return [];
  }
}

// ==========================================
// Server-Side Puzzle Generation
// ==========================================

/**
 * Generate a daily puzzle with async database lookup for pre-selected word
 * Use this on the server-side to get AI-selected words when available
 */
export async function generateDailyPuzzleAsync(
  dateString: string,
  language: Language,
  forceRegenerate: boolean = false
): Promise<DailyPuzzle> {
  // Load noun words for board enrichment (cached after first load)
  const nounWords = await loadNounWordsForLanguage(language);

  // Try to fetch puzzle data from database (includes stored grid)
  const puzzleData = await fetchDailyPuzzleData(dateString, language);

  // Guard: reject stored target words that exceed the gameplay cap.
  // Legacy DB rows (or admin imports from before the cap tightened) may hold
  // words longer than MAX_TARGET_WORD_LENGTH — fall through to deterministic
  // regeneration instead of serving an oversized target to players.
  const storedTargetTooLong =
    !!puzzleData && puzzleData.targetWord.length > MAX_TARGET_WORD_LENGTH;
  if (storedTargetTooLong) {
    console.warn(
      `[Daily Puzzle] Stored target "${puzzleData!.targetWord}" for ${dateString}/${language} exceeds ${MAX_TARGET_WORD_LENGTH} chars - regenerating deterministically`
    );
  }

  // If we have puzzle data with a valid grid, use it (unless force regenerate)
  if (puzzleData && !forceRegenerate && !storedTargetTooLong) {
    const targetWord = puzzleData.targetWord;

    // Check if we have a stored grid
    if (puzzleData.grid && puzzleData.grid.length > 0) {
      // Validate that the target word is actually on the grid
      if (isWordOnGrid(targetWord, puzzleData.grid)) {
        logger.log(`[Daily Puzzle] Using stored grid for ${dateString}/${language}`);
        return {
          grid: puzzleData.grid,
          targetWord: targetWord.toUpperCase(),
          puzzleDate: dateString,
          language,
          puzzleNumber: getPuzzleNumber(dateString),
        };
      } else {
        // Target word is NOT on the stored grid - need to regenerate!
        console.warn(
          `[Daily Puzzle] Target word "${targetWord}" NOT on stored grid for ${dateString}/${language} - regenerating!`
        );
      }
    } else {
      logger.log(`[Daily Puzzle] No stored grid for ${dateString}/${language} - generating new one`);
    }

    // Generate new puzzle with the pre-selected word + noun enrichment
    const puzzle = generateDailyPuzzle(dateString, language, targetWord, undefined, undefined, nounWords);

    // Save the generated grid to database for future players
    const saved = await saveGridToDatabase(dateString, language, puzzle.grid, puzzle.targetWord);
    if (saved) {
      logger.log(`[Daily Puzzle] Saved new grid for ${dateString}/${language}`);
    }

    return puzzle;
  }

  // No puzzle data in database - generate from scratch
  logger.log(
    `[Daily Puzzle] No puzzle data in DB for ${dateString}/${language} - generating deterministically`
  );
  const puzzle = generateDailyPuzzle(dateString, language, undefined, undefined, undefined, nounWords);

  // Try to save the generated grid
  const saved = await saveGridToDatabase(dateString, language, puzzle.grid, puzzle.targetWord);
  if (saved) {
    logger.log(`[Daily Puzzle] Saved generated grid for ${dateString}/${language}`);
  }

  return puzzle;
}

/**
 * Force regenerate the grid for a daily puzzle and save it
 * This is used by admins when they want to regenerate the board
 */
export async function regenerateDailyPuzzle(
  dateString: string,
  language: Language
): Promise<DailyPuzzle> {
  return generateDailyPuzzleAsync(dateString, language, true);
}
