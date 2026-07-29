/**
 * Leaderboard Scoring Policy
 *
 * Single source of truth for how a completed game contributes to the
 * COMPETITIVE leaderboard (`profiles.total_score`, which the season + global
 * leaderboard project from and rank by).
 *
 * Design goals (see docs/2026-06-01-points-economy-audit.md):
 *  - Daily and multiplayer/casual play are weighted EQUALLY (1x). The leaderboard
 *    is the sum of raw earned points; we do NOT amplify daily or attenuate
 *    multiplayer. Daily still tends to rank high because its raw per-game scores
 *    are larger, but multiplayer now counts fully and compounds across games.
 *  - Feature-gated / preview modes (admin-only `word-tower`, coming-soon
 *    `shiritori`) contribute NOTHING — they must not pollute the leaderboard.
 *  - XP / progression is a SEPARATE track and is intentionally NOT governed
 *    here (we don't punish players for playing casually; we only re-weight the
 *    competitive currency).
 *
 * NOTE: these weights are duplicated in SQL inside the
 * `recompute_current_season_leaderboard` Postgres function (the authoritative
 * source for the displayed `leaderboard.total_score`). If you change a weight
 * here, ship a matching migration redefining that function, or the live board
 * will silently desync from this per-game tally.
 *
 * Gating derives from the existing rotation weights (`GAME_MODE_WEIGHTS`) so it
 * cannot drift from the start-gate: a known mode with weight 0 is gated.
 */
import { GAME_MODE_WEIGHTS } from './gameModeSelector';

/**
 * Multiplier on a daily game's raw score when crediting the leaderboard.
 * 1x — daily is no longer amplified; raw points count as-is.
 */
export const DAILY_LEADERBOARD_WEIGHT = 1;

/**
 * Multiplier on a casual / multiplayer game's raw score.
 * 1x — multiplayer now counts the same per point as daily (was 0.25).
 */
export const CASUAL_LEADERBOARD_WEIGHT = 1;

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
