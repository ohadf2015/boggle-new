import { describe, it, expect } from 'vitest';
import {
  peakBucketIndex,
  maxGames,
  barPct,
  computeDelta,
} from '../insightsTransforms';

describe('insightsTransforms', () => {
  describe('peakBucketIndex', () => {
    it('returns the index field of the bucket with the most games', () => {
      const dow = [
        { dow: 0, games: 87 },
        { dow: 1, games: 191 },
        { dow: 6, games: 208 },
      ];
      expect(peakBucketIndex(dow, 'dow')).toBe(6);
    });

    it('works for the hour field', () => {
      const hours = [
        { hour: 9, games: 60 },
        { hour: 15, games: 141 },
        { hour: 22, games: 106 },
      ];
      expect(peakBucketIndex(hours, 'hour')).toBe(15);
    });

    it('returns null for an empty list', () => {
      expect(peakBucketIndex([], 'dow')).toBeNull();
    });

    it('on a tie returns the first-seen bucket (stable)', () => {
      const dow = [
        { dow: 2, games: 100 },
        { dow: 5, games: 100 },
      ];
      expect(peakBucketIndex(dow, 'dow')).toBe(2);
    });
  });

  describe('maxGames', () => {
    it('returns the largest games value', () => {
      expect(maxGames([{ games: 3 }, { games: 208 }, { games: 87 }])).toBe(208);
    });
    it('returns 0 for an empty list (no divide-by-zero downstream)', () => {
      expect(maxGames([])).toBe(0);
    });
  });

  describe('barPct', () => {
    it('scales a value against the max to a 0-100 percentage', () => {
      expect(barPct(104, 208)).toBe(50);
      expect(barPct(208, 208)).toBe(100);
    });
    it('returns 0 when max is 0 (guards divide-by-zero)', () => {
      expect(barPct(0, 0)).toBe(0);
    });
  });

  describe('computeDelta', () => {
    it('reports an upward delta vs yesterday', () => {
      expect(computeDelta(150, 100)).toEqual({ pct: 50, direction: 'up' });
    });
    it('reports a downward delta', () => {
      expect(computeDelta(80, 100)).toEqual({ pct: -20, direction: 'down' });
    });
    it('reports flat when equal', () => {
      expect(computeDelta(100, 100)).toEqual({ pct: 0, direction: 'flat' });
    });
    it('returns null pct (not Infinity) when yesterday is 0', () => {
      expect(computeDelta(5, 0)).toEqual({ pct: null, direction: 'up' });
    });
    it('flat when both 0', () => {
      expect(computeDelta(0, 0)).toEqual({ pct: null, direction: 'flat' });
    });
  });
});
