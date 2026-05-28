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

/**
 * Grade a level clear 1–3 stars.
 *
 * Reworked 2026-05-24: the prior version compared `wordsFound.length` to
 * `level.words.length`, which broke the 3-star path the moment a player found
 * any off-theme bonus word (wordsFound then exceeds the theme count). It also
 * left `wrongAttempts <= 5` always true (the reducer never tracked misses), so
 * every clear scored 2★ unless it was fast. Both are fixed here:
 *
 *   - "all theme words" is a set check, so bonus words never count against it.
 *   - Two routes to 3★ reward two play styles (Wordscapes-style): a spotless
 *     SPEED run, or a spotless run that DISCOVERS an off-theme bonus word.
 *     This makes free-form exploration a path to mastery, not just a sink.
 *
 * `bonusWordsFound` = count of dictionary words the player found that aren't on
 * the level's target list.
 */
export function starRating(
  submission: ClearSubmission,
  level: BlastLevel,
  bonusWordsFound = 0,
): 1 | 2 | 3 {
  const config = LOCALE_CONFIGS[submission.locale];
  const normFound = new Set(submission.wordsFound.map(config.normalize));
  const allTheme = level.words.every((w) => normFound.has(config.normalize(w)));

  // Partial finish (board cleared or soft-locked WITHOUT every theme word) caps
  // at 1 star — the "finish but fewer stars" rule. Every higher tier below is
  // therefore guaranteed all-theme, so the 2★ `solid` path can no longer leak a
  // 2-star grade to a run that missed a target.
  if (!allTheme) return 1;

  const targetTime = 30 * level.words.length;
  const spotless = submission.hintsUsed === 0 && submission.wrongAttempts <= 2;
  const masterful = spotless && (submission.timeSeconds <= targetTime || bonusWordsFound >= 1);
  if (masterful) return 3;

  const solid = submission.hintsUsed <= 1 && submission.wrongAttempts <= 5;
  if (solid) return 2;

  return 1;
}
