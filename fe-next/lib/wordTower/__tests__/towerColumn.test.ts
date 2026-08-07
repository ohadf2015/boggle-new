import { describe, it, expect } from 'vitest';
import { wordColor, textColorOn, hexToHsl } from '../towerColumn';

// The vertical letter-chain model (buildTowerColumn / cellAltitudes /
// blendColors / sharedConnectorLen) was deleted with the Shiritori chain it
// drew — a word is now ONE horizontal floor (see towerFloor.test.ts). What
// remains is per-word colour and glyph contrast.

describe('wordColor', () => {
  it('is deterministic per index', () => {
    expect(wordColor(0)).toBe(wordColor(0));
    expect(wordColor(7)).toBe(wordColor(7));
  });
  it('gives adjacent words clearly different hues (golden-angle separation)', () => {
    const h0 = hexToHsl(wordColor(0)).h;
    const h1 = hexToHsl(wordColor(1)).h;
    const arc = Math.min(Math.abs(h0 - h1), 360 - Math.abs(h0 - h1));
    expect(arc).toBeGreaterThan(40); // never near-identical neighbours
  });
  it('returns a valid 24-bit colour', () => {
    for (let i = 0; i < 20; i++) {
      const c = wordColor(i);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(0xffffff);
    }
  });
});


describe('textColorOn', () => {
  it('inks dark glyphs on a light tile and light glyphs on a dark one', () => {
    expect(textColorOn(0xffffff)).toBe(0x14141f);
    expect(textColorOn(0x101018)).toBe(0xfffef0);
  });

  it('keeps every word colour legible', () => {
    for (let i = 0; i < 24; i++) {
      const ink = textColorOn(wordColor(i));
      expect([0x14141f, 0xfffef0]).toContain(ink);
    }
  });
});
