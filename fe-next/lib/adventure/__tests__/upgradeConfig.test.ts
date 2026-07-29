import {
  UPGRADES,
  UPGRADE_CATEGORIES,
  getUpgrade,
  getAvailableUpgrades,
  getUpgradesByCategory,
  getUpgradeTier,
  getNextTierCost,
  canAffordUpgrade,
  purchaseUpgrade,
  getTotalUpgradeCost,
  getUpgradeEffect,
  type UpgradeState,
  type UpgradeCategory,
} from '../upgradeConfig';

describe('upgradeConfig', () => {
  // ==============================================
  // UPGRADES DATA INTEGRITY
  // ==============================================

  describe('UPGRADES catalog', () => {
    it('should contain exactly 11 upgrades', () => {
      expect(UPGRADES).toHaveLength(11);
    });

    it('should have unique IDs', () => {
      const ids = UPGRADES.map(u => u.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(UPGRADES.map(u => [u.id, u]))('%s has at least 2 tiers', (_id, upgrade) => {
      expect(upgrade.tiers.length).toBeGreaterThanOrEqual(2);
    });

    it.each(UPGRADES.map(u => [u.id, u]))('%s has all positive costs', (_id, upgrade) => {
      upgrade.tiers.forEach((t: { cost: number }) => {
        expect(t.cost).toBeGreaterThan(0);
      });
    });

    it.each(UPGRADES.map(u => [u.id, u]))('%s has sequential tier levels', (_id, upgrade) => {
      const levels = upgrade.tiers.map((t: { level: number }) => t.level);
      levels.forEach((level: number, i: number) => {
        expect(level).toBe(i + 1);
      });
    });

    it.each(UPGRADES.map(u => [u.id, u]))('%s has unlockWorld between 1 and 10', (_id, upgrade) => {
      expect(upgrade.unlockWorld).toBeGreaterThanOrEqual(1);
      expect(upgrade.unlockWorld).toBeLessThanOrEqual(10);
    });

    it('should cover all 4 categories', () => {
      const categories = new Set(UPGRADES.map(u => u.category));
      expect(categories).toEqual(new Set(['excavation', 'survival', 'fortune', 'mastery']));
    });

    it('should have 4 category metadata entries matching all categories', () => {
      const metaIds = UPGRADE_CATEGORIES.map(c => c.id);
      expect(metaIds).toEqual(['excavation', 'survival', 'fortune', 'mastery']);
    });
  });

  // ==============================================
  // getUpgrade
  // ==============================================

  describe('getUpgrade', () => {
    it('should return upgrade definition for valid ID', () => {
      const upgrade = getUpgrade('wordRadar');
      expect(upgrade).toBeDefined();
      expect(upgrade!.id).toBe('wordRadar');
      expect(upgrade!.category).toBe('excavation');
    });

    it('should return undefined for invalid ID', () => {
      expect(getUpgrade('nonexistent')).toBeUndefined();
    });
  });

  // ==============================================
  // getAvailableUpgrades
  // ==============================================

  describe('getAvailableUpgrades', () => {
    it('should return only world 1 upgrades when currentWorld is 1', () => {
      const available = getAvailableUpgrades(1);
      expect(available.every(u => u.unlockWorld <= 1)).toBe(true);
      expect(available.length).toBeGreaterThan(0);
    });

    it('should return more upgrades as world increases', () => {
      const w1 = getAvailableUpgrades(1);
      const w5 = getAvailableUpgrades(5);
      expect(w5.length).toBeGreaterThan(w1.length);
    });

    it('should return all upgrades at world 10', () => {
      expect(getAvailableUpgrades(10)).toHaveLength(UPGRADES.length);
    });

    it('should return empty for world 0', () => {
      expect(getAvailableUpgrades(0)).toHaveLength(0);
    });
  });

  // ==============================================
  // getUpgradesByCategory
  // ==============================================

  describe('getUpgradesByCategory', () => {
    it('should return only excavation upgrades', () => {
      const result = getUpgradesByCategory('excavation');
      expect(result.every(u => u.category === 'excavation')).toBe(true);
      expect(result.length).toBe(3);
    });

    it('should return only mastery upgrades', () => {
      const result = getUpgradesByCategory('mastery');
      expect(result.every(u => u.category === 'mastery')).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should return empty for unknown category', () => {
      expect(getUpgradesByCategory('unknown' as UpgradeCategory)).toHaveLength(0);
    });
  });

  // ==============================================
  // getUpgradeTier
  // ==============================================

  describe('getUpgradeTier', () => {
    it('should return 0 for unpurchased upgrade', () => {
      expect(getUpgradeTier({}, 'wordRadar')).toBe(0);
    });

    it('should return stored tier level', () => {
      expect(getUpgradeTier({ wordRadar: 3 }, 'wordRadar')).toBe(3);
    });
  });

  // ==============================================
  // getNextTierCost
  // ==============================================

  describe('getNextTierCost', () => {
    it('should return tier 1 cost when unpurchased', () => {
      // Given wordRadar tier 1 costs 60
      expect(getNextTierCost({}, 'wordRadar')).toBe(60);
    });

    it('should return tier 2 cost when at tier 1', () => {
      expect(getNextTierCost({ wordRadar: 1 }, 'wordRadar')).toBe(120);
    });

    it('should return null when maxed out', () => {
      // wordRadar has 5 tiers
      expect(getNextTierCost({ wordRadar: 5 }, 'wordRadar')).toBeNull();
    });

    it('should return null for invalid upgrade ID', () => {
      expect(getNextTierCost({}, 'nonexistent')).toBeNull();
    });
  });

  // ==============================================
  // canAffordUpgrade
  // ==============================================

  describe('canAffordUpgrade', () => {
    it('should return true when gold >= cost', () => {
      // wordRadar tier 1 costs 60
      expect(canAffordUpgrade({}, 'wordRadar', 60)).toBe(true);
      expect(canAffordUpgrade({}, 'wordRadar', 100)).toBe(true);
    });

    it('should return false when gold < cost', () => {
      expect(canAffordUpgrade({}, 'wordRadar', 59)).toBe(false);
    });

    it('should return false when maxed out', () => {
      expect(canAffordUpgrade({ wordRadar: 5 }, 'wordRadar', 9999)).toBe(false);
    });

    it('should return false for invalid upgrade', () => {
      expect(canAffordUpgrade({}, 'nonexistent', 9999)).toBe(false);
    });
  });

  // ==============================================
  // purchaseUpgrade
  // ==============================================

  describe('purchaseUpgrade', () => {
    it('should return new state and remaining gold on success', () => {
      const result = purchaseUpgrade({}, 'wordRadar', 100);
      expect(result).not.toBeNull();
      expect(result!.state.wordRadar).toBe(1);
      expect(result!.gold).toBe(40); // 100 - 60
    });

    it('should increment existing tier', () => {
      const result = purchaseUpgrade({ wordRadar: 1 }, 'wordRadar', 200);
      expect(result!.state.wordRadar).toBe(2);
      expect(result!.gold).toBe(80); // 200 - 120
    });

    it('should not mutate original state', () => {
      const original: UpgradeState = { wordRadar: 1 };
      purchaseUpgrade(original, 'wordRadar', 200);
      expect(original.wordRadar).toBe(1);
    });

    it('should return null when insufficient gold', () => {
      expect(purchaseUpgrade({}, 'wordRadar', 10)).toBeNull();
    });

    it('should return null when already maxed', () => {
      expect(purchaseUpgrade({ wordRadar: 5 }, 'wordRadar', 9999)).toBeNull();
    });

    it('should return null for invalid upgrade', () => {
      expect(purchaseUpgrade({}, 'nonexistent', 9999)).toBeNull();
    });
  });

  // ==============================================
  // getTotalUpgradeCost
  // ==============================================

  describe('getTotalUpgradeCost', () => {
    it('should return a positive number', () => {
      expect(getTotalUpgradeCost()).toBeGreaterThan(0);
    });

    it('should equal sum of all tier costs', () => {
      const manual = UPGRADES.reduce(
        (sum, u) => sum + u.tiers.reduce((s, t) => s + t.cost, 0),
        0
      );
      expect(getTotalUpgradeCost()).toBe(manual);
    });
  });

  // ==============================================
  // getUpgradeEffect
  // ==============================================

  describe('getUpgradeEffect', () => {
    it('should return 0 when tier is 0 (unpurchased)', () => {
      expect(getUpgradeEffect({}, 'wordRadar')).toBe(0);
    });

    it('should return correct value for tier 1', () => {
      // wordRadar tier 1 value is 0.3
      expect(getUpgradeEffect({ wordRadar: 1 }, 'wordRadar')).toBe(0.3);
    });

    it('should return correct value for higher tier', () => {
      // wordRadar tier 3 value is 2
      expect(getUpgradeEffect({ wordRadar: 3 }, 'wordRadar')).toBe(2);
    });

    it('should return 0 for invalid upgrade ID', () => {
      expect(getUpgradeEffect({}, 'nonexistent')).toBe(0);
    });

    it('should return 0 for tier beyond max', () => {
      expect(getUpgradeEffect({ wordRadar: 99 }, 'wordRadar')).toBe(0);
    });
  });

  describe('Blast Shield unlock timing (difficulty audit)', () => {
    it('blastShield should unlock at World 3 (when ice/bomb tiles appear)', () => {
      const blastShield = getUpgrade('blastShield');
      expect(blastShield).toBeDefined();
      expect(blastShield!.unlockWorld).toBe(3);
    });

    it('blastShield should be available in World 3 upgrades list', () => {
      const w3Upgrades = getAvailableUpgrades(3);
      const ids = w3Upgrades.map((u) => u.id);
      expect(ids).toContain('blastShield');
    });
  });
});
