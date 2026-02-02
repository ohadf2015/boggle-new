/**
 * Feature Gates Tests
 *
 * Tests progressive feature unlocking based on user experience
 */

import { getFeatureGates, isFeatureUnlocked } from '../featureGates';

describe('Feature Gates', () => {
  describe('getFeatureGates', () => {
    it('should lock all features for new users (0 games)', () => {
      // GIVEN
      const userStats = { totalGamesPlayed: 0 };

      // WHEN
      const gates = getFeatureGates(userStats);

      // THEN
      expect(gates.advancedSettings).toBe(false);
      expect(gates.customBotCount).toBe(false);
      expect(gates.challengeMode).toBe(false);
      expect(gates.practiceMode).toBe(false);
    });

    it('should unlock advanced settings after 5 games', () => {
      // GIVEN
      const userStats = { totalGamesPlayed: 5 };

      // WHEN
      const gates = getFeatureGates(userStats);

      // THEN
      expect(gates.advancedSettings).toBe(true);
      expect(gates.customBotCount).toBe(false);
      expect(gates.challengeMode).toBe(false);
      expect(gates.practiceMode).toBe(false);
    });

    it('should unlock custom bot count after 10 games', () => {
      // GIVEN
      const userStats = { totalGamesPlayed: 10 };

      // WHEN
      const gates = getFeatureGates(userStats);

      // THEN
      expect(gates.advancedSettings).toBe(true);
      expect(gates.customBotCount).toBe(true);
      expect(gates.challengeMode).toBe(false);
      expect(gates.practiceMode).toBe(false);
    });

    it('should unlock challenge mode after 15 games', () => {
      // GIVEN
      const userStats = { totalGamesPlayed: 15 };

      // WHEN
      const gates = getFeatureGates(userStats);

      // THEN
      expect(gates.advancedSettings).toBe(true);
      expect(gates.customBotCount).toBe(true);
      expect(gates.challengeMode).toBe(true);
      expect(gates.practiceMode).toBe(false);
    });

    it('should unlock practice mode after 20 games', () => {
      // GIVEN
      const userStats = { totalGamesPlayed: 20 };

      // WHEN
      const gates = getFeatureGates(userStats);

      // THEN
      expect(gates.advancedSettings).toBe(true);
      expect(gates.customBotCount).toBe(true);
      expect(gates.challengeMode).toBe(true);
      expect(gates.practiceMode).toBe(true);
    });

    it('should unlock all features for experienced users (50+ games)', () => {
      // GIVEN
      const userStats = { totalGamesPlayed: 50 };

      // WHEN
      const gates = getFeatureGates(userStats);

      // THEN
      expect(gates.advancedSettings).toBe(true);
      expect(gates.customBotCount).toBe(true);
      expect(gates.challengeMode).toBe(true);
      expect(gates.practiceMode).toBe(true);
    });

    it('should handle null/undefined user stats (treat as new user)', () => {
      // GIVEN
      const userStats = null;

      // WHEN
      const gates = getFeatureGates(userStats);

      // THEN
      expect(gates.advancedSettings).toBe(false);
      expect(gates.customBotCount).toBe(false);
      expect(gates.challengeMode).toBe(false);
      expect(gates.practiceMode).toBe(false);
    });
  });

  describe('isFeatureUnlocked', () => {
    it('should return correct status for specific feature', () => {
      // GIVEN
      const userStats = { totalGamesPlayed: 10 };

      // WHEN & THEN
      expect(isFeatureUnlocked('advancedSettings', userStats)).toBe(true);
      expect(isFeatureUnlocked('customBotCount', userStats)).toBe(true);
      expect(isFeatureUnlocked('challengeMode', userStats)).toBe(false);
      expect(isFeatureUnlocked('practiceMode', userStats)).toBe(false);
    });

    it('should return false for unknown feature', () => {
      // GIVEN
      const userStats = { totalGamesPlayed: 50 };

      // WHEN
      const isUnlocked = isFeatureUnlocked('unknownFeature' as any, userStats);

      // THEN
      expect(isUnlocked).toBe(false);
    });

    it('should handle null user stats', () => {
      // GIVEN
      const userStats = null;

      // WHEN
      const isUnlocked = isFeatureUnlocked('advancedSettings', userStats);

      // THEN
      expect(isUnlocked).toBe(false);
    });
  });

  describe('Threshold Boundary Tests', () => {
    it('should NOT unlock at threshold minus 1', () => {
      // GIVEN
      const userStats = { totalGamesPlayed: 4 };

      // WHEN
      const gates = getFeatureGates(userStats);

      // THEN - 4 games is less than 5 threshold
      expect(gates.advancedSettings).toBe(false);
    });

    it('should unlock AT exact threshold', () => {
      // GIVEN
      const userStats = { totalGamesPlayed: 5 };

      // WHEN
      const gates = getFeatureGates(userStats);

      // THEN - 5 games meets 5 threshold
      expect(gates.advancedSettings).toBe(true);
    });

    it('should remain unlocked beyond threshold', () => {
      // GIVEN
      const userStats = { totalGamesPlayed: 6 };

      // WHEN
      const gates = getFeatureGates(userStats);

      // THEN - 6 games exceeds 5 threshold
      expect(gates.advancedSettings).toBe(true);
    });
  });
});
