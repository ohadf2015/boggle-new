/**
 * `availableMpModes` is the single source of truth for which multiplayer
 * modes a player may pick, given their GAME language. The last language-gated
 * mode has since been retired; this now locks down that every language sees
 * the same base rotation, and that a removed mode never reappears.
 */
import { describe, it, expect } from 'vitest';
import { availableMpModes, BASE_MP_MODES } from '../availableModes';

describe('availableMpModes', () => {
  it('returns the same base mode list regardless of language', () => {
    expect(availableMpModes('ja')).toEqual(BASE_MP_MODES);
    expect(availableMpModes('en')).toEqual(BASE_MP_MODES);
    expect(availableMpModes('he')).toEqual(BASE_MP_MODES);
    expect(availableMpModes(null)).toEqual(BASE_MP_MODES);
    expect(availableMpModes(undefined)).toEqual(BASE_MP_MODES);
  });

  it('never returns a stale/removed mode (e.g. the retired JA-only chain mode)', () => {
    expect(availableMpModes('ja')).toEqual(['classic', 'word-hunt', 'wheel-rush']);
  });
});
