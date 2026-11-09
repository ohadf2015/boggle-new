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
import {
  LEGACY_WHEEL_SOURCES, WHEEL_V2_SOURCES, WHEEL_V2_START_DATE, WHEEL_V3_SOURCES, WHEEL_V3_START_DATE,
  HARD_CENTER_LETTERS,
} from './wordWheelSources';
import { getUniqueLetters, shuffleInPlace } from './wordWheelLetters';
import { scheduledWheel } from './wordWheelSchedule';

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

const isDate = (seed: string) => /^\d{4}-\d{2}-\d{2}$/.test(seed);

/** Played dates keep the old sources and center; practice/quick seeds are not dates and get the newest pool. */
function isV2Puzzle(date: string): boolean {
  return !isDate(date) || date >= WHEEL_V2_START_DATE;
}

const sourcesFor = (table: Record<Language, readonly string[]>, language: Language) =>
  table[language]?.length ? table[language] : table.en;

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

  // Daily from v3: a no-repeat schedule (fresh source each day, few shared letters with yesterday).
  if (isDate(date) && date >= WHEEL_V3_START_DATE) {
    const { center, letters } = scheduledWheel(
      date, WHEEL_V3_START_DATE, sourcesFor(WHEEL_V3_SOURCES, language), language, HARD_CENTER_LETTERS[language] ?? [],
    );
    return { centerLetter: center, outerLetters: letters.slice(1), allLetters: letters, puzzleDate: date, language, puzzleNumber };
  }

  // Seed PRNG — different namespace from Word Hunt
  const seedStr = `word-wheel-${SEED_SALT}-${date}-${language}`;
  const seed = hashString(seedStr);
  const random = mulberry32(seed);

  const v2 = isV2Puzzle(date);
  const sources = !isDate(date)
    ? sourcesFor(WHEEL_V3_SOURCES, language)
    : v2 ? sourcesFor(WHEEL_V2_SOURCES, language) : (LEGACY_WHEEL_SOURCES[language] || LEGACY_WHEEL_SOURCES.en);
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

  shuffleInPlace(letters, random);

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
