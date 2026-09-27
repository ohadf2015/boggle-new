import { describe, it, expect } from 'vitest';
import {
  clampView,
  ensureCellVisible,
  initialScale,
  isPannable,
  zoomAt,
  FIT,
  MAX_SCALE,
} from '../viewport';

const VW = 350; // a phone-sized square board

describe('initialScale', () => {
  it('opens a mini fitted — nothing to pan', () => {
    expect(initialScale(5)).toBe(1);
    expect(initialScale(7)).toBe(1);
  });

  it('opens a newspaper grid zoomed so cells clear the touch target', () => {
    const scale = initialScale(11);
    expect(scale).toBeGreaterThan(1);
    expect((VW * scale) / 11).toBeGreaterThanOrEqual(44);
  });

  it('never exceeds the zoom ceiling', () => {
    expect(initialScale(45)).toBe(MAX_SCALE);
  });
});

describe('clampView', () => {
  it('pins a fitted board to the origin so it cannot be dragged off-centre', () => {
    expect(clampView({ x: -80, y: 40, scale: 1 }, VW)).toEqual(FIT);
  });

  it('never exposes empty space past an edge', () => {
    const overflow = VW * (2 - 1);
    expect(clampView({ x: 50, y: 50, scale: 2 }, VW)).toMatchObject({ x: 0, y: 0 });
    expect(clampView({ x: -999, y: -999, scale: 2 }, VW)).toMatchObject({
      x: -overflow,
      y: -overflow,
    });
  });

  it('holds the zoom inside its bounds', () => {
    expect(clampView({ x: 0, y: 0, scale: 0.2 }, VW).scale).toBe(1);
    expect(clampView({ x: 0, y: 0, scale: 99 }, VW).scale).toBe(MAX_SCALE);
  });
});

describe('isPannable', () => {
  it('is false at fit and true once zoomed', () => {
    expect(isPannable(FIT)).toBe(false);
    expect(isPannable({ x: 0, y: 0, scale: 1.6 })).toBe(true);
  });
});

describe('zoomAt', () => {
  it('keeps the anchor point under the finger', () => {
    // Zooming about the box centre from 1→2 must push the content half a box up-left.
    const out = zoomAt(FIT, 2, VW / 2, VW / 2, VW);
    expect(out.x).toBeCloseTo(-VW / 2);
    expect(out.y).toBeCloseTo(-VW / 2);
  });

  it('clamps so zooming at a corner cannot expose empty space', () => {
    const out = zoomAt(FIT, 2, 0, 0, VW);
    expect(out).toMatchObject({ x: 0, y: 0, scale: 2 });
  });
});

describe('ensureCellVisible', () => {
  const base = { size: 11, vw: VW, rtl: false };

  it('does nothing when the board is fitted', () => {
    const view = FIT;
    expect(ensureCellVisible(view, { ...base, row: 10, col: 10 })).toBe(view);
  });

  it('pans to a cell that is off the bottom-right', () => {
    const view = { x: 0, y: 0, scale: 2 };
    const out = ensureCellVisible(view, { ...base, row: 10, col: 10 });
    const cell = (VW * 2) / 11;
    // the cell's far edge must now sit inside the box
    expect(10 * cell + out.x + cell).toBeLessThanOrEqual(VW + 0.001);
    expect(10 * cell + out.y + cell).toBeLessThanOrEqual(VW + 0.001);
  });

  it('leaves an already-visible cell alone rather than nudging on every keystroke', () => {
    const view = { x: 0, y: 0, scale: 2 };
    expect(ensureCellVisible(view, { ...base, row: 1, col: 1 })).toEqual(view);
  });

  it('mirrors the column for RTL grids', () => {
    const view = { x: 0, y: 0, scale: 2 };
    // In an RTL grid column 0 is drawn on the RIGHT, so focusing it must pan right-ward,
    // exactly opposite to the LTR case.
    const ltr = ensureCellVisible(view, { ...base, row: 0, col: 0, rtl: false });
    const rtl = ensureCellVisible(view, { ...base, row: 0, col: 0, rtl: true });
    expect(ltr.x).toBe(0);
    expect(rtl.x).toBeLessThan(0);
  });

  it('never pans past an edge', () => {
    const view = { x: 0, y: 0, scale: 3 };
    const out = ensureCellVisible(view, { ...base, row: 10, col: 10 });
    expect(out.x).toBeGreaterThanOrEqual(-VW * 2 - 0.001);
    expect(out.y).toBeGreaterThanOrEqual(-VW * 2 - 0.001);
  });
});
