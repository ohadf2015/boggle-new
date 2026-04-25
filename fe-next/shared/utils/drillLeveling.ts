/**
 * Shared drill-level promotion logic.
 *
 * Single source of truth for the brain-drill level ladder. Both the server
 * route (`/api/drills/submit`) and any client surface that previews "score
 * needed for next level" must read from here, never from drill-component
 * `LEVEL_CONFIGS` arrays.
 *
 * Why centralized: the same target ladder is currently duplicated across
 * 5 drill components and 2 server constants — drift here silently breaks
 * progression. Audit ref: `fe-next/docs/audits/brain-drills-2026-04-26.md` §H3.
 *
 * @module shared/utils/drillLeveling
 */

export const MIN_DRILL_LEVEL = 1;
export const MAX_DRILL_LEVEL = 5;

/**
 * Score required to clear each drill level.
 * Index `i` = threshold for level `i + 1` (i.e. `DRILL_TARGET_SCORES[0]` is
 * the bar a level-1 player must clear to be promoted to level 2).
 */
export const DRILL_TARGET_SCORES: readonly number[] = [50, 100, 200, 350, 500];

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return MIN_DRILL_LEVEL;
  const intLevel = Math.floor(level);
  if (intLevel < MIN_DRILL_LEVEL) return MIN_DRILL_LEVEL;
  if (intLevel > MAX_DRILL_LEVEL) return MAX_DRILL_LEVEL;
  return intLevel;
}

/** Threshold to clear `level` (clamped to valid range). */
export function getDrillTargetScore(level: number): number {
  const clamped = clampLevel(level);
  return DRILL_TARGET_SCORES[clamped - 1];
}

/**
 * Decide the player's level after a session ending with `score`.
 * Promotes by at most one level per session — multi-level skips are
 * intentionally disallowed so the server can't be coaxed into awarding
 * MAX_LEVEL XP from a single submission.
 */
export function getNextDrillLevel(currentLevel: number, score: number): number {
  if (!Number.isFinite(score) || score < 0) return clampLevel(currentLevel);
  const clamped = clampLevel(currentLevel);
  if (clamped >= MAX_DRILL_LEVEL) return MAX_DRILL_LEVEL;
  return score >= DRILL_TARGET_SCORES[clamped - 1] ? clamped + 1 : clamped;
}

/** Snapshot of a player's `drill_progress` row used for promotion math. */
export interface DrillProgressSnapshot {
  level: number;
  highScore: number;
  totalPlays: number;
  totalScore: number;
}

/** Result of folding a session result into prior progress. */
export interface DrillProgressUpdate extends DrillProgressSnapshot {
  avgScore: number;
}

/**
 * Fold a session score into the player's prior `drill_progress` row.
 * Pure function so the API route stays a thin DB-translator and the
 * promotion math can be exhaustively tested without supabase mocks.
 *
 * Pass `null` for first-play to seed defaults. Negative/non-finite
 * scores still count as a play (so abandon-rate ≠ skipped XP loophole)
 * but contribute zero to totals and never promote level.
 */
export function computeDrillProgressUpdate(
  prior: DrillProgressSnapshot | null,
  score: number
): DrillProgressUpdate {
  const safeScore = Number.isFinite(score) && score >= 0 ? score : 0;
  const base: DrillProgressSnapshot = prior ?? {
    level: MIN_DRILL_LEVEL,
    highScore: 0,
    totalPlays: 0,
    totalScore: 0,
  };

  const totalPlays = base.totalPlays + 1;
  const totalScore = base.totalScore + safeScore;
  const highScore = Math.max(base.highScore, safeScore);
  const avgScore = Math.round(totalScore / totalPlays);
  const level = safeScore > 0 || base.totalPlays === 0
    ? getNextDrillLevel(base.level, safeScore)
    : clampLevel(base.level);

  return { level, highScore, totalPlays, totalScore, avgScore };
}
