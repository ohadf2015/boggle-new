import { describe, it, expect } from 'vitest';
import { xpForLevel } from '@/shared/xp/levelCurve';
import { buildXpMoment } from '../xpMomentModel';

describe('buildXpMoment', () => {
  it('fills within one level from the old total to the new one', () => {
    // Given a game that stays inside level 3
    const floor = xpForLevel(3);
    const span = xpForLevel(4) - floor;
    const before = floor + Math.round(span * 0.2);
    const gained = Math.round(span * 0.3);
    // When the moment is built
    const m = buildXpMoment(gained, before + gained);
    // Then one segment fills level 3 from ~20% to ~50%
    expect(m.levelUp).toBe(false);
    expect(m.segments).toEqual([{ level: 3, fromPct: m.from.pct, toPct: m.to.pct }]);
    expect(m.from.pct).toBeGreaterThanOrEqual(19);
    expect(m.to.pct).toBeGreaterThanOrEqual(49);
  });

  it('a level crossing fills the old level to 100, then the new level from 0', () => {
    const before = xpForLevel(5) - 10;
    const m = buildXpMoment(40, before + 40);
    expect(m.levelUp).toBe(true);
    expect(m.segments).toEqual([
      { level: 4, fromPct: m.from.pct, toPct: 100 },
      { level: 5, fromPct: 0, toPct: m.to.pct },
    ]);
  });

  it('crossing several levels jumps to the final level', () => {
    const m = buildXpMoment(xpForLevel(9) - xpForLevel(4), xpForLevel(9) + 1);
    expect(m.segments.map((s) => s.level)).toEqual([4, 9]);
    expect(m.to.level).toBe(9);
  });

  it('never starts below zero XP', () => {
    const m = buildXpMoment(500, 100);
    expect(m.from.level).toBe(1);
    expect(m.from.xpIntoLevel).toBe(0);
  });

  it('treats a missing or negative gain as nothing gained', () => {
    const m = buildXpMoment(-5, xpForLevel(2));
    expect(m.gained).toBe(0);
    expect(m.levelUp).toBe(false);
  });
});
