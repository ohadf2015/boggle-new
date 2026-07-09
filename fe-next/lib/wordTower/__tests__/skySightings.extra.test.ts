import { describe, it, expect } from 'vitest';
import {
  pickSighting,
  SIGHTING_MIN_ALT_M,
  SIGHTING_CHANCE,
  SIGHTING_ASSET,
  type SightingKind,
} from '../skySightings';

const EXTRA: SightingKind[] = ['blimp', 'auroraRibbon', 'constellation'];

describe('skySightings — extra unexpected sky events', () => {
  it('can produce extended sighting kinds at altitude', () => {
    const seen = new Set<SightingKind | null>();
    for (let i = 0; i < 400; i++) {
      const roll = (i / 400) * SIGHTING_CHANCE * 0.999;
      const k = pickSighting(roll, 500);
      if (k) seen.add(k);
    }
    for (const k of EXTRA) {
      expect(seen.has(k)).toBe(true);
    }
  });

  it('still gates below min altitude', () => {
    expect(pickSighting(0, SIGHTING_MIN_ALT_M - 1)).toBeNull();
  });

  it('remains deterministic for identical inputs', () => {
    expect(pickSighting(0.02, 400)).toBe(pickSighting(0.02, 400));
  });

  it('keeps whale asset for deep-space whale', () => {
    expect(SIGHTING_ASSET.whale).toMatch(/wt-spacewhale/);
  });
});
