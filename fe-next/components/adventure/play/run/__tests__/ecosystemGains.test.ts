/**
 * What the meta-game strip shows after a node — the STS victory-screen ledger
 * rule: one line per thing that actually moved, nothing for a zero.
 */
import { describe, it, expect } from 'vitest';
import { ecosystemGains, hasEcosystemGains, STREAK_MIN } from '../ecosystemGains';

const base = { xpGained: 0, coinsGained: 0, leaderboardPoints: 0, achievementsUnlocked: [] as string[] };

describe('ecosystemGains', () => {
  it('returns nothing when the node moved nothing (plain fight, xp daily cap hit)', () => {
    expect(ecosystemGains(base)).toEqual([]);
    expect(hasEcosystemGains(base)).toBe(false);
  });

  it('shows only the non-zero lines', () => {
    expect(ecosystemGains({ ...base, xpGained: 40 })).toEqual([{ kind: 'xp', value: 40 }]);
    expect(ecosystemGains({ ...base, coinsGained: 15, leaderboardPoints: 7 })).toEqual([
      { kind: 'coins', value: 15 },
      { kind: 'points', value: 7 },
    ]);
  });

  it('orders the ledger xp → coins → points → streak', () => {
    const gains = ecosystemGains({ ...base, xpGained: 40, coinsGained: 40, leaderboardPoints: 9, streak: { current: 3, longest: 5 } });
    expect(gains.map((g) => g.kind)).toEqual(['xp', 'coins', 'points', 'streak']);
  });

  it('given a run that ended with gold left, when the ledger is built, then the banked purse is its own coin line after coins', () => {
    // The purse is WHY gold mattered past the run — it must say so, not vanish into the coin total.
    expect(ecosystemGains({ ...base, coinsGained: 40, purseCoins: 35 }).map((g) => [g.kind, g.value])).toEqual([
      ['coins', 40],
      ['purse', 35],
    ]);
    expect(hasEcosystemGains({ ...base, purseCoins: 5 })).toBe(true);
  });

  it('carries the streak as its own value, not a delta', () => {
    expect(ecosystemGains({ ...base, streak: { current: 6, longest: 9 } })).toEqual([{ kind: 'streak', value: 6 }]);
  });

  it(`hides a streak below ${STREAK_MIN} days (day one is not a streak)`, () => {
    expect(ecosystemGains({ ...base, streak: { current: 1, longest: 4 } })).toEqual([]);
    expect(ecosystemGains({ ...base, streak: { current: 0, longest: 0 } })).toEqual([]);
  });

  it('ignores negative / non-finite server values instead of rendering them', () => {
    expect(ecosystemGains({ ...base, xpGained: -5, coinsGained: Number.NaN })).toEqual([]);
  });

  it('tolerates a result with no ecosystem fields at all (older payload)', () => {
    expect(ecosystemGains({})).toEqual([]);
    expect(hasEcosystemGains({})).toBe(false);
  });

  it('counts an achievement unlock as something worth showing even with zero gains', () => {
    expect(hasEcosystemGains({ ...base, achievementsUnlocked: ['VETERAN'] })).toBe(true);
    // …but an achievement is a toast, not a ledger line.
    expect(ecosystemGains({ ...base, achievementsUnlocked: ['VETERAN'] })).toEqual([]);
  });

  it('counts a level-up as something worth showing', () => {
    expect(hasEcosystemGains({ ...base, levelUp: { newLevel: 7, levelsGained: 1, newTitles: [] } })).toBe(true);
  });
});
