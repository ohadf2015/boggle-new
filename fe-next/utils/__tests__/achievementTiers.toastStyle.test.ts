/**
 * Unit tests for getTierToastStyle — the rarity-driven visual scaling helper
 * that drives sparkle count, pulse radius, shine repetitions, confetti volume
 * and the colored hard-shadow Tailwind class for the achievement toast.
 *
 * The neo-brutalist achievement toast (single-player + multiplayer inline) reads
 * this directly; if the scaling stops being monotonic, rarer tiers stop *feeling*
 * rarer.
 */

import { describe, it, expect } from 'vitest';
import { getTierToastStyle, type TierName } from '../achievementTiers';

const TIERS: TierName[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

describe('getTierToastStyle', () => {
  describe('null / undefined fallback', () => {
    it('returns shadow-hard-yellow for null tier', () => {
      // Contract: neo-brutalist-fixes.test.tsx asserts the default inline toast
      // uses .shadow-hard-yellow when count is missing — keep this default stable.
      expect(getTierToastStyle(null).shadowClass).toBe('shadow-hard-yellow');
    });

    it('returns shadow-hard-yellow for undefined tier', () => {
      expect(getTierToastStyle(undefined).shadowClass).toBe('shadow-hard-yellow');
    });

    it('does not show the rarity badge on the default fallback', () => {
      expect(getTierToastStyle(null).showRarityBadge).toBe(false);
    });
  });

  describe('per-tier shape', () => {
    it.each(TIERS)('returns a valid style object for %s', (tier) => {
      const style = getTierToastStyle(tier);
      expect(style.sparkleCount).toBeGreaterThanOrEqual(1);
      expect(style.sparkleCount).toBeLessThanOrEqual(6);
      expect(style.pulseRadius).toBeGreaterThan(0);
      expect(style.shineRepeat).toBeGreaterThanOrEqual(1);
      expect(style.confettiCount).toBeGreaterThan(0);
      expect(style.confettiSpread).toBeGreaterThan(0);
    });

    it.each(TIERS)('uses a known shadow-hard token for %s', (tier) => {
      const valid = ['shadow-hard-yellow', 'shadow-hard-cyan', 'shadow-hard-purple'];
      expect(valid).toContain(getTierToastStyle(tier).shadowClass);
    });
  });

  describe('rarity scaling is monotonic', () => {
    // The whole point of the helper: each step up in rarity must add
    // visible "celebration weight" — if SILVER stops being more sparkly
    // than BRONZE, the design intent is broken.
    const styles = TIERS.map(getTierToastStyle);

    it('sparkle count is non-decreasing across BRONZE → SILVER → GOLD → PLATINUM', () => {
      for (let i = 1; i < styles.length; i++) {
        expect(styles[i].sparkleCount).toBeGreaterThanOrEqual(styles[i - 1].sparkleCount);
      }
    });

    it('pulse radius is non-decreasing across tiers', () => {
      for (let i = 1; i < styles.length; i++) {
        expect(styles[i].pulseRadius).toBeGreaterThanOrEqual(styles[i - 1].pulseRadius);
      }
    });

    it('confetti count is non-decreasing across tiers', () => {
      for (let i = 1; i < styles.length; i++) {
        expect(styles[i].confettiCount).toBeGreaterThanOrEqual(styles[i - 1].confettiCount);
      }
    });

    it('confetti spread is non-decreasing across tiers', () => {
      for (let i = 1; i < styles.length; i++) {
        expect(styles[i].confettiSpread).toBeGreaterThanOrEqual(styles[i - 1].confettiSpread);
      }
    });

    it('PLATINUM is strictly larger than BRONZE on every visible scalar', () => {
      const bronze = getTierToastStyle('BRONZE');
      const platinum = getTierToastStyle('PLATINUM');
      expect(platinum.sparkleCount).toBeGreaterThan(bronze.sparkleCount);
      expect(platinum.pulseRadius).toBeGreaterThan(bronze.pulseRadius);
      expect(platinum.confettiCount).toBeGreaterThan(bronze.confettiCount);
      expect(platinum.confettiSpread).toBeGreaterThan(bronze.confettiSpread);
    });
  });

  describe('rarity badge gating', () => {
    it('does NOT show the rarity badge for BRONZE / SILVER (everyday unlocks)', () => {
      expect(getTierToastStyle('BRONZE').showRarityBadge).toBe(false);
      expect(getTierToastStyle('SILVER').showRarityBadge).toBe(false);
    });

    it('SHOWS the rarity badge for GOLD / PLATINUM (announce-worthy)', () => {
      expect(getTierToastStyle('GOLD').showRarityBadge).toBe(true);
      expect(getTierToastStyle('PLATINUM').showRarityBadge).toBe(true);
    });
  });

  describe('shine repetition gating', () => {
    it('GOLD and PLATINUM run the shine sweep more than once', () => {
      expect(getTierToastStyle('GOLD').shineRepeat).toBeGreaterThan(1);
      expect(getTierToastStyle('PLATINUM').shineRepeat).toBeGreaterThan(1);
    });

    it('BRONZE and SILVER run the shine sweep exactly once', () => {
      expect(getTierToastStyle('BRONZE').shineRepeat).toBe(1);
      expect(getTierToastStyle('SILVER').shineRepeat).toBe(1);
    });
  });

  describe('shadow class assignment', () => {
    it('PLATINUM uses purple shadow (matches PLATINUM glow tokens)', () => {
      expect(getTierToastStyle('PLATINUM').shadowClass).toBe('shadow-hard-purple');
    });

    it('SILVER uses cyan shadow (cool metallic feel)', () => {
      expect(getTierToastStyle('SILVER').shadowClass).toBe('shadow-hard-cyan');
    });

    it('BRONZE and GOLD use yellow shadow (warm tones)', () => {
      expect(getTierToastStyle('BRONZE').shadowClass).toBe('shadow-hard-yellow');
      expect(getTierToastStyle('GOLD').shadowClass).toBe('shadow-hard-yellow');
    });
  });
});
