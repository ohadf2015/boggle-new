/**
 * Daily Challenge Grid Generation
 *
 * Core grid generation logic for daily puzzles with word embedding
 */

import {
  hebrewLetters,
  swedishLetters,
  spanishLetters,
  japaneseLetters,
  kanjiCompounds,
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
} from '../consts';
import type { Language, LetterGrid } from '@/types';
import type { DailyPuzzle, DailyTargetWord } from './types';
import { SEED_SALT, normalizeHebrewFinalLetters, MIN_SAME_LENGTH_WORDS } from './constants';
import { mulberry32, hashString } from './prng';
import { getDailyChallengeDate, getPuzzleNumber } from './dateUtils';
import {
  BONUS_WORD_LISTS,
  TARGET_WORD_LISTS,
  getSameLengthWords,
  calculateLetterOverlapScore,
} from './wordLists';

// ==========================================
// Basic Grid Generation
// ==========================================
//
// NOTE: Async database operations have been moved to gridGeneration.server.ts
// to prevent server-only modules from being bundled into client code.
// Use API routes or Server Actions to access server-only functionality.

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
  const grid: (string | null)[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  const totalCells = rows * cols;
  const targetCompounds = Math.floor(totalCells / 5);

  // Shuffle compounds using seeded random
  const shuffledCompounds = [...kanjiCompounds].sort(() => random() - 0.5);
  const twoCharCompounds = shuffledCompounds.filter((w) => w.length === 2);
  const threeCharCompounds = shuffledCompounds.filter((w) => w.length === 3);

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
// Word Path Finding
// ==========================================

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
 * Check if a word can be formed on the grid using adjacent cells
 * Uses DFS to find a valid path for the word
 *
 * NOTE: For Hebrew words, final letters (ך, ם, ן, ף, ץ) are normalized to
 * their regular forms before searching, since grids store regular forms only.
 */
export function isWordOnGrid(word: string, grid: LetterGrid): boolean {
  if (!grid || grid.length === 0 || !word) return false;

  const rows = grid.length;
  const cols = grid[0].length;
  // Normalize Hebrew final letters to regular forms, then uppercase
  // This ensures "כוכבים" (with final ם) matches grid cells with "מ"
  const wordNormalized = normalizeHebrewFinalLetters(word).toUpperCase();

  // 8 directions for adjacent cells
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  function dfs(row: number, col: number, index: number, visited: Set<string>): boolean {
    if (index === wordNormalized.length) return true;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false;

    const key = `${row},${col}`;
    if (visited.has(key)) return false;

    // Normalize grid cell for comparison
    const cellLetter = grid[row][col].toUpperCase();
    if (cellLetter !== wordNormalized[index]) return false;

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
      if (grid[r][c].toUpperCase() === wordNormalized[0]) {
        if (dfs(r, c, 0, new Set())) {
          return true;
        }
      }
    }
  }

  return false;
}

// ==========================================
// Word Embedding
// ==========================================

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
  const grid: (string | null)[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null));
  const wordUpper = word.toUpperCase();

  // 8 directions for adjacent cells (including diagonals)
  const directions = [
    { dr: -1, dc: -1 },
    { dr: -1, dc: 0 },
    { dr: -1, dc: 1 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
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
  const grid: (string | null)[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  // 8 directions for adjacent cells (including diagonals)
  const directions = [
    { dr: -1, dc: -1 },
    { dr: -1, dc: 0 },
    { dr: -1, dc: 1 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
  ];

  // STEP 1: Embed the target word (REQUIRED)
  // Normalize Hebrew final letters to regular letters for grid display
  let targetUpper = targetWord.toUpperCase();
  if (language === 'he') {
    targetUpper = normalizeHebrewFinalLetters(targetUpper);
  }
  let targetPlaced = false;
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts && !targetPlaced; attempt++) {
    const startRow = Math.floor(random() * rows);
    const startCol = Math.floor(random() * cols);
    const path = findWordPathInPartialGrid(
      targetUpper,
      startRow,
      startCol,
      rows,
      cols,
      random,
      directions,
      grid,
      usedCells
    );

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

    // Normalize Hebrew final letters to regular letters for grid display
    let wordUpper = bonusWord.toUpperCase();
    if (language === 'he') {
      wordUpper = normalizeHebrewFinalLetters(wordUpper);
    }
    let wordPlaced = false;

    // Try a few random positions
    for (let attempt = 0; attempt < 30 && !wordPlaced; attempt++) {
      const startRow = Math.floor(random() * rows);
      const startCol = Math.floor(random() * cols);

      const path = findWordPathInPartialGrid(
        wordUpper,
        startRow,
        startCol,
        rows,
        cols,
        random,
        directions,
        grid,
        usedCells
      );

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
    console.warn(
      `[Daily Puzzle] Only embedded ${sameLengthEmbedded}/${minSameLengthWords} same-length words for target length ${targetLength}`
    );
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

// ==========================================
// Main Puzzle Generation
// ==========================================

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
 */
export function generateDailyPuzzle(
  dateString: string,
  language: Language,
  preSelectedWord?: string,
  customRows?: number,
  customCols?: number
): DailyPuzzle {
  // Create seed from date + language + salt
  const seedString = `${SEED_SALT}-${dateString}-${language}-v2`;
  const seed = hashString(seedString);
  const random = mulberry32(seed);

  // Get grid dimensions
  const rows = customRows || DIFFICULTIES[DEFAULT_DIFFICULTY].rows;
  const cols = customCols || DIFFICULTIES[DEFAULT_DIFFICULTY].cols;

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
  const sameLengthWords = getSameLengthWords(targetWord, language, random);

  // STEP 3: Get other bonus words for survival mode (different lengths for variety)
  const bonusWordList = BONUS_WORD_LISTS[language] || BONUS_WORD_LISTS['en'];
  const otherBonusWords = bonusWordList
    .filter((w) => w.length !== targetWord.length)
    .map((w) => w.toUpperCase());

  // Score and sort other bonus words by letter overlap with target
  const scoredOtherBonus = otherBonusWords.map((word) => ({
    word,
    score: calculateLetterOverlapScore(word, targetWord),
    isLonger: word.length >= targetWord.length,
  }));

  // Sort: longer words with high overlap first, then other words by overlap
  scoredOtherBonus.sort((a, b) => {
    if (a.isLonger && !b.isLonger && a.score > 0) return -1;
    if (b.isLonger && !a.isLonger && b.score > 0) return 1;
    return b.score - a.score;
  });

  // Shuffle within top tier for variety
  const topBonus = scoredOtherBonus.slice(0, 8).map((s) => s.word);
  for (let i = topBonus.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [topBonus[i], topBonus[j]] = [topBonus[j], topBonus[i]];
  }

  // Prioritize same-length words
  const sameLengthToEmbed = sameLengthWords.slice(0, Math.max(MIN_SAME_LENGTH_WORDS, 8));
  const otherBonusToEmbed = topBonus.slice(0, 6);

  // Combine: same-length words first (priority), then other bonus words
  let bonusWordsToEmbed = [...sameLengthToEmbed, ...otherBonusToEmbed];

  // Normalize Hebrew final letters for grid display
  let normalizedTargetWord = targetWord;
  if (language === 'he') {
    normalizedTargetWord = normalizeHebrewFinalLetters(targetWord);
    bonusWordsToEmbed = bonusWordsToEmbed.map((word) => normalizeHebrewFinalLetters(word));
  }

  // Create grid with target word AND bonus words embedded
  const grid = embedMultipleWordsInGrid(
    normalizedTargetWord,
    bonusWordsToEmbed,
    letters,
    rows,
    cols,
    random,
    language
  );

  return {
    grid,
    targetWord: normalizedTargetWord,
    puzzleDate: dateString,
    language,
    puzzleNumber: getPuzzleNumber(dateString),
  };
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
    const twoCharWords = japaneseTargets.filter((w) => w.length === 2);

    // Shuffle and pick first
    const shuffled = [...twoCharWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    targetWord = shuffled[0] || '日本';
  }

  // Get same-length words for gameplay assistance
  const sameLengthWords = getSameLengthWords(targetWord, 'ja', random);

  // Get other bonus words for variety
  const japaneseBonusWords = BONUS_WORD_LISTS['ja'] || [];
  const otherBonusWords = japaneseBonusWords.filter((w) => w.length !== targetWord.length);

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
  const grid: (string | null)[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  // 8 directions for adjacent cells
  const directions = [
    { dr: -1, dc: -1 },
    { dr: -1, dc: 0 },
    { dr: -1, dc: 1 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
  ];

  // Place target word (2 chars) adjacently
  const startRow = Math.floor(random() * rows);
  const startCol = Math.floor(random() * (cols - 1)); // Ensure room for 2 chars
  grid[startRow][startCol] = targetWord[0];
  grid[startRow][startCol + 1] = targetWord[1];
  usedCells.add(`${startRow},${startCol}`);
  usedCells.add(`${startRow},${startCol + 1}`);

  // Embed bonus words
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

      const path = findWordPathInPartialGrid(
        bonusWord,
        bStartRow,
        bStartCol,
        rows,
        cols,
        random,
        directions,
        grid,
        usedCells
      );

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
    console.warn(
      `[Daily Puzzle - Japanese] Only embedded ${sameLengthEmbedded}/${MIN_SAME_LENGTH_WORDS} same-length words for target length ${targetLength}`
    );
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
    puzzleNumber: getPuzzleNumber(dateString),
  };
}

// ==========================================
// Server-Only Functions Moved
// ==========================================
//
// The following functions have been moved to gridGeneration.server.ts
// to prevent bundling server-only dependencies into client code:
//
// - generateDailyPuzzleAsync(): Async puzzle generation with database lookup
// - regenerateDailyPuzzle(): Force regenerate and save to database
//
// Use these functions in API routes or Server Actions only.
// Import from: '@/utils/dailyChallenge/gridGeneration.server'

/**
 * Get today's daily puzzle
 * Convenience wrapper for generateDailyPuzzle
 */
export function getTodaysDailyPuzzle(language: Language): DailyPuzzle {
  const date = getDailyChallengeDate();
  return generateDailyPuzzle(date, language);
}

// ==========================================
// Target Word Selection
// ==========================================

/**
 * Quick heuristic to check if a word could exist on the grid
 * Checks if all required letters are available (not a full path check)
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

  // Get word list for this language
  const wordList = TARGET_WORD_LISTS[language] || TARGET_WORD_LISTS['en'];

  // Shuffle word list using seeded random (Fisher-Yates)
  const shuffled = [...wordList];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Import word validation to check if word is actually on board
  const { isWordOnBoard } = require('../clientWordValidator');

  // Try each word in shuffled order - must validate with actual path-finding
  for (const word of shuffled) {
    // Normalize Hebrew final letters before checking
    const normalizedWord = language === 'he' ? normalizeHebrewFinalLetters(word) : word;

    // First do quick letter count check
    if (canWordExistOnGrid(normalizedWord, grid, language)) {
      // Then validate with proper path-finding algorithm
      if (isWordOnBoard(normalizedWord, grid, language)) {
        return {
          word: normalizedWord,
          puzzleDate: dateString,
          language,
          puzzleNumber: getPuzzleNumber(dateString),
        };
      }
    }
  }

  // Fallback: return first word (should never happen with good word lists)
  console.warn(`[Daily Challenge] No valid target word found on grid for ${dateString} ${language}`);
  const fallbackWord = language === 'he' ? normalizeHebrewFinalLetters(shuffled[0]) : shuffled[0];
  return {
    word: fallbackWord,
    puzzleDate: dateString,
    language,
    puzzleNumber: getPuzzleNumber(dateString),
  };
}

/**
 * Get the daily target word for today
 * Convenience wrapper for selectDailyTargetWord
 */
export function getTodaysTargetWord(grid: LetterGrid, language: Language): DailyTargetWord {
  const date = getDailyChallengeDate();
  return selectDailyTargetWord(grid, date, language);
}
