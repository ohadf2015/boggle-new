import { describe, it, expect } from 'vitest';
import { courseTileLayout, biomeBackdrop } from '../towerLayout';

describe('courseTileLayout', () => {
  it('returns one tile per code point (unicode-safe)', () => {
    expect(courseTileLayout('CAT', 300).tiles.map((t) => t.char)).toEqual(['C', 'A', 'T']);
    // Hebrew letters are single code points — 4 tiles, not byte count.
    expect(courseTileLayout('שלום', 300).tiles).toHaveLength(4);
  });

  it('empty word → no tiles, zero size', () => {
    const l = courseTileLayout('', 300);
    expect(l.tiles).toEqual([]);
    expect(l.width).toBe(0);
    expect(l.height).toBe(0);
  });

  it('clamps a single tile to maxTile and centers it within the course', () => {
    const l = courseTileLayout('A', 300, { maxTile: 56, gap: 4 });
    expect(l.tiles[0]!.size).toBe(56);
    expect(l.tiles[0]!.x).toBeCloseTo((300 - 56) / 2);
    expect(l.height).toBe(56);
  });

  it('clamps down to minTile for long words (never shrinks past the floor)', () => {
    const l = courseTileLayout('ABCDEFGHIJ', 100, { minTile: 18, maxTile: 56, gap: 4 });
    expect(l.tiles).toHaveLength(10);
    expect(l.tiles.every((t) => t.size === 18)).toBe(true);
  });

  it('lays LTR words left-to-right (char 0 left-most)', () => {
    const l = courseTileLayout('CAT', 300, { dir: 'ltr' });
    expect(l.tiles[0]!.char).toBe('C');
    expect(l.tiles[0]!.x).toBeLessThan(l.tiles[2]!.x);
  });

  it('lays RTL words right-to-left (char 0 right-most)', () => {
    const l = courseTileLayout('שלום', 300, { dir: 'rtl' });
    expect(l.tiles[0]!.char).toBe('ש');
    // logical first char must sit at the greatest x (visually rightmost)
    expect(l.tiles[0]!.x).toBeGreaterThan(l.tiles[l.tiles.length - 1]!.x);
  });

  it('spaces adjacent tiles by exactly tile size + gap (no overlap)', () => {
    const l = courseTileLayout('CAT', 300, { gap: 4 });
    const xs = l.tiles.map((t) => t.x).sort((a, b) => a - b);
    expect(xs[1]! - xs[0]!).toBeCloseTo(l.tiles[0]!.size + 4);
  });
});

describe('biomeBackdrop', () => {
  it('city shows the full construction rig', () => {
    const b = biomeBackdrop('city');
    expect(b.scaffold).toBeGreaterThan(0);
    expect(b.crane).toBeGreaterThan(0);
    expect(b.skyline).toBeGreaterThan(0);
  });

  it('deep-space biomes drop the rig entirely', () => {
    for (const id of ['nebula', 'galaxy'] as const) {
      const b = biomeBackdrop(id);
      expect(b.scaffold).toBe(0);
      expect(b.crane).toBe(0);
      expect(b.skyline).toBe(0);
    }
  });

  it('scaffold opacity is non-increasing as altitude rises', () => {
    const order = ['city', 'sky', 'stratosphere', 'orbit', 'nebula', 'galaxy'] as const;
    const vals = order.map((id) => biomeBackdrop(id).scaffold);
    for (let i = 1; i < vals.length; i++) expect(vals[i]!).toBeLessThanOrEqual(vals[i - 1]!);
  });
});
