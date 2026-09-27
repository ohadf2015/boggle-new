import { describe, it, expect } from 'vitest';
import {
  shouldHideSplash,
  splashProgress,
  pickLoadingTextIndex,
} from '../splashController';

describe('splashController', () => {
  describe('shouldHideSplash', () => {
    it('returns true when elapsedMs >= maxMs (hard fail-safe)', () => {
      expect(
        shouldHideSplash({
          ready: false,
          elapsedMs: 3500,
          minMs: 600,
          maxMs: 3500,
        })
      ).toBe(true);
    });

    it('returns true when elapsedMs > maxMs', () => {
      expect(
        shouldHideSplash({
          ready: false,
          elapsedMs: 4000,
          minMs: 600,
          maxMs: 3500,
        })
      ).toBe(true);
    });

    it('returns false when elapsedMs < maxMs and not ready', () => {
      expect(
        shouldHideSplash({
          ready: false,
          elapsedMs: 1000,
          minMs: 600,
          maxMs: 3500,
        })
      ).toBe(false);
    });

    it('returns false when ready but elapsedMs < minMs', () => {
      expect(
        shouldHideSplash({
          ready: true,
          elapsedMs: 300,
          minMs: 600,
          maxMs: 3500,
        })
      ).toBe(false);
    });

    it('returns true when ready and elapsedMs >= minMs', () => {
      expect(
        shouldHideSplash({
          ready: true,
          elapsedMs: 700,
          minMs: 600,
          maxMs: 3500,
        })
      ).toBe(true);
    });

    it('returns true when ready and elapsedMs exactly equals minMs', () => {
      expect(
        shouldHideSplash({
          ready: true,
          elapsedMs: 600,
          minMs: 600,
          maxMs: 3500,
        })
      ).toBe(true);
    });

    it('respects custom minMs and maxMs defaults', () => {
      expect(
        shouldHideSplash({
          ready: true,
          elapsedMs: 1000,
          minMs: 2000,
          maxMs: 5000,
        })
      ).toBe(false);
    });
  });

  describe('splashProgress', () => {
    it('returns 0 when elapsedMs is 0', () => {
      expect(splashProgress(0, 3500)).toBe(0);
    });

    it('returns a value in range [0, 1) for all valid inputs', () => {
      const maxMs = 3500;
      for (let ms = 0; ms <= 5000; ms += 100) {
        const progress = splashProgress(ms, maxMs);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThan(1);
      }
    });

    it('is monotonically increasing', () => {
      const maxMs = 3500;
      let prevProgress = splashProgress(0, maxMs);
      for (let ms = 100; ms <= 5000; ms += 100) {
        const progress = splashProgress(ms, maxMs);
        expect(progress).toBeGreaterThanOrEqual(prevProgress);
        prevProgress = progress;
      }
    });

    it('approaches but never reaches 1.0 at maxMs', () => {
      const progress = splashProgress(3500, 3500);
      expect(progress).toBeGreaterThan(0.7);
      expect(progress).toBeLessThan(1);
    });

    it('continues to increase monotonically beyond maxMs', () => {
      const p1 = splashProgress(3500, 3500);
      const p2 = splashProgress(4000, 3500);
      const p3 = splashProgress(5000, 3500);
      expect(p2).toBeGreaterThan(p1);
      expect(p3).toBeGreaterThan(p2);
      expect(p3).toBeLessThan(1);
    });
  });

  describe('pickLoadingTextIndex', () => {
    it('returns 0 for elapsedMs < intervalMs', () => {
      expect(pickLoadingTextIndex(0, 8, 1300)).toBe(0);
      expect(pickLoadingTextIndex(500, 8, 1300)).toBe(0);
    });

    it('rotates indices every intervalMs', () => {
      expect(pickLoadingTextIndex(1300, 8, 1300)).toBe(1);
      expect(pickLoadingTextIndex(2600, 8, 1300)).toBe(2);
      expect(pickLoadingTextIndex(3900, 8, 1300)).toBe(3);
    });

    it('wraps around using modulo', () => {
      expect(pickLoadingTextIndex(10400, 8, 1300)).toBe(0);
      expect(pickLoadingTextIndex(11700, 8, 1300)).toBe(1);
    });

    it('uses default intervalMs of 1300', () => {
      expect(pickLoadingTextIndex(1300, 8)).toBe(1);
      expect(pickLoadingTextIndex(2600, 8)).toBe(2);
    });

    it('handles count of 1 without error', () => {
      expect(pickLoadingTextIndex(0, 1, 1300)).toBe(0);
      expect(pickLoadingTextIndex(2600, 1, 1300)).toBe(0);
    });
  });
});
