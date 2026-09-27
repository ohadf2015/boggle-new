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
  hasRealOpponent,
  getDiminishingReturnsFactor,
  getDailyXpCap,
  PRESTIGE_CONFIG,
  XP_CONFIG,
} from '../xpManager';

// ===== hasRealOpponent =====
describe('hasRealOpponent', () => {
  it('is true only when at least two real (non-bot) players were present', () => {
    expect(hasRealOpponent(2)).toBe(true);
    expect(hasRealOpponent(3)).toBe(true);
    expect(hasRealOpponent(8)).toBe(true);
  });

  it('is false for a lone human (everyone else was a bot)', () => {
    expect(hasRealOpponent(1)).toBe(false);
    expect(hasRealOpponent(0)).toBe(false);
  });

  it('treats missing/invalid counts as no real opponent', () => {
    expect(hasRealOpponent(null)).toBe(false);
    expect(hasRealOpponent(undefined)).toBe(false);
  });
});

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

  it('returns 1.05 for prestige 1 (only rank 1 bonus)', () => {
    expect(getPrestigeMultiplier(1)).toBe(1.05);
  });

  it('accumulates bonuses across ranks (prestige 2 = 1.0 + 0.05 + 0.10 = 1.15)', () => {
    expect(getPrestigeMultiplier(2)).toBe(1.15);
  });

  it('accumulates bonuses across ranks (prestige 3 = 1.0 + 0.05 + 0.10 + 0.15 = 1.30)', () => {
    expect(getPrestigeMultiplier(3)).toBe(1.30);
  });

  it('accumulates bonuses across ranks (prestige 5 = 1.0 + 0.05 + 0.10 + 0.15 + 0.20 + 0.25 = 1.75)', () => {
    expect(getPrestigeMultiplier(5)).toBe(1.75);
  });

  it('caps at max prestige for out-of-range values', () => {
    // Prestige 99 clamps to MAX_PRESTIGE (5), returns full accumulated bonus
    expect(getPrestigeMultiplier(99)).toBe(getPrestigeMultiplier(5));
  });

  it('returns 1.0 for negative prestige', () => {
    expect(getPrestigeMultiplier(-1)).toBe(1.0);
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

  it('uses reduced score multiplier (0.15)', () => {
    const result = calculateGameXp({ score: 1000 });
    // 1000 * 0.15 = 150 score XP
    expect(result.breakdown.scoreXp).toBe(150);
  });

  it('caps singleplayer XP at SINGLEPLAYER_CAP (300)', () => {
    // High score + achievements should still cap at 300
    const result = calculateGameXp({ score: 10000, achievementCount: 20, playerCount: 1 });
    expect(result.totalXp).toBeLessThanOrEqual(XP_CONFIG.SINGLEPLAYER_CAP);
    expect(result.totalXp).toBe(XP_CONFIG.SINGLEPLAYER_CAP);
  });

  it('caps multiplayer XP at MULTIPLAYER_CAP (400)', () => {
    const result = calculateGameXp({ score: 10000, isWinner: true, achievementCount: 20, playerCount: 4 });
    expect(result.totalXp).toBeLessThanOrEqual(XP_CONFIG.MULTIPLAYER_CAP);
    expect(result.totalXp).toBe(XP_CONFIG.MULTIPLAYER_CAP);
  });

  it('caps achievement XP at ACHIEVEMENT_CAP (200)', () => {
    const result = calculateGameXp({ achievementCount: 10, playerCount: 1 });
    // 10 * 100 = 1000, but capped at 200
    expect(result.breakdown.achievementXp).toBeLessThanOrEqual(XP_CONFIG.ACHIEVEMENT_CAP);
    expect(result.breakdown.achievementXp).toBe(XP_CONFIG.ACHIEVEMENT_CAP);
  });

  it('does not cap low XP games', () => {
    const result = calculateGameXp({ score: 200, playerCount: 1 });
    // 50 base + 200*0.15 = 50 + 30 = 80, well under cap
    expect(result.totalXp).toBe(80);
  });
});

// ===== getDiminishingReturnsFactor =====
describe('getDiminishingReturnsFactor', () => {
  it('returns 1.0 for levels 1-25', () => {
    expect(getDiminishingReturnsFactor(1)).toBe(1.0);
    expect(getDiminishingReturnsFactor(25)).toBe(1.0);
  });

  it('returns 0.85 for levels 26-50', () => {
    expect(getDiminishingReturnsFactor(26)).toBe(0.85);
    expect(getDiminishingReturnsFactor(50)).toBe(0.85);
  });

  it('returns 0.70 for levels 51-75', () => {
    expect(getDiminishingReturnsFactor(51)).toBe(0.70);
    expect(getDiminishingReturnsFactor(75)).toBe(0.70);
  });

  it('returns 0.55 for levels 76-100', () => {
    expect(getDiminishingReturnsFactor(76)).toBe(0.55);
    expect(getDiminishingReturnsFactor(100)).toBe(0.55);
  });
});

// ===== getDailyXpCap =====
describe('getDailyXpCap', () => {
  it('returns full XP when under first threshold', () => {
    const result = getDailyXpCap(100, 0);
    expect(result).toBe(100);
  });

  it('returns full XP up to FULL_RATE threshold', () => {
    const result = getDailyXpCap(100, 1400);
    // dailyXpSoFar=1400, earning 100 more → 1500 total, all in FULL_RATE zone
    expect(result).toBe(100);
  });

  it('halves XP in the HALF_RATE zone (1500-3000)', () => {
    const result = getDailyXpCap(200, 1500);
    // All 200 XP falls in the half-rate zone → 100
    expect(result).toBe(100);
  });

  it('quarters XP above QUARTER_RATE threshold (3000+)', () => {
    const result = getDailyXpCap(400, 3000);
    // All 400 XP falls in the quarter-rate zone → 100
    expect(result).toBe(100);
  });

  it('handles XP that spans multiple zones', () => {
    // dailyXpSoFar=1400, earning 200 → 100 at full rate, 100 at half rate = 100+50 = 150
    const result = getDailyXpCap(200, 1400);
    expect(result).toBe(150);
  });

  it('returns at least 1 XP when earning positive amount', () => {
    const result = getDailyXpCap(1, 99999);
    expect(result).toBeGreaterThanOrEqual(1);
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
