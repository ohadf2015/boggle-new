import { describe, expect, it } from 'vitest';
import { screenSize } from '../camera';

/**
 * Regression guard for the bug that made the whole scene paint into the left
 * 1/dpr of the canvas on every real phone.
 *
 * Pixi v8's `renderer.width` is already CSS pixels; v7's was device pixels.
 * The v7 habit of dividing it by `resolution` is a no-op on a dpr-1 desktop —
 * so it passed every review — and halves the world on a dpr-2 phone.
 */
describe('screenSize', () => {
  it('returns CSS pixels, not device pixels, on a high-dpr screen', () => {
    // A 412x915 phone at dpr 2: Pixi reports CSS px in `screen`, device px on the canvas.
    const renderer = { screen: { width: 412, height: 915 }, width: 412, height: 915, resolution: 2 };

    expect(screenSize(renderer)).toEqual({ w: 412, h: 915 });
  });

  it('ignores resolution entirely', () => {
    const base = { screen: { width: 800, height: 600 }, width: 800, height: 600 };

    for (const resolution of [1, 1.75, 2, 3]) {
      expect(screenSize({ ...base, resolution })).toEqual({ w: 800, h: 600 });
    }
  });
});
