import { describe, it, expect } from 'vitest';
import { computeBannerMargin } from './bannerMargin';

describe('computeBannerMargin', () => {
  describe('Android branch', () => {
    it('returns 0 when navHeight is 0 (no nav), even if safeBottom is present', () => {
      expect(computeBannerMargin({ navHeight: 0, safeBottom: 48, isAndroid: true })).toBe(0);
    });

    it('returns navHeight when navHeight > 0 and navHeight >= safeBottom', () => {
      expect(computeBannerMargin({ navHeight: 75, safeBottom: 48, isAndroid: true })).toBe(75);
    });

    it('returns safeBottom when navHeight > 0 but navHeight < safeBottom', () => {
      expect(computeBannerMargin({ navHeight: 20, safeBottom: 48, isAndroid: true })).toBe(48);
    });

    it('returns max(navHeight, safeBottom) when both > 0', () => {
      expect(computeBannerMargin({ navHeight: 100, safeBottom: 30, isAndroid: true })).toBe(100);
    });

    it('handles edge case: both zero', () => {
      expect(computeBannerMargin({ navHeight: 0, safeBottom: 0, isAndroid: true })).toBe(0);
    });
  });

  describe('iOS branch', () => {
    it('returns 0 when navHeight is 0 (no nav), regardless of safeBottom', () => {
      expect(computeBannerMargin({ navHeight: 0, safeBottom: 34, isAndroid: false })).toBe(0);
    });

    it('returns navHeight - safeBottom when navHeight > safeBottom (accounts for double-count)', () => {
      expect(computeBannerMargin({ navHeight: 75, safeBottom: 34, isAndroid: false })).toBe(41);
    });

    it('returns 0 when navHeight <= safeBottom (avoid negative margins)', () => {
      expect(computeBannerMargin({ navHeight: 20, safeBottom: 34, isAndroid: false })).toBe(0);
    });

    it('returns 0 when both are zero', () => {
      expect(computeBannerMargin({ navHeight: 0, safeBottom: 0, isAndroid: false })).toBe(0);
    });
  });
});
