import { describe, it, expect } from 'vitest';
import { courseTileLayout, biomeBackdrop, towerRowLayout } from '../towerLayout';

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

describe('towerRowLayout (grounded camera)', () => {
  const H = 1200;
  const inset = 220;

  it('empty tower applies no shift', () => {
    const l = towerRowLayout({ pinCount: 0, H, bottomInsetPx: inset });
    expect(l.shift).toBe(0);
  });

  it('short tower is grounded: base sits near the bottom (above the deck), no shift', () => {
    const l = towerRowLayout({ pinCount: 3, H, bottomInsetPx: inset });
    expect(l.shift).toBe(0);
    // base (pos 0) centred at baseCenter, which is above the control deck
    expect(l.centerY(0)).toBe(l.baseCenter);
    expect(l.baseCenter + l.half).toBeLessThanOrEqual(H - inset);
  });

  it('grounded tower never pushes its newest tile above the build line', () => {
    const l = towerRowLayout({ pinCount: 6, H, bottomInsetPx: inset });
    expect(l.shift).toBe(0);
    // top committed tile stays at or below topCenter (i.e. under the crane line)
    expect(l.centerY(5)).toBeGreaterThanOrEqual(l.topCenter);
  });

  it('tall tower overflows: newest committed tile is pinned at the build line', () => {
    const pinCount = 20;
    const l = towerRowLayout({ pinCount, H, bottomInsetPx: inset });
    expect(l.shift).toBeGreaterThan(0);
    expect(l.centerY(pinCount - 1)).toBeCloseTo(l.topCenter);
    // base has scrolled below the viewport bottom (off-screen / behind the deck)
    expect(l.centerY(0)).toBeGreaterThan(H - inset);
  });

  it('centerY is monotonic in pos by exactly one row height (no overlaps)', () => {
    const l = towerRowLayout({ pinCount: 10, H, bottomInsetPx: inset });
    for (let p = 0; p < 9; p++) {
      expect(l.centerY(p) - l.centerY(p + 1)).toBeCloseTo(l.rowH);
    }
  });

  it('shift grows continuously across the overflow boundary (no camera jump)', () => {
    // Find the boundary pinCount where shift first becomes positive.
    let boundary = 0;
    for (let n = 1; n < 60; n++) {
      if (towerRowLayout({ pinCount: n, H, bottomInsetPx: inset }).shift > 0) { boundary = n; break; }
    }
    expect(boundary).toBeGreaterThan(1);
    const before = towerRowLayout({ pinCount: boundary - 1, H, bottomInsetPx: inset }).shift;
    const at = towerRowLayout({ pinCount: boundary, H, bottomInsetPx: inset }).shift;
    const after = towerRowLayout({ pinCount: boundary + 1, H, bottomInsetPx: inset }).shift;
    expect(before).toBe(0);
    // each extra committed row adds exactly one rowH of downward travel
    expect(after - at).toBeCloseTo(towerRowLayout({ pinCount: boundary, H, bottomInsetPx: inset }).rowH);
    expect(at).toBeLessThanOrEqual(towerRowLayout({ pinCount: boundary, H, bottomInsetPx: inset }).rowH);
  });
});
