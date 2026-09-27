/**
 * Word Tower — Daily Tower seed (pure).
 *
 * The research's #1 retention lever: everyone climbs the SAME tower each UTC day,
 * so scores are comparable and there's a reason to come back tomorrow (NYT
 * Spelling Bee model). Pinning both the game code (per-day) and the player id
 * (constant) makes `initWordTowerState` deterministic across all players, so the
 * anchor + tray sequence is identical for everyone on a given day.
 */

/** Constant player id for the daily run — fixes the seed so the tray matches for all. */
export const DAILY_PLAYER_ID = 'daily';

/** The shared calendar day as YYYY-MM-DD in UTC (rolls over identically worldwide). */
export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Per-day seed key, e.g. `daily-2026-05-28`. */
export function dailyTowerGameCode(date: Date = new Date()): string {
  return `daily-${utcDateKey(date)}`;
}
