/**
 * Pure detection for hidden achievements. Split by INPUT SOURCE so each detector
 * stays pure, total, and independently testable:
 *  - selection-gesture detectors are fed the drag path size + board size,
 *  - word-pattern detectors are fed an accepted valid word + game context.
 *
 * Every function is total: malformed/empty input yields []. Dedup is NOT done
 * here — that is the state layer's job (hiddenAchievementState.ts).
 */

import type { HiddenAchievementId } from './hiddenAchievements';

const PALINDROME_MIN_LEN = 4;
const SPEED_DEMON_WORDS = 5;
const SPEED_DEMON_WINDOW_SEC = 10;
const TRIPLE_THREAT_REPEAT = 3;

export interface SelectionAchievementContext {
  /** Number of tiles touched in the just-completed drag. */
  selectedTileCount: number;
  /** Total tiles on the board (rows * cols). */
  totalTiles: number;
}

export interface WordAchievementContext {
  /** The accepted valid word. */
  word: string;
  /** `timeSinceStart` (seconds) for every valid word found so far, incl. this one. */
  validWordTimesSec: number[];
}

function isPalindrome(word: string): boolean {
  const w = word.toLowerCase();
  return w === [...w].reverse().join('');
}

function hasLetterRepeatedAtLeast(word: string, n: number): boolean {
  const counts: Record<string, number> = {};
  for (const ch of word.toLowerCase()) {
    counts[ch] = (counts[ch] ?? 0) + 1;
    if (counts[ch] >= n) return true;
  }
  return false;
}

/** Detect selection-gesture achievements (e.g. "select every tile in one drag"). */
export function detectSelectionAchievements(
  ctx: SelectionAchievementContext,
): HiddenAchievementId[] {
  const ids: HiddenAchievementId[] = [];
  if (ctx.totalTiles > 0 && ctx.selectedTileCount === ctx.totalTiles) {
    ids.push('board_sweep');
  }
  return ids;
}

/** Detect word-pattern achievements from an accepted valid word + game context. */
export function detectWordAchievements(
  ctx: WordAchievementContext,
): HiddenAchievementId[] {
  const ids: HiddenAchievementId[] = [];
  const word = ctx.word ?? '';
  if (!word) return ids;

  if (word.length >= PALINDROME_MIN_LEN && isPalindrome(word)) {
    ids.push('palindrome');
  }

  const fastWords = (ctx.validWordTimesSec ?? []).filter(
    (t) => t <= SPEED_DEMON_WINDOW_SEC,
  );
  if (fastWords.length >= SPEED_DEMON_WORDS) {
    ids.push('speed_demon');
  }

  if (hasLetterRepeatedAtLeast(word, TRIPLE_THREAT_REPEAT)) {
    ids.push('triple_threat');
  }

  return ids;
}
