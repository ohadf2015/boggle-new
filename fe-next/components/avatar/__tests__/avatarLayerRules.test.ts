/**
 * Sync-guard for back-layer membership.
 * Premium parts that draw volume behind the face (long hair, wings) MUST sit
 * behind it, and closed/glowing eyes must not blink.
 *
 * 2026-09 redraw: the sets are now derived from the new art's own part
 * definitions; retired ids (twinTails, bobCut, wings, monkeyEars, starBase,
 * moonBase, diamondEye, sleepyEye, laserEye, cyberEye, gemEye, moonEye,
 * catEye) are checked through the part they render as.
 */
import { describe, it, expect } from 'vitest';
import { mapLegacyPart } from '@/lib/avatar/legacyMap';
import {
  BACK_LAYER_STYLES,
  BACK_ACCESSORY_STYLES,
  SKIP_BLINK_EYES,
  SKIP_BLUSH_BASES,
} from '../avatarLayerRules';

describe('avatarLayerRules — premium back-layer wiring', () => {
  it('includes premium hair styles that draw volume behind the head', () => {
    for (const style of ['longFlow', 'twinTails', 'bobCut', 'vaporwave', 'galaxy'] as const) {
      expect(BACK_LAYER_STYLES.has(mapLegacyPart('hair', style)), `${style} must be a back-layer hair`).toBe(true);
    }
  });

  it('includes wings as a back-layer accessory', () => {
    expect(BACK_ACCESSORY_STYLES.has(mapLegacyPart('accessory', 'wings'))).toBe(true);
  });

  it('keeps existing epic wing accessories behind the face', () => {
    for (const style of ['angelWings', 'demonWings', 'butterflyWings'] as const) {
      expect(BACK_ACCESSORY_STYLES.has(style)).toBe(true);
    }
  });

  it('skips blink on premium eyes that are non-standard/closed/glow', () => {
    for (const eye of ['starEye', 'heartEye', 'laser', 'robot', 'void', 'infinity', 'happy', 'closed', 'sleepy'] as const) {
      expect(SKIP_BLINK_EYES.has(mapLegacyPart('eyes', eye)), `${eye} should skip blink`).toBe(true);
    }
    expect(SKIP_BLINK_EYES.has('round')).toBe(false);
  });

  it('skips cheek blush on premium non-human bases', () => {
    for (const base of ['starBase', 'moonBase', 'skull', 'robotHead', 'dragonHead', 'slime'] as const) {
      expect(SKIP_BLUSH_BASES.has(mapLegacyPart('base', base))).toBe(true);
    }
    expect(SKIP_BLUSH_BASES.has('square')).toBe(false);
  });
});
