import { describe, it, expect } from 'vitest';
import { computeBannerMargin, MAX_BANNER_OFFSET_PX } from '../bannerMargin';

describe('computeBannerMargin', () => {
  describe('Android (plugin adds safe-area on top of margin)', () => {
    it('returns the nav height for a normal-sized nav', () => {
      // Given a real Android nav (h-16 + ~48px gesture inset)
      // When we compute the banner lift
      // Then the banner sits just above the nav, unchanged
      expect(computeBannerMargin({ isAndroid: true, navHeight: 112, safeBottom: 48 })).toBe(112);
    });

    it('CLAMPS a pathological nav height so the banner cannot float mid-screen', () => {
      // Given Android 15 edge-to-edge reports a pathological bottom inset that
      // inflates --bottom-nav-height to ~364px (the "ad floating mid-screen" bug)
      // When we compute the banner lift
      // Then it is capped to the sane ceiling, keeping the banner near the bottom
      expect(computeBannerMargin({ isAndroid: true, navHeight: 364, safeBottom: 0 })).toBe(
        MAX_BANNER_OFFSET_PX,
      );
    });

    it('CLAMPS a pathological safe-area too', () => {
      expect(computeBannerMargin({ isAndroid: true, navHeight: 0, safeBottom: 300 })).toBe(
        MAX_BANNER_OFFSET_PX,
      );
    });

    it('takes the larger of nav vs safe-area', () => {
      expect(computeBannerMargin({ isAndroid: true, navHeight: 64, safeBottom: 96 })).toBe(96);
    });

    it('returns 0 when the nav is hidden and there is no safe area', () => {
      expect(computeBannerMargin({ isAndroid: true, navHeight: 0, safeBottom: 0 })).toBe(0);
    });
  });

  describe('iOS (plugin re-adds safeAreaLayoutGuide → subtract to avoid double-count)', () => {
    it('subtracts the safe area from the nav height', () => {
      expect(computeBannerMargin({ isAndroid: false, navHeight: 83, safeBottom: 34 })).toBe(49);
    });

    it('never returns a negative margin', () => {
      expect(computeBannerMargin({ isAndroid: false, navHeight: 20, safeBottom: 60 })).toBe(0);
    });

    it('clamps before subtracting so a runaway nav cannot leak through', () => {
      // navHeight clamps to 120, safeBottom 34 → 120 - 34 = 86
      expect(computeBannerMargin({ isAndroid: false, navHeight: 999, safeBottom: 34 })).toBe(86);
    });
  });

  describe('defensive input handling', () => {
    it('treats negative nav height as 0', () => {
      expect(computeBannerMargin({ isAndroid: true, navHeight: -10, safeBottom: 0 })).toBe(0);
    });

    it('treats NaN as 0', () => {
      expect(computeBannerMargin({ isAndroid: true, navHeight: Number.NaN, safeBottom: Number.NaN })).toBe(
        0,
      );
    });
  });
});
