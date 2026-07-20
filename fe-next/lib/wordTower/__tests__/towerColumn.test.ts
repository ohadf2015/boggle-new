import { describe, it, expect } from 'vitest';
import { buildTowerColumn, cellAltitudes, wordColor, blendColors, hexToHsl } from '../towerColumn';

describe('buildTowerColumn', () => {
  it('empty tower → no cells', () => {
    expect(buildTowerColumn([])).toEqual([]);
  });

  it('single solo floor → one letter cell per code point, all the word colour', () => {
    const cells = buildTowerColumn([{ word: 'CAT' }]);
    expect(cells).toHaveLength(3);
    expect(cells.map((c) => (c.kind === 'letter' ? c.char : '#'))).toEqual(['C', 'A', 'T']);
    const c0 = wordColor(0);
    expect(cells.every((c) => c.kind === 'letter' && c.color === c0 && !c.shared)).toBe(true);
  });

  it('tags a surprise floor onto its emitted letter cells (for the surprise-block render)', () => {
    const cells = buildTowerColumn([{ word: 'CAT' }, { word: 'TOP', surprise: 'golden_floor' }]);
    // 'T' connector merges into floor 0's tail; floor 1 emits only 'O','P'.
    const tagged = cells.filter((c) => c.kind === 'letter' && c.surprise === 'golden_floor');
    expect(tagged.map((c) => (c.kind === 'letter' ? c.char : '#'))).toEqual(['O', 'P']);
    // Ordinary floor 0 letters carry no surprise tag.
    expect(cells.slice(0, 3).every((c) => c.kind === 'letter' && c.surprise === undefined)).toBe(true);
  });

  it('Hebrew word is unicode-safe (one cell per letter, logical order bottom→top)', () => {
    const cells = buildTowerColumn([{ word: 'שלום' }]);
    expect(cells).toHaveLength(4);
    expect(cells.map((c) => (c.kind === 'letter' ? c.char : '#'))).toEqual(['ש', 'ל', 'ו', 'ם']);
  });

  it('chained words share the connector letter exactly once (CAT→TOP = C A T O P)', () => {
    const cells = buildTowerColumn([{ word: 'CAT' }, { word: 'TOP' }]);
    expect(cells.map((c) => (c.kind === 'letter' ? c.char : '#'))).toEqual(['C', 'A', 'T', 'O', 'P']);
    expect(cells).toHaveLength(5); // not 6 — the shared T is rendered once
  });

  it('connector letter is flagged shared and tinted the blend of both word colours', () => {
    const cells = buildTowerColumn([{ word: 'CAT' }, { word: 'TOP' }]);
    const tCell = cells[2]!; // the shared T
    expect(tCell.kind).toBe('letter');
    expect(tCell.kind === 'letter' && tCell.shared).toBe(true);
    expect(tCell.color).toBe(blendColors(wordColor(0), wordColor(1)));
    // non-shared letters keep their own word colour
    expect(cells[0]!.color).toBe(wordColor(0)); // C
    expect(cells[3]!.color).toBe(wordColor(1)); // O
  });

  it('three-word chain blends each join independently', () => {
    // CAT→TEN→NET : shared T (cells[2]) and shared N (cells[4])
    const cells = buildTowerColumn([{ word: 'CAT' }, { word: 'TEN' }, { word: 'NET' }]);
    expect(cells.map((c) => (c.kind === 'letter' ? c.char : '#'))).toEqual(['C', 'A', 'T', 'E', 'N', 'E', 'T']);
    expect(cells[2]!.color).toBe(blendColors(wordColor(0), wordColor(1))); // T join
    expect(cells[4]!.color).toBe(blendColors(wordColor(1), wordColor(2))); // N join
  });

  it('versus spoiler-free floor (empty word) → a single brick cell', () => {
    const cells = buildTowerColumn([{ word: '' }, { word: '' }]);
    expect(cells).toHaveLength(2);
    expect(cells.every((c) => c.kind === 'brick')).toBe(true);
  });

  it('a letter floor after a brick does not blend into the brick', () => {
    const cells = buildTowerColumn([{ word: '' }, { word: 'CAT' }]);
    expect(cells[0]!.kind).toBe('brick');
    expect(cells.slice(1).map((c) => (c.kind === 'letter' ? c.char : '#'))).toEqual(['C', 'A', 'T']);
    expect(cells[1]!.kind === 'letter' && cells[1]!.shared).toBe(false);
  });
});

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

describe('blendColors', () => {
  it('blending a colour with itself is the identity', () => {
    expect(blendColors(0xbfff00, 0xbfff00)).toBe(0xbfff00);
  });
  it('produces a hue strictly between the two inputs (shorter arc)', () => {
    const a = 0x00ffff; // cyan ~180°
    const b = 0xff1493; // pink ~328°
    const blend = blendColors(a, b);
    const ha = hexToHsl(a).h;
    const hb = hexToHsl(b).h;
    const hm = hexToHsl(blend).h;
    // shorter arc from cyan to pink crosses the high end (180→328 directly = 148°)
    expect(hm).toBeGreaterThan(Math.min(ha, hb));
    expect(hm).toBeLessThan(Math.max(ha, hb));
  });
});

describe('cellAltitudes', () => {
  it('emits exactly one altitude per built cell (parallel to buildTowerColumn)', () => {
    const floors = [{ word: 'CAT', meters: 6 }, { word: 'TOP', meters: 4 }, { word: 'PEN', meters: 5 }];
    const cells = buildTowerColumn(floors);
    const alts = cellAltitudes(floors);
    expect(alts).toHaveLength(cells.length);
  });

  it('matches cell count even with merged connectors (shared letters are not double-counted)', () => {
    const floors = [{ word: 'CAT', meters: 6 }, { word: 'TEA', meters: 4 }, { word: 'EAR', meters: 5 }];
    const cells = buildTowerColumn(floors); // C A T E A R → 6 cells (E,A shared)
    expect(cellAltitudes(floors)).toHaveLength(cells.length);
  });

  it('rises monotonically from base to top', () => {
    const floors = [{ word: 'CAT', meters: 6 }, { word: 'TOP', meters: 60 }, { word: 'PEN', meters: 100 }];
    const alts = cellAltitudes(floors);
    for (let i = 1; i < alts.length; i++) expect(alts[i]).toBeGreaterThanOrEqual(alts[i - 1]!);
  });

  it('keeps base tiles near the ground and top tiles near the total height', () => {
    const floors = [{ word: 'CAT', meters: 10 }, { word: 'TOP', meters: 90 }];
    const alts = cellAltitudes(floors);
    const total = 100;
    expect(alts[0]!).toBeLessThan(10); // base tile is in the city
    expect(alts[alts.length - 1]!).toBeLessThanOrEqual(total);
    expect(alts[alts.length - 1]!).toBeGreaterThan(50); // top tile is high up
  });

  it('handles empty / brick floors', () => {
    expect(cellAltitudes([])).toEqual([]);
    const alts = cellAltitudes([{ word: '', meters: 2 }, { word: '', meters: 2 }]);
    expect(alts).toHaveLength(2);
  });
});

describe('buildTowerColumn — 2-char vowel connector', () => {
  it('merges a 2-char shared prefix into the previous two tiles', () => {
    // CAT->TEA (share T, 1) ; TEA->EAR (share EA, 2)
    const cells = buildTowerColumn([{ word: 'CAT' }, { word: 'TEA' }, { word: 'EAR' }]);
    const letters = cells.filter((c) => c.kind === 'letter');
    expect(letters.map((c) => (c as { char: string }).char).join('')).toBe('CATEAR');
    // the E and A (TEA's last two) are shared connectors with EAR
    expect((letters[3] as { shared: boolean }).shared).toBe(true); // E
    expect((letters[4] as { shared: boolean }).shared).toBe(true); // A
  });
});
