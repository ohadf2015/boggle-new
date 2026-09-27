/**
 * Leaderboard mood policy — pure core.
 *
 * Translates the signals the in-game leaderboard already computes per tick
 * (per-player score delta, rank delta, current combo) into a single transient
 * avatar `mood`. This is the *policy* layer on top of the generic mood engine
 * (`avatarMood.ts` / `useAvatarMood`): it decides WHICH reaction a leaderboard
 * row should play, while the engine decides how the face renders.
 *
 * Pure + side-effect-free → unit-testable with zero mocks. Returns `null` when
 * nothing happened, which the caller maps to idle.
 */
import type { AvatarMood } from '@/lib/avatar/avatarMood';

export interface LeaderboardMoodInput {
  /** Points gained since the previous tick (0 if none). */
  scoreChange: number;
  /** Positions moved since the previous tick: >0 moved up, <0 dropped. */
  rankChange: number;
  /** Current combo/streak level for this player (0 if none). */
  comboLevel: number;
}

/**
 * A score delta at/above this is treated as a "big word" hype moment (flame
 * eyes) rather than an ordinary gain. Flavor heuristic, not exact — `scoreChange`
 * is a total-score delta so it can't perfectly isolate one big word. Tunable.
 */
export const BIG_WORD_THRESHOLD = 18;

/** Combo level at/above which a quiet tick still shows the "on fire" face. */
export const SUSTAINED_COMBO_THRESHOLD = 10;

/**
 * Priority (most dramatic / most-easily-lost beat wins):
 *   overtaken (flinch) > overtook (smug) > big-word > ordinary gain > sustained combo.
 */
export function deriveLeaderboardMood(input: LeaderboardMoodInput): AvatarMood | null {
  const { scoreChange, rankChange, comboLevel } = input;

  if (rankChange < 0) return 'emoteShock'; // just got overtaken — flinch
  if (rankChange > 0) return 'correct'; // just overtook someone — smug celebration
  if (scoreChange >= BIG_WORD_THRESHOLD) return 'streak'; // big-word hype
  if (scoreChange > 0) return 'correct'; // ordinary scored
  if (comboLevel >= SUSTAINED_COMBO_THRESHOLD) return 'streak'; // on fire, quiet tick
  return null;
}
