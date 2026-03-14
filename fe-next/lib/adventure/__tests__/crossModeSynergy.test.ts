import {
  getAdventureBonusesForMultiplayer,
  getUnlockedCosmetics,
  type CrossModeBonus,
} from '../crossModeSynergy';

describe('crossModeSynergy', () => {
  describe('getAdventureBonusesForMultiplayer', () => {
    it('should return no bonuses at prestige 0', () => {
      const bonus = getAdventureBonusesForMultiplayer(0, 0);
      expect(bonus.xpMultiplier).toBe(1.0);
      expect(bonus.border).toBeNull();
    });

    it('should grant XP multiplier at prestige 1+', () => {
      const bonus = getAdventureBonusesForMultiplayer(1, 0);
      expect(bonus.xpMultiplier).toBeGreaterThan(1.0);
    });

    it('should scale XP multiplier with prestige level', () => {
      const p1 = getAdventureBonusesForMultiplayer(1, 0);
      const p3 = getAdventureBonusesForMultiplayer(3, 0);
      expect(p3.xpMultiplier).toBeGreaterThan(p1.xpMultiplier);
    });

    it('should grant border cosmetic at prestige 1+', () => {
      const bonus = getAdventureBonusesForMultiplayer(1, 0);
      expect(bonus.border).not.toBeNull();
    });

    it('should grant title at high prestige', () => {
      const bonus = getAdventureBonusesForMultiplayer(5, 0);
      expect(bonus.title).toBeDefined();
    });
  });

  describe('getUnlockedCosmetics', () => {
    it('should return empty array with no boss trophies', () => {
      expect(getUnlockedCosmetics(0, 0)).toHaveLength(0);
    });

    it('should unlock avatar for 3+ boss trophies', () => {
      const cosmetics = getUnlockedCosmetics(3, 0);
      expect(cosmetics.some(c => c.type === 'avatar')).toBe(true);
    });

    it('should unlock more cosmetics with more trophies', () => {
      const c3 = getUnlockedCosmetics(3, 0);
      const c10 = getUnlockedCosmetics(10, 0);
      expect(c10.length).toBeGreaterThanOrEqual(c3.length);
    });

    it('should include prestige-based cosmetics', () => {
      const c = getUnlockedCosmetics(0, 3);
      expect(c.some(item => item.source === 'prestige')).toBe(true);
    });
  });
});
