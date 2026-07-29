/**
 * Server-side validation for `/api/drills/submit` payloads.
 *
 * The API previously trusted client-supplied `score`, `wordsFound`, and
 * `durationSeconds` fields, allowing a malicious client to mint XP and
 * brain-score by POSTing absurd values. This module is the single
 * checkpoint for those sanity checks.
 *
 * Audit ref: `fe-next/docs/audits/brain-drills-2026-04-26.md` §B1.
 *
 * @module shared/utils/drillSubmissionValidation
 */

import { MAX_DRILL_LEVEL, MIN_DRILL_LEVEL } from './drillLeveling';

/** Drill types accepted by the API. Mirrors `DRILL_DOMAINS` keys. */
const VALID_DRILL_TYPES = [
  'lightning-round',
  'memory-hunt',
  'combo-master',
  'pattern-switcher',
  'rare-gems',
] as const;

type ValidDrillType = (typeof VALID_DRILL_TYPES)[number];

/** Per-level score ceilings (above this = cheat or bug). Indexed level-1. */
const PER_LEVEL_MAX_SCORE: readonly number[] = [500, 750, 1000, 1500, 2000];

/**
 * Empirical floor: even speed-typists land near 0.5s/word in drill
 * grids. Anything tighter implies an automated client.
 */
const MIN_SECONDS_PER_WORD = 0.5;

/**
 * Hard cap on session duration. Drill timers max out at 90s; padding
 * to 10min covers idle pauses but rejects clients that pretend a
 * session lasted hours.
 */
const MAX_DURATION_SECONDS = 600;

/** Cap on words a single drill grid can plausibly yield. */
const MAX_WORDS_FOUND = 200;

export interface DrillSubmissionInput {
  drillType: string;
  level: number;
  score: number;
  wordsFound: number;
  durationSeconds: number;
}

export type DrillSubmissionValidation =
  | { ok: true }
  | { ok: false; error: string };

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n);
}

function isNonNegFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

export function validateDrillSubmission(
  input: DrillSubmissionInput
): DrillSubmissionValidation {
  if (!VALID_DRILL_TYPES.includes(input.drillType as ValidDrillType)) {
    return { ok: false, error: 'Invalid drill type' };
  }

  if (!isInt(input.level) || input.level < MIN_DRILL_LEVEL || input.level > MAX_DRILL_LEVEL) {
    return { ok: false, error: `Level must be an integer in [${MIN_DRILL_LEVEL}, ${MAX_DRILL_LEVEL}]` };
  }

  if (!isNonNegFinite(input.score)) {
    return { ok: false, error: 'Score must be a non-negative finite number' };
  }
  const maxScore = PER_LEVEL_MAX_SCORE[input.level - 1];
  if (input.score > maxScore) {
    return { ok: false, error: `Score ${input.score} exceeds per-level max ${maxScore}` };
  }

  if (!isNonNegFinite(input.wordsFound) || input.wordsFound > MAX_WORDS_FOUND) {
    return { ok: false, error: 'wordsFound out of range' };
  }

  if (!isNonNegFinite(input.durationSeconds) || input.durationSeconds > MAX_DURATION_SECONDS) {
    return { ok: false, error: 'durationSeconds out of range' };
  }

  // Anti-bot: must take at least MIN_SECONDS_PER_WORD per word found.
  if (input.wordsFound > 0) {
    const minDuration = input.wordsFound * MIN_SECONDS_PER_WORD;
    if (input.durationSeconds < minDuration) {
      return {
        ok: false,
        error: `Session too fast: ${input.durationSeconds}s for ${input.wordsFound} words`,
      };
    }
  }

  return { ok: true };
}
