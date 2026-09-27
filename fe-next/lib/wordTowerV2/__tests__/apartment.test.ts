import { describe, expect, it } from 'vitest';
import { apartmentLayout, litWindows } from '../apartment';
import { BLOCK_HEIGHT_PX, blockWidthForWord } from '../scoring';

const inside = (r: { x: number; y: number; w: number; h: number }, w: number, h: number) =>
  r.x >= -w / 2 - 1e-6 && r.x + r.w <= w / 2 + 1e-6 && r.y >= -h / 2 - 1e-6 && r.y + r.h <= h / 2 + 1e-6;

describe('apartmentLayout', () => {
  for (const word of ['cat', 'tower', 'skyscrap']) {
    it(`given a ${word.length}-letter floor, when laid out, then sign, windows and slab sit inside the block`, () => {
      const w = blockWidthForWord(word);
      const l = apartmentLayout(w, BLOCK_HEIGHT_PX, false);
      expect(inside(l.sign, w, BLOCK_HEIGHT_PX)).toBe(true);
      expect(inside(l.slab, w, BLOCK_HEIGHT_PX)).toBe(true);
      for (const win of l.windows) expect(inside(win, w, BLOCK_HEIGHT_PX)).toBe(true);
    });
  }

  it('given any floor, when laid out, then it has a row of at least four windows (reads as an apartment)', () => {
    expect(apartmentLayout(blockWidthForWord('cat'), BLOCK_HEIGHT_PX, false).windows.length).toBeGreaterThanOrEqual(4);
  });

  it('given windows, when laid out, then none overlap and they sit below the sign', () => {
    const l = apartmentLayout(blockWidthForWord('tower'), BLOCK_HEIGHT_PX, false);
    for (let i = 1; i < l.windows.length; i += 1) expect(l.windows[i].x).toBeGreaterThanOrEqual(l.windows[i - 1].x + l.windows[i - 1].w);
    for (const win of l.windows) expect(win.y).toBeGreaterThanOrEqual(l.sign.y + l.sign.h);
  });

  it('given the lobby (first floor), when laid out, then a door replaces the middle windows', () => {
    const l = apartmentLayout(blockWidthForWord('tower'), BLOCK_HEIGHT_PX, true);
    expect(l.door).not.toBeNull();
    for (const win of l.windows) {
      const overlaps = win.x < l.door!.x + l.door!.w && win.x + win.w > l.door!.x;
      expect(overlaps).toBe(false);
    }
  });
});

describe('litWindows', () => {
  it('given tenants, when lit, then one window each, capped at the window count', () => {
    expect(litWindows(6, 0, 3).filter(Boolean).length).toBe(0);
    expect(litWindows(6, 3, 3).filter(Boolean).length).toBe(3);
    expect(litWindows(6, 99, 3).filter(Boolean).length).toBe(6);
  });

  it('given the same floor, when lit twice, then the same windows (no flicker between repaints)', () => {
    expect(litWindows(7, 4, 11)).toEqual(litWindows(7, 4, 11));
  });

  it('given more tenants, when lit, then earlier windows stay lit (arrivals only add light)', () => {
    const a = litWindows(7, 2, 5);
    const b = litWindows(7, 3, 5);
    a.forEach((on, i) => {
      if (on) expect(b[i]).toBe(true);
    });
  });
});
