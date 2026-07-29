import { describe, it, expect } from 'vitest';
import { isVeteran, getVeteranCardVariant, type BlastProgressSnapshot } from '../veteran-detection';

describe('veteran-detection', () => {
  describe('isVeteran', () => {
    it('returns true when max_level_cleared >= 5', () => {
      const progress: BlastProgressSnapshot = { max_level_cleared: 5 };
      expect(isVeteran(progress)).toBe(true);
    });

    it('returns true when max_level_cleared > 5', () => {
      const progress: BlastProgressSnapshot = { max_level_cleared: 10 };
      expect(isVeteran(progress)).toBe(true);
    });

    it('returns false when max_level_cleared < 5', () => {
      const progress: BlastProgressSnapshot = { max_level_cleared: 4 };
      expect(isVeteran(progress)).toBe(false);
    });

    it('returns false when max_level_cleared is undefined', () => {
      const progress: BlastProgressSnapshot = {};
      expect(isVeteran(progress)).toBe(false);
    });

    it('returns false when max_level_cleared is 0', () => {
      const progress: BlastProgressSnapshot = { max_level_cleared: 0 };
      expect(isVeteran(progress)).toBe(false);
    });
  });

  describe('getVeteranCardVariant', () => {
    it('returns welcome_back variant', () => {
      const variant = getVeteranCardVariant();
      expect(variant).toBe('welcome_back');
    });
  });
});
