/**
 * The player level curve. The SQL functions increment_player_xp and
 * update_player_stats_and_xp restate it; levelCurve.guard.test.ts pins them together.
 * Total XP to reach level L = round(100 * L^e), e by tier: 1.4 (≤25), 1.45 (≤50), 1.5 (≤75), 1.55.
 */

export const MAX_LEVEL = 100;
const LEVEL_BASE = 100;

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  pct: number;
  isMax: boolean;
}

export function levelExponent(level: number): number {
  if (level <= 25) return 1.4;
  if (level <= 50) return 1.45;
  if (level <= 75) return 1.5;
  return 1.55;
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(LEVEL_BASE * Math.pow(level, levelExponent(level)));
}

export function levelFromXp(xp: number): number {
  if (!(xp > 0)) return 1;
  let low = 1;
  let high = MAX_LEVEL;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (xpForLevel(mid) <= xp) low = mid;
    else high = mid - 1;
  }
  return low;
}

export function levelProgress(xp: number): LevelProgress {
  const total = Math.max(0, xp || 0);
  const level = levelFromXp(total);
  const start = xpForLevel(level);
  if (level >= MAX_LEVEL) {
    return { level, xpIntoLevel: total - start, xpForNext: 0, pct: 100, isMax: true };
  }
  const xpForNext = xpForLevel(level + 1) - start;
  const xpIntoLevel = total - start;
  const pct = Math.min(99, Math.floor((xpIntoLevel / xpForNext) * 100));
  return { level, xpIntoLevel, xpForNext, pct, isMax: false };
}

export function levelBeforeGrant(newTotalXp: number, granted: number): number {
  return levelFromXp(Math.max(0, newTotalXp - Math.max(0, granted)));
}
