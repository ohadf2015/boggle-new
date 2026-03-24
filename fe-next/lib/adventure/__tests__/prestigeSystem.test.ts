import {
  canPrestige,
  getPrestigeRank,
  getPrestigeXpMultiplier,
  getPrestigeGoldMultiplier,
  getPrestigePreview,
  MAX_PRESTIGE_LEVEL,
  PRESTIGE_RANKS,
} from '../prestigeSystem';

describe('prestigeSystem', () => {
  // Helper: generate full completions for all 10 worlds × 7 levels
  function fullCompletions(stars = 3) {
    const completions = [];
    for (let w = 1; w <= 10; w++) {
      for (let l = 1; l <= 7; l++) {
        completions.push({ world: w, level: l, stars });
      }
    }
    return completions;
  }

  describe('canPrestige', () => {
    it('returns false with no completions', () => {
      expect(canPrestige([], 0)).toBe(false);
    });

    it('returns false with partial completions', () => {
      const partial = fullCompletions().slice(0, 60); // missing 10 levels
      expect(canPrestige(partial, 0)).toBe(false);
    });

    it('returns true when all 70 levels completed with at least 1 star', () => {
      expect(canPrestige(fullCompletions(1), 0)).toBe(true);
    });

    it('returns true with 3 stars on all levels', () => {
      expect(canPrestige(fullCompletions(3), 0)).toBe(true);
    });

    it('returns false at max prestige level', () => {
      expect(canPrestige(fullCompletions(), MAX_PRESTIGE_LEVEL)).toBe(false);
    });

    it('returns false if any level has 0 stars', () => {
      const completions = fullCompletions();
      completions[35].stars = 0; // W6L1 = 0 stars
      expect(canPrestige(completions, 0)).toBe(false);
    });
  });

  describe('getPrestigeRank', () => {
    it('returns null for level 0', () => {
      expect(getPrestigeRank(0)).toBeNull();
    });

    it('returns bronze for level 1', () => {
      const rank = getPrestigeRank(1);
      expect(rank?.nameKey).toBe('adventure.prestige.ranks.bronze');
      expect(rank?.badgeColor).toBe('#CD7F32');
    });

    it('returns diamond for level 5', () => {
      expect(getPrestigeRank(5)?.nameKey).toBe('adventure.prestige.ranks.diamond');
    });

    it('returns null for level beyond max', () => {
      expect(getPrestigeRank(99)).toBeNull();
    });
  });

  describe('multipliers', () => {
    it('returns 1x for level 0 (no prestige)', () => {
      expect(getPrestigeXpMultiplier(0)).toBe(1);
      expect(getPrestigeGoldMultiplier(0)).toBe(1);
    });

    it('returns 1.1x XP and 1.1x gold at bronze (level 1)', () => {
      expect(getPrestigeXpMultiplier(1)).toBeCloseTo(1.1);
      expect(getPrestigeGoldMultiplier(1)).toBeCloseTo(1.1);
    });

    it('accumulates XP bonus across prestige levels (not just current rank)', () => {
      // Level 1: +0.1, Level 2: +0.2 → cumulative = 1 + 0.1 + 0.2 = 1.3
      expect(getPrestigeXpMultiplier(2)).toBeCloseTo(1.3);
      // Level 3: +0.3 → cumulative = 1 + 0.1 + 0.2 + 0.3 = 1.6
      expect(getPrestigeXpMultiplier(3)).toBeCloseTo(1.6);
      // Level 5: all bonuses → 1 + 0.1 + 0.2 + 0.3 + 0.4 + 0.5 = 2.5
      expect(getPrestigeXpMultiplier(5)).toBeCloseTo(2.5);
    });

    it('accumulates gold bonus across prestige levels', () => {
      // Level 2: 1 + 0.1 + 0.15 = 1.25
      expect(getPrestigeGoldMultiplier(2)).toBeCloseTo(1.25);
      // Level 5: 1 + 0.1 + 0.15 + 0.2 + 0.25 + 0.3 = 2.0
      expect(getPrestigeGoldMultiplier(5)).toBeCloseTo(2.0);
    });
  });

  describe('getPrestigePreview', () => {
    it('shows correct preview for first prestige', () => {
      const preview = getPrestigePreview(0, 150);
      expect(preview.nextLevel).toBe(1);
      expect(preview.nextRank?.nameKey).toBe('adventure.prestige.ranks.bronze');
      expect(preview.keeps).toContain('upgrades');
      expect(preview.keeps).toContain('gold');
      expect(preview.resets).toContain('worldCompletions');
      expect(preview.lifetimeStarsAdded).toBe(150);
    });
  });

  describe('PRESTIGE_RANKS', () => {
    it('has 5 ranks', () => {
      expect(PRESTIGE_RANKS).toHaveLength(5);
    });

    it('each rank has increasing bonuses', () => {
      for (let i = 1; i < PRESTIGE_RANKS.length; i++) {
        expect(PRESTIGE_RANKS[i].xpBonus).toBeGreaterThan(PRESTIGE_RANKS[i - 1].xpBonus);
        expect(PRESTIGE_RANKS[i].goldBonus).toBeGreaterThan(PRESTIGE_RANKS[i - 1].goldBonus);
      }
    });
  });
});
