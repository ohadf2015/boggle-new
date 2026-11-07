/**
 * Quick Play round builder — seeded, deterministic boards scored vs solver-perfect.
 * Same seed + mode + language = same board and perfect score for everyone,
 * which is what makes challenge links ("beat my exact board") possible.
 */
import { randomUUID } from 'crypto';
import { findAllWords, getCachedTrie } from './boggleSolver';
import { calculateWordScore } from '@/shared/utils/scoring';
import { generateDailyGridWithWeightedLetters, selectDailyTargetWord } from '@/utils/dailyChallenge/gridGeneration';
import {
  generateWordWheelPuzzle,
  isValidWordWheelWord,
  type WordWheelPuzzle,
} from '@/utils/dailyChallenge/wordWheelGeneration';
import { scoreWord as scoreWheelWord } from '@/utils/dailyChallenge/wordWheelScoring';
// ESM import — a bare require() here trips the backend vitest CJS transform
// into a module-init loop (mixed-mode file) and hangs the whole test run.
import { dictionary, ensureLanguageLoaded } from '../dictionary';

export type QuickMode = 'classic' | 'blast' | 'word-hunt' | 'wheel-rush';

export interface QuickRoundConfig {
  mode: QuickMode;
  seed: string;
  language: string;
  durationSec: number;
  /** Board for grid modes (classic / blast / word-hunt); empty for wheel-rush */
  grid: string[][];
  /** Wheel puzzle for wheel-rush only */
  wheel?: WordWheelPuzzle;
  /** Seeded target word for word-hunt only */
  targetWord?: string;
  /** All solver-findable words, lowercase */
  words: string[];
  /** Every solver word scored — the anti-cheat ceiling, not a target anyone reaches. */
  perfectScore: number;
  /** The 60-second target: what a strong round looks like. Score % is measured against this. */
  parScore: number;
  /** How many words make up the par (the denominator players see). */
  parWords: number;
}

export const QUICK_ROUND_DURATION_SEC = 60;
const MAX_WHEEL_WORD_LENGTH = 7; // each wheel letter usable once

function dictionaryFor(language: string): Set<string> {
  switch (language) {
    case 'he': return dictionary.hebrewWords;
    case 'sv': return dictionary.swedishWords;
    case 'ja': return dictionary.japaneseWords;
    case 'es': return dictionary.spanishWords;
    default: return dictionary.englishWords;
  }
}

export function scoreWordsForMode(mode: QuickMode, words: string[]): number {
  if (mode === 'wheel-rush') {
    return words.reduce((sum, w) => sum + scoreWheelWord(w), 0);
  }
  return words.reduce((sum, w) => sum + calculateWordScore(w, 0), 0);
}

/**
 * Words in a strong 60-second round, per mode. "Perfect" (every solver word,
 * often 400-500 words and 15k-30k points) is unreachable: real rounds land at
 * 0-5% of it (quick_play_results Jul-Nov 2026: best classic 173 pts vs a
 * 15k-26k perfect). That one scale broke the % card, the rank ladder and the
 * 30/60/85% ghost rivals at once. Par is the sum of the N easiest words —
 * shortest first, the ones people actually find — so a good round reads 50-100%.
 * Blast is lower: tiles leave the board as you clear them.
 */
export const PAR_WORDS: Record<QuickMode, number> = {
  classic: 25,
  blast: 15,
  'word-hunt': 20,
  'wheel-rush': 30,
};

export function parScoreForMode(mode: QuickMode, words: string[]): { parScore: number; parWords: number } {
  const easiest = [...words]
    .sort((a, b) => a.length - b.length || scoreWordsForMode(mode, [a]) - scoreWordsForMode(mode, [b]))
    .slice(0, PAR_WORDS[mode]);
  return { parScore: Math.max(1, scoreWordsForMode(mode, easiest)), parWords: easiest.length };
}

export async function buildQuickRound(
  mode: QuickMode,
  language: string,
  seed?: string
): Promise<QuickRoundConfig> {
  const roundSeed = seed || randomUUID();
  // Cold Next process: dictionaries load lazily — an empty set would mint
  // garbage rounds (no words, perfectScore=1) instead of failing loud.
  if (dictionaryFor(language).size === 0) {
    await ensureLanguageLoaded(language as never);
    if (dictionaryFor(language).size === 0) {
      throw new Error(`Dictionary unavailable for language ${language}`);
    }
  }

  if (mode === 'wheel-rush') {
    // dateString is pure seed material for the generator; puzzleNumber would be
    // NaN for a non-date seed, so pin it to 0 (quick rounds have no puzzle #).
    const wheel = generateWordWheelPuzzle(`quick-${roundSeed}`, language as never);
    wheel.puzzleNumber = 0;
    const words: string[] = [];
    for (const raw of dictionaryFor(language)) {
      const w = raw.toLowerCase();
      if (w.length < 3 || w.length > MAX_WHEEL_WORD_LENGTH) continue;
      if (isValidWordWheelWord(w, wheel.centerLetter, wheel.allLetters)) words.push(w);
    }
    return {
      mode,
      seed: roundSeed,
      language,
      durationSec: QUICK_ROUND_DURATION_SEC,
      grid: [],
      wheel,
      words,
      perfectScore: Math.max(1, scoreWordsForMode(mode, words)),
      ...parScoreForMode(mode, words),
    };
  }

  const grid = generateDailyGridWithWeightedLetters(`quick-${roundSeed}`, language as never);
  // A trie is MANDATORY: findAllWords without one falls back to exhaustive
  // depth-15 DFS (no prefix pruning) and effectively never returns.
  const trie = getCachedTrie(language);
  if (!trie) throw new Error(`No dictionary trie for language ${language}`);
  const words = findAllWords(grid, language, { minLength: 3, maxLength: 10, trie })
    .map((w) => w.toLowerCase());
  const targetWord = mode === 'word-hunt'
    ? selectDailyTargetWord(grid, `quick-${roundSeed}`, language as never).word
    : undefined;
  return {
    mode,
    seed: roundSeed,
    language,
    durationSec: QUICK_ROUND_DURATION_SEC,
    grid,
    words,
    targetWord,
    perfectScore: Math.max(1, scoreWordsForMode(mode, words)),
    ...parScoreForMode(mode, words),
  };
}
