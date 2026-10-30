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
  isWordOnGrid,
  canWordExistOnGrid,
} from './gridPathFinding';
import { generateSeededJapaneseGrid, generateJapaneseDailyPuzzle } from './gridGeneration.ja';

// Re-export for consumers
export { isWordOnGrid } from './gridPathFinding';

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
