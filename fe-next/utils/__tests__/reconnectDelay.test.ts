import { describe, it, expect } from 'vitest';
import {
  computeReconnectDelay,
  DEFAULT_RECONNECT_BASE_MS,
  DEFAULT_RECONNECT_JITTER_MS,
} from '@/utils/reconnectDelay';

describe('computeReconnectDelay', () => {
  describe('Given an explicit base + jitter window', () => {
    it('returns the base when rng yields 0 (earliest reconnect)', () => {
      expect(computeReconnectDelay(4000, 8000, () => 0)).toBe(4000);
    });

    it('returns base + full jitter when rng yields ~1 (latest reconnect)', () => {
      expect(computeReconnectDelay(4000, 8000, () => 1)).toBe(12000);
    });

    it('spreads to a mid-window value for a mid rng', () => {
      expect(computeReconnectDelay(4000, 8000, () => 0.5)).toBe(8000);
    });

    it('always lands within [base, base+jitter] for random rng', () => {
      for (let i = 0; i < 200; i++) {
        const d = computeReconnectDelay(3000, 9000);
        expect(d).toBeGreaterThanOrEqual(3000);
        expect(d).toBeLessThanOrEqual(12000);
      }
    });
  });

  describe('Given a zero jitter window', () => {
    it('collapses to the base (deterministic, no spread)', () => {
      expect(computeReconnectDelay(5000, 0, () => 0.9)).toBe(5000);
    });
  });

  describe('Given missing / malformed inputs (old server, bad payload)', () => {
    it('falls back to defaults when both args are undefined', () => {
      expect(computeReconnectDelay(undefined, undefined, () => 0)).toBe(
        DEFAULT_RECONNECT_BASE_MS,
      );
      expect(computeReconnectDelay(undefined, undefined, () => 1)).toBe(
        DEFAULT_RECONNECT_BASE_MS + DEFAULT_RECONNECT_JITTER_MS,
      );
    });

    it('falls back to default jitter when only base is provided (legacy serverShutdown payload)', () => {
      // Legacy server sends only { reconnectIn } — client must still jitter.
      expect(computeReconnectDelay(5000, undefined, () => 0)).toBe(5000);
      expect(computeReconnectDelay(5000, undefined, () => 1)).toBe(
        5000 + DEFAULT_RECONNECT_JITTER_MS,
      );
    });

    it('ignores negative / NaN values and uses defaults', () => {
      expect(computeReconnectDelay(-100, -50, () => 0)).toBe(
        DEFAULT_RECONNECT_BASE_MS,
      );
      expect(computeReconnectDelay(NaN, NaN, () => 0)).toBe(
        DEFAULT_RECONNECT_BASE_MS,
      );
    });
  });

  it('returns an integer (setTimeout-safe)', () => {
    expect(Number.isInteger(computeReconnectDelay(3000, 7000, () => 0.333))).toBe(
      true,
    );
  });
});
