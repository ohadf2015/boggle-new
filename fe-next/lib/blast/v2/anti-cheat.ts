import type { BlastLevel, Locale } from './types';
import { LOCALE_CONFIGS } from './locale-config';

const MIN_TIME_PER_WORD = 5; // seconds

export type ClearSubmission = {
  levelNumber: number;
  locale: Locale;
  wordsFound: string[];
  timeSeconds: number;
  hintsUsed: number;
  wrongAttempts: number;
  cascadesTriggered: number;
  submissionId?: string;
};

export type ClearValidation = { ok: true } | { ok: false; reason: string };

export function validateLevelClear(submission: ClearSubmission, level: BlastLevel): ClearValidation {
  const config = LOCALE_CONFIGS[submission.locale];
  const normWords = new Set(level.words.map(config.normalize));
  const normFound = new Set(submission.wordsFound.map(config.normalize));

  // Check all found words are in level
  for (const word of normFound) {
    if (!normWords.has(word)) {
      return { ok: false, reason: `word not in level: ${word}` };
    }
  }

  // Check time bound
  const minTime = MIN_TIME_PER_WORD * level.words.length;
  if (submission.timeSeconds < minTime) {
    return { ok: false, reason: `time too fast: ${submission.timeSeconds}s < ${minTime}s` };
  }

  return { ok: true };
}

// Worst-case per-letter ceiling: cascade(20) × chain-mult-cap(4) × double-bonus(2) + coin-overlay(5)
// = 165 coins/letter. Loose upper bound that doesn't need the level data.
const MAX_COINS_PER_LETTER = 165;

export function maxPossibleCoins(submission: ClearSubmission): number {
  return submission.wordsFound.reduce((sum, w) => sum + w.length * MAX_COINS_PER_LETTER, 0);
}

export function validateChainBounds(submission: ClearSubmission): ClearValidation {
  const maxCascades = Math.max(0, submission.wordsFound.length - 1);
  if (submission.cascadesTriggered > maxCascades) {
    return {
      ok: false,
      reason: `cascade count ${submission.cascadesTriggered} exceeds max ${maxCascades} for ${submission.wordsFound.length} words`,
    };
  }
  return { ok: true };
}

export type AntiCheatCapResult =
  | { ok: true; trustedCoins: number }
  | { ok: false; reason: string };

export function applyAntiCheatCaps(submission: ClearSubmission, clientCoins: number): AntiCheatCapResult {
  const chain = validateChainBounds(submission);
  if (!chain.ok) return chain;
  const ceiling = maxPossibleCoins(submission);
  const trustedCoins = Math.max(0, Math.min(clientCoins, ceiling));
  return { ok: true, trustedCoins };
}

// Level-aware variant: validates wordsFound against the actual level + time floor + chain bound.
// Use this when the route can load the curated pack (levels 1..CURATED_LEVEL_CUTOFF).
export function applyAntiCheatCapsWithLevel(
  submission: ClearSubmission,
  clientCoins: number,
  level: BlastLevel,
): AntiCheatCapResult {
  const levelCheck = validateLevelClear(submission, level);
  if (!levelCheck.ok) return levelCheck;
  return applyAntiCheatCaps(submission, clientCoins);
}

export function starRating(submission: ClearSubmission, level: BlastLevel): 1 | 2 | 3 {
  const targetTime = 30 * level.words.length;
  const allWords = submission.wordsFound.length === level.words.length;

  if (allWords && submission.hintsUsed === 0 && submission.wrongAttempts <= 3 && submission.timeSeconds <= targetTime) {
    return 3;
  }
  if (submission.hintsUsed <= 1 || submission.wrongAttempts <= 5) {
    return 2;
  }
  return 1;
}
