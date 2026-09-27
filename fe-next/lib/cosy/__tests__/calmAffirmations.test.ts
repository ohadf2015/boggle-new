import { describe, it, expect } from 'vitest';
import {
  CALM_AFFIRMATION_KEYS,
  selectCalmAffirmationKey,
} from '../calmAffirmations';

/**
 * Cosy / Calm Mode quiet-celebration affirmations.
 *
 * The calm acknowledgement used to always read the same flat "Well done". A
 * cozy experience varies its warmth, so the layer rotates through a small pool
 * of gentle phrases. This is the pure spine: a deterministic selector keyed off
 * an incrementing beat index (NO Math.random — rotation must be replayable and
 * test-stable).
 */
describe('selectCalmAffirmationKey', () => {
  it('starts the rotation on the existing warm default (cosy.wellDone)', () => {
    // Beat 0 must stay wellDone so the established calm cue is unchanged on the
    // first celebration of a session.
    expect(selectCalmAffirmationKey(0)).toBe('cosy.wellDone');
  });

  it('rotates deterministically through every affirmation key in order', () => {
    const seen = CALM_AFFIRMATION_KEYS.map((_, i) => selectCalmAffirmationKey(i));
    expect(seen).toEqual([...CALM_AFFIRMATION_KEYS]);
  });

  it('wraps around after the last key (cyclic, never out of range)', () => {
    const len = CALM_AFFIRMATION_KEYS.length;
    expect(selectCalmAffirmationKey(len)).toBe(CALM_AFFIRMATION_KEYS[0]);
    expect(selectCalmAffirmationKey(len + 2)).toBe(CALM_AFFIRMATION_KEYS[2 % len]);
  });

  it('is total over negative indices (defensive — never throws / undefined)', () => {
    // A ref counter should never go negative, but the selector must not blow up
    // and dump a raw key onto the calm audience if it ever does.
    expect(CALM_AFFIRMATION_KEYS).toContain(selectCalmAffirmationKey(-1));
    expect(CALM_AFFIRMATION_KEYS).toContain(selectCalmAffirmationKey(-7));
  });

  it('offers more than one phrase (the whole point is variety)', () => {
    expect(CALM_AFFIRMATION_KEYS.length).toBeGreaterThan(1);
  });

  it('exposes only cosy-namespaced keys (i18n contract reach)', () => {
    for (const key of CALM_AFFIRMATION_KEYS) {
      expect(key.startsWith('cosy.')).toBe(true);
    }
  });
});
