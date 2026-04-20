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

// ==========================================
// Nine-letter source words per language
// ==========================================
// These words provide the 9 unique letters for each puzzle.
// Players don't need to find the source word — it's just the seed.

const NINE_LETTER_SOURCES: Record<Language, string[]> = {
  en: [
    'BREATHING', 'COUNTRIES', 'DANGEROUS', 'EDUCATION', 'FINGERTIP',
    'GARDENING', 'HARMONIZE', 'IMAGINERY', 'JUMBOSIZE', 'KNOWLEDGE',
    'LANDSCAPE', 'MACHINERY', 'NIGHTCLUB', 'OPERATING', 'PLAYSCORE',
    'QUESTIONS', 'REACTIONS', 'SCOLARING', 'TRAMLINES', 'UPLIGHTER',
    'VOLCANISM', 'WORSENING', 'EXPLORING', 'YEARNINGS', 'SPRINKLED',
    'BLUNDERS', 'COMPANIES', 'DIRECTION', 'EXPORTING', 'FLOWERING',
    'GOVERNING', 'HORSEBACK', 'INVADERS', 'LAUNCHING', 'MOLECULES',
    'NUMBERING', 'OUTSCORED', 'PRACTICED', 'REMAINING', 'SURPRISED',
    'THOUSANDS', 'UNMASKING', 'VICTIMLESS', 'WANDERING', 'ANCHORING',
    'BUILDINGS', 'CERTAINLY', 'DESERVING', 'EXCLUDING', 'FURNISHED',
    'GROUNDING', 'HERODINGS', 'ISLANDERS', 'JUXTAPOSE', 'KINGFISHER',
    'LEVITAING', 'MISGUIDED', 'WONDERING', 'UPHOLDING', 'CARVINGS',
    'DREAMLIKE', 'FROSTBITE', 'NIGHTWARE', 'PUBLISHED', 'RECOGNISE',
    'SHOULDERS', 'THUMBSCRW', 'UNKINDEST', 'VOLUNTARY', 'WITHERING',
    'CUSTOMERS', 'FRAGMENTS', 'HANDWROTE', 'MICROWAVE', 'OUTSMARTED',
    'PLUNDERED', 'KEYSTONED', 'OBJECTING', 'RESHAPING', 'WORLDWIDE',
    'CLUSTERING', 'DIALOGUES', 'FRANCHISE', 'HORSEMINT', 'JAVELINS',
    'MARKETING', 'NEURALKIT', 'PROVIDING', 'SQUIRMED', 'TRANSFORM',
    'UPBRAIDED', 'VERBOSITY', 'WHETSTONE', 'YOUNGSTER', 'BADMINTON',
    'CLOBBERED', 'DYNAMITES', 'EXPECTING', 'FULCRTIPS', 'GEOMETRIC',
  ],
  he: [
    'מחשבונים', 'התלמידים', 'הספרייה', 'משחקיהם',
    'מתכוננים', 'השכנייה', 'הרכבתיה', 'תלבושות',
  ],
  sv: [
    'BOKSTAVER', 'DATORSPEL', 'FRIHANDIG', 'GRUNDKURS',
    'HUVUDSIDA', 'KLARGÖRAS', 'LANDSTING', 'MUSIKBAND',
  ],
  ja: [
    '新しい世界', '教育機関', '自然環境', '技術革新',
    '文化交流', '経済発展', '社会問題', '健康管理',
  ],
  es: [
    'RESPALDOS', 'CAMINANDO', 'DECORATIV', 'ENCONTRAR',
    'FABRICADO', 'GOBIERNO', 'HORMIGAS', 'INDOMABLE',
  ],
  fr: [],
  de: [],
};

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

  // Pick a source word deterministically
  const sources = NINE_LETTER_SOURCES[language] || NINE_LETTER_SOURCES.en;
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

  // Center letter is the most "useful" — pick one that appears most in common words
  // For simplicity: use the first letter after shuffle (deterministic)
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
