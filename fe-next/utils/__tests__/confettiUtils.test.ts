/**
 * Test suite for confettiUtils
 *
 * Tests Z-index constants and layered celebration system
 */

import { Z_INDEX } from '../confettiUtils';

describe('confettiUtils', () => {
  describe('Z_INDEX constants', () => {
    it('should define BACKGROUND_PARTICLES constant', () => {
      // GIVEN/WHEN
      const zIndex = Z_INDEX.BACKGROUND_PARTICLES;

      // THEN
      expect(zIndex).toBe(1000);
      expect(typeof zIndex).toBe('number');
    });

    it('should define MIDGROUND_PARTICLES constant', () => {
      // GIVEN/WHEN
      const zIndex = Z_INDEX.MIDGROUND_PARTICLES;

      // THEN
      expect(zIndex).toBe(2000);
      expect(typeof zIndex).toBe('number');
    });

    it('should define FOREGROUND_PARTICLES constant', () => {
      // GIVEN/WHEN
      const zIndex = Z_INDEX.FOREGROUND_PARTICLES;

      // THEN
      expect(zIndex).toBe(3000);
      expect(typeof zIndex).toBe('number');
    });

    it('should define CELEBRATION_OVERLAY constant', () => {
      // GIVEN/WHEN
      const zIndex = Z_INDEX.CELEBRATION_OVERLAY;

      // THEN
      expect(zIndex).toBe(9000);
      expect(typeof zIndex).toBe('number');
    });

    it('should define CINEMATIC_PLAYER constant', () => {
      // GIVEN/WHEN
      const zIndex = Z_INDEX.CINEMATIC_PLAYER;

      // THEN
      expect(zIndex).toBe(9999);
      expect(typeof zIndex).toBe('number');
    });

    it('should have z-index values in ascending order', () => {
      // GIVEN/WHEN
      const values = [
        Z_INDEX.BACKGROUND_PARTICLES,
        Z_INDEX.MIDGROUND_PARTICLES,
        Z_INDEX.FOREGROUND_PARTICLES,
        Z_INDEX.CELEBRATION_OVERLAY,
        Z_INDEX.CINEMATIC_PLAYER,
      ];

      // THEN
      for (let i = 0; i < values.length - 1; i++) {
        expect(values[i]).toBeLessThan(values[i + 1]);
      }
    });

    it('should be exported as const object', () => {
      // GIVEN/WHEN
      const constantsType = typeof Z_INDEX;

      // THEN
      expect(constantsType).toBe('object');
      expect(Z_INDEX).toBeDefined();
      expect(Object.isFrozen(Z_INDEX)).toBe(false); // `as const` doesn't freeze at runtime
    });
  });

  describe('fireLayeredCelebration function', () => {
    it('should be exported and callable', () => {
      // GIVEN
      const { fireLayeredCelebration } = require('../confettiUtils');

      // THEN
      expect(fireLayeredCelebration).toBeDefined();
      expect(typeof fireLayeredCelebration).toBe('function');
    });

    it('should accept totalBudget parameter', () => {
      // GIVEN
      const { fireLayeredCelebration } = require('../confettiUtils');

      // WHEN/THEN - Should not throw
      expect(() => fireLayeredCelebration(100)).not.toThrow();
      expect(() => fireLayeredCelebration(0)).not.toThrow();
    });
  });
});
