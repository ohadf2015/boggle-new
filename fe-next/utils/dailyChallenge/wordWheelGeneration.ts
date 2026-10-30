/**
 * Word Wheel Puzzle Generation
 *
 * Generates deterministic Word Wheel puzzles seeded on date + language.
 * A Word Wheel has 7 letters: 1 center + 6 outer.
 * Every valid word must include the center letter.
 */

import type { Language } from '@/types';
import { SEED_SALT } from './constants';
import { mulberry32, hashString } from './prng';
import { getDailyChallengeDate, getPuzzleNumber } from './dateUtils';
import { normalizeHebrewLetter } from '@/shared/utils/wordNormalization';
import {
  LEGACY_WHEEL_SOURCES, WHEEL_V2_SOURCES, WHEEL_V2_START_DATE, HARD_CENTER_LETTERS,
} from './wordWheelSources';

// ==========================================
// Word Wheel Puzzle Types
// ==========================================

export interface WordWheelPuzzle {
  centerLetter: string;
  outerLetters: string[];
  allLetters: string[];
  puzzleDate: string;
  language: Language;
  puzzleNumber: number;
}

/**
 * Extract unique letters from a source word.
 * For languages like Japanese, characters are treated individually.
 */
function getUniqueLetters(word: string, language?: Language): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const char of word) {
    const upper = char.toUpperCase();
    if (upper === ' ') continue;
    // Normalize Hebrew final forms (sofit) so tiles show regular letter forms
    const normalized = language === 'he' ? normalizeHebrewLetter(upper) : upper;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

/** Played dates keep the old sources and center; practice/quick seeds are not dates and get v2. */
function isV2Puzzle(date: string): boolean {
  return !/^\d{4}-\d{2}-\d{2}$/.test(date) || date >= WHEEL_V2_START_DATE;
}

function moveFirstPlayableCenterToFront(letters: string[], language: Language): void {
  const hard = HARD_CENTER_LETTERS[language] ?? [];
  const idx = letters.findIndex(l => !hard.includes(l));
  if (idx > 0) letters.unshift(letters.splice(idx, 1)[0]);
}

/**
 * Generate a deterministic Word Wheel puzzle for a given date + language.
 * Same date + language = same puzzle worldwide.
 */
export function generateWordWheelPuzzle(
  dateString?: string,
  language: Language = 'en'
): WordWheelPuzzle {
  const date = dateString || getDailyChallengeDate();
  const puzzleNumber = getPuzzleNumber(date);

  // Seed PRNG — different namespace from Word Hunt
  const seedStr = `word-wheel-${SEED_SALT}-${date}-${language}`;
  const seed = hashString(seedStr);
  const random = mulberry32(seed);

  const v2 = isV2Puzzle(date);
  const sources = v2
    ? (WHEEL_V2_SOURCES[language]?.length ? WHEEL_V2_SOURCES[language] : WHEEL_V2_SOURCES.en)
    : (LEGACY_WHEEL_SOURCES[language] || LEGACY_WHEEL_SOURCES.en);
  const sourceIndex = Math.floor(random() * sources.length);
  const sourceWord = sources[sourceIndex];

  // Extract unique letters (take first 7 if more)
  let letters = getUniqueLetters(sourceWord, language);
  if (letters.length > 7) letters = letters.slice(0, 7);

  // If fewer than 7 unique letters, pad with common letters
  if (letters.length < 7) {
    const commonLetters = language === 'he'
      ? ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ח', 'י', 'כ', 'ל', 'מ', 'נ', 'ר', 'ש', 'ת']
      : language === 'ja'
        ? ['日', '月', '火', '水', '木', '金', '土', '人', '大', '小', '上', '下']
        : ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R', 'D', 'L', 'C', 'U', 'M'];
    const available = commonLetters.filter(l => !letters.includes(l));
    while (letters.length < 7 && available.length > 0) {
      const idx = Math.floor(random() * available.length);
      letters.push(available.splice(idx, 1)[0]);
    }
  }

  // Shuffle letters
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }

  if (v2) moveFirstPlayableCenterToFront(letters, language);
  const centerLetter = letters[0];
  const outerLetters = letters.slice(1, 7);

  return {
    centerLetter,
    outerLetters,
    allLetters: [centerLetter, ...outerLetters],
    puzzleDate: date,
    language,
    puzzleNumber,
  };
}

/**
 * Check if a word can be formed from the wheel letters,
 * using each letter at most once, and includes the center letter.
 */
export function isValidWordWheelWord(
  word: string,
  centerLetter: string,
  allLetters: string[]
): boolean {
  const upper = word.toUpperCase();

  // Must contain center letter
  if (!upper.includes(centerLetter.toUpperCase())) return false;

  // Each letter can only be used once (count available)
  const available = new Map<string, number>();
  for (const l of allLetters) {
    const u = l.toUpperCase();
    available.set(u, (available.get(u) || 0) + 1);
  }

  for (const char of upper) {
    const count = available.get(char);
    if (!count || count <= 0) return false;
    available.set(char, count - 1);
  }

  return true;
}
