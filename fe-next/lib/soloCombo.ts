/**
 * Solo-bots combo chain. Pure — the round hook applies `awardedWordPoints`
 * to the player's word score only. Bot scoring never calls this.
 *
 * A gap over 8s breaks the chain first; an 'ok' after that gap starts a new
 * streak at 1 (the silent word is not discarded). Praise is the highest
 * ladder rung the current streak has reached, and null below 3.
 */

export type SoloSubmissionResult = 'ok' | 'dup' | 'invalid' | 'short';

export interface SoloComboState {
  streak: number;
  multiplier: number;
  /** i18n key, or null when the streak is below the first rung. */
  praiseKey: string | null;
  /** Timestamp of the last 'ok'. Null until the first valid word. */
  lastOkMs: number | null;
}

const GAP_MS = 8000;

const PRAISE_LADDER: ReadonlyArray<readonly [number, string]> = [
  [15, 'singlePlayer.praise.legendary'],
  [10, 'singlePlayer.praise.rampage'],
  [6, 'singlePlayer.praise.hot'],
  [3, 'singlePlayer.praise.warm'],
];

export function initialSoloCombo(): SoloComboState {
  return { streak: 0, multiplier: 1, praiseKey: null, lastOkMs: null };
}

export function comboMultiplier(streak: number): number {
  return Math.min(3, 1 + Math.floor(streak / 4));
}

export function praiseKeyForStreak(streak: number): string | null {
  for (const [threshold, key] of PRAISE_LADDER) {
    if (streak >= threshold) return key;
  }
  return null;
}

export function applySubmission(
  state: SoloComboState,
  result: SoloSubmissionResult,
  nowMs: number,
): SoloComboState {
  const timedOut = state.lastOkMs != null && nowMs - state.lastOkMs > GAP_MS;
  let streak = result !== 'ok' || timedOut ? 0 : state.streak;
  let lastOkMs = state.lastOkMs;
  if (result === 'ok') {
    streak += 1;
    lastOkMs = nowMs;
  }
  return {
    streak,
    multiplier: comboMultiplier(streak),
    praiseKey: praiseKeyForStreak(streak),
    lastOkMs,
  };
}

/** Points actually added for one valid word. Non-ok submissions award 0. */
export function awardedWordPoints(basePts: number, multiplier: number): number {
  return basePts * multiplier;
}
