import { describe, it, expect } from 'vitest';
import { buildTowerColumn, wordColor, blendColors, hexToHsl } from '../towerColumn';

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

import { buildTowerColumn as buildCol2 } from '../towerColumn';
describe('buildTowerColumn — 2-char vowel connector', () => {
  it('merges a 2-char shared prefix into the previous two tiles', () => {
    // CAT->TEA (share T, 1) ; TEA->EAR (share EA, 2)
    const cells = buildCol2([{ word: 'CAT' }, { word: 'TEA' }, { word: 'EAR' }]);
    const letters = cells.filter((c) => c.kind === 'letter');
    expect(letters.map((c) => (c as { char: string }).char).join('')).toBe('CATEAR');
    // the E and A (TEA's last two) are shared connectors with EAR
    expect((letters[3] as { shared: boolean }).shared).toBe(true); // E
    expect((letters[4] as { shared: boolean }).shared).toBe(true); // A
  });
});
