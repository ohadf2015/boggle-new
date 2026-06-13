import { describe, it, expect } from 'vitest';
import { getAnimatedMascot, ANIMATED_STYLE_MASCOTS } from '../animatedMascots';
import { STYLE_KEYS } from '../styles';

describe('getAnimatedMascot', () => {
  it('returns null for a style with no animated asset (falls back to CSS dance)', () => {
    // `default` never gets a style dance asset.
    expect(getAnimatedMascot('default')).toBeNull();
  });

  it('every non-default style ships a real dancing loop (all of them, not just rock)', () => {
    for (const key of STYLE_KEYS) {
      if (key === 'default') continue;
      expect(getAnimatedMascot(key), `missing animated loop for "${key}"`).toMatch(
        /^\/mascots\/styles\/.+\.(gif|webp)$/,
      );
    }
  });

  it('returns the registered animated path for a style that has one', () => {
    // rock is the first generated dancing loop.
    expect(getAnimatedMascot('rock')).toBe(ANIMATED_STYLE_MASCOTS.rock ?? null);
    if (ANIMATED_STYLE_MASCOTS.rock) {
      expect(getAnimatedMascot('rock')).toMatch(/^\/mascots\/styles\/.+\.(gif|webp)$/);
    }
  });

  it('every registered path points at an animated asset under the styles folder', () => {
    for (const path of Object.values(ANIMATED_STYLE_MASCOTS)) {
      expect(path).toMatch(/^\/mascots\/styles\/.+\.(gif|webp)$/);
    }
  });
});
