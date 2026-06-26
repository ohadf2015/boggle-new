import { describe, it, expect } from 'vitest';
import { courseTileLayout, biomeBackdrop, towerRowLayout, towerPanMin, clampPan } from '../towerLayout';

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
    const l = towerRowLayout({ pinCount: 2, H, bottomInsetPx: inset });
    expect(l.shift).toBe(0);
    // base (pos 0) centred at baseCenter, which is above the control deck
    expect(l.centerY(0)).toBe(l.baseCenter);
    expect(l.baseCenter + l.half).toBeLessThanOrEqual(H - inset);
  });

  it('grounded tower never pushes its newest tile above the build line', () => {
    // Within the visible cap (default 2 rows) the tower stays grounded.
    const l = towerRowLayout({ pinCount: 2, H, bottomInsetPx: inset });
    expect(l.shift).toBe(0);
    // top committed tile stays at or below topCenter (i.e. under the crane line)
    expect(l.centerY(1)).toBeGreaterThanOrEqual(l.topCenter);
  });

  // ── "top 2 blocks on screen" — the camera shows only the newest few rows so
  //    most of the screen stays clean sky; the rest scrolls below the deck. ──
  it('keeps the tower grounded up to maxVisibleRows, then pans on the next row', () => {
    const mvr = 3;
    for (let n = 1; n <= mvr; n++) {
      expect(towerRowLayout({ pinCount: n, H, bottomInsetPx: inset, maxVisibleRows: mvr }).shift).toBe(0);
    }
    // the (mvr+1)-th committed row tips the camera into follow mode
    expect(towerRowLayout({ pinCount: mvr + 1, H, bottomInsetPx: inset, maxVisibleRows: mvr }).shift).toBeGreaterThan(0);
  });

  it('defaults to a 3-row visible cap (founder 2026-06-26: ~3 blocks on screen)', () => {
    expect(towerRowLayout({ pinCount: 3, H, bottomInsetPx: inset }).shift).toBe(0);
    expect(towerRowLayout({ pinCount: 4, H, bottomInsetPx: inset }).shift).toBeGreaterThan(0);
  });

  it('sizes bricks so roughly maxVisibleRows fill the band (build line → deck)', () => {
    // A typical phone viewport: the visible committed band should hold ~mvr big
    // blocks, not a dozen small ones (the rest scroll below the deck).
    const l = towerRowLayout({ pinCount: 12, H: 844, bottomInsetPx: 300, maxVisibleRows: 3 });
    const visibleRows = (844 - 300 - l.topCenter) / l.rowH;
    expect(visibleRows).toBeGreaterThan(1.5);
    expect(visibleRows).toBeLessThanOrEqual(4); // ~3, never a tall stack of tiny tiles
  });

  it('build line sits exactly (maxVisibleRows-1) rows above the grounded base', () => {
    for (const mvr of [2, 3, 5]) {
      const l = towerRowLayout({ pinCount: 1, H, bottomInsetPx: inset, maxVisibleRows: mvr });
      expect(l.baseCenter - l.topCenter).toBeCloseTo((mvr - 1) * l.rowH);
    }
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

  // ── Phase-1 polish: compact, cohesive stack (founder: tiles too big, tower
  //    reads as floating blocks not a solid tower; new letters crammed at top). ──
  it('caps tile size to a chunky maximum even on tall canvases', () => {
    expect(towerRowLayout({ pinCount: 5, H: 2000, bottomInsetPx: inset }).size).toBeLessThanOrEqual(96);
  });

  it('keeps a usable minimum tile size on short canvases', () => {
    expect(towerRowLayout({ pinCount: 5, H: 300, bottomInsetPx: inset }).size).toBeGreaterThanOrEqual(44);
  });

  it('stacks rows nearly flush — a thin seam, never a loose gap or overlap', () => {
    for (const h of [380, 700, 1000, 1400]) {
      const l = towerRowLayout({ pinCount: 5, H: h, bottomInsetPx: 160 });
      const seam = l.rowH - l.size;
      expect(seam).toBeGreaterThan(0); // tiles must not overlap
      expect(seam).toBeLessThanOrEqual(3); // cohesive tower, not detached floating blocks
    }
  });

  it('keeps the build line glued to the crane line (~0.28H), never up by the header', () => {
    // The crane chrome + rival rail are anchored to this same upper-middle line;
    // the build line must stay there so the dropped block lands under the crane.
    for (const h of [700, 915, 1200]) {
      const l = towerRowLayout({ pinCount: 8, H: h, bottomInsetPx: 160 });
      expect(l.topCenter).toBeGreaterThanOrEqual(h * 0.22);
      expect(l.topCenter).toBeLessThanOrEqual(h * 0.42);
    }
  });

  it('floats the base just (maxVisibleRows-1) rows under the crane line — a tight build zone, clean screen below', () => {
    const l = towerRowLayout({ pinCount: 2, H: 915, bottomInsetPx: 130, maxVisibleRows: 3 });
    // base hangs in the build zone, still ABOVE the control deck (clean strip
    // below it), and exactly (mvr-1) rows under the crane line.
    expect(l.baseCenter + l.half).toBeLessThan(915 - 130);
    expect(l.baseCenter - l.topCenter).toBeCloseTo(2 * l.rowH);
  });
});

describe('camera pan (user scroll to review the tower)', () => {
  it('a short tower needs no pan — the base is already on screen', () => {
    // base near mid-screen, well above the deck → nothing below to reveal
    expect(towerPanMin(400, 900, 200, 27)).toBe(0);
  });

  it('a tall tower allows panning UP to bring the off-screen base into view', () => {
    // base scrolled below the viewport bottom → pan must be negative to reveal it
    const panMin = towerPanMin(1400, 900, 200, 27);
    expect(panMin).toBeLessThan(0);
    // panning by exactly panMin lands the base just above the deck
    expect(1400 + panMin).toBeCloseTo(900 - 200 - 27);
  });

  it('clampPan keeps the offset within [panMin, 0]', () => {
    expect(clampPan(50, -500)).toBe(0); // can't pan past the newest tile (sky above)
    expect(clampPan(-200, -500)).toBe(-200); // mid-range allowed
    expect(clampPan(-900, -500)).toBe(-500); // can't pan below the base
    expect(clampPan(0, 0)).toBe(0); // degenerate (short tower) pins at 0
  });
});
