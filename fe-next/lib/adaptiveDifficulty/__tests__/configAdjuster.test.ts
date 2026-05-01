/**
 * Config Adjuster Tests
 *
 * Tests for tier-based level configuration adjustments.
 * Written in TDD RED phase - tests first, implementation second.
 */

import { getLevelConfig } from '@/lib/adventure/levelConfig';
import type { DifficultyTier } from '@/types/difficulty';
import { applyTierAdjustments, getTierAdjustments } from '../configAdjuster';

describe('configAdjuster', () => {
  describe('getTierAdjustments', () => {
    it('should return easy tier adjustments', () => {
      // GIVEN
      const tier: DifficultyTier = 'easy';

      // WHEN
      const adjustments = getTierAdjustments(tier);

      // THEN
      expect(adjustments).toEqual({
        timerMultiplier: 1.2,
        scoreTargetMultiplier: 0.8,
        powerUpCooldownMultiplier: 1.0,
      });
    });

    it('should return normal tier adjustments', () => {
      // GIVEN
      const tier: DifficultyTier = 'normal';

      // WHEN
      const adjustments = getTierAdjustments(tier);

      // THEN
      expect(adjustments).toEqual({
        timerMultiplier: 1.0,
        scoreTargetMultiplier: 1.0,
        powerUpCooldownMultiplier: 1.0,
      });
    });

    it('should return hard tier adjustments', () => {
      // GIVEN
      const tier: DifficultyTier = 'hard';

      // WHEN
      const adjustments = getTierAdjustments(tier);

      // THEN
      expect(adjustments).toEqual({
        timerMultiplier: 0.85,
        scoreTargetMultiplier: 1.0,
        powerUpCooldownMultiplier: 1.5,
      });
    });
  });

  describe('applyTierAdjustments', () => {
    describe('Normal tier', () => {
      it('should return unmodified config for normal tier', () => {
        // GIVEN
        const baseConfig = getLevelConfig(1, 1);
        const tier: DifficultyTier = 'normal';

        // WHEN
        const adjusted = applyTierAdjustments(baseConfig, tier);

        // THEN
        expect(adjusted.timerSeconds).toBe(baseConfig.timerSeconds);
        expect(adjusted.objectives).toEqual(baseConfig.objectives);
      });
    });

    describe('Easy tier', () => {
      it('should increase timer by 20% for easy tier', () => {
        // GIVEN
        const baseConfig = getLevelConfig(1, 1);
        const tier: DifficultyTier = 'easy';

        // WHEN
        const adjusted = applyTierAdjustments(baseConfig, tier);

        // THEN
        expect(adjusted.timerSeconds).toBe(Math.floor(baseConfig.timerSeconds * 1.2));
      });

      it('should decrease score target by 20% for easy tier', () => {
        // GIVEN
        const baseConfig = getLevelConfig(3, 6); // forge archetype → scoreTarget primary
        const tier: DifficultyTier = 'easy';

        // WHEN
        const adjusted = applyTierAdjustments(baseConfig, tier);

        // THEN
        const originalScoreObjective = baseConfig.objectives.find(
          (obj) => obj.type === 'scoreTarget' && obj.isPrimary
        );
        const adjustedScoreObjective = adjusted.objectives.find(
          (obj) => obj.type === 'scoreTarget' && obj.isPrimary
        );

        expect(originalScoreObjective).toBeDefined();
        expect(adjustedScoreObjective).toBeDefined();

        if (originalScoreObjective && adjustedScoreObjective) {
          const expectedTarget = Math.floor(originalScoreObjective.target * 0.8);
          expect(adjustedScoreObjective.target).toBe(expectedTarget);
        }
      });

      it('should not modify wordCount objectives', () => {
        // GIVEN
        const baseConfig = getLevelConfig(1, 1); // Has wordCount objective (odd level)
        const tier: DifficultyTier = 'easy';

        // WHEN
        const adjusted = applyTierAdjustments(baseConfig, tier);

        // THEN
        const originalWordObjective = baseConfig.objectives.find(
          (obj) => obj.type === 'wordCount' && obj.isPrimary
        );
        const adjustedWordObjective = adjusted.objectives.find(
          (obj) => obj.type === 'wordCount' && obj.isPrimary
        );

        expect(originalWordObjective).toBeDefined();
        expect(adjustedWordObjective).toBeDefined();

        if (originalWordObjective && adjustedWordObjective) {
          expect(adjustedWordObjective.target).toBe(originalWordObjective.target);
        }
      });

      it('should not modify non-primary objectives', () => {
        // GIVEN
        const baseConfig = getLevelConfig(2, 5); // Has secondary objectives
        const tier: DifficultyTier = 'easy';

        // WHEN
        const adjusted = applyTierAdjustments(baseConfig, tier);

        // THEN
        const secondaryObjectives = adjusted.objectives.filter((obj) => !obj.isPrimary);
        const originalSecondaryObjectives = baseConfig.objectives.filter(
          (obj) => !obj.isPrimary
        );

        expect(secondaryObjectives.length).toBe(originalSecondaryObjectives.length);

        // All secondary objectives should remain unchanged
        secondaryObjectives.forEach((obj, idx) => {
          expect(obj.target).toBe(originalSecondaryObjectives[idx].target);
        });
      });
    });

    describe('Hard tier', () => {
      it('should decrease timer by 15% for hard tier', () => {
        // GIVEN
        const baseConfig = getLevelConfig(1, 1);
        const tier: DifficultyTier = 'hard';

        // WHEN
        const adjusted = applyTierAdjustments(baseConfig, tier);

        // THEN
        expect(adjusted.timerSeconds).toBe(Math.floor(baseConfig.timerSeconds * 0.85));
      });

      it('should not modify score targets for hard tier', () => {
        // GIVEN
        const baseConfig = getLevelConfig(3, 6); // forge archetype → scoreTarget primary
        const tier: DifficultyTier = 'hard';

        // WHEN
        const adjusted = applyTierAdjustments(baseConfig, tier);

        // THEN
        const originalScoreObjective = baseConfig.objectives.find(
          (obj) => obj.type === 'scoreTarget' && obj.isPrimary
        );
        const adjustedScoreObjective = adjusted.objectives.find(
          (obj) => obj.type === 'scoreTarget' && obj.isPrimary
        );

        expect(originalScoreObjective).toBeDefined();
        expect(adjustedScoreObjective).toBeDefined();

        if (originalScoreObjective && adjustedScoreObjective) {
          expect(adjustedScoreObjective.target).toBe(originalScoreObjective.target);
        }
      });
    });

    describe('Boss level exclusion', () => {
      it('should return unmodified config for W2+ boss level with easy tier', () => {
        // GIVEN — W2 boss (W1 boss has light DDA exception)
        const baseConfig = getLevelConfig(2, 7); // Boss level
        const tier: DifficultyTier = 'easy';

        // Verify this is a boss level (dependency validation)
        expect(baseConfig.isBossLevel).toBe(true);

        // WHEN
        const adjusted = applyTierAdjustments(baseConfig, tier);

        // THEN
        expect(adjusted).toEqual(baseConfig);
        expect(adjusted.timerSeconds).toBe(baseConfig.timerSeconds);
        expect(adjusted.objectives).toEqual(baseConfig.objectives);
      });

      it('should return unmodified config for boss level with hard tier', () => {
        // GIVEN
        const baseConfig = getLevelConfig(2, 7); // Boss level
        const tier: DifficultyTier = 'hard';

        // Verify this is a boss level (dependency validation)
        expect(baseConfig.isBossLevel).toBe(true);

        // WHEN
        const adjusted = applyTierAdjustments(baseConfig, tier);

        // THEN
        expect(adjusted).toEqual(baseConfig);
        expect(adjusted.timerSeconds).toBe(baseConfig.timerSeconds);
        expect(adjusted.objectives).toEqual(baseConfig.objectives);
      });
    });

    describe('Boss level identification verification', () => {
      it('should identify level 7 as boss level in world 1', () => {
        // GIVEN / WHEN
        const bossConfig = getLevelConfig(1, 7);
        const normalConfig = getLevelConfig(1, 1);

        // THEN
        expect(bossConfig.isBossLevel).toBe(true);
        expect(normalConfig.isBossLevel).toBe(false);
      });

      it('should identify level 7 as boss level in world 2', () => {
        // GIVEN / WHEN
        const bossConfig = getLevelConfig(2, 7);

        // THEN
        expect(bossConfig.isBossLevel).toBe(true);
      });

      it('should identify level 7 as boss level in world 3', () => {
        // GIVEN / WHEN
        const bossConfig = getLevelConfig(3, 7);

        // THEN
        expect(bossConfig.isBossLevel).toBe(true);
      });
    });

    describe('Immutability', () => {
      it('should not mutate original config', () => {
        // GIVEN
        const baseConfig = getLevelConfig(1, 2);
        const tier: DifficultyTier = 'easy';

        const originalTimerSeconds = baseConfig.timerSeconds;
        const originalObjectives = JSON.stringify(baseConfig.objectives);

        // WHEN
        applyTierAdjustments(baseConfig, tier);

        // THEN
        expect(baseConfig.timerSeconds).toBe(originalTimerSeconds);
        expect(JSON.stringify(baseConfig.objectives)).toBe(originalObjectives);
      });
    });

    describe('World 1 boss light DDA (difficulty audit)', () => {
      it('should apply timer boost to W1 boss on easy tier', () => {
        // GIVEN
        const baseConfig = getLevelConfig(1, 7); // W1 boss
        const tier: DifficultyTier = 'easy';
        expect(baseConfig.isBossLevel).toBe(true);

        // WHEN
        const adjusted = applyTierAdjustments(baseConfig, tier);

        // THEN — W1 boss gets timer boost (120 * 1.2 = 144)
        expect(adjusted.timerSeconds).toBe(Math.floor(baseConfig.timerSeconds * 1.2));
      });

      it('should NOT apply timer boost to W2+ boss on easy tier', () => {
        // GIVEN
        const baseConfig = getLevelConfig(2, 7); // W2 boss
        const tier: DifficultyTier = 'easy';
        expect(baseConfig.isBossLevel).toBe(true);

        // WHEN
        const adjusted = applyTierAdjustments(baseConfig, tier);

        // THEN — W2+ bosses remain fully exempt
        expect(adjusted.timerSeconds).toBe(baseConfig.timerSeconds);
      });

      it('should NOT modify W1 boss objectives even on easy tier', () => {
        // GIVEN
        const baseConfig = getLevelConfig(1, 7);
        const tier: DifficultyTier = 'easy';

        // WHEN
        const adjusted = applyTierAdjustments(baseConfig, tier);

        // THEN — objectives unchanged
        expect(adjusted.objectives).toEqual(baseConfig.objectives);
      });
    });
  });
});
