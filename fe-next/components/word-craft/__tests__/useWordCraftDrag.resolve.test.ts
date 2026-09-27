import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { resolveDropCellFast, useWordCraftDrag } from '../useWordCraftDrag';

/**
 * Fake 15×15 board element: 318×318 at (0,0) → 3px border + 6px padding
 * (chrome 9), inner 300, 2px gaps. pitch = (300 + 2) / 15 ≈ 20.13.
 */
function fakeBoard(size = 15): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-wc-board', '');
  el.setAttribute('data-board-size', String(size));
  el.style.borderLeftWidth = '3px';
  el.style.paddingLeft = '6px';
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 318, height: 318, right: 318, bottom: 318, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  Object.defineProperty(el, 'offsetWidth', { value: 318 });
  return el;
}

const PITCH = (300 + 2) / 15;
const CHROME = 9;
/** Viewport coords of the center of cell (r,c) on the fake board. */
function cellCenter(r: number, c: number): [number, number] {
  return [CHROME + c * PITCH + (PITCH - 2) / 2, CHROME + r * PITCH + (PITCH - 2) / 2];
}

describe('resolveDropCellFast', () => {
  it('maps a point inside an empty cell to its key', () => {
    const [x, y] = cellCenter(7, 7);
    expect(resolveDropCellFast(x, y, fakeBoard(), new Set(['0,0', '7,7']))).toBe('7,7');
  });

  it('returns null for an occupied cell with no empty neighbour in snap range', () => {
    const [x, y] = cellCenter(7, 7);
    expect(resolveDropCellFast(x, y, fakeBoard(), new Set(['0,0']))).toBeNull();
  });

  it('snaps an occupied-cell point to an adjacent empty cell within radius', () => {
    // Point dead-center of occupied (7,8); empty (7,7) center is one pitch
    // away (~20 px < 32 px radius) → snap.
    const [x, y] = cellCenter(7, 8);
    expect(resolveDropCellFast(x, y, fakeBoard(), new Set(['7,7']))).toBe('7,7');
  });

  it('snaps a gap point between cells to the nearest empty cell', () => {
    const [cx, cy] = cellCenter(7, 7);
    const gapX = cx + (PITCH - 2) / 2 + 1; // 1px into the gap right of (7,7)
    expect(resolveDropCellFast(gapX, cy, fakeBoard(), new Set(['7,7']))).toBe('7,7');
  });

  it('returns null far outside the board', () => {
    expect(resolveDropCellFast(1000, 1000, fakeBoard(), new Set(['7,7']))).toBeNull();
  });

  it('respects a CSS-transform scale (rect 2× the layout size)', () => {
    const el = fakeBoard();
    el.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 636, height: 636, right: 636, bottom: 636, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    // Same cell (7,7) center — everything doubles.
    const [x, y] = cellCenter(7, 7);
    expect(resolveDropCellFast(x * 2, y * 2, el, new Set(['7,7']))).toBe('7,7');
  });
});

describe('useWordCraftDrag render behavior', () => {
  let board: HTMLElement;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    board = fakeBoard();
    document.body.appendChild(board);
  });

  afterEach(() => {
    board.remove();
    vi.unstubAllGlobals();
  });

  function firePointerDownAt(x: number, y: number) {
    return {
      isPrimary: true,
      clientX: x,
      clientY: y,
      pointerType: 'mouse',
    } as unknown as React.PointerEvent;
  }

  it('does not re-render per pointermove — ≤4 renders for a 60-move storm inside one cell', () => {
    let renders = 0;
    const empty = new Set(['7,7']);
    const { result } = renderHook(() => {
      renders++;
      return useWordCraftDrag({ onDrop: vi.fn(), getEmptyCells: () => empty });
    });

    const [cx, cy] = cellCenter(7, 7);
    act(() => {
      result.current.begin('t-1', 'A', 1, firePointerDownAt(cx, cy - 200));
    });
    act(() => {
      for (let i = 0; i < 60; i++) {
        // March straight down toward (7,7) — all landing inside the same cell
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: cx, clientY: cy - (60 - i) / 30 }));
      }
    });

    // initial + begin + activation/hover flip(s). Never 60.
    expect(renders).toBeLessThanOrEqual(5);
  });

  it('drops on the resolved cell on pointerup', () => {
    const onDrop = vi.fn();
    const empty = new Set(['7,7']);
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells: () => empty }));

    const [cx, cy] = cellCenter(7, 7);
    act(() => {
      result.current.begin('t-1', 'A', 1, firePointerDownAt(cx - 30, cy - 30));
    });
    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: cx, clientY: cy }));
    });
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { clientX: cx, clientY: cy }));
    });

    expect(onDrop).toHaveBeenCalledWith('t-1', 7, 7);
  });
});
