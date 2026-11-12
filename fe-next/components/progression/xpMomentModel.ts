import { levelProgress, type LevelProgress } from '@/shared/xp/levelCurve';

export interface XpSegment {
  level: number;
  fromPct: number;
  toPct: number;
}

export interface XpMoment {
  gained: number;
  from: LevelProgress;
  to: LevelProgress;
  levelUp: boolean;
  segments: XpSegment[];
}

export function buildXpMoment(gained: number, total: number): XpMoment {
  const after = Math.max(0, total || 0);
  const gain = Math.max(0, Math.min(gained || 0, after));
  const from = levelProgress(after - gain);
  const to = levelProgress(after);
  const levelUp = to.level > from.level;
  const segments: XpSegment[] = levelUp
    ? [
        { level: from.level, fromPct: from.pct, toPct: 100 },
        { level: to.level, fromPct: 0, toPct: to.pct },
      ]
    : [{ level: to.level, fromPct: from.pct, toPct: to.pct }];
  return { gained: Math.max(0, gained || 0), from, to, levelUp, segments };
}
