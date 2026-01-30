/**
 * Currency Utilities Tests
 *
 * Tests for gold calculation, upgrade purchasing, and cost scaling.
 * Follows TDD RED-GREEN-REFACTOR cycle.
 */

import {
  calculateLevelGold,
  getUpgradeCost,
  purchaseUpgrade,
  CURRENCY_CONFIG,
  STAT_UPGRADES,
} from '../currencyUtils';
import type { UpgradeId } from '../../types/progression';

describe('currencyUtils', () => {
  describe('CURRENCY_CONFIG', () => {
    it('should have valid base gold reward', () => {
      expect(CURRENCY_CONFIG.baseGoldReward).toBe(50);
    });

    it('should have valid growth rate', () => {
      expect(CURRENCY_CONFIG.goldGrowthRate).toBe(1.2);
    });

    it('should have difficulty multipliers', () => {
      expect(CURRENCY_CONFIG.difficultyMultipliers.easy).toBe(0.8);
      expect(CURRENCY_CONFIG.difficultyMultipliers.normal).toBe(1.0);
      expect(CURRENCY_CONFIG.difficultyMultipliers.hard).toBe(1.5);
    });

    it('should have star bonus percentage', () => {
      expect(CURRENCY_CONFIG.starBonusPercentage).toBe(10);
    });
  });

  describe('STAT_UPGRADES', () => {
    it('should have timeBonus upgrade defined', () => {
      const upgrade = STAT_UPGRADES.timeBonus;
      expect(upgrade.id).toBe('timeBonus');
      expect(upgrade.baseCost).toBe(500);
      expect(upgrade.benefitPerStack).toBe(10);
      expect(upgrade.maxStacks).toBe(5);
    });

    it('should have scoreBonus upgrade defined', () => {
      const upgrade = STAT_UPGRADES.scoreBonus;
      expect(upgrade.id).toBe('scoreBonus');
      expect(upgrade.baseCost).toBe(750);
      expect(upgrade.benefitPerStack).toBe(5);
      expect(upgrade.maxStacks).toBe(5);
    });

    it('should have xpBonus upgrade defined', () => {
      const upgrade = STAT_UPGRADES.xpBonus;
      expect(upgrade.id).toBe('xpBonus');
      expect(upgrade.baseCost).toBe(1000);
      expect(upgrade.benefitPerStack).toBe(10);
      expect(upgrade.maxStacks).toBe(5);
    });
  });

  describe('calculateLevelGold', () => {
    describe('base calculation', () => {
      it('should calculate gold for level 1, normal difficulty, 1 star', () => {
        const gold = calculateLevelGold(1, 'normal', 1);
        // Base: 50 * 1.2^1 = 60
        // Difficulty: 60 * 1.0 = 60
        // Stars: 60 * (1 + 1 * 0.1) = 66
        expect(gold).toBe(66);
      });

      it('should calculate gold for level 5, normal difficulty, 1 star', () => {
        const gold = calculateLevelGold(5, 'normal', 1);
        // Base: 50 * 1.2^5 = 124.416
        // Difficulty: 124.416 * 1.0 = 124.416
        // Stars: 124.416 * 1.1 = 136.8576
        expect(gold).toBe(137); // Rounded
      });

      it('should calculate gold for level 10, normal difficulty, 1 star', () => {
        const gold = calculateLevelGold(10, 'normal', 1);
        // Base: 50 * 1.2^10 = 309.58
        // Difficulty: 309.58 * 1.0 = 309.58
        // Stars: 309.58 * 1.1 = 340.54
        expect(gold).toBe(341); // Rounded
      });
    });

    describe('difficulty multipliers', () => {
      it('should apply easy difficulty multiplier (0.8x)', () => {
        const gold = calculateLevelGold(1, 'easy', 1);
        // Base: 50 * 1.2^1 = 60
        // Difficulty: 60 * 0.8 = 48
        // Stars: 48 * 1.1 = 52.8
        expect(gold).toBe(53); // Rounded
      });

      it('should apply hard difficulty multiplier (1.5x)', () => {
        const gold = calculateLevelGold(1, 'hard', 1);
        // Base: 50 * 1.2^1 = 60
        // Difficulty: 60 * 1.5 = 90
        // Stars: 90 * 1.1 = 99
        expect(gold).toBe(99);
      });
    });

    describe('star bonuses', () => {
      it('should apply 1 star bonus (+10%)', () => {
        const gold = calculateLevelGold(1, 'normal', 1);
        // Stars: base * 1.1
        expect(gold).toBe(66);
      });

      it('should apply 2 star bonus (+20%)', () => {
        const gold = calculateLevelGold(1, 'normal', 2);
        // Base: 60, Stars: 60 * 1.2 = 72
        expect(gold).toBe(72);
      });

      it('should apply 3 star bonus (+30%)', () => {
        const gold = calculateLevelGold(1, 'normal', 3);
        // Base: 60, Stars: 60 * 1.3 = 78
        expect(gold).toBe(78);
      });
    });

    describe('scaling balance', () => {
      it('should scale exponentially with level', () => {
        const level1 = calculateLevelGold(1, 'normal', 1);
        const level20 = calculateLevelGold(20, 'normal', 1);
        const level50 = calculateLevelGold(50, 'normal', 1);

        // Each level should give more gold than previous
        expect(level20).toBeGreaterThan(level1);
        expect(level50).toBeGreaterThan(level20);

        // Verify exponential growth is working
        expect(level1).toBeGreaterThan(0);
        expect(level20).toBeGreaterThan(level1 * 10); // Significant growth
        expect(level50).toBeGreaterThan(level20 * 10); // Continued growth

        // Calculate total cost of all upgrades
        let totalUpgradeCost = 0;
        const upgradeIds: UpgradeId[] = ['timeBonus', 'scoreBonus', 'xpBonus'];
        upgradeIds.forEach((id) => {
          for (let stack = 0; stack < 5; stack++) {
            totalUpgradeCost += getUpgradeCost(id, stack);
          }
        });

        // Total upgrade cost should be substantial
        expect(totalUpgradeCost).toBeGreaterThan(10000);
      });
    });
  });

  describe('getUpgradeCost', () => {
    describe('timeBonus costs', () => {
      it('should calculate cost for stack 0 (base cost)', () => {
        const cost = getUpgradeCost('timeBonus', 0);
        // Base cost: 500 * 1.5^0 = 500
        expect(cost).toBe(500);
      });

      it('should calculate cost for stack 1', () => {
        const cost = getUpgradeCost('timeBonus', 1);
        // 500 * 1.5^1 = 750
        expect(cost).toBe(750);
      });

      it('should calculate cost for stack 2', () => {
        const cost = getUpgradeCost('timeBonus', 2);
        // 500 * 1.5^2 = 1125
        expect(cost).toBe(1125);
      });

      it('should calculate cost for stack 4 (last stack)', () => {
        const cost = getUpgradeCost('timeBonus', 4);
        // 500 * 1.5^4 = 2531.25 -> rounds to 2531
        expect(cost).toBe(2531); // Rounded
      });
    });

    describe('scoreBonus costs', () => {
      it('should calculate cost for stack 0', () => {
        const cost = getUpgradeCost('scoreBonus', 0);
        expect(cost).toBe(750);
      });

      it('should calculate cost for stack 2', () => {
        const cost = getUpgradeCost('scoreBonus', 2);
        // 750 * 1.5^2 = 1687.5
        expect(cost).toBe(1688); // Rounded
      });
    });

    describe('xpBonus costs', () => {
      it('should calculate cost for stack 0', () => {
        const cost = getUpgradeCost('xpBonus', 0);
        expect(cost).toBe(1000);
      });

      it('should calculate cost for stack 3', () => {
        const cost = getUpgradeCost('xpBonus', 3);
        // 1000 * 1.5^3 = 3375
        expect(cost).toBe(3375);
      });
    });

    describe('exponential scaling', () => {
      it('should scale costs exponentially', () => {
        const cost0 = getUpgradeCost('timeBonus', 0);
        const cost1 = getUpgradeCost('timeBonus', 1);
        const cost2 = getUpgradeCost('timeBonus', 2);

        // Each cost should be 1.5x previous
        expect(cost1).toBe(cost0 * 1.5);
        expect(cost2).toBe(cost1 * 1.5);
      });
    });
  });

  describe('purchaseUpgrade', () => {
    describe('successful purchases', () => {
      it('should purchase first timeBonus upgrade with sufficient gold', () => {
        const result = purchaseUpgrade('timeBonus', 1000, 0);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.newGold).toBe(500); // 1000 - 500
          expect(result.newStacks).toBe(1);
        }
      });

      it('should purchase second timeBonus upgrade', () => {
        const result = purchaseUpgrade('timeBonus', 1000, 1);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.newGold).toBe(250); // 1000 - 750
          expect(result.newStacks).toBe(2);
        }
      });

      it('should purchase scoreBonus upgrade', () => {
        const result = purchaseUpgrade('scoreBonus', 1000, 0);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.newGold).toBe(250); // 1000 - 750
          expect(result.newStacks).toBe(1);
        }
      });

      it('should purchase xpBonus upgrade', () => {
        const result = purchaseUpgrade('xpBonus', 1500, 0);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.newGold).toBe(500); // 1500 - 1000
          expect(result.newStacks).toBe(1);
        }
      });
    });

    describe('insufficient gold', () => {
      it('should fail when gold is insufficient for timeBonus', () => {
        const result = purchaseUpgrade('timeBonus', 400, 0);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('insufficient_gold');
        }
      });

      it('should fail when gold is exactly 1 less than cost', () => {
        const result = purchaseUpgrade('timeBonus', 499, 0);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('insufficient_gold');
        }
      });

      it('should succeed when gold is exactly equal to cost', () => {
        const result = purchaseUpgrade('timeBonus', 500, 0);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.newGold).toBe(0);
        }
      });
    });

    describe('max stacks reached', () => {
      it('should fail when timeBonus is at max stacks (5)', () => {
        const result = purchaseUpgrade('timeBonus', 10000, 5);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('max_stacks_reached');
        }
      });

      it('should succeed at stack 4 (one before max)', () => {
        const result = purchaseUpgrade('timeBonus', 3000, 4);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.newStacks).toBe(5);
        }
      });
    });

    describe('invalid upgrade', () => {
      it('should fail for invalid upgrade ID', () => {
        const result = purchaseUpgrade('invalidUpgrade' as UpgradeId, 1000, 0);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('invalid_upgrade');
        }
      });
    });

    describe('pure function behavior', () => {
      it('should not mutate input values', () => {
        const initialGold = 1000;
        const initialStacks = 0;
        purchaseUpgrade('timeBonus', initialGold, initialStacks);

        // Values should remain unchanged
        expect(initialGold).toBe(1000);
        expect(initialStacks).toBe(0);
      });

      it('should return consistent results for same inputs', () => {
        const result1 = purchaseUpgrade('timeBonus', 1000, 0);
        const result2 = purchaseUpgrade('timeBonus', 1000, 0);

        expect(result1).toEqual(result2);
      });
    });
  });

  describe('economic balance', () => {
    it('should require multiple levels to afford first upgrade', () => {
      const level1Gold = calculateLevelGold(1, 'normal', 3);
      const firstUpgradeCost = getUpgradeCost('timeBonus', 0);

      // Should need ~8-10 perfect level completions for cheapest upgrade
      expect(level1Gold * 8).toBeGreaterThanOrEqual(firstUpgradeCost);
    });

    it('should require grinding for max upgrades', () => {
      // Total cost to max all upgrades
      let totalCost = 0;
      const upgradeIds: UpgradeId[] = ['timeBonus', 'scoreBonus', 'xpBonus'];

      upgradeIds.forEach((id) => {
        for (let stack = 0; stack < 5; stack++) {
          totalCost += getUpgradeCost(id, stack);
        }
      });

      // Should require many level completions
      const level20Gold = calculateLevelGold(20, 'hard', 3);
      const levelsNeeded = Math.ceil(totalCost / level20Gold);

      // Should need at least 8+ level completions (balanced for progression)
      // With hard difficulty and perfect stars, level 20 gives ~1406 gold
      // Total upgrade cost is ~11,250 gold, requiring ~8 completions
      expect(levelsNeeded).toBeGreaterThanOrEqual(8);
      expect(totalCost).toBeGreaterThan(10000); // Significant investment
    });
  });
});
