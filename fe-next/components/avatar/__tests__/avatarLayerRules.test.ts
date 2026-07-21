/**
 * Sync-guard for back-layer membership.
 * Premium overhaul parts (longFlow, twinTails, bobCut, wings) MUST sit behind
 * the face — forgetting to add them to BACK_* sets is the Class-3 asymmetric-path
 * bug (client renderer right, SSR wrong → PNG export layers break).
 */
import { describe, it, expect } from 'vitest';
import {
  BACK_LAYER_STYLES,
  BACK_ACCESSORY_STYLES,
  SKIP_BLINK_EYES,
  SKIP_BLUSH_BASES,
} from '../avatarLayerRules';

describe('avatarLayerRules — premium back-layer wiring', () => {
  it('includes premium hair styles that draw volume behind the head', () => {
    for (const style of ['longFlow', 'twinTails', 'bobCut'] as const) {
      expect(BACK_LAYER_STYLES.has(style), `${style} must be a back-layer hair`).toBe(true);
    }
  });

  it('includes wings as a back-layer accessory', () => {
    expect(BACK_ACCESSORY_STYLES.has('wings')).toBe(true);
  });

  it('keeps existing epic wing accessories behind the face', () => {
    for (const style of ['angelWings', 'demonWings', 'butterflyWings', 'monkeyEars'] as const) {
      expect(BACK_ACCESSORY_STYLES.has(style)).toBe(true);
    }
  });

  it('skips blink on premium eyes that are non-standard/closed/glow', () => {
    for (const eye of [
      'starEye', 'heartEye', 'diamondEye', 'sleepyEye', 'laserEye',
      'cyberEye', 'gemEye', 'moonEye', 'catEye',
    ] as const) {
      expect(SKIP_BLINK_EYES.has(eye), `${eye} should skip blink`).toBe(true);
    }
  });

  it('skips cheek blush on premium non-human bases', () => {
    for (const base of ['starBase', 'moonBase'] as const) {
      expect(SKIP_BLUSH_BASES.has(base)).toBe(true);
    }
  });
});
