import { levelFromXp, xpForLevel } from '@/shared/xp/levelCurve';
import { LEVEL_UNLOCK_LADDER, normalizeLevel, type LevelUnlock } from '@/lib/avatar/unlocks';

export interface NextUnlockTeaserModel {
  level: number;
  next: LevelUnlock;
  pct: number;
  xpToGo: number;
}

export function getUpcomingUnlocks(level: number | null | undefined, count: number): LevelUnlock[] {
  const lvl = normalizeLevel(level);
  return LEVEL_UNLOCK_LADDER.filter(u => u.level > lvl).slice(0, count);
}

/** `knownLevel` covers a level-up this session that the profile XP hasn't caught up with. */
export function buildNextUnlockTeaser(totalXp: number, knownLevel?: number | null): NextUnlockTeaserModel | null {
  const xpLevel = levelFromXp(Math.max(0, totalXp));
  const level = Math.max(xpLevel, knownLevel ?? 0);
  const [next] = getUpcomingUnlocks(level, 1);
  if (!next) return null;
  const floorXp = xpForLevel(level);
  const targetXp = xpForLevel(next.level);
  const xp = Math.max(totalXp, floorXp);
  const span = Math.max(1, targetXp - floorXp);
  return {
    level,
    next,
    pct: Math.min(100, Math.max(0, Math.round(((xp - floorXp) / span) * 100))),
    xpToGo: Math.max(0, targetXp - xp),
  };
}
