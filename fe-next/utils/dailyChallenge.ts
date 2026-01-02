/**
 * Daily Challenge Utilities
 *
 * Provides deterministic grid generation for daily challenges.
 * Same date + language = same puzzle for all users worldwide.
 */

import { hebrewLetters, swedishLetters, spanishLetters, japaneseLetters, kanjiCompounds, DIFFICULTIES, DEFAULT_DIFFICULTY } from './consts';
import { formatTimeHHMMSS } from '@/shared/utils';
import type { Language, LetterGrid } from '@/types';
import type { LetterFeedback } from './wordHuntFeedback';

// ==========================================
// Constants
// ==========================================

// Epoch date for puzzle numbering (first daily challenge)
// Puzzle #1 = 2025-12-30, Puzzle #2 = 2025-12-31
const DAILY_CHALLENGE_EPOCH = new Date('2025-12-30T00:00:00Z');

// Hebrew final letters mapping to regular forms
// Final letters should not appear on the grid - only regular forms
const HEBREW_FINAL_TO_REGULAR: Record<string, string> = {
  'ך': 'כ', // final kaf → kaf
  'ם': 'מ', // final mem → mem
  'ן': 'נ', // final nun → nun
  'ף': 'פ', // final pe → pe
  'ץ': 'צ', // final tsade → tsade
};

/**
 * Normalize Hebrew final letters to regular forms for grid display
 * Final letters (ך, ם, ן, ף, ץ) are replaced with their regular forms
 */
function normalizeHebrewFinalLetters(text: string): string {
  let normalized = text;
  for (const [final, regular] of Object.entries(HEBREW_FINAL_TO_REGULAR)) {
    normalized = normalized.replace(new RegExp(final, 'g'), regular);
  }
  return normalized;
}

// Salt for seeding (prevents reverse-engineering grids)
const SEED_SALT = 'lexiclash-daily-v1';

// Default game duration for daily challenge (in seconds)
export const DAILY_CHALLENGE_DURATION = 120;

// ==========================================
// Seeded PRNG (Mulberry32)
// ==========================================

/**
 * Mulberry32 PRNG - simple, fast, and deterministic
 * Given the same seed, produces the same sequence of random numbers
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Simple string hash function (djb2)
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ==========================================
// Date Utilities
// ==========================================

/**
 * Get today's date in UTC as YYYY-MM-DD string
 * Daily challenges reset at midnight UTC for all users globally
 */
export function getDailyChallengeDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get a specific date's string representation
 */
export function formatDateForDaily(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate the puzzle number for a given date
 * Returns days since epoch + 1 (so puzzle #1 is 2024-01-01)
 */
export function getPuzzleNumber(dateString?: string): number {
  const date = dateString ? new Date(dateString + 'T00:00:00Z') : new Date();
  const daysSinceEpoch = Math.floor((date.getTime() - DAILY_CHALLENGE_EPOCH.getTime()) / (24 * 60 * 60 * 1000));
  return daysSinceEpoch + 1;
}

/**
 * Get the date string for a given puzzle number
 */
export function getDateForPuzzleNumber(puzzleNumber: number): string {
  const date = new Date(DAILY_CHALLENGE_EPOCH.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * Get seconds until the next daily challenge resets (midnight UTC)
 */
export function getSecondsUntilNextDaily(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

/**
 * Format countdown as HH:MM:SS
 * @deprecated Use formatTimeHHMMSS from '@/shared/utils' directly
 */
export const formatCountdown = formatTimeHHMMSS;

// ==========================================
// Seeded Grid Generation
// ==========================================

/**
 * Generate a deterministic grid for a daily challenge
 * Same date + language = same grid for everyone
 */
export function generateDailyGrid(
  dateString: string,
  language: Language,
  rows: number | null = null,
  cols: number | null = null
): LetterGrid {
  // Create seed from date + language + salt
  const seedString = `${SEED_SALT}-${dateString}-${language}`;
  const seed = hashString(seedString);
  const random = mulberry32(seed);

  // Use default difficulty if no rows/cols specified
  if (rows === null || cols === null) {
    rows = DIFFICULTIES[DEFAULT_DIFFICULTY].rows;
    cols = DIFFICULTIES[DEFAULT_DIFFICULTY].cols;
  }

  // Get letters for the language
  let letters: string[] | string;

  if (language === 'en') {
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  } else if (language === 'sv') {
    letters = swedishLetters;
  } else if (language === 'es') {
    letters = spanishLetters;
  } else if (language === 'ja') {
    return generateSeededJapaneseGrid(random, rows, cols);
  } else {
    letters = hebrewLetters;
  }

  // Generate grid with seeded random
  const lettersArray = typeof letters === 'string' ? letters.split('') : letters;
  const grid: string[][] = [];

  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    for (let j = 0; j < cols; j++) {
      const randomIndex = Math.floor(random() * lettersArray.length);
      row.push(lettersArray[randomIndex]);
    }
    grid.push(row);
  }

  return grid;
}

/**
 * Generate a seeded Japanese grid with embedded kanji compounds
 */
function generateSeededJapaneseGrid(
  random: () => number,
  rows: number,
  cols: number
): LetterGrid {
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  const totalCells = rows * cols;
  const targetCompounds = Math.floor(totalCells / 5);

  // Shuffle compounds using seeded random
  const shuffledCompounds = [...kanjiCompounds].sort(() => random() - 0.5);
  const twoCharCompounds = shuffledCompounds.filter(w => w.length === 2);
  const threeCharCompounds = shuffledCompounds.filter(w => w.length === 3);

  let embeddedCount = 0;

  // Embed 3-character compounds first
  for (const compound of threeCharCompounds) {
    if (embeddedCount >= Math.floor(targetCompounds * 0.2)) break;
    if (tryEmbedCompoundSeeded(grid, compound, rows, cols, usedCells, random)) {
      embeddedCount++;
    }
  }

  // Then 2-character compounds
  for (const compound of twoCharCompounds) {
    if (embeddedCount >= targetCompounds) break;
    if (tryEmbedCompoundSeeded(grid, compound, rows, cols, usedCells, random)) {
      embeddedCount++;
    }
  }

  // Fill remaining with random kanji
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        const randomIndex = Math.floor(random() * japaneseLetters.length);
        grid[i][j] = japaneseLetters[randomIndex];
      }
    }
  }

  return grid as LetterGrid;
}

/**
 * Try to embed a compound using seeded random
 */
function tryEmbedCompoundSeeded(
  grid: (string | null)[][],
  compound: string,
  rows: number,
  cols: number,
  usedCells: Set<string>,
  random: () => number
): boolean {
  const wordLen = compound.length;
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 0, dc: -1 },
    { dr: 1, dc: 0 },
    { dr: -1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: -1, dc: -1 },
    { dr: -1, dc: 1 },
  ];

  const shuffledDirs = [...directions].sort(() => random() - 0.5);

  const attempts = 50;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const startRow = Math.floor(random() * rows);
    const startCol = Math.floor(random() * cols);

    for (const dir of shuffledDirs) {
      const endRow = startRow + (wordLen - 1) * dir.dr;
      const endCol = startCol + (wordLen - 1) * dir.dc;

      if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
        continue;
      }

      let canPlace = true;
      const cellsToUse: Array<{ r: number; c: number; char: string }> = [];

      for (let i = 0; i < wordLen; i++) {
        const r = startRow + i * dir.dr;
        const c = startCol + i * dir.dc;

        if (grid[r][c] !== null && grid[r][c] !== compound[i]) {
          canPlace = false;
          break;
        }

        cellsToUse.push({ r, c, char: compound[i] });
      }

      if (canPlace) {
        for (const cell of cellsToUse) {
          grid[cell.r][cell.c] = cell.char;
          usedCells.add(`${cell.r},${cell.c}`);
        }
        return true;
      }
    }
  }

  return false;
}

// ==========================================
// Word-First Grid Generation (Core Fix)
// ==========================================

/**
 * Result of word-first grid generation
 * Contains both the grid AND the guaranteed target word
 */
export interface DailyPuzzle {
  grid: LetterGrid;
  targetWord: string;
  puzzleDate: string;
  language: Language;
  puzzleNumber: number;
}

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
  // Only run on server side
  if (typeof window !== 'undefined') {
    return null;
  }

  try {
    // Dynamic import to avoid client-side issues
    const { getSupabase, isSupabaseConfigured } = await import('@/backend/modules/supabaseServer');

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
      gridGeneratedAt: data.grid_generated_at
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
  // Only run on server side
  if (typeof window !== 'undefined') {
    return false;
  }

  try {
    const { getSupabase, isSupabaseConfigured } = await import('@/backend/modules/supabaseServer');

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
          updated_at: new Date().toISOString()
        })
        .eq('puzzle_date', dateString)
        .eq('language', language);

      if (error) {
        console.error('[Daily Puzzle] Failed to update grid:', error.message);
        return false;
      }
    } else {
      // Create new entry
      const { error } = await supabase
        .from('daily_target_words')
        .insert({
          puzzle_date: dateString,
          language,
          puzzle_number: getPuzzleNumber(dateString),
          target_word: targetWord,
          grid,
          grid_generated_at: new Date().toISOString(),
          ai_selected: false,
          ai_reason: 'Auto-generated with grid'
        });

      if (error) {
        console.error('[Daily Puzzle] Failed to insert grid:', error.message);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[Daily Puzzle] Failed to save grid:', error);
    return false;
  }
}

/**
 * Generate a daily puzzle with GUARANTEED playable target word
 *
 * ALGORITHM (Word-First):
 * 1. Check database for pre-selected word (AI-generated or admin override)
 * 2. If not found, select target word deterministically from date
 * 3. Generate a grid that embeds the word along a valid path
 * 4. Fill remaining cells with seeded random letters
 *
 * This eliminates the possibility of an unsolvable puzzle.
 *
 * @param dateString - Date string (YYYY-MM-DD)
 * @param language - Game language
 * @param preSelectedWord - Optional pre-selected word (skips DB lookup)
 * @returns Puzzle with guaranteed playable word
 */
export function generateDailyPuzzle(
  dateString: string,
  language: Language,
  preSelectedWord?: string
): DailyPuzzle {
  // Create seed from date + language + salt
  const seedString = `${SEED_SALT}-${dateString}-${language}-v2`;
  const seed = hashString(seedString);
  const random = mulberry32(seed);

  // Get grid dimensions
  const rows = DIFFICULTIES[DEFAULT_DIFFICULTY].rows;
  const cols = DIFFICULTIES[DEFAULT_DIFFICULTY].cols;

  // Get letters for the language
  let letters: string[];
  if (language === 'en') {
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  } else if (language === 'sv') {
    letters = swedishLetters;
  } else if (language === 'es') {
    letters = spanishLetters;
  } else if (language === 'ja') {
    // Japanese uses different word embedding strategy
    return generateJapaneseDailyPuzzle(dateString, language, random, rows, cols, preSelectedWord);
  } else {
    letters = hebrewLetters;
  }

  // STEP 1: Select target word - use pre-selected if provided, otherwise deterministic
  let targetWord: string;

  if (preSelectedWord) {
    targetWord = preSelectedWord.toUpperCase();
  } else {
    // Deterministic fallback - use words of varying lengths (3-8 letters)
    const wordList = TARGET_WORD_LISTS[language] || TARGET_WORD_LISTS['en'];

    // Shuffle word list using seeded random (Fisher-Yates)
    const shuffled = [...wordList];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Pick the first word (deterministic)
    targetWord = shuffled[0];
  }

  // STEP 2: Get same-length words for gameplay assistance
  // These words help players practice same-length guesses and get letter feedback (clues)
  // ENHANCED: Now prioritizes words with letter overlap with target
  const sameLengthWords = getSameLengthWords(targetWord, language, random);

  // STEP 3: Get other bonus words for survival mode (different lengths for variety)
  // ENHANCED: Prioritize longer words that share letters with target (for clue revelation)
  const bonusWordList = BONUS_WORD_LISTS[language] || BONUS_WORD_LISTS['en'];
  const otherBonusWords = bonusWordList
    .filter(w => w.length !== targetWord.length) // Exclude same-length (already covered)
    .map(w => w.toUpperCase());

  // Score and sort other bonus words by letter overlap with target
  // Prioritize LONGER words (>= target length) that can reveal positional clues
  const scoredOtherBonus = otherBonusWords.map(word => ({
    word,
    score: calculateLetterOverlapScore(word, targetWord),
    isLonger: word.length >= targetWord.length
  }));

  // Sort: longer words with high overlap first, then other words by overlap
  scoredOtherBonus.sort((a, b) => {
    // Longer words with overlap get priority
    if (a.isLonger && !b.isLonger && a.score > 0) return -1;
    if (b.isLonger && !a.isLonger && b.score > 0) return 1;
    // Then by overlap score
    return b.score - a.score;
  });

  // Shuffle within top tier for variety (top 8 highest-scoring words)
  const topBonus = scoredOtherBonus.slice(0, 8).map(s => s.word);
  for (let i = topBonus.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [topBonus[i], topBonus[j]] = [topBonus[j], topBonus[i]];
  }

  // Prioritize same-length words: take at least MIN_SAME_LENGTH_WORDS (5) same-length words
  // Then fill remaining slots with other bonus words (now prioritized by letter overlap)
  const sameLengthToEmbed = sameLengthWords.slice(0, Math.max(MIN_SAME_LENGTH_WORDS, 8));
  const otherBonusToEmbed = topBonus.slice(0, 6); // Increased from 4 to 6 for more clue opportunities

  // Combine: same-length words first (priority), then other bonus words
  let bonusWordsToEmbed = [...sameLengthToEmbed, ...otherBonusToEmbed];

  // STEP 3.5: Normalize Hebrew final letters for grid display
  // Final letters (ך, ם, ן, ף, ץ) should not appear on the grid
  let normalizedTargetWord = targetWord;
  if (language === 'he') {
    normalizedTargetWord = normalizeHebrewFinalLetters(targetWord);
    bonusWordsToEmbed = bonusWordsToEmbed.map(word => normalizeHebrewFinalLetters(word));
  }

  // STEP 3: Create grid with target word AND bonus words embedded
  const grid = embedMultipleWordsInGrid(normalizedTargetWord, bonusWordsToEmbed, letters, rows, cols, random, language);

  return {
    grid,
    targetWord: normalizedTargetWord, // Use normalized word so hints match grid
    puzzleDate: dateString,
    language,
    puzzleNumber: getPuzzleNumber(dateString)
  };
}

/**
 * Check if a word can be formed on the grid using adjacent cells
 * Uses DFS to find a valid path for the word
 */
function isWordOnGrid(word: string, grid: LetterGrid): boolean {
  if (!grid || grid.length === 0 || !word) return false;

  const rows = grid.length;
  const cols = grid[0].length;
  const wordUpper = word.toUpperCase();

  // 8 directions for adjacent cells
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  function dfs(row: number, col: number, index: number, visited: Set<string>): boolean {
    if (index === wordUpper.length) return true;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false;

    const key = `${row},${col}`;
    if (visited.has(key)) return false;

    // Normalize grid cell for comparison
    const cellLetter = grid[row][col].toUpperCase();
    if (cellLetter !== wordUpper[index]) return false;

    visited.add(key);

    for (const [dr, dc] of directions) {
      if (dfs(row + dr, col + dc, index + 1, visited)) {
        return true;
      }
    }

    visited.delete(key);
    return false;
  }

  // Try starting from each cell
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].toUpperCase() === wordUpper[0]) {
        if (dfs(r, c, 0, new Set())) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Generate a daily puzzle with async database lookup for pre-selected word
 * Use this on the server-side to get AI-selected words when available
 *
 * ENHANCED: Now stores and retrieves grids from the database
 * - If a stored grid exists and contains the target word, use it
 * - If no stored grid or target word is not on the grid, generate new grid and save it
 *
 * @param dateString - Date string (YYYY-MM-DD)
 * @param language - Game language
 * @param forceRegenerate - Force regenerate the grid even if one exists
 * @returns Puzzle with AI-selected or deterministic word, guaranteed to be on the board
 */
export async function generateDailyPuzzleAsync(
  dateString: string,
  language: Language,
  forceRegenerate: boolean = false
): Promise<DailyPuzzle> {
  // Try to fetch puzzle data from database (includes stored grid)
  const puzzleData = await fetchDailyPuzzleData(dateString, language);

  // If we have puzzle data with a valid grid, use it (unless force regenerate)
  if (puzzleData && !forceRegenerate) {
    const targetWord = puzzleData.targetWord;

    // Check if we have a stored grid
    if (puzzleData.grid && puzzleData.grid.length > 0) {
      // Validate that the target word is actually on the grid
      if (isWordOnGrid(targetWord, puzzleData.grid)) {
        console.log(`[Daily Puzzle] Using stored grid for ${dateString}/${language}`);
        return {
          grid: puzzleData.grid,
          targetWord: targetWord.toUpperCase(),
          puzzleDate: dateString,
          language,
          puzzleNumber: getPuzzleNumber(dateString)
        };
      } else {
        // Target word is NOT on the stored grid - need to regenerate!
        console.warn(`[Daily Puzzle] Target word "${targetWord}" NOT on stored grid for ${dateString}/${language} - regenerating!`);
      }
    } else {
      console.log(`[Daily Puzzle] No stored grid for ${dateString}/${language} - generating new one`);
    }

    // Generate new puzzle with the pre-selected word
    const puzzle = generateDailyPuzzle(dateString, language, targetWord);

    // Save the generated grid to database for future players
    const saved = await saveGridToDatabase(dateString, language, puzzle.grid, puzzle.targetWord);
    if (saved) {
      console.log(`[Daily Puzzle] Saved new grid for ${dateString}/${language}`);
    }

    return puzzle;
  }

  // No puzzle data in database - generate from scratch
  console.log(`[Daily Puzzle] No puzzle data in DB for ${dateString}/${language} - generating deterministically`);
  const puzzle = generateDailyPuzzle(dateString, language);

  // Try to save the generated grid
  const saved = await saveGridToDatabase(dateString, language, puzzle.grid, puzzle.targetWord);
  if (saved) {
    console.log(`[Daily Puzzle] Saved generated grid for ${dateString}/${language}`);
  }

  return puzzle;
}

/**
 * Force regenerate the grid for a daily puzzle and save it
 * This is used by admins when they want to regenerate the board
 *
 * @param dateString - Date string (YYYY-MM-DD)
 * @param language - Game language
 * @returns New puzzle with regenerated grid
 */
export async function regenerateDailyPuzzle(
  dateString: string,
  language: Language
): Promise<DailyPuzzle> {
  return generateDailyPuzzleAsync(dateString, language, true);
}

/**
 * Embed a word into a grid along a valid adjacent path
 * Then fill remaining cells with random letters
 */
function embedWordInGrid(
  word: string,
  letters: string[],
  rows: number,
  cols: number,
  random: () => number,
  language: Language
): LetterGrid {
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const wordUpper = word.toUpperCase();

  // 8 directions for adjacent cells (including diagonals)
  const directions = [
    { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
    { dr: 0, dc: -1 },                      { dr: 0, dc: 1 },
    { dr: 1, dc: -1 },  { dr: 1, dc: 0 },  { dr: 1, dc: 1 },
  ];

  // Try to place the word starting from random positions
  let placed = false;
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
    // Pick random starting position
    const startRow = Math.floor(random() * rows);
    const startCol = Math.floor(random() * cols);

    // Try to find a valid path for the word using DFS
    const path = findWordPath(wordUpper, startRow, startCol, rows, cols, random, directions);

    if (path && path.length === wordUpper.length) {
      // Place the word along the path
      for (let i = 0; i < path.length; i++) {
        grid[path[i].row][path[i].col] = wordUpper[i];
      }
      placed = true;
    }
  }

  // If somehow couldn't place (very unlikely), use linear placement as fallback
  if (!placed) {
    console.warn(`[Daily Puzzle] Using linear fallback for word: ${word}`);
    // Place word in first row
    for (let i = 0; i < wordUpper.length && i < cols; i++) {
      grid[0][i] = wordUpper[i];
    }
  }

  // STEP 3: Fill remaining cells with random letters
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        const randomIndex = Math.floor(random() * letters.length);
        grid[i][j] = letters[randomIndex];
      }
    }
  }

  return grid as LetterGrid;
}

/**
 * Embed multiple words into a grid for survival mode playability
 * First embeds the target word (required), then tries to embed bonus words
 * Finally fills remaining cells with random letters
 *
 * @param targetWord - The main target word (must be embedded)
 * @param bonusWords - Additional words to try embedding for survival mode
 * @param letters - Available letters for this language
 * @param rows - Grid rows
 * @param cols - Grid columns
 * @param random - Seeded random function
 * @param language - Language code
 * @returns Grid with embedded words
 */
function embedMultipleWordsInGrid(
  targetWord: string,
  bonusWords: string[],
  letters: string[],
  rows: number,
  cols: number,
  random: () => number,
  language: Language
): LetterGrid {
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  // 8 directions for adjacent cells (including diagonals)
  const directions = [
    { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
    { dr: 0, dc: -1 },                      { dr: 0, dc: 1 },
    { dr: 1, dc: -1 },  { dr: 1, dc: 0 },  { dr: 1, dc: 1 },
  ];

  // STEP 1: Embed the target word (REQUIRED)
  const targetUpper = targetWord.toUpperCase();
  let targetPlaced = false;
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts && !targetPlaced; attempt++) {
    const startRow = Math.floor(random() * rows);
    const startCol = Math.floor(random() * cols);
    const path = findWordPathInPartialGrid(targetUpper, startRow, startCol, rows, cols, random, directions, grid, usedCells);

    if (path && path.length === targetUpper.length) {
      for (let i = 0; i < path.length; i++) {
        grid[path[i].row][path[i].col] = targetUpper[i];
        usedCells.add(`${path[i].row},${path[i].col}`);
      }
      targetPlaced = true;
    }
  }

  // Fallback if target word couldn't be placed (very unlikely)
  if (!targetPlaced) {
    console.warn(`[Daily Puzzle] Using linear fallback for target word: ${targetWord}`);
    for (let i = 0; i < targetUpper.length && i < cols; i++) {
      grid[0][i] = targetUpper[i];
      usedCells.add(`0,${i}`);
    }
  }

  // STEP 2: Try to embed bonus words for gameplay
  // Priority: same-length words first (for clue feedback), then other bonus words
  let embeddedCount = 0;
  let sameLengthEmbedded = 0;
  const targetLength = targetUpper.length;
  const maxBonusWords = 12; // Embed more words to ensure good gameplay
  const minSameLengthWords = MIN_SAME_LENGTH_WORDS; // Must embed at least 5 same-length words

  for (const bonusWord of bonusWords) {
    if (embeddedCount >= maxBonusWords) break;

    // Track same-length words separately
    const isSameLength = bonusWord.length === targetLength;

    const wordUpper = bonusWord.toUpperCase();
    let wordPlaced = false;

    // Try a few random positions
    for (let attempt = 0; attempt < 30 && !wordPlaced; attempt++) {
      const startRow = Math.floor(random() * rows);
      const startCol = Math.floor(random() * cols);

      const path = findWordPathInPartialGrid(wordUpper, startRow, startCol, rows, cols, random, directions, grid, usedCells);

      if (path && path.length === wordUpper.length) {
        // Place the word
        for (let i = 0; i < path.length; i++) {
          grid[path[i].row][path[i].col] = wordUpper[i];
          usedCells.add(`${path[i].row},${path[i].col}`);
        }
        wordPlaced = true;
        embeddedCount++;
        if (isSameLength) {
          sameLengthEmbedded++;
        }
      }
    }
  }

  // Log same-length embedding result for debugging
  if (sameLengthEmbedded < minSameLengthWords) {
    console.warn(`[Daily Puzzle] Only embedded ${sameLengthEmbedded}/${minSameLengthWords} same-length words for target length ${targetLength}`);
  }

  // STEP 3: Fill remaining cells with random letters
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        const randomIndex = Math.floor(random() * letters.length);
        grid[i][j] = letters[randomIndex];
      }
    }
  }

  return grid as LetterGrid;
}

/**
 * Find a valid adjacent path for a word in a partially filled grid
 * Allows placing letters in empty cells or reusing cells with matching letters
 */
function findWordPathInPartialGrid(
  word: string,
  startRow: number,
  startCol: number,
  rows: number,
  cols: number,
  random: () => number,
  directions: Array<{ dr: number; dc: number }>,
  grid: (string | null)[][],
  usedCells: Set<string>
): Array<{ row: number; col: number }> | null {
  const path: Array<{ row: number; col: number }> = [];
  const visited = new Set<string>();

  function dfs(row: number, col: number, charIndex: number): boolean {
    if (charIndex === word.length) {
      return true;
    }

    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return false;
    }

    const key = `${row},${col}`;
    if (visited.has(key)) {
      return false;
    }

    // Check if this cell is valid:
    // - Empty (null) - we can place our letter
    // - Has matching letter - we can share this cell
    const cellValue = grid[row][col];
    const neededChar = word[charIndex];
    if (cellValue !== null && cellValue !== neededChar) {
      return false; // Cell has a different letter
    }

    visited.add(key);
    path.push({ row, col });

    if (charIndex === word.length - 1) {
      return true;
    }

    const shuffledDirs = [...directions].sort(() => random() - 0.5);
    for (const dir of shuffledDirs) {
      if (dfs(row + dir.dr, col + dir.dc, charIndex + 1)) {
        return true;
      }
    }

    visited.delete(key);
    path.pop();
    return false;
  }

  if (dfs(startRow, startCol, 0)) {
    return path;
  }
  return null;
}

/**
 * Find a valid adjacent path for a word starting from given position
 * Uses randomized DFS to create varied path shapes
 */
function findWordPath(
  word: string,
  startRow: number,
  startCol: number,
  rows: number,
  cols: number,
  random: () => number,
  directions: Array<{ dr: number; dc: number }>
): Array<{ row: number; col: number }> | null {
  const path: Array<{ row: number; col: number }> = [];
  const visited = new Set<string>();

  function dfs(row: number, col: number, charIndex: number): boolean {
    if (charIndex === word.length) {
      return true; // Successfully placed all characters
    }

    // Check bounds
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return false;
    }

    const key = `${row},${col}`;
    if (visited.has(key)) {
      return false; // Already used this cell
    }

    // Mark as visited and add to path
    visited.add(key);
    path.push({ row, col });

    if (charIndex === word.length - 1) {
      return true; // Last character placed
    }

    // Shuffle directions for variety
    const shuffledDirs = [...directions].sort(() => random() - 0.5);

    // Try each direction
    for (const dir of shuffledDirs) {
      const newRow = row + dir.dr;
      const newCol = col + dir.dc;
      if (dfs(newRow, newCol, charIndex + 1)) {
        return true;
      }
    }

    // Backtrack
    visited.delete(key);
    path.pop();
    return false;
  }

  if (dfs(startRow, startCol, 0)) {
    return path;
  }
  return null;
}

/**
 * Generate Japanese daily puzzle with embedded compound
 */
function generateJapaneseDailyPuzzle(
  dateString: string,
  language: Language,
  random: () => number,
  rows: number,
  cols: number,
  preSelectedWord?: string
): DailyPuzzle {
  // Use pre-selected word if provided
  let targetWord: string;

  if (preSelectedWord) {
    targetWord = preSelectedWord;
  } else {
    // For Japanese, use 2-character compounds as target
    const japaneseTargets = TARGET_WORD_LISTS['ja'] || [];
    const twoCharWords = japaneseTargets.filter(w => w.length === 2);

    // Shuffle and pick first
    const shuffled = [...twoCharWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    targetWord = shuffled[0] || '日本';
  }

  // Get same-length words for gameplay assistance (prioritized)
  const sameLengthWords = getSameLengthWords(targetWord, 'ja', random);

  // Get other bonus words for variety (different lengths)
  const japaneseBonusWords = BONUS_WORD_LISTS['ja'] || [];
  const otherBonusWords = japaneseBonusWords
    .filter(w => w.length !== targetWord.length);

  const shuffledOtherBonus = [...otherBonusWords];
  for (let i = shuffledOtherBonus.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledOtherBonus[i], shuffledOtherBonus[j]] = [shuffledOtherBonus[j], shuffledOtherBonus[i]];
  }

  // Prioritize same-length words, then other bonus words
  const sameLengthToEmbed = sameLengthWords.slice(0, Math.max(MIN_SAME_LENGTH_WORDS, 6));
  const otherBonusToEmbed = shuffledOtherBonus.slice(0, 4);
  const bonusWordsToEmbed = [...sameLengthToEmbed, ...otherBonusToEmbed];

  // Generate grid with Japanese characters
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  // 8 directions for adjacent cells
  const directions = [
    { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
    { dr: 0, dc: -1 },                      { dr: 0, dc: 1 },
    { dr: 1, dc: -1 },  { dr: 1, dc: 0 },  { dr: 1, dc: 1 },
  ];

  // Place target word (2 chars) adjacently
  const startRow = Math.floor(random() * rows);
  const startCol = Math.floor(random() * (cols - 1)); // Ensure room for 2 chars
  grid[startRow][startCol] = targetWord[0];
  grid[startRow][startCol + 1] = targetWord[1];
  usedCells.add(`${startRow},${startCol}`);
  usedCells.add(`${startRow},${startCol + 1}`);

  // Embed bonus words (same-length words first for gameplay assistance)
  let embeddedCount = 0;
  let sameLengthEmbedded = 0;
  const targetLength = targetWord.length;
  const maxBonusWords = 10;

  for (const bonusWord of bonusWordsToEmbed) {
    if (embeddedCount >= maxBonusWords) break;

    const wordChars = bonusWord.split('');
    const isSameLength = bonusWord.length === targetLength;
    let wordPlaced = false;

    for (let attempt = 0; attempt < 30 && !wordPlaced; attempt++) {
      const bStartRow = Math.floor(random() * rows);
      const bStartCol = Math.floor(random() * cols);

      const path = findWordPathInPartialGrid(bonusWord, bStartRow, bStartCol, rows, cols, random, directions, grid, usedCells);

      if (path && path.length === wordChars.length) {
        for (let i = 0; i < path.length; i++) {
          grid[path[i].row][path[i].col] = wordChars[i];
          usedCells.add(`${path[i].row},${path[i].col}`);
        }
        wordPlaced = true;
        embeddedCount++;
        if (isSameLength) {
          sameLengthEmbedded++;
        }
      }
    }
  }

  // Log same-length embedding result for debugging
  if (sameLengthEmbedded < MIN_SAME_LENGTH_WORDS) {
    console.warn(`[Daily Puzzle - Japanese] Only embedded ${sameLengthEmbedded}/${MIN_SAME_LENGTH_WORDS} same-length words for target length ${targetLength}`);
  }

  // Fill rest with random Japanese characters
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        const randomIndex = Math.floor(random() * japaneseLetters.length);
        grid[i][j] = japaneseLetters[randomIndex];
      }
    }
  }

  return {
    grid: grid as LetterGrid,
    targetWord,
    puzzleDate: dateString,
    language,
    puzzleNumber: getPuzzleNumber(dateString)
  };
}

/**
 * Get today's daily puzzle
 * Convenience wrapper for generateDailyPuzzle
 */
export function getTodaysDailyPuzzle(language: Language): DailyPuzzle {
  const date = getDailyChallengeDate();
  return generateDailyPuzzle(date, language);
}

// ==========================================
// Word Hunt Results (New Daily Challenge Format)
// ==========================================

/**
 * Result for Word Hunt daily challenge
 * Replaces the old scoring-based DailyChallengeResult
 */
export interface WordHuntResult {
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;

  // Game outcome
  solved: boolean;                // Did player find the target word?
  attemptsUsed: number;          // 1-10 attempts
  targetWord: string;            // The word they were hunting for

  // Attempt history
  attempts: Array<{
    word: string;
    feedback: LetterFeedback[];
    timestamp: number;
  }>;

  // Survival mode fields (optional for backward compatibility)
  wordsDiscovered?: Array<{
    word: string;
    timestamp: number;
    lifeGained: number;
    tokensGained: number;
  }>;
  lifeRemaining?: number;
  clueTokensEarned?: number;
  clueTokensSpent?: number;
  hintsUnlocked?: number;
  efficiencyScore?: number;

  // Metadata
  streakDays: number;
  completedAt: string;
}

// ==========================================
// Shareable Results Generation
// ==========================================

// Legacy interface for backward compatibility
export interface DailyChallengeResult {
  puzzleNumber: number;
  puzzleDate: string;
  score: number;
  wordCount: number;
  wordsByLength: Record<number, number>; // { 3: 2, 4: 5, ... }
  timeSeconds: number;
  streakDays: number;
  language: Language;
}

/**
 * Color emoji for each word length - representing word value/difficulty
 */
const LENGTH_EMOJI: Record<number, string> = {
  2: '⬜',  // 2-letter (rare/bonus)
  3: '🟨',  // Yellow - common
  4: '🟩',  // Green - good
  5: '🟦',  // Blue - great
  6: '🟪',  // Purple - excellent
  7: '🔶',  // Orange - amazing
  8: '🔶',  // Orange (same for 8+)
};

/**
 * Get emoji for a word length
 */
function getWordLengthEmoji(length: number): string {
  if (length >= 7) return LENGTH_EMOJI[7];
  return LENGTH_EMOJI[length] || LENGTH_EMOJI[3];
}

/**
 * Translation function type for share messages
 */
type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

/**
 * Generate a shareable result string (Wordle-style)
 * Shows word length distribution as a visual bar chart
 * @param result - The daily challenge result
 * @param siteUrl - Optional site URL override
 * @param t - Optional translation function for localized messages
 */
export function generateShareableResult(
  result: DailyChallengeResult,
  siteUrl?: string,
  t?: TranslationFn
): string {
  // Build word length distribution display
  // Group by length and show as horizontal bars
  const sortedLengths = Object.entries(result.wordsByLength)
    .sort(([a], [b]) => Number(a) - Number(b));

  // Create visual bar for each word length
  const wordBars = sortedLengths
    .map(([len, count]) => {
      const emoji = getWordLengthEmoji(Number(len));
      const bar = emoji.repeat(Math.min(count, 8)); // Cap at 8 for visual clarity
      const overflow = count > 8 ? `+${count - 8}` : '';
      return `${len}⃣ ${bar}${overflow}`;
    })
    .join('\n');

  // Format streak with milestone callouts
  let streakText = '';
  if (result.streakDays >= 30) {
    const text = t
      ? t('daily.share.streakMilestone30', { days: result.streakDays })
      : `${result.streakDays} day streak! 🏆`;
    streakText = `🔥 ${text}\n`;
  } else if (result.streakDays >= 7) {
    const text = t
      ? t('daily.share.streakMilestone7', { days: result.streakDays })
      : `${result.streakDays} day streak! 💪`;
    streakText = `🔥 ${text}\n`;
  } else if (result.streakDays > 1) {
    const text = t
      ? t('daily.share.streak', { days: result.streakDays })
      : `${result.streakDays} day streak!`;
    streakText = `🔥 ${text}\n`;
  }

  // Build URL with current origin and language
  let dailyUrl = 'lexiclash.live/daily';
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const language = result.language;
    dailyUrl = `${origin}/${language}/daily`;
  } else if (siteUrl) {
    dailyUrl = `${siteUrl}/${result.language}/daily`;
  }

  // Score-based brag line
  let bragLine = '';
  if (result.score >= 500) {
    bragLine = t ? t('daily.share.bragDomination') : 'Absolute word domination 👑';
  } else if (result.score >= 300) {
    bragLine = t ? t('daily.share.bragCrushed') : 'The board never stood a chance';
  } else if (result.score >= 150) {
    bragLine = t ? t('daily.share.bragSolid') : 'Solid word hunting today';
  }

  // Get translated strings
  const header = t
    ? t('daily.share.header', { number: result.puzzleNumber })
    : `LexiClash Daily #${result.puzzleNumber}`;
  const stats = t
    ? t('daily.share.stats', { score: result.score, words: result.wordCount })
    : `${result.score} pts | ${result.wordCount} words`;
  const cta = t ? t('daily.share.cta') : 'Think you can beat this? 🎮';

  // Build the shareable text with competitive CTA
  return `🎯 ${header}

${wordBars}

📊 ${stats}${bragLine ? `\n${bragLine}` : ''}
${streakText}
${cta}
${dailyUrl}`;
}

/**
 * Translation function type for share messages
 */
type ShareTranslationFn = (key: string) => string;

/**
 * Generate Word Hunt share text
 * Clean, simple, and engaging - no emoji grid, just the result
 * NOTE: URL is NOT included here - it's added by the share mechanisms to avoid duplication
 *
 * @param result - The word hunt result
 * @param t - Optional translation function. If provided, uses translated messages.
 * @param siteUrl - Optional site URL (deprecated, kept for backward compatibility)
 */
export function generateWordHuntShareableResult(
  result: WordHuntResult,
  t?: ShareTranslationFn,
  siteUrl?: string
): string {
  // Format the main result message
  const resultEmoji = result.solved ? '🎯' : '💪';

  // Get translated result text
  const resultText = result.solved
    ? (t ? t('wordHunt.shareMessage.solvedIn').replace('{attempts}', String(result.attemptsUsed)) : `Solved in ${result.attemptsUsed}/10`)
    : (t ? t('wordHunt.shareMessage.failedAttempt') : `X/10 - so close!`);

  // Get translated header
  const header = t
    ? t('wordHunt.shareMessage.header').replace('{number}', String(result.puzzleNumber))
    : `LexiClash Word Hunt #${result.puzzleNumber}`;

  // Performance message tiers with translation keys
  const performanceTiers = {
    genius: ['genius1', 'genius2', 'genius3', 'genius4'],
    great: ['great1', 'great2', 'great3', 'great4'],
    good: ['good1', 'good2', 'good3', 'good4'],
    close: ['close1', 'close2', 'close3', 'close4'],
    fail: ['fail1', 'fail2', 'fail3', 'fail4'],
  };

  // Fallback English messages for when no translation function is provided
  const fallbackMessages = {
    genius: ['🧠 Too easy!', '🔥 Didn\'t even break a sweat', '⚡ Is this thing on easy mode?', '👑 Bow down, peasants!'],
    great: ['⚡ Crushed it!', '💥 That was satisfying', '🎯 On point today!', '✨ Feeling sharp!'],
    good: ['✨ Got there!', '💫 Brain still works!', '🙌 Not bad!', '👏 That\'ll do!'],
    close: ['😅 That was TOO close!', '💫 Squeaked through!', '🎉 Survival mode: activated!', '😮‍💨 Phew!'],
    fail: ['💪 Next time!', '🔄 Tomorrow\'s mine!', '😤 This word was unfair!', '🎲 Bad board!'],
  };

  let performanceMsg = '';
  if (result.solved) {
    let tier: keyof typeof performanceTiers;
    if (result.attemptsUsed <= 2) tier = 'genius';
    else if (result.attemptsUsed <= 4) tier = 'great';
    else if (result.attemptsUsed <= 6) tier = 'good';
    else tier = 'close';

    const keys = performanceTiers[tier];
    const randomIdx = Math.floor(Math.random() * keys.length);
    performanceMsg = t
      ? t(`wordHunt.shareMessage.${keys[randomIdx]}`)
      : fallbackMessages[tier][randomIdx];
  } else {
    const keys = performanceTiers.fail;
    const randomIdx = Math.floor(Math.random() * keys.length);
    performanceMsg = t
      ? t(`wordHunt.shareMessage.${keys[randomIdx]}`)
      : fallbackMessages.fail[randomIdx];
  }

  // Pick a random competitive CTA for variety
  const ctaKeys = ['cta1', 'cta2', 'cta3', 'cta4', 'cta5'];
  const fallbackCTAs = [
    'Think you can do better?',
    'Your turn.',
    'Beat that.',
    'I dare you to try.',
    'Good luck topping this!',
  ];
  const ctaRandomIdx = Math.floor(Math.random() * ctaKeys.length);
  const cta = t
    ? t(`wordHunt.shareMessage.${ctaKeys[ctaRandomIdx]}`)
    : fallbackCTAs[ctaRandomIdx];

  // Build the shareable text - simple and engaging (URL added separately by share mechanisms)
  return `${resultEmoji} ${header}

${resultText} ${performanceMsg}

${cta} 🎮`;
}

/**
 * Generate share text for different platforms (Word Hunt)
 * Now returns the same clean text for all platforms
 */
export function getWordHuntShareTextForPlatform(
  result: WordHuntResult,
  platform: 'whatsapp' | 'twitter' | 'telegram' | 'copy',
  t?: ShareTranslationFn,
  siteUrl = 'lexiclash.live'
): string {
  // Same clean text for all platforms - no extra messages to avoid duplicate links
  return generateWordHuntShareableResult(result, t, siteUrl);
}

/**
 * Generate share text for different platforms (LEGACY - old daily challenge format)
 */
export function getShareTextForPlatform(
  result: DailyChallengeResult,
  platform: 'whatsapp' | 'twitter' | 'telegram' | 'copy',
  siteUrl = 'lexiclash.live'
): string {
  const baseText = generateShareableResult(result, siteUrl);

  // Platform-specific tweaks
  switch (platform) {
    case 'twitter':
      // Twitter has character limits, keep it concise
      return baseText;
    case 'whatsapp':
    case 'telegram':
      // Add a bit more context for messaging apps
      return `${baseText}\n\nCan you beat my score?`;
    case 'copy':
    default:
      return baseText;
  }
}

// ==========================================
// Local Storage Utilities
// ==========================================

const DAILY_STORAGE_KEY = 'lexiclash_daily';
const WORD_HUNT_STORAGE_KEY = 'lexiclash_word_hunt'; // New key for Word Hunt

// Legacy stored result interface
export interface StoredDailyResult {
  date: string;
  puzzleNumber: number;
  result: DailyChallengeResult;
  completedAt: string;
}

// New Word Hunt stored result interface
export interface StoredWordHuntResult {
  date: string;
  puzzleNumber: number;
  result: WordHuntResult;
  completedAt: string;
}

/**
 * Check if user has already played today's daily challenge
 */
export function hasPlayedToday(language: Language): boolean {
  if (typeof window === 'undefined') return false;

  const today = getDailyChallengeDate();
  const key = `${DAILY_STORAGE_KEY}_${language}_${today}`;
  return localStorage.getItem(key) !== null;
}

/**
 * Get the stored result for today's daily (if exists)
 */
export function getTodaysResult(language: Language): StoredDailyResult | null {
  if (typeof window === 'undefined') return null;

  const today = getDailyChallengeDate();
  const key = `${DAILY_STORAGE_KEY}_${language}_${today}`;
  const stored = localStorage.getItem(key);

  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save the result of today's daily challenge
 */
export function saveDailyResult(result: DailyChallengeResult): void {
  if (typeof window === 'undefined') return;

  const today = getDailyChallengeDate();
  const key = `${DAILY_STORAGE_KEY}_${result.language}_${today}`;

  const storedResult: StoredDailyResult = {
    date: today,
    puzzleNumber: result.puzzleNumber,
    result,
    completedAt: new Date().toISOString(),
  };

  localStorage.setItem(key, JSON.stringify(storedResult));
}

/**
 * Get all stored daily results (for history)
 */
export function getAllDailyResults(language: Language): StoredDailyResult[] {
  if (typeof window === 'undefined') return [];

  const results: StoredDailyResult[] = [];
  const prefix = `${DAILY_STORAGE_KEY}_${language}_`;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          results.push(JSON.parse(stored));
        } catch {
          // Skip invalid entries
        }
      }
    }
  }

  // Sort by date descending
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

// ==========================================
// Word Hunt Local Storage (New)
// ==========================================

/**
 * Check if user has already played today's Word Hunt
 */
export function hasPlayedWordHuntToday(language: Language): boolean {
  if (typeof window === 'undefined') return false;

  const today = getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${language}_${today}`;
  return localStorage.getItem(key) !== null;
}

/**
 * Get the stored Word Hunt result for today (if exists)
 */
export function getTodaysWordHuntResult(language: Language): StoredWordHuntResult | null {
  if (typeof window === 'undefined') return null;

  const today = getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${language}_${today}`;
  const stored = localStorage.getItem(key);

  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save the result of today's Word Hunt
 * Also updates the daily streak for Word Hunt completions
 */
export function saveWordHuntResult(result: WordHuntResult): DailyStreak {
  if (typeof window === 'undefined') {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  }

  const today = getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${result.language}_${today}`;

  const storedResult: StoredWordHuntResult = {
    date: today,
    puzzleNumber: result.puzzleNumber,
    result,
    completedAt: new Date().toISOString(),
  };

  localStorage.setItem(key, JSON.stringify(storedResult));

  // Update the daily streak when completing Word Hunt
  return updateDailyStreak();
}

/**
 * Clear today's Word Hunt result to allow retry
 * Used when player pays coins to retry the daily challenge
 * Returns true if successfully cleared
 */
export function clearWordHuntResultForRetry(language: Language): boolean {
  if (typeof window === 'undefined') return false;

  const today = getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${language}_${today}`;

  try {
    localStorage.removeItem(key);

    // Also clear the coin award flag so they can earn coins again
    const awardKey = `lexiclash_daily_coin_award_${today}_${language}`;
    localStorage.removeItem(awardKey);

    return true;
  } catch {
    return false;
  }
}

/**
 * Get all stored Word Hunt results (for history)
 */
export function getAllWordHuntResults(language: Language): StoredWordHuntResult[] {
  if (typeof window === 'undefined') return [];

  const results: StoredWordHuntResult[] = [];
  const prefix = `${WORD_HUNT_STORAGE_KEY}_${language}_`;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          results.push(JSON.parse(stored));
        } catch {
          // Skip invalid entries
        }
      }
    }
  }

  // Sort by date descending
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

// ==========================================
// Daily Streak Utilities
// ==========================================

const DAILY_STREAK_KEY = 'lexiclash_daily_streak';

export interface DailyStreak {
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
  totalDailiesCompleted: number;
}

/**
 * Get the current daily streak
 */
export function getDailyStreak(): DailyStreak {
  if (typeof window === 'undefined') {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  }

  const stored = localStorage.getItem(DAILY_STREAK_KEY);
  if (!stored) {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  }

  try {
    return JSON.parse(stored);
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  }
}

/**
 * Update the daily streak after completing a daily challenge
 */
export function updateDailyStreak(): DailyStreak {
  if (typeof window === 'undefined') {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  }

  const today = getDailyChallengeDate();
  const yesterday = getYesterdayDate();
  const current = getDailyStreak();

  // Already played today - no update needed
  if (current.lastPlayedDate === today) {
    return current;
  }

  let newStreak: number;

  if (current.lastPlayedDate === yesterday) {
    // Continue the streak
    newStreak = current.currentStreak + 1;
  } else {
    // Streak broken (or first time)
    newStreak = 1;
  }

  const updated: DailyStreak = {
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, current.longestStreak),
    lastPlayedDate: today,
    totalDailiesCompleted: current.totalDailiesCompleted + 1,
  };

  localStorage.setItem(DAILY_STREAK_KEY, JSON.stringify(updated));

  return updated;
}

/**
 * Get yesterday's date string
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Check if this streak update hits a milestone
 */
export function getStreakMilestone(streak: number): number | null {
  const milestones = [7, 14, 30, 50, 100, 365];
  return milestones.find(m => m === streak) || null;
}

/**
 * Check if the player's streak is at risk (hasn't played today but has an active streak)
 * Returns the hours remaining until streak expires, or null if no active streak at risk
 */
export function isStreakAtRisk(): { atRisk: boolean; hoursRemaining: number; currentStreak: number } {
  if (typeof window === 'undefined') {
    return { atRisk: false, hoursRemaining: 0, currentStreak: 0 };
  }

  const streak = getDailyStreak();
  const today = getDailyChallengeDate();

  // No streak or already played today - not at risk
  if (streak.currentStreak < 2 || streak.lastPlayedDate === today) {
    return { atRisk: false, hoursRemaining: 0, currentStreak: streak.currentStreak };
  }

  // Check if they played yesterday (streak is still valid but at risk today)
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (streak.lastPlayedDate === yesterdayStr) {
    // Calculate hours until midnight UTC (when streak expires)
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));
    const hoursRemaining = Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / (1000 * 60 * 60)));

    return { atRisk: true, hoursRemaining, currentStreak: streak.currentStreak };
  }

  // Streak already broken (missed yesterday)
  return { atRisk: false, hoursRemaining: 0, currentStreak: 0 };
}

/**
 * Get a celebratory message for streak milestones
 */
export function getStreakMilestoneMessage(streak: number): { emoji: string; title: string; subtitle: string } | null {
  const milestoneMessages: Record<number, { emoji: string; title: string; subtitle: string }> = {
    7: { emoji: '🔥', title: '1 WEEK STREAK!', subtitle: 'A full week of word hunting!' },
    14: { emoji: '🌟', title: '2 WEEKS STRONG!', subtitle: 'Two weeks of dedication!' },
    30: { emoji: '👑', title: 'MONTHLY MASTER!', subtitle: '30 days of excellence!' },
    50: { emoji: '💎', title: 'LEGENDARY STREAK!', subtitle: '50 days unstoppable!' },
    100: { emoji: '🏆', title: 'CENTURY CHAMPION!', subtitle: '100 days - you are a legend!' },
    365: { emoji: '🌍', title: 'YEAR-LONG WARRIOR!', subtitle: '365 days of pure dedication!' },
  };
  return milestoneMessages[streak] || null;
}

// ==========================================
// Challenge Link Utilities
// ==========================================

/**
 * Generate a simple challenge URL for sharing
 *
 * PRIVACY NOTE: We intentionally keep the URL simple (no encoded player data)
 * to avoid exposing any game-specific information that could:
 * 1. Spoil the puzzle for others
 * 2. Leak player statistics unnecessarily
 *
 * The URL just links to the daily challenge page for the correct language.
 */
export function generateChallengeUrl(result: WordHuntResult): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://lexiclash.live';
  return `${baseUrl}/${result.language}/daily`;
}

/**
 * Parse a legacy challenge URL parameter (for backwards compatibility)
 * New URLs don't include challenge data, but we keep this for old links.
 */
export function parseChallengeParam(encoded: string): {
  puzzleNumber: number;
  attemptsUsed: number;
  solved: boolean;
  efficiencyScore: number;
  wordsDiscovered: number;
} | null {
  try {
    const decoded = JSON.parse(atob(encoded));
    return {
      puzzleNumber: decoded.p,
      attemptsUsed: decoded.a,
      solved: decoded.s === 1,
      efficiencyScore: decoded.e || 0,
      wordsDiscovered: decoded.w || 0,
    };
  } catch {
    return null;
  }
}

// ==========================================
// Word Rarity Utilities
// ==========================================

/**
 * Common word frequency tiers (lower = more common)
 * Words found less frequently are considered rarer
 */
const WORD_FREQUENCY_TIERS: Record<Language, Record<string, number>> = {
  en: {
    // Tier 1: Very common (frequency 1)
    'THE': 1, 'AND': 1, 'FOR': 1, 'ARE': 1, 'BUT': 1, 'NOT': 1, 'YOU': 1, 'ALL': 1,
    'CAN': 1, 'HER': 1, 'WAS': 1, 'ONE': 1, 'OUR': 1, 'OUT': 1, 'DAY': 1, 'HAD': 1,
    // Tier 2: Common (frequency 2)
    'CAT': 2, 'DOG': 2, 'RUN': 2, 'SUN': 2, 'FUN': 2, 'BIG': 2, 'TOP': 2, 'MAN': 2,
    'RED': 2, 'BOX': 2, 'CUP': 2, 'PEN': 2, 'CAR': 2, 'BUS': 2, 'MAP': 2, 'KEY': 2,
    // Tier 3: Less common (frequency 3)
    'MOON': 3, 'STAR': 3, 'BIRD': 3, 'FISH': 3, 'TREE': 3, 'BOOK': 3, 'DOOR': 3, 'HAND': 3,
    'FOOT': 3, 'HEAD': 3, 'ROCK': 3, 'SAND': 3, 'BOAT': 3, 'GAME': 3, 'WOLF': 3, 'BEAR': 3,
    // Tier 4: Uncommon (frequency 4) - these are considered rare
    'HAWK': 4, 'FROG': 4, 'DEER': 4, 'DUCK': 4, 'JADE': 4, 'RUBY': 4, 'SILK': 4, 'WOOL': 4,
    'CAVE': 4, 'PEAK': 4, 'POND': 4, 'REEF': 4, 'MYTH': 4, 'BARD': 4, 'MAGE': 4, 'SAGE': 4,
    // Tier 5: Rare (frequency 5) - these are very rare
    'LYNX': 5, 'FLUX': 5, 'APEX': 5, 'VOID': 5, 'ECHO': 5, 'QUIZ': 5, 'MAZE': 5, 'GRID': 5,
    'SWAN': 5, 'CROW': 5, 'MOTH': 5, 'WASP': 5, 'CRAB': 5, 'SEAL': 5, 'TOAD': 5, 'BREW': 5,
  },
  he: {},
  sv: {},
  ja: {},
  es: {},
  fr: {},
  de: {},
};

/**
 * Get the rarity score of a word (1-5, higher = rarer)
 * Returns 3 (average) for unknown words
 */
export function getWordRarity(word: string, language: Language): number {
  const wordUpper = word.toUpperCase();
  const tiers = WORD_FREQUENCY_TIERS[language] || {};
  return tiers[wordUpper] || 3; // Default to average rarity
}

/**
 * Get rarity label and emoji based on rarity score
 */
export function getRarityLabel(rarity: number): { label: string; emoji: string; color: string } {
  if (rarity >= 5) return { label: 'LEGENDARY', emoji: '💎', color: 'text-purple-500' };
  if (rarity >= 4) return { label: 'RARE', emoji: '🌟', color: 'text-yellow-500' };
  if (rarity >= 3) return { label: 'UNCOMMON', emoji: '✨', color: 'text-blue-500' };
  return { label: 'COMMON', emoji: '📖', color: 'text-gray-500' };
}

/**
 * Find the rarest word from a list of discovered words
 */
export function findRarestWord(
  words: Array<{ word: string }>,
  language: Language
): { word: string; rarity: number; label: string; emoji: string } | null {
  if (!words || words.length === 0) return null;

  let rarestWord = words[0].word;
  let highestRarity = getWordRarity(words[0].word, language);

  for (const { word } of words) {
    const rarity = getWordRarity(word, language);
    if (rarity > highestRarity) {
      highestRarity = rarity;
      rarestWord = word;
    }
  }

  const { label, emoji } = getRarityLabel(highestRarity);
  return { word: rarestWord, rarity: highestRarity, label, emoji };
}

// ==========================================
// Guest Player Info (for daily leaderboard display)
// ==========================================

const GUEST_DAILY_PLAYER_KEY = 'lexiclash_guest_daily_player';

export interface GuestDailyPlayer {
  displayName: string;
  avatarEmoji: string;
  avatarColor: string;
}

/**
 * Get or generate guest daily player info
 * This is stored in localStorage so the same guest always appears with the same name/avatar
 */
export async function getGuestDailyPlayer(): Promise<GuestDailyPlayer> {
  if (typeof window === 'undefined') {
    return { displayName: 'Guest', avatarEmoji: '🎯', avatarColor: '#6366f1' };
  }

  // Check if we already have stored guest player info
  const stored = localStorage.getItem(GUEST_DAILY_PLAYER_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Continue to generate new
    }
  }

  // Generate new guest player info
  try {
    const response = await fetch('/api/random-name?language=en', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      const guestPlayer: GuestDailyPlayer = {
        displayName: data.name,
        avatarEmoji: data.avatar.emoji,
        avatarColor: data.avatar.color,
      };
      localStorage.setItem(GUEST_DAILY_PLAYER_KEY, JSON.stringify(guestPlayer));
      return guestPlayer;
    }
  } catch {
    // Fall through to default
  }

  // Fallback
  const fallback: GuestDailyPlayer = {
    displayName: 'Player ' + Math.floor(Math.random() * 1000),
    avatarEmoji: '🎯',
    avatarColor: '#6366f1',
  };
  localStorage.setItem(GUEST_DAILY_PLAYER_KEY, JSON.stringify(fallback));
  return fallback;
}

/**
 * Update guest daily player info (for name editing)
 * Allows guests to customize their display name
 */
export function updateGuestDailyPlayer(updates: Partial<GuestDailyPlayer>): GuestDailyPlayer | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(GUEST_DAILY_PLAYER_KEY);
  let current: GuestDailyPlayer = {
    displayName: 'Guest',
    avatarEmoji: '🎯',
    avatarColor: '#6366f1',
  };

  if (stored) {
    try {
      current = JSON.parse(stored);
    } catch {
      // Use default
    }
  }

  const updated: GuestDailyPlayer = {
    ...current,
    ...updates,
  };

  localStorage.setItem(GUEST_DAILY_PLAYER_KEY, JSON.stringify(updated));
  return updated;
}

// ==========================================
// Browser Fingerprint (for guest tracking)
// ==========================================

const GUEST_FINGERPRINT_KEY = 'lexiclash_guest_fingerprint';

/**
 * Generate or retrieve a stable guest fingerprint for tracking
 * Uses browser fingerprinting with UUID fallback to ensure we always have a valid ID
 * This is NOT for security - just to identify repeat guest plays
 */
export async function getGuestFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return '';

  try {
    // First, check if we already have a stored fingerprint (for consistency across sessions)
    const storedFingerprint = localStorage.getItem(GUEST_FINGERPRINT_KEY);
    if (storedFingerprint && storedFingerprint.length > 0) {
      return storedFingerprint;
    }

    // Generate new fingerprint from browser components
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width.toString(),
      screen.height.toString(),
      screen.colorDepth.toString(),
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || '',
      // Canvas fingerprint (simple version)
      await getCanvasFingerprint(),
    ];

    const fingerprintData = components.filter(Boolean).join('|');
    let fingerprint = hashString(fingerprintData).toString(36);

    // Ensure fingerprint is always valid (fallback to UUID if empty/falsy)
    if (!fingerprint || fingerprint === '0') {
      fingerprint = generateGuestUUID();
    }

    // Store for consistency
    localStorage.setItem(GUEST_FINGERPRINT_KEY, fingerprint);
    console.log('[GuestFingerprint] Generated new fingerprint:', fingerprint.substring(0, 8) + '...');

    return fingerprint;
  } catch (error) {
    console.warn('[GuestFingerprint] Error generating fingerprint, using fallback UUID:', error);
    // Fallback to UUID if anything fails
    const fallbackId = generateGuestUUID();
    try {
      localStorage.setItem(GUEST_FINGERPRINT_KEY, fallbackId);
    } catch {
      // localStorage might be disabled - that's ok, just return the UUID
    }
    return fallbackId;
  }
}

/**
 * Generate a simple UUID v4 for guest identification fallback
 */
function generateGuestUUID(): string {
  // Use crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  }
  // Fallback for older browsers
  return 'xxxxxxxxxxxxxxxx'.replace(/x/g, () => {
    return Math.floor(Math.random() * 16).toString(16);
  });
}

/**
 * Simple canvas fingerprint
 */
async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('LexiClash Daily', 2, 2);

    return canvas.toDataURL().slice(-50);
  } catch {
    return '';
  }
}

// ==========================================
// Word Hunt Target Word Selection
// ==========================================

/**
 * Bonus words to embed in the grid for survival mode playability
 * These are 4+ letter words that can be discovered for life/tokens
 * Curated for each language to ensure validity
 */
const BONUS_WORD_LISTS: Record<Language, string[]> = {
  en: [
    // Common 4-letter English words for discovery
    'TREE', 'BIRD', 'FISH', 'STAR', 'MOON', 'RAIN', 'WIND', 'SNOW',
    'BOOK', 'DOOR', 'HAND', 'FOOT', 'HEAD', 'FACE', 'ROCK', 'SAND',
    'BOAT', 'GAME', 'WOLF', 'BEAR', 'FROG', 'DEER', 'DUCK', 'HAWK',
    'CAKE', 'MILK', 'SOUP', 'RICE', 'BEAN', 'CORN', 'PLUM', 'PEAR',
    'GOLD', 'IRON', 'JADE', 'RUBY', 'SILK', 'WOOL', 'CLAY', 'COAL',
    'HILL', 'LAKE', 'WAVE', 'CAVE', 'PATH', 'PEAK', 'POND', 'REEF',
  ],
  he: [
    // Common 4+ letter Hebrew words
    'בית', 'מים', 'עולם', 'אדם', 'דבר', 'עין', 'ראש', 'ילד',
    'ספר', 'חבר', 'דלת', 'חלון', 'שמש', 'ירח', 'כוכב', 'פרח',
    'סוס', 'כלב', 'ציפור', 'דגים', 'ארנב', 'נמר', 'זאב', 'דוב',
  ],
  sv: [
    // Common 4+ letter Swedish words
    'HUND', 'KATT', 'FÅGEL', 'TRÄD', 'STEN', 'BERG', 'SJÖN', 'REGN',
    'SNÖN', 'VIND', 'SOLEN', 'MÅNE', 'NATT', 'LJUS', 'MÖRK', 'VÄGG',
    'GOLV', 'DÖRR', 'BORD', 'STOL', 'SÄNG', 'LAMP', 'GLAS', 'SKÅL',
  ],
  ja: [
    // Common 2-character Japanese words/kanji compounds (Japanese uses different char lengths)
    '日本', '東京', '学校', '先生', '学生', '友達', '家族', '会社',
    '仕事', '時間', '天気', '音楽', '映画', '料理', '旅行', '電車',
  ],
  es: [
    // Common 4+ letter Spanish words
    'CASA', 'AGUA', 'VIDA', 'AMOR', 'MESA', 'LIBRO', 'PERRO', 'GATO',
    'LUNA', 'CIELO', 'NOCHE', 'TIERRA', 'PLAYA', 'CAMPO', 'MONTE', 'LAGO',
    'FLOR', 'ROSA', 'ARBOL', 'HOJA', 'VINO', 'CAFE', 'LECHE', 'CARNE',
  ],
  fr: [
    // Common 4+ letter French words
    'MAISON', 'LIVRE', 'CHIEN', 'CHAT', 'LUNE', 'SOLEIL', 'NUIT', 'JOUR',
    'FLEUR', 'ARBRE', 'TERRE', 'CIEL', 'PLAGE', 'VILLE', 'PAYS', 'MONDE',
    'PAIN', 'LAIT', 'CAFE', 'VINO', 'ROSE', 'BLEU', 'NOIR', 'BLANC',
  ],
  de: [
    // Common 4+ letter German words
    'HAUS', 'BAUM', 'BUCH', 'HUND', 'KATZE', 'SONNE', 'MOND', 'STERN',
    'BERG', 'WALD', 'FLUSS', 'MEER', 'STADT', 'LAND', 'WELT', 'ZEIT',
    'BROT', 'WEIN', 'MILCH', 'ROSE', 'BLAU', 'GRÜN', 'ROTE', 'GOLD',
  ],
};

/**
 * Curated lists of quality target words for Word Hunt mode
 * Organized by language and difficulty
 */
const TARGET_WORD_LISTS: Record<Language, string[]> = {
  en: [
    // 4-letter words - varied and interesting (main target pool)
    'BIRD', 'FISH', 'MOON', 'STAR', 'RAIN', 'WIND', 'SNOW', 'TREE',
    'BOOK', 'DOOR', 'HAND', 'FOOT', 'HEAD', 'FACE', 'ROCK', 'SAND',
    'BOAT', 'GAME', 'WOLF', 'BEAR', 'FROG', 'DEER', 'DUCK', 'HAWK',
    'CAKE', 'MILK', 'SOUP', 'RICE', 'BEAN', 'CORN', 'PLUM', 'PEAR',
    'GOLD', 'IRON', 'JADE', 'RUBY', 'SILK', 'WOOL', 'CLAY', 'COAL',
    'HILL', 'LAKE', 'WAVE', 'CAVE', 'PATH', 'PEAK', 'POND', 'REEF',
    'SONG', 'DRUM', 'HORN', 'BELL', 'POEM', 'TALE', 'MYTH', 'PLAY',
    'KING', 'DUKE', 'HERO', 'SAGE', 'MONK', 'CHEF', 'MAGE', 'BARD',
    'SHIP', 'CART', 'BIKE', 'SLED', 'RAFT', 'KITE', 'DOME', 'ARCH',
    'ROSE', 'FERN', 'VINE', 'LEAF', 'STEM', 'ROOT', 'PALM', 'PINE',
    'DAWN', 'DUSK', 'NOON', 'GLOW', 'BEAM', 'BLUR', 'MIST', 'HAZE',
    'HOPE', 'WISH', 'CALM', 'ZEAL', 'GRIT', 'SOUL', 'MIND', 'WILL',
    'NEST', 'HIVE', 'LAIR', 'FORT', 'TENT', 'BARN', 'MILL', 'PIER',
    'WAND', 'COIN', 'MASK', 'RING', 'CAPE', 'HELM', 'CLAW', 'FANG',
    'FIRE', 'TIDE', 'GUST', 'BOLT', 'SURF', 'FOAM', 'SAND', 'DUST',
    // Additional unique 4-letter words
    'MAZE', 'GRID', 'CODE', 'QUIZ', 'ECHO', 'VOID', 'FLUX', 'APEX',
    'LYNX', 'SWAN', 'CROW', 'MOTH', 'WASP', 'CRAB', 'SEAL', 'TOAD',
    'BREW', 'STEW', 'BAKE', 'ROAM', 'SOAR', 'DIVE', 'LEAP', 'SPIN',
  ],
  he: [
    // Hebrew 4-letter words (for daily challenge - replaced obvious ones)
    'בית', 'מים', 'עולם', 'אדם', 'דבר',
    'עין', 'ראש', 'ילד', 'ספר', 'חבר',
    'דלת', 'חלון', 'שמש', 'ירח', 'כוכב',
    'פרח', 'סוס', 'כלב', 'ציפור', 'דגים',
    'ארנב', 'נמר', 'זאב', 'דוב', 'אריה',
    'עוגה', 'לחם', 'חלב', 'מים', 'מרק',
    'זהב', 'כסף', 'נחושת', 'ברזל', 'עץ',
    'הר', 'נהר', 'ים', 'אגם', 'גבעה',
    'שיר', 'ספר', 'מכתב', 'סיפור', 'חלום',
    'מלך', 'גיבור', 'חכם', 'אמן', 'רופא',
    'אש', 'מים', 'רוח', 'אדמה', 'שמים',
    'אור', 'צל', 'לילה', 'יום', 'בוקר',
  ],
  sv: [
    // Swedish 3-4 letter words
    'HUS', 'DAG', 'ÖGA', 'ÖRA', 'ARM', 'BEN', 'BOK', 'BIL', 'SOL', 'VÄG',
    // Swedish 5-letter words
    'VATTEN', 'VÄRLD', 'PLATS', 'LJUD', 'KRAFT',
    'BÄSTA', 'FÖRSTA', 'SISTA', 'RUNDA', 'KLAR',
    'STEN', 'HUND', 'KATT', 'FÅGEL', 'BLOM',
    // Swedish 6-letter words
    'SLOTT', 'TRÄDGÅRD', 'MARKNAD', 'FÖNSTER',
    'NATUR', 'HIMMEL', 'VINTER', 'SOMMAR',
    // Swedish 7-letter words
    'MORGON', 'KVÄLL', 'PERFEKT', 'FANTASTISK'
  ],
  ja: [
    // Japanese 2-3 character words
    '日本', '東京', '学校', '先生', '学生',
    '友達', '家族', '会社', '仕事', '時間',
    '天気', '音楽', '映画', '料理', '旅行',
    '電車', '新聞', '本', '犬', '猫',
    '花', '木', '山', '川', '海',
    // Japanese 3-4 character compound words
    '日本語', '図書館', '大学', '病院', '空港',
    '公園', '駅', '銀行', '郵便局', '美術館'
  ],
  es: [
    // Spanish 3-4 letter words
    'SOL', 'MAR', 'PAN', 'SAL', 'LUZ', 'VOZ', 'PAZ', 'REY', 'LEY', 'RÍO',
    'CASA', 'AGUA', 'VIDA', 'AMOR', 'MESA', 'LIBRO', 'PERRO', 'GATO',
    // Spanish 5-letter words
    'MUNDO', 'LUGAR', 'TIEMPO', 'GENTE', 'NOCHE',
    'PLANTA', 'TIERRA', 'CIELO', 'FIESTA', 'AMIGO',
    // Spanish 6-letter words
    'CASTILLO', 'JARDÍN', 'MERCADO', 'PUENTE',
    'VENTANA', 'SIMPLE', 'MODERNO', 'DORADO',
    // Spanish 7-letter words
    'COCINA', 'MAÑANA', 'PERFECTO', 'NATURAL', 'FANTÁSTICO'
  ],
  fr: [
    // French 3-4 letter words
    'CHAT', 'PAIN', 'LUNE', 'ÉTOILE', 'ARBRE', 'FLEUR', 'JOUR', 'NUIT',
    // French 5-letter words
    'MAISON', 'MONDE', 'TEMPS', 'VILLE', 'GRAND',
    'PETIT', 'BELLE', 'FORCE', 'PLACE', 'CHOSE',
    'LIVRE', 'CHIEN', 'AMOUR', 'JOLIE', 'RÊVE',
    // French 6-letter words
    'JARDIN', 'SOLEIL', 'NATURE', 'MONTAGNE', 'RIVIÈRE'
  ],
  de: [
    // German 3-4 letter words
    'HAUS', 'BAUM', 'BUCH', 'HUND', 'KATZE', 'SONNE', 'MOND', 'STERN',
    // German 5-letter words
    'WELT', 'ZEIT', 'STADT', 'GROSS', 'KLEIN',
    'KRAFT', 'PLATZ', 'SACHE', 'WASSER', 'LIEBE',
    // German 6-letter words
    'GARTEN', 'FENSTER', 'NATUR', 'HIMMEL', 'SOMMER'
  ]
};

/**
 * Same-length helper words organized by word length for each language.
 * These words are prioritized for embedding to help players practice
 * same-length guesses and get letter feedback (green/yellow clues).
 *
 * Minimum 5 same-length words should be embedded alongside the target word.
 */
const SAME_LENGTH_HELPER_WORDS: Record<Language, Record<number, string[]>> = {
  en: {
    3: ['CAT', 'DOG', 'SUN', 'RUN', 'FUN', 'BIG', 'RED', 'SKY', 'FLY', 'CRY', 'DRY', 'TRY', 'BAT', 'RAT', 'HAT', 'MAT', 'SAT', 'FAT', 'PEN', 'TEN', 'HEN', 'MEN', 'DEN', 'BED', 'LED', 'WED', 'FED'],
    4: ['TREE', 'BIRD', 'FISH', 'STAR', 'MOON', 'RAIN', 'WIND', 'SNOW', 'BOOK', 'DOOR', 'HAND', 'FOOT', 'HEAD', 'FACE', 'ROCK', 'SAND', 'BOAT', 'GAME', 'WOLF', 'BEAR', 'FROG', 'DEER', 'DUCK', 'HAWK', 'CAKE', 'MILK', 'SOUP', 'RICE', 'BEAN', 'CORN', 'PLUM', 'PEAR', 'GOLD', 'IRON', 'JADE', 'RUBY', 'SILK', 'WOOL', 'CLAY', 'COAL', 'HILL', 'LAKE', 'WAVE', 'CAVE', 'PATH', 'PEAK', 'POND', 'REEF', 'KING', 'DUKE', 'HERO', 'SAGE', 'MONK', 'CHEF', 'MAGE', 'BARD', 'SHIP', 'CART', 'BIKE', 'SLED', 'RAFT', 'KITE', 'DOME', 'ARCH'],
    5: ['WORLD', 'HOUSE', 'WATER', 'LIGHT', 'NIGHT', 'DREAM', 'STORM', 'FLAME', 'STONE', 'CLOUD', 'RIVER', 'OCEAN', 'BEACH', 'HORSE', 'TIGER', 'EAGLE', 'SNAKE', 'WHALE', 'SHARK', 'CRANE', 'BREAD', 'GRAPE', 'LEMON', 'PEACH', 'MAPLE', 'CROWN', 'SWORD', 'SHIELD', 'TOWER', 'BRIDGE', 'PLANT', 'BLOOM', 'FRUIT', 'GRASS', 'TRAIL', 'GROVE', 'CLIFF', 'SHORE', 'DELTA', 'FROST', 'SPARK', 'BLAZE', 'GLEAM', 'SHADE', 'QUIET', 'PEACE', 'BRAVE', 'NOBLE', 'SWIFT', 'GRAND'],
    6: ['CASTLE', 'GARDEN', 'FOREST', 'ISLAND', 'DESERT', 'JUNGLE', 'VALLEY', 'MEADOW', 'STREAM', 'SUNSET', 'WINTER', 'SUMMER', 'SPRING', 'AUTUMN', 'TEMPLE', 'PALACE', 'CHURCH', 'BRIDGE', 'HARBOR', 'MARKET', 'SCHOOL', 'STABLE', 'TAVERN', 'PRISON', 'DRAGON', 'KNIGHT', 'WIZARD', 'PIRATE', 'HUNTER', 'ARCHER', 'ORANGE', 'BANANA', 'CHERRY', 'MANGO', 'SILVER', 'BRONZE', 'COPPER', 'MARBLE', 'VELVET', 'COTTON', 'CANDLE', 'MIRROR', 'BASKET', 'HAMMER', 'ANCHOR', 'RIBBON', 'FEATHER', 'BUTTON'],
    7: ['RAINBOW', 'THUNDER', 'VOLCANO', 'GLACIER', 'TORNADO', 'MONSOON', 'SUNRISE', 'MORNING', 'EVENING', 'WEATHER', 'CRYSTAL', 'DIAMOND', 'EMERALD', 'SAPPHIRE', 'KINGDOM', 'VILLAGE', 'COTTAGE', 'MANSION', 'LIBRARY', 'MUSEUM', 'CAPTAIN', 'SOLDIER', 'WARRIOR', 'GENERAL', 'EMPEROR', 'SCHOLAR', 'TEACHER', 'PAINTER', 'SCULPTOR', 'FOUNDER', 'MYSTERY', 'JOURNEY', 'DESTINY', 'VICTORY', 'FREEDOM', 'COURAGE', 'HARMONY', 'BALANCE', 'WONDER', 'MIRACLE'],
    8: ['MOUNTAIN', 'WATERFALL', 'TREASURE', 'ADVENTURE', 'CHAMPION', 'GUARDIAN', 'EXPLORER', 'INVENTOR', 'COMPOSER', 'ARCHITECT', 'STRENGTH', 'PATIENCE', 'KINDNESS', 'LAUGHTER', 'SUNSHINE', 'MOONLIGHT', 'STARLIGHT', 'TWILIGHT', 'MIDNIGHT', 'DAYBREAK'],
  },
  he: {
    2: ['יד', 'עץ', 'אב', 'אם', 'בן', 'בת', 'גן', 'דג', 'זב', 'חג', 'טל', 'כד', 'לב', 'מט', 'נר', 'סף', 'עד', 'פה', 'צל', 'קר'],
    3: ['בית', 'מים', 'אדם', 'דבר', 'עין', 'ראש', 'ילד', 'ספר', 'חבר', 'דלת', 'שמש', 'ירח', 'פרח', 'סוס', 'כלב', 'עוף', 'דגי', 'אות', 'קול', 'אור'],
    4: ['עולם', 'חלון', 'כוכב', 'ציפור', 'דגים', 'ארנב', 'נמר', 'זאב', 'דוב', 'אריה', 'עוגה', 'לחם', 'חלב', 'מרק', 'זהב', 'כסף', 'ברזל', 'נהר', 'אגם', 'גבעה', 'שיר', 'מכתב', 'סיפור', 'חלום', 'מלך', 'גיבור', 'חכם', 'אמן', 'רופא', 'רוח', 'אדמה', 'שמים', 'לילה', 'יום', 'בוקר'],
    5: ['נחושת', 'שולחן', 'מחשב', 'טלפון', 'חיוך', 'משפחה', 'חברים', 'אהבה', 'שמחה', 'בריאות'],
  },
  sv: {
    3: ['HUS', 'DAG', 'ÖGA', 'ÖRA', 'ARM', 'BEN', 'BOK', 'BIL', 'SOL', 'VÄG', 'BRO', 'SJÖ', 'SKY', 'SNÖ', 'TRÄ', 'ÖL', 'ÄGG', 'ÄRT', 'ÖST'],
    4: ['HUND', 'KATT', 'STEN', 'BERG', 'REGN', 'SNÖN', 'VIND', 'NATT', 'LJUS', 'MÖRK', 'VÄGG', 'GOLV', 'DÖRR', 'BORD', 'STOL', 'SÄNG', 'LAMP', 'GLAS', 'SKÅL', 'BOLL', 'BÅGE', 'BÅLE', 'FISK', 'MASK', 'BLAD'],
    5: ['FÅGEL', 'TRÄD', 'SOLEN', 'MÅNE', 'VATTEN', 'VÄRLD', 'PLATS', 'LJUD', 'KRAFT', 'BÄSTA', 'FÖRSTA', 'SISTA', 'RUNDA', 'KLAR', 'BLOM', 'HIMMEL', 'VINTER', 'SOMMAR'],
    6: ['SLOTT', 'NATUR', 'MORGON', 'KVÄLL', 'FÖNSTER', 'MARKNAD', 'TRÄDGÅRD'],
  },
  ja: {
    2: ['日本', '東京', '学校', '先生', '学生', '友達', '家族', '会社', '仕事', '時間', '天気', '音楽', '映画', '料理', '旅行', '電車', '新聞', '本', '犬', '猫', '花', '木', '山', '川', '海', '空', '雨', '雪', '風', '雲'],
    3: ['日本語', '図書館', '大学', '病院', '空港', '公園', '駅', '銀行', '郵便局', '美術館', '電話', '新幹線', '桜', '富士山'],
  },
  es: {
    3: ['SOL', 'MAR', 'PAN', 'SAL', 'LUZ', 'VOZ', 'PAZ', 'REY', 'LEY', 'RÍO', 'DÍA', 'MES', 'AÑO', 'VER', 'DAR', 'SER', 'OJO', 'PIE', 'MÁS', 'DOS'],
    4: ['CASA', 'AGUA', 'VIDA', 'AMOR', 'MESA', 'LUNA', 'FLOR', 'ROSA', 'VINO', 'CAFE', 'LAGO', 'PATO', 'GATO', 'PERRO', 'PERA', 'MANO', 'PELO', 'CARA', 'BOCA', 'OJOS'],
    5: ['LIBRO', 'MUNDO', 'LUGAR', 'GENTE', 'NOCHE', 'PLAYA', 'CAMPO', 'MONTE', 'LECHE', 'CARNE', 'AMIGO', 'CIELO', 'TIERRA', 'ARBOL', 'HOJA'],
    6: ['FIESTA', 'JARDÍN', 'PUENTE', 'SIMPLE', 'COCINA', 'MAÑANA', 'TIEMPO', 'PLANTA', 'MERCADO', 'VENTANA', 'MODERNO', 'DORADO', 'CASTILLO'],
    7: ['NATURAL', 'PERFECTO', 'HERMOSO', 'PEQUEÑO', 'GRANDE', 'FANTÁSTICO'],
  },
  fr: {
    4: ['CHAT', 'PAIN', 'LUNE', 'JOUR', 'NUIT', 'ROSE', 'BLEU', 'NOIR', 'VENT', 'PLUIE', 'NEIGE', 'FROID', 'CHAUD', 'BEAU', 'DOUX'],
    5: ['ARBRE', 'FLEUR', 'MONDE', 'TEMPS', 'VILLE', 'GRAND', 'PETIT', 'BELLE', 'FORCE', 'PLACE', 'CHOSE', 'LIVRE', 'CHIEN', 'AMOUR', 'JOLIE', 'RÊVE', 'ÉTOILE'],
    6: ['MAISON', 'JARDIN', 'SOLEIL', 'NATURE', 'RIVIÈRE', 'FORÊT', 'CHÂTEAU', 'MONTAGNE'],
  },
  de: {
    4: ['HAUS', 'BAUM', 'BUCH', 'HUND', 'MOND', 'BERG', 'WALD', 'MEER', 'LAND', 'WELT', 'ZEIT', 'BROT', 'WEIN', 'ROSE', 'BLAU', 'GOLD', 'ROTE'],
    5: ['KATZE', 'SONNE', 'STERN', 'STADT', 'GROSS', 'KLEIN', 'KRAFT', 'PLATZ', 'SACHE', 'LIEBE', 'WASSER', 'FLUSS'],
    6: ['GARTEN', 'FENSTER', 'NATUR', 'HIMMEL', 'SOMMER', 'WINTER', 'HERBST', 'SCHULE', 'KIRCHE', 'BRÜCKE'],
  },
};

/**
 * Calculate letter overlap score between a word and target word
 * Counts how many letters from the word exist in the target (yellow-style matching)
 * Higher score = more letters in common
 */
function calculateLetterOverlapScore(word: string, targetWord: string): number {
  const wordUpper = word.toUpperCase();
  const targetUpper = targetWord.toUpperCase();

  // Count letters in target word
  const targetLetterCounts = new Map<string, number>();
  for (const letter of targetUpper) {
    targetLetterCounts.set(letter, (targetLetterCounts.get(letter) || 0) + 1);
  }

  // Count matching letters (yellow-style: same letter, any position)
  let score = 0;
  const usedCounts = new Map<string, number>();

  for (const letter of wordUpper) {
    const available = targetLetterCounts.get(letter) || 0;
    const used = usedCounts.get(letter) || 0;
    if (used < available) {
      score++;
      usedCounts.set(letter, used + 1);
    }
  }

  return score;
}

/**
 * Get same-length helper words for a given target word
 * Combines words from SAME_LENGTH_HELPER_WORDS and TARGET_WORD_LISTS
 * Excludes the target word itself
 *
 * ENHANCED: Prioritizes words with higher letter overlap with target word
 * Words sharing more letters with target are sorted first, then shuffled within groups
 */
function getSameLengthWords(targetWord: string, language: Language, random: () => number): string[] {
  const targetLength = targetWord.length;
  const targetUpper = targetWord.toUpperCase();

  // Collect same-length words from helper lists
  const helperWords = SAME_LENGTH_HELPER_WORDS[language]?.[targetLength] || [];

  // Also collect same-length words from TARGET_WORD_LISTS
  const targetWords = (TARGET_WORD_LISTS[language] || [])
    .filter(w => w.length === targetLength);

  // Combine both sources and remove duplicates and the target word itself
  const allWords = [...new Set([...helperWords, ...targetWords])]
    .map(w => w.toUpperCase())
    .filter(w => w !== targetUpper);

  // Score each word by letter overlap with target
  const scoredWords = allWords.map(word => ({
    word,
    score: calculateLetterOverlapScore(word, targetUpper)
  }));

  // Sort by score descending (more shared letters = higher priority)
  scoredWords.sort((a, b) => b.score - a.score);

  // Group words by score tier and shuffle within each tier for variety
  // This ensures high-overlap words come first but with some randomness
  const tierSize = 5; // Group every 5 words into a tier
  const result: string[] = [];

  for (let i = 0; i < scoredWords.length; i += tierSize) {
    const tier = scoredWords.slice(i, i + tierSize).map(s => s.word);
    // Shuffle within tier using seeded random
    for (let j = tier.length - 1; j > 0; j--) {
      const k = Math.floor(random() * (j + 1));
      [tier[j], tier[k]] = [tier[k], tier[j]];
    }
    result.push(...tier);
  }

  return result;
}

// Minimum number of same-length words to embed (excluding target word)
const MIN_SAME_LENGTH_WORDS = 5;

/**
 * Interface for daily target word result
 */
export interface DailyTargetWord {
  word: string;
  puzzleDate: string;
  language: Language;
  puzzleNumber: number;
}

/**
 * Deterministically select a target word for the daily Word Hunt challenge
 *
 * Algorithm:
 * 1. Use same seeded PRNG as grid generation
 * 2. Shuffle curated word list using seeded random
 * 3. Try each word in order to see if it exists on the board WITH A VALID PATH
 * 4. Return the first word that can be formed on the board through adjacent cells
 * 5. If none work (should never happen), regenerate grid with better letter distribution
 *
 * CRITICAL: Must be 100% deterministic - same date+language = same target word
 *
 * @param grid - The daily challenge grid
 * @param dateString - Date string (YYYY-MM-DD)
 * @param language - Game language
 * @returns Target word for this puzzle
 */
export function selectDailyTargetWord(
  grid: LetterGrid,
  dateString: string,
  language: Language
): DailyTargetWord {
  // Use same seed as grid generation for consistency
  const seedString = `${SEED_SALT}-${dateString}-${language}-target`;
  const seed = hashString(seedString);
  const random = mulberry32(seed);

  // Get word list for this language - includes words of varying lengths (3-8 letters)
  const wordList = TARGET_WORD_LISTS[language] || TARGET_WORD_LISTS['en'];

  // Shuffle word list using seeded random (Fisher-Yates)
  const shuffled = [...wordList];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Import word validation to check if word is actually on board
  const { isWordOnBoard } = require('./clientWordValidator');

  // Try each word in shuffled order - must validate with actual path-finding
  for (const word of shuffled) {
    // Normalize Hebrew final letters before checking
    const normalizedWord = language === 'he' ? normalizeHebrewFinalLetters(word) : word;

    // First do quick letter count check
    if (canWordExistOnGrid(normalizedWord, grid, language)) {
      // Then validate with proper path-finding algorithm
      if (isWordOnBoard(normalizedWord, grid, language)) {
        return {
          word: normalizedWord, // Return normalized word
          puzzleDate: dateString,
          language,
          puzzleNumber: getPuzzleNumber(dateString)
        };
      }
    }
  }

  // Fallback: return first word (should never happen with good word lists)
  // This word might not be on the board, but it's deterministic
  console.warn(`[Daily Challenge] No valid target word found on grid for ${dateString} ${language}`);
  const fallbackWord = language === 'he' ? normalizeHebrewFinalLetters(shuffled[0]) : shuffled[0];
  return {
    word: fallbackWord,
    puzzleDate: dateString,
    language,
    puzzleNumber: getPuzzleNumber(dateString)
  };
}

/**
 * Quick heuristic to check if a word could exist on the grid
 * Checks if all required letters are available (not a full path check)
 *
 * @param word - Word to check
 * @param grid - Letter grid
 * @param language - Language for normalization
 * @returns true if word might exist on grid
 */
function canWordExistOnGrid(word: string, grid: LetterGrid, language: Language): boolean {
  // Flatten grid and count available letters
  const gridLetters = grid.flat();
  const letterCounts = new Map<string, number>();

  for (const letter of gridLetters) {
    const normalized = letter.toUpperCase();
    letterCounts.set(normalized, (letterCounts.get(normalized) || 0) + 1);
  }

  // Check if all letters in word are available
  const wordUpper = word.toUpperCase();
  const wordLetterCounts = new Map<string, number>();

  for (const letter of wordUpper) {
    wordLetterCounts.set(letter, (wordLetterCounts.get(letter) || 0) + 1);
  }

  for (const [letter, count] of wordLetterCounts.entries()) {
    const available = letterCounts.get(letter) || 0;
    if (available < count) {
      return false; // Not enough of this letter
    }
  }

  return true; // All letters are available
}

/**
 * Get the daily target word for today
 * Convenience wrapper for selectDailyTargetWord
 *
 * @param grid - The daily grid
 * @param language - Game language
 * @returns Today's target word
 */
export function getTodaysTargetWord(grid: LetterGrid, language: Language): DailyTargetWord {
  const date = getDailyChallengeDate();
  return selectDailyTargetWord(grid, date, language);
}

// ==========================================
// Signup Conversion Utilities
// ==========================================

/**
 * Conversion trigger types for daily challenge signup prompts
 */
export type ConversionTrigger =
  | 'firstCompletion'   // First time completing a daily challenge
  | 'streakAtRisk'      // Streak of 3+ days (loss aversion)
  | 'topPercentile'     // Scored in top 10%
  | 'quickSolve';       // Solved in 3 or fewer attempts

const SIGNUP_MODAL_DISMISSED_KEY = 'lexiclash_signup_dismissed';
const PENDING_DAILY_RESULT_KEY = 'lexiclash_pending_daily_result';
const FIRST_COMPLETION_KEY = 'lexiclash_first_daily_completion';
const WINNER_ONBOARDING_KEY = 'lexiclash_winner_onboarding';

/**
 * Check if the signup modal has been dismissed recently
 * Returns true if dismissed within the last 3 days (avoid spamming)
 */
export function wasSignupModalDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const dismissed = localStorage.getItem(SIGNUP_MODAL_DISMISSED_KEY);
    if (!dismissed) return false;

    const dismissedAt = parseInt(dismissed, 10);
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < threeDaysMs;
  } catch {
    return false;
  }
}

/**
 * Record that the signup modal was dismissed
 */
export function recordSignupModalDismissed(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SIGNUP_MODAL_DISMISSED_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if this is the user's first daily challenge completion
 */
export function isFirstDailyCompletion(): boolean {
  if (typeof window === 'undefined') return true;

  try {
    return !localStorage.getItem(FIRST_COMPLETION_KEY);
  } catch {
    return true;
  }
}

/**
 * Mark that the user has completed at least one daily challenge
 */
export function markFirstDailyCompletion(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FIRST_COMPLETION_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Determine the appropriate conversion trigger based on result
 * Returns null if no trigger should fire (e.g., recently dismissed)
 */
export function getConversionTrigger(
  result: WordHuntResult,
  percentile?: number
): ConversionTrigger | null {
  // Don't show if recently dismissed
  if (wasSignupModalDismissedRecently()) {
    return null;
  }

  // Priority 1: First completion (onboarding moment)
  if (isFirstDailyCompletion()) {
    markFirstDailyCompletion();
    return 'firstCompletion';
  }

  // Priority 2: Streak at risk (loss aversion - strongest motivator)
  if (result.streakDays >= 3) {
    return 'streakAtRisk';
  }

  // Priority 3: Top percentile (competitive pride)
  if (result.solved && percentile !== undefined && percentile <= 10) {
    return 'topPercentile';
  }

  // Priority 4: Quick solve (skill pride)
  if (result.solved && result.attemptsUsed <= 3) {
    return 'quickSolve';
  }

  return null;
}

/**
 * Pending result structure for auto-save after OAuth
 */
export interface PendingDailyResult {
  result: WordHuntResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  trigger?: ConversionTrigger; // What prompted the signup (for onboarding UX)
  savedAt: number;
}

/**
 * Store the pending result before OAuth redirect
 * This will be retrieved after successful signup to auto-save
 */
export function setPendingDailyResult(data: Omit<PendingDailyResult, 'savedAt'>): void {
  if (typeof window === 'undefined') return;

  try {
    const pending: PendingDailyResult = {
      ...data,
      savedAt: Date.now(),
    };
    localStorage.setItem(PENDING_DAILY_RESULT_KEY, JSON.stringify(pending));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the pending result after OAuth callback
 * Returns null if no pending result or if expired (> 1 hour)
 */
export function getPendingDailyResult(): PendingDailyResult | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(PENDING_DAILY_RESULT_KEY);
    if (!stored) return null;

    const pending = JSON.parse(stored) as PendingDailyResult;

    // Expire after 1 hour (OAuth should complete quickly)
    const oneHourMs = 60 * 60 * 1000;
    if (Date.now() - pending.savedAt > oneHourMs) {
      clearPendingDailyResult();
      return null;
    }

    return pending;
  } catch {
    return null;
  }
}

/**
 * Clear the pending result (after successful save or on error)
 */
export function clearPendingDailyResult(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(PENDING_DAILY_RESULT_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Winner onboarding data stored after signup with pending result
 */
export interface WinnerOnboardingData {
  needsOnboarding: boolean;
  trigger: ConversionTrigger;
  initialName: string;
  initialAvatarId: string;
  savedAt: number;
}

/**
 * Set the winner onboarding flag after successful OAuth signup
 * This indicates the user needs to complete avatar/name selection
 */
export function setWinnerOnboarding(data: Omit<WinnerOnboardingData, 'savedAt'>): void {
  if (typeof window === 'undefined') return;

  try {
    const onboardingData: WinnerOnboardingData = {
      ...data,
      savedAt: Date.now(),
    };
    localStorage.setItem(WINNER_ONBOARDING_KEY, JSON.stringify(onboardingData));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the winner onboarding data
 * Returns null if no onboarding needed or if expired (> 1 hour)
 */
export function getWinnerOnboarding(): WinnerOnboardingData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(WINNER_ONBOARDING_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored) as WinnerOnboardingData;

    // Expire after 1 hour (should complete onboarding quickly)
    const oneHourMs = 60 * 60 * 1000;
    if (Date.now() - data.savedAt > oneHourMs) {
      clearWinnerOnboarding();
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Clear the winner onboarding flag (after completion or expiry)
 */
export function clearWinnerOnboarding(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(WINNER_ONBOARDING_KEY);
  } catch {
    // Ignore storage errors
  }
}

// ==========================================
// Guest Data Sync for Signup
// ==========================================

/**
 * Get all guest daily challenge results for syncing to authenticated account
 * Returns results from ALL languages that the guest has played
 */
export function getAllGuestDailyResults(): Array<{
  result: WordHuntResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
}> {
  if (typeof window === 'undefined') return [];

  const allResults: Array<{
    result: WordHuntResult;
    puzzleNumber: number;
    puzzleDate: string;
    language: Language;
  }> = [];

  const languages: Language[] = ['en', 'he', 'sv', 'ja', 'es'];

  for (const language of languages) {
    const results = getAllWordHuntResults(language);
    for (const stored of results) {
      allResults.push({
        result: stored.result,
        puzzleNumber: stored.puzzleNumber,
        puzzleDate: stored.date,
        language,
      });
    }
  }

  return allResults;
}

/**
 * @deprecated SECURITY VULNERABILITY - DO NOT USE
 *
 * This function reads from localStorage which can be manipulated by users.
 * Use `claimGuestDailyResultsSecure` instead, which claims results from
 * validated server-side records.
 *
 * This function is kept for reference only and will be removed in a future version.
 */
async function syncGuestDailyResultsToAccount_DEPRECATED(
  userId: string,
  userProfile: { display_name: string | null; username: string; avatar_emoji: string | null; avatar_color: string | null; avatar_image: string | null; profile_picture_url: string | null }
): Promise<number> {
  if (typeof window === 'undefined') return 0;

  try {
    // Get all guest results from localStorage
    const allGuestResults = getAllGuestDailyResults();

    if (allGuestResults.length === 0) {
      console.log('[Sync] No guest daily results to sync');
      return 0;
    }

    console.log(`[Sync] Found ${allGuestResults.length} guest daily results to sync`);

    // Get guest player info for fallback
    const guestPlayer = await getGuestDailyPlayer();
    let successCount = 0;

    // Submit each result to the backend
    for (const { result, puzzleNumber, puzzleDate, language } of allGuestResults) {
      try {
        const bodyData: Record<string, unknown> = {
          puzzleDate,
          puzzleNumber,
          language,
          playerId: userId,
          guestFingerprint: null, // Now authenticated, use player ID
          displayName: userProfile.display_name || userProfile.username,
          avatarEmoji: userProfile.avatar_emoji || guestPlayer?.avatarEmoji || '🎯',
          avatarColor: userProfile.avatar_color || guestPlayer?.avatarColor || '#6366f1',
          avatarImage: userProfile.avatar_image || undefined,
          profilePictureUrl: userProfile.profile_picture_url || undefined,
          solved: result.solved,
          attemptsUsed: result.attemptsUsed,
          targetWord: result.targetWord,
          attemptWords: result.attempts.map(a => ({
            word: a.word,
            feedback: a.feedback.map(f => ({
              letter: f.letter,
              feedback: f.feedback,
              position: f.position,
            })),
            timestamp: a.timestamp,
          })),
        };

        // Add survival mode fields if present
        if (result.wordsDiscovered) bodyData.wordsDiscovered = result.wordsDiscovered;
        if (result.lifeRemaining !== undefined) bodyData.lifeRemaining = result.lifeRemaining;
        if (result.clueTokensEarned !== undefined) bodyData.clueTokensEarned = result.clueTokensEarned;
        if (result.clueTokensSpent !== undefined) bodyData.clueTokensSpent = result.clueTokensSpent;
        if (result.hintsUnlocked !== undefined) bodyData.hintsUnlocked = result.hintsUnlocked;
        if (result.efficiencyScore !== undefined) bodyData.efficiencyScore = result.efficiencyScore;

        const response = await fetch('/api/daily-challenge/word-hunt/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });

        if (response.ok) {
          successCount++;
          console.log(`[Sync] Synced result for ${puzzleDate} (${language})`);
        } else {
          const errorText = await response.text();
          console.warn(`[Sync] Failed to sync result for ${puzzleDate} (${language}):`, errorText);
        }
      } catch (err) {
        console.warn(`[Sync] Error syncing result for ${puzzleDate} (${language}):`, err);
      }
    }

    console.log(`[Sync] Successfully synced ${successCount}/${allGuestResults.length} guest daily results`);

    // Clear guest daily results from localStorage after successful sync
    if (successCount > 0) {
      clearAllGuestDailyResults();
    }

    return successCount;
  } catch (err) {
    console.error('[Sync] Error syncing guest daily results:', err);
    return 0;
  }
}

/**
 * Clear all guest daily challenge results from localStorage
 * Should be called after syncing to authenticated account
 */
function clearAllGuestDailyResults(): void {
  if (typeof window === 'undefined') return;

  try {
    const languages: Language[] = ['en', 'he', 'sv', 'ja', 'es'];

    for (const language of languages) {
      // Find and remove all Word Hunt results for this language
      const prefix = `${WORD_HUNT_STORAGE_KEY}_${language}_`;
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove all found keys
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    }

    // Also clear streak data and other guest daily-related data
    localStorage.removeItem(DAILY_STREAK_KEY);
    localStorage.removeItem(GUEST_DAILY_PLAYER_KEY);
    localStorage.removeItem(GUEST_FINGERPRINT_KEY);

    console.log('[Sync] Cleared all guest daily results from localStorage');
  } catch (err) {
    console.warn('[Sync] Error clearing guest daily results:', err);
  }
}

/**
 * SECURE: Claim guest daily challenge results for a newly authenticated user
 *
 * This function securely transfers guest daily results to the user's account by
 * calling a server API that updates existing database records. This prevents
 * localStorage manipulation attacks since the data comes from server-side records
 * that were validated when originally submitted.
 *
 * @param guestFingerprint - The guest's fingerprint (session ID used when playing as guest)
 * @param userId - The authenticated user's ID
 * @param userProfile - The user's profile info for display updates
 * @returns Number of results successfully claimed
 */
export async function claimGuestDailyResultsSecure(
  guestFingerprint: string,
  userId: string,
  userProfile: {
    display_name: string | null;
    username: string;
    avatar_emoji: string | null;
    avatar_color: string | null;
    avatar_image: string | null;
    profile_picture_url: string | null;
  }
): Promise<number> {
  if (typeof window === 'undefined') return 0;

  try {
    console.log(`[SecureClaim] Claiming guest daily results for user ${userId}`);

    const response = await fetch('/api/daily-challenge/claim-guest-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestFingerprint,
        playerId: userId,
        displayName: userProfile.display_name || userProfile.username,
        avatarEmoji: userProfile.avatar_emoji,
        avatarColor: userProfile.avatar_color,
        avatarImage: userProfile.avatar_image,
        profilePictureUrl: userProfile.profile_picture_url,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[SecureClaim] Failed to claim guest results:', errorText);
      return 0;
    }

    const result = await response.json();
    console.log(`[SecureClaim] Successfully claimed ${result.claimedCount} results (efficiency: ${result.totalEfficiencyScore})`);

    // Clear localStorage guest data after successful claim
    clearAllGuestDailyResults();

    return result.claimedCount;
  } catch (err) {
    console.error('[SecureClaim] Error claiming guest daily results:', err);
    return 0;
  }
}
