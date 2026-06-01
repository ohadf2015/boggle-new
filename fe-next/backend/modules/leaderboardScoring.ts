/**
 * Leaderboard Scoring Policy
 *
 * Single source of truth for how a completed game contributes to the
 * COMPETITIVE leaderboard (`profiles.total_score`, which the season + global
 * leaderboard project from and rank by).
 *
 * Design goals (see docs/2026-06-01-points-economy-audit.md):
 *  - The Daily Challenge is the dominant leaderboard source; casual free-play
 *    contributes far less, so standings are driven mostly by daily play.
 *  - Feature-gated / preview modes (admin-only `word-tower`, coming-soon
 *    `shiritori`) contribute NOTHING — they must not pollute the leaderboard.
 *  - XP / progression is a SEPARATE track and is intentionally NOT governed
 *    here (we don't punish players for playing casually; we only re-weight the
 *    competitive currency).
 *
 * Gating derives from the existing rotation weights (`GAME_MODE_WEIGHTS`) so it
 * cannot drift from the start-gate: a known mode with weight 0 is gated.
 */
import { GAME_MODE_WEIGHTS } from './gameModeSelector';

/** Multiplier on a daily game's raw score when crediting the leaderboard. */
export const DAILY_LEADERBOARD_WEIGHT = 3;

/** Multiplier on a casual / single-player game's raw score. < 1 so daily wins. */
export const CASUAL_LEADERBOARD_WEIGHT = 0.25;

const DAILY_MODE_ALIASES = new Set(['daily', 'daily-challenge']);

/**
 * A mode is gated iff it is a KNOWN game mode explicitly set to weight 0
 * (admin-only / coming-soon). Unknown or single-player mode strings
 * (e.g. 'daily-challenge', 'solo-bots') are NOT gated.
 */
export function isGatedMode(mode: string | null | undefined): boolean {
  if (mode == null) return false;
  return (GAME_MODE_WEIGHTS as Record<string, number>)[mode] === 0;
}

/** True if the mode is the Daily Challenge (the headline competitive event). */
export function isDailyMode(mode: string | null | undefined): boolean {
  return mode != null && DAILY_MODE_ALIASES.has(mode);
}

/** Whether a mode may contribute to the leaderboard / award XP at all. */
export function awardsLeaderboardPoints(mode: string | null | undefined): boolean {
  return !isGatedMode(mode);
}

/**
 * Leaderboard points (`total_score` increment) for a completed game.
 * Raw per-game score is preserved elsewhere (e.g. `game_results.score`); this
 * only governs the competitive currency.
 */
export function leaderboardPointsForGame(
  mode: string | null | undefined,
  rawScore: number
): number {
  if (!Number.isFinite(rawScore) || rawScore <= 0) return 0;
  if (isGatedMode(mode)) return 0;
  const weight = isDailyMode(mode) ? DAILY_LEADERBOARD_WEIGHT : CASUAL_LEADERBOARD_WEIGHT;
  return Math.round(rawScore * weight);
}
