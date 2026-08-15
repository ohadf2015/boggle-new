/**
 * Daily Challenge Grid Generation
 *
 * Core grid generation logic for daily puzzles with word embedding
 */

import {
  hebrewLetters,
  swedishLetters,
  spanishLetters,
  russianLetterPool,
  japaneseLetters,
  kanjiCompounds,
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
} from '../consts';
import type { Language, LetterGrid } from '@/types';
import type { DailyPuzzle, DailyTargetWord } from './types';
import { SEED_SALT, normalizeHebrewFinalLetters, MIN_SAME_LENGTH_WORDS, MAX_TARGET_WORD_LENGTH } from './constants';
import { mulberry32, hashString } from './prng';
import { getDailyChallengeDate, getPuzzleNumber } from './dateUtils';
import {
  BONUS_WORD_LISTS,
  TARGET_WORD_LISTS,
  getSameLengthWords,
  calculateLetterOverlapScore,
} from './wordLists';
import { getMinAnswerLength } from '@/shared/constants/gameConstants';
import { isWordHuntQuality } from '@/shared/utils/wordQuality';
import {
  embedMultipleWordsInGrid,
  findWordPathInPartialGrid,
  EIGHT_DIRECTIONS,
  isWordOnGrid,
  canWordExistOnGrid,
} from './gridPathFinding';

// Re-export for consumers
export { isWordOnGrid } from './gridPathFinding';

/** Fisher-Yates shuffle in place */
function shuffleFY<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// ==========================================
// Basic Grid Generation
// ==========================================
//
// NOTE: Async database operations have been moved to gridGeneration.server.ts

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
  const seedString = `${SEED_SALT}-${dateString}-${language}`;
  const seed = hashString(seedString);
  const random = mulberry32(seed);

  if (rows === null || cols === null) {
    rows = DIFFICULTIES[DEFAULT_DIFFICULTY].rows;
    cols = DIFFICULTIES[DEFAULT_DIFFICULTY].cols;
  }

  let letters: string[] | string;

  if (language === 'en') {
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  } else if (language === 'sv') {
    letters = swedishLetters;
  } else if (language === 'es') {
    letters = spanishLetters;
  } else if (language === 'ru') {
    letters = russianLetterPool;
  } else if (language === 'ja') {
    return generateSeededJapaneseGrid(random, rows, cols);
  } else if (language === 'he') {
    letters = hebrewLetters;
  } else {
    // Unknown language must not silently become a Hebrew board (Russian leaked
    // Hebrew tiles before the 'ru' branch existed). Default to English.
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }

  const lettersArray = typeof letters === 'string' ? letters.split('') : letters;
  const grid: string[][] = [];

  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    for (let j = 0; j < cols; j++) {
      row.push(lettersArray[Math.floor(random() * lettersArray.length)]);
    }
    grid.push(row);
  }

  return grid;
}

/**
 * Generate a deterministic grid with weighted English letter distribution (for Quick Play)
 *
 * Uses realistic English letter frequencies to ensure:
 * - Mean vowel share ~35% (vs ~20% from uniform distribution)
 * - Every row has at least one vowel
 * - Q is extremely rare and almost always paired with U
 *
 * English frequency weights derived from corpus analysis.
 * Non-English languages fall back to unweighted distribution.
 *
 * @param dateString - Seed string (e.g., 'quick-uuid')
 * @param language - Language code
 * @param rows - Grid height (default 6)
 * @param cols - Grid width (default 6)
 * @returns Weighted letter grid
 */
export function generateDailyGridWithWeightedLetters(
  dateString: string,
  language: Language,
  rows: number | null = null,
  cols: number | null = null
): LetterGrid {
  // Only use weighted distribution for English; fall back for other languages
  if (language !== 'en') {
    return generateDailyGrid(dateString, language, rows, cols);
  }

  const seedString = `${SEED_SALT}-${dateString}-${language}-weighted`;
  const seed = hashString(seedString);
  const random = mulberry32(seed);

  if (rows === null || cols === null) {
    rows = DIFFICULTIES[DEFAULT_DIFFICULTY].rows;
    cols = DIFFICULTIES[DEFAULT_DIFFICULTY].cols;
  }

  // English letter frequencies (as proportions, summing to ~100)
  // Derived from corpus analysis: E(12.7%), T(9%), A(8.2%), O(7.5%), I(7%), etc.
  const weightedLetters = [
    // Vowels (38% total)
    'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', // A: 8.2%
    'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', // E: 12.7%
    'I', 'I', 'I', 'I', 'I', 'I', 'I', // I: 7%
    'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', // O: 7.5%
    'U', 'U', 'U', // U: 2.8%
    // High-frequency consonants
    'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', // T: 9%
    'R', 'R', 'R', 'R', 'R', 'R', // R: 6%
    'S', 'S', 'S', 'S', 'S', 'S', // S: 6.3%
    'N', 'N', 'N', 'N', 'N', 'N', 'N', // N: 6.7%
    'L', 'L', 'L', 'L', 'L', // L: 4%
    'D', 'D', 'D', 'D', // D: 4.3%
    'H', 'H', 'H', 'H', // H: 3%
    'C', 'C', 'C', // C: 2.8%
    'M', 'M', 'M', // M: 2.4%
    'P', 'P', 'P', // P: 1.9%
    'G', 'G', 'G', // G: 2%
    // Medium-frequency consonants
    'F', 'F', // F: 2.2%
    'B', 'B', // B: 1.5%
    'Y', 'Y', // Y: 2%
    'W', 'W', // W: 1.2%
    'V', // V: 1%
    'K', // K: 0.8%
    'X', // X: 0.15% (rare)
    'Z', // Z: 0.07% (rare)
    'J', // J: 0.15%
    'Q', // Q: 0.1% (very rare, almost always followed by U in English)
  ];

  const vowels = new Set(['A', 'E', 'I', 'O', 'U']);
  const grid: string[][] = [];

  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    let hasVowel = false;

    for (let j = 0; j < cols; j++) {
      let letter: string;

      // For the last cell in a row without a vowel, pick a vowel
      if (j === cols - 1 && !hasVowel) {
        const vowelArray = Array.from(vowels);
        letter = vowelArray[Math.floor(random() * vowelArray.length)];
      } else {
        // Pick from weighted distribution
        letter = weightedLetters[Math.floor(random() * weightedLetters.length)];

        // Special case: if we pick Q, try to follow with U (if next cell exists)
        if (letter === 'Q' && j < cols - 1) {
          row.push(letter);
          j++;
          letter = 'U'; // Q almost always followed by U in English
        }
      }

      if (vowels.has(letter)) {
        hasVowel = true;
      }
      row.push(letter);
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

  const shuffledCompounds = shuffleFY([...kanjiCompounds], random);
  const twoCharCompounds = shuffledCompounds.filter((w) => w.length === 2);
  const threeCharCompounds = shuffledCompounds.filter((w) => w.length === 3);

  let embeddedCount = 0;

  for (const compound of threeCharCompounds) {
    if (embeddedCount >= Math.floor(targetCompounds * 0.2)) break;
    if (tryEmbedCompoundSeeded(grid, compound, rows, cols, usedCells, random)) {
      embeddedCount++;
    }
  }

  for (const compound of twoCharCompounds) {
    if (embeddedCount >= targetCompounds) break;
    if (tryEmbedCompoundSeeded(grid, compound, rows, cols, usedCells, random)) {
      embeddedCount++;
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        grid[i][j] = japaneseLetters[Math.floor(random() * japaneseLetters.length)];
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
    { dr: 0, dc: 1 }, { dr: 0, dc: -1 }, { dr: 1, dc: 0 }, { dr: -1, dc: 0 },
    { dr: 1, dc: 1 }, { dr: 1, dc: -1 }, { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
  ];

  const shuffledDirs = shuffleFY([...directions], random);

  for (let attempt = 0; attempt < 50; attempt++) {
    const startRow = Math.floor(random() * rows);
    const startCol = Math.floor(random() * cols);

    for (const dir of shuffledDirs) {
      const endRow = startRow + (wordLen - 1) * dir.dr;
      const endCol = startCol + (wordLen - 1) * dir.dc;

      if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) continue;

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
// Main Puzzle Generation
// ==========================================

/**
 * Generate a daily puzzle with GUARANTEED playable target word
 */
export function generateDailyPuzzle(
  dateString: string,
  language: Language,
  preSelectedWord?: string,
  customRows?: number,
  customCols?: number,
  supplementalNounWords?: string[],
): DailyPuzzle {
  const seedString = `${SEED_SALT}-${dateString}-${language}-v2`;
  const seed = hashString(seedString);
  const random = mulberry32(seed);

  const rows = customRows || DIFFICULTIES[DEFAULT_DIFFICULTY].rows;
  const cols = customCols || DIFFICULTIES[DEFAULT_DIFFICULTY].cols;

  let letters: string[];
  if (language === 'en') {
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  } else if (language === 'sv') {
    letters = swedishLetters;
  } else if (language === 'es') {
    letters = spanishLetters;
  } else if (language === 'ru') {
    letters = russianLetterPool;
  } else if (language === 'ja') {
    return generateJapaneseDailyPuzzle(dateString, language, random, rows, cols, preSelectedWord);
  } else if (language === 'he') {
    letters = hebrewLetters;
  } else {
    // Unknown language must not silently become a Hebrew board. Default English.
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  }

  // Select target word
  let targetWord: string;
  const minTargetLength = getMinAnswerLength(language);

  if (preSelectedWord) {
    targetWord = preSelectedWord.toUpperCase();
  } else {
    const curatedWords = (TARGET_WORD_LISTS[language] || TARGET_WORD_LISTS['en'])
      .filter(w => w.length >= minTargetLength && w.length <= MAX_TARGET_WORD_LENGTH);

    // Enrich with quality nouns from dictionary (capped at 6 letters, quality-filtered)
    const nounCandidates = (supplementalNounWords || [])
      .map(w => w.toUpperCase())
      .filter(w =>
        w.length >= minTargetLength &&
        w.length <= MAX_TARGET_WORD_LENGTH &&
        isWordHuntQuality(w, language)
      );

    // Curated words first (higher quality), then noun candidates (deduplicated)
    const curatedSet = new Set(curatedWords.map(w => w.toUpperCase()));
    const uniqueNouns = nounCandidates.filter(w => !curatedSet.has(w));
    const combined = [...curatedWords, ...uniqueNouns];

    const shuffled = [...combined];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    targetWord = shuffled[0];
  }

  // Get bonus words — supplemental noun words enrich both same-length and bonus pools
  const nounWords = supplementalNounWords || [];
  const sameLengthWords = getSameLengthWords(targetWord, language, random, nounWords);
  const bonusWordList = BONUS_WORD_LISTS[language] || BONUS_WORD_LISTS['en'];
  const nounBonusWords = nounWords
    .filter((w) => w.length !== targetWord.length && w.length >= 3)
    .map((w) => w.toUpperCase());
  const otherBonusWords = [...new Set([
    ...bonusWordList.filter((w) => w.length !== targetWord.length).map((w) => w.toUpperCase()),
    ...nounBonusWords,
  ])];

  const scoredOtherBonus = otherBonusWords.map((word) => ({
    word,
    score: calculateLetterOverlapScore(word, targetWord),
    isLonger: word.length >= targetWord.length,
  }));

  scoredOtherBonus.sort((a, b) => {
    if (a.isLonger && !b.isLonger && a.score > 0) return -1;
    if (b.isLonger && !a.isLonger && b.score > 0) return 1;
    return b.score - a.score;
  });

  const topBonus = scoredOtherBonus.slice(0, 8).map((s) => s.word);
  for (let i = topBonus.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [topBonus[i], topBonus[j]] = [topBonus[j], topBonus[i]];
  }

  const sameLengthToEmbed = sameLengthWords.slice(0, Math.max(MIN_SAME_LENGTH_WORDS, 8));
  const otherBonusToEmbed = topBonus.slice(0, 6);

  let bonusWordsToEmbed = [...sameLengthToEmbed, ...otherBonusToEmbed];

  let normalizedTargetWord = targetWord;
  if (language === 'he') {
    normalizedTargetWord = normalizeHebrewFinalLetters(targetWord);
    bonusWordsToEmbed = bonusWordsToEmbed.map((word) => normalizeHebrewFinalLetters(word));
  }

  const grid = embedMultipleWordsInGrid(
    normalizedTargetWord, bonusWordsToEmbed, letters, rows, cols, random, language
  );

  return {
    grid, targetWord: normalizedTargetWord,
    puzzleDate: dateString, language,
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
  let targetWord: string;

  if (preSelectedWord) {
    targetWord = preSelectedWord;
  } else {
    const japaneseTargets = TARGET_WORD_LISTS['ja'] || [];
    const twoCharWords = japaneseTargets.filter((w) => w.length === 2);
    const shuffled = [...twoCharWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    targetWord = shuffled[0] || '日本';
  }

  const sameLengthWords = getSameLengthWords(targetWord, 'ja', random);
  const japaneseBonusWords = BONUS_WORD_LISTS['ja'] || [];
  const otherBonusWords = japaneseBonusWords.filter((w) => w.length !== targetWord.length);

  const shuffledOtherBonus = [...otherBonusWords];
  for (let i = shuffledOtherBonus.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledOtherBonus[i], shuffledOtherBonus[j]] = [shuffledOtherBonus[j], shuffledOtherBonus[i]];
  }

  const sameLengthToEmbed = sameLengthWords.slice(0, Math.max(MIN_SAME_LENGTH_WORDS, 6));
  const otherBonusToEmbed = shuffledOtherBonus.slice(0, 4);
  const bonusWordsToEmbed = [...sameLengthToEmbed, ...otherBonusToEmbed];

  // Build grid with target word placed adjacently
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  const startRow = Math.floor(random() * rows);
  const startCol = Math.floor(random() * (cols - 1));
  grid[startRow][startCol] = targetWord[0];
  grid[startRow][startCol + 1] = targetWord[1];
  usedCells.add(`${startRow},${startCol}`);
  usedCells.add(`${startRow},${startCol + 1}`);

  // Embed bonus words
  let embeddedCount = 0;
  let sameLengthEmbedded = 0;
  const targetLength = targetWord.length;

  for (const bonusWord of bonusWordsToEmbed) {
    if (embeddedCount >= 10) break;

    const wordChars = bonusWord.split('');
    const isSameLength = bonusWord.length === targetLength;
    let wordPlaced = false;

    for (let attempt = 0; attempt < 30 && !wordPlaced; attempt++) {
      const bStartRow = Math.floor(random() * rows);
      const bStartCol = Math.floor(random() * cols);
      const path = findWordPathInPartialGrid(
        bonusWord, bStartRow, bStartCol, rows, cols, random, EIGHT_DIRECTIONS, grid, usedCells
      );

      if (path && path.length === wordChars.length) {
        for (let i = 0; i < path.length; i++) {
          grid[path[i].row][path[i].col] = wordChars[i];
          usedCells.add(`${path[i].row},${path[i].col}`);
        }
        wordPlaced = true;
        embeddedCount++;
        if (isSameLength) sameLengthEmbedded++;
      }
    }
  }

  if (sameLengthEmbedded < MIN_SAME_LENGTH_WORDS) {
    console.warn(
      `[Daily Puzzle - Japanese] Only embedded ${sameLengthEmbedded}/${MIN_SAME_LENGTH_WORDS} same-length words for target length ${targetLength}`
    );
  }

  // Fill remaining with random Japanese characters
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        grid[i][j] = japaneseLetters[Math.floor(random() * japaneseLetters.length)];
      }
    }
  }

  return {
    grid: grid as LetterGrid, targetWord,
    puzzleDate: dateString, language,
    puzzleNumber: getPuzzleNumber(dateString),
  };
}

// ==========================================
// Server-Only Functions Moved
// ==========================================
//
// The following functions have been moved to gridGeneration.server.ts
// Import from: '@/utils/dailyChallenge/gridGeneration.server'

/**
 * Get today's daily puzzle
 */
export function getTodaysDailyPuzzle(language: Language): DailyPuzzle {
  const date = getDailyChallengeDate();
  return generateDailyPuzzle(date, language);
}

// ==========================================
// Target Word Selection
// ==========================================

/**
 * Deterministically select a target word for the daily Word Hunt challenge
 */
export function selectDailyTargetWord(
  grid: LetterGrid,
  dateString: string,
  language: Language
): DailyTargetWord {
  const seedString = `${SEED_SALT}-${dateString}-${language}-target`;
  const seed = hashString(seedString);
  const random = mulberry32(seed);

  const minTargetLen = getMinAnswerLength(language);
  const wordList = (TARGET_WORD_LISTS[language] || TARGET_WORD_LISTS['en'])
    .filter(w => w.length >= minTargetLen && w.length <= MAX_TARGET_WORD_LENGTH);

  const shuffled = [...wordList];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  for (const word of shuffled) {
    const normalizedWord = language === 'he' ? normalizeHebrewFinalLetters(word) : word;
    if (canWordExistOnGrid(normalizedWord, grid, language) && isWordOnGrid(normalizedWord, grid)) {
      return {
        word: normalizedWord, puzzleDate: dateString,
        language, puzzleNumber: getPuzzleNumber(dateString),
      };
    }
  }

  console.warn(`[Daily Challenge] No valid target word found on grid for ${dateString} ${language}`);
  const fallbackWord = language === 'he' ? normalizeHebrewFinalLetters(shuffled[0]) : shuffled[0];
  return {
    word: fallbackWord, puzzleDate: dateString,
    language, puzzleNumber: getPuzzleNumber(dateString),
  };
}

/**
 * Get the daily target word for today
 */
export function getTodaysTargetWord(grid: LetterGrid, language: Language): DailyTargetWord {
  const date = getDailyChallengeDate();
  return selectDailyTargetWord(grid, date, language);
}
