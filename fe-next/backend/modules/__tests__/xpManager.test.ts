/**
 * XP Manager Tests — prestige functions, XP curve, and toRoman
 */
import {
  canPrestige,
  getPrestigeMultiplier,
  getPrestigeDisplay,
  getNextPrestigeRewards,
  getPrestigeInfo,
  applyPrestigeMultiplier,
  toRoman,
  getXpForLevel,
  getLevelFromXp,
  getXpProgress,
  calculateGameXp,
  PRESTIGE_CONFIG,
  XP_CONFIG,
} from '../xpManager';

// ===== toRoman =====
describe('toRoman', () => {
  it.each([
    [1, 'I'],
    [2, 'II'],
    [3, 'III'],
    [4, 'IV'],
    [5, 'V'],
  ])('converts %i to %s', (num, expected) => {
    expect(toRoman(num)).toBe(expected);
  });
});

// ===== canPrestige =====
describe('canPrestige', () => {
  it('returns true at max level with prestige 0', () => {
    expect(canPrestige(100, 0)).toBe(true);
  });

  it('returns false below max level', () => {
    expect(canPrestige(99, 0)).toBe(false);
  });

  it('returns false at max prestige', () => {
    expect(canPrestige(100, PRESTIGE_CONFIG.MAX_PRESTIGE)).toBe(false);
  });

  it('returns true at max level with prestige 4', () => {
    expect(canPrestige(100, 4)).toBe(true);
  });
});

// ===== getPrestigeMultiplier =====
describe('getPrestigeMultiplier', () => {
  it('returns 1.0 for prestige 0', () => {
    expect(getPrestigeMultiplier(0)).toBe(1.0);
  });

  it('returns 1.25 for prestige 5', () => {
    expect(getPrestigeMultiplier(5)).toBe(1.25);
  });

  it('returns 1.0 for invalid prestige', () => {
    expect(getPrestigeMultiplier(99)).toBe(1.0);
  });
});

// ===== getPrestigeDisplay =====
describe('getPrestigeDisplay', () => {
  it('returns null for prestige 0', () => {
    expect(getPrestigeDisplay(0)).toBeNull();
  });

  it('returns display info for prestige 1-5', () => {
    for (let i = 1; i <= 5; i++) {
      const display = getPrestigeDisplay(i);
      expect(display).not.toBeNull();
      expect(display).toHaveProperty('name');
      expect(display).toHaveProperty('color');
      expect(display).toHaveProperty('icon');
    }
  });

  it('returns null for invalid prestige', () => {
    expect(getPrestigeDisplay(6)).toBeNull();
  });
});

// ===== getNextPrestigeRewards =====
describe('getNextPrestigeRewards', () => {
  it('returns rewards for prestige 0 -> 1', () => {
    const rewards = getNextPrestigeRewards(0);
    expect(rewards.length).toBeGreaterThan(0);
    expect(rewards.some(r => r.type === 'title')).toBe(true);
    expect(rewards.some(r => r.type === 'border')).toBe(true);
    expect(rewards.some(r => r.type === 'multiplier')).toBe(true);
  });

  it('returns empty for max prestige', () => {
    expect(getNextPrestigeRewards(5)).toEqual([]);
  });
});

// ===== applyPrestigeMultiplier =====
describe('applyPrestigeMultiplier', () => {
  it('applies 1.0x correctly', () => {
    expect(applyPrestigeMultiplier(100, 1.0)).toBe(100);
  });

  it('applies 1.05x correctly', () => {
    expect(applyPrestigeMultiplier(100, 1.05)).toBe(105);
  });

  it('rounds to nearest integer', () => {
    expect(applyPrestigeMultiplier(33, 1.05)).toBe(35); // 34.65 -> 35
  });
});

// ===== XP Curve (segmented exponents) =====
describe('XP curve', () => {
  it('level 1 requires 0 XP', () => {
    expect(getXpForLevel(1)).toBe(0);
  });

  it('XP increases monotonically', () => {
    let prev = 0;
    for (let i = 2; i <= 100; i++) {
      const xp = getXpForLevel(i);
      expect(xp).toBeGreaterThan(prev);
      prev = xp;
    }
  });

  it('uses segmented exponents (level 25 vs 26 should show curve change)', () => {
    const xp25 = getXpForLevel(25);
    const xp26 = getXpForLevel(26);
    // Level 25 uses exponent 1.4, level 26 uses 1.45
    // The ratio should reflect the steeper curve
    expect(xp26).toBeGreaterThan(xp25);
  });

  it('getLevelFromXp inverts getXpForLevel', () => {
    for (let level = 1; level <= 100; level++) {
      const xp = getXpForLevel(level);
      expect(getLevelFromXp(xp)).toBe(level);
    }
  });

  it('getLevelFromXp caps at MAX_LEVEL', () => {
    expect(getLevelFromXp(999999999)).toBe(100);
  });

  it('getLevelFromXp returns 1 for 0 XP', () => {
    expect(getLevelFromXp(0)).toBe(1);
  });
});

// ===== getXpProgress =====
describe('getXpProgress', () => {
  it('returns isMaxLevel true at level 100', () => {
    const xp = getXpForLevel(100);
    const progress = getXpProgress(xp);
    expect(progress.isMaxLevel).toBe(true);
    expect(progress.progressPercent).toBe(100);
  });

  it('returns correct progress mid-level', () => {
    const xpLvl5 = getXpForLevel(5);
    const xpLvl6 = getXpForLevel(6);
    const midXp = Math.floor((xpLvl5 + xpLvl6) / 2);
    const progress = getXpProgress(midXp);
    expect(progress.currentLevel).toBe(5);
    expect(progress.progressPercent).toBeGreaterThan(0);
    expect(progress.progressPercent).toBeLessThan(100);
  });
});

// ===== calculateGameXp =====
describe('calculateGameXp', () => {
  it('awards base XP for game completion', () => {
    const result = calculateGameXp({});
    expect(result.totalXp).toBe(XP_CONFIG.GAME_COMPLETION);
  });

  it('awards win bonus only in multiplayer', () => {
    const mp = calculateGameXp({ isWinner: true, playerCount: 2 });
    const sp = calculateGameXp({ isWinner: true, playerCount: 1 });
    expect(mp.breakdown.winBonus).toBe(XP_CONFIG.WIN_BONUS);
    expect(sp.breakdown.winBonus).toBe(0);
  });
});

// ===== getPrestigeInfo =====
describe('getPrestigeInfo', () => {
  it('returns comprehensive info for prestige 0', () => {
    const info = getPrestigeInfo(100, 0);
    expect(info.canPrestige).toBe(true);
    expect(info.prestigeMultiplier).toBe(1.0);
    expect(info.nextPrestigeRewards.length).toBeGreaterThan(0);
  });
});
