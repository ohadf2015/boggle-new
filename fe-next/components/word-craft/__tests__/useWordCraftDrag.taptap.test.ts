import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordCraftDrag } from '../useWordCraftDrag';

/**
 * Fake 15×15 board for grid-math drop resolution: 318×318 at (0,0) →
 * 3px border + 6px padding (chrome 9), inner 300, 2px gaps.
 * pitch = (300 + 2) / 15 ≈ 20.13. Cell (r,c) center = 9 + i*pitch + span/2.
 */
function makeFakeBoard(size = 15): HTMLElement {
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
function cellCenter(r: number, c: number): [number, number] {
  return [CHROME + c * PITCH + (PITCH - 2) / 2, CHROME + r * PITCH + (PITCH - 2) / 2];
}

describe('useWordCraftDrag — touch-pointer tap-tap default', () => {
  let container: HTMLDivElement;
  let board: HTMLElement;
  // Per-test set of empty board cells the hook resolves drops against.
  let emptyCells: Set<string>;
  const getEmptyCells = () => emptyCells;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    board = makeFakeBoard();
    document.body.appendChild(board);
    emptyCells = new Set<string>();
    // jsdom lacks a paint loop; run ghost-paint rAF callbacks synchronously.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    document.body.removeChild(container);
    board.remove();
    vi.unstubAllGlobals();
  });

  function createPointerEvent(
    type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
    pointerType: 'mouse' | 'touch' | 'pen',
    x: number,
    y: number,
    _target?: EventTarget,
    extra?: { isPrimary?: boolean },
  ): PointerEvent {
    return new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerType,
      clientX: x,
      clientY: y,
      isPrimary: extra?.isPrimary ?? true,
    });
  }

  it('touch pointer with pointerdown + pointerup (no movement) = tap, no drag ghost', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));

    act(() => {
      // Simulate touch pointer down on a rack tile
      const evt = createPointerEvent('pointerdown', 'touch', 100, 100);
      result.current.begin('t-1', 'A', 1, evt as any);
    });

    // After pointerdown alone, drag should exist but NOT be active (no ghost yet)
    expect(result.current.drag).not.toBeNull();
    expect(result.current.drag?.active).toBe(false);
    expect(result.current.drag?.pointerType).toBe('touch');
    expect(result.current.drag?.tileId).toBe('t-1');

    act(() => {
      // Simulate pointerup without any movement
      const evt = createPointerEvent('pointerup', 'touch', 100, 100);
      window.dispatchEvent(evt);
    });

    // After pointerup with no movement, drag should be cleared
    expect(result.current.drag).toBeNull();
    // onDrop should NOT have been called (no active drop)
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('touch pointer with >6px movement escalates to drag (ghost becomes active)', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 50, 50);
      result.current.begin('t-2', 'B', 2, evt as any);
    });

    expect(result.current.drag?.active).toBe(false);

    act(() => {
      // Move >6px (e.g., 50 pixels diagonal)
      const evt = createPointerEvent('pointermove', 'touch', 100, 100);
      window.dispatchEvent(evt);
    });

    // After >6px movement, drag should become active. x/y stay at the START
    // position — live motion is imperative (ghostRef transform), not state.
    expect(result.current.drag).not.toBeNull();
    expect(result.current.drag?.active).toBe(true);
    expect(result.current.drag?.x).toBe(50);
    expect(result.current.drag?.y).toBe(50);
  });

  it('mouse pointer with pointerdown + movement immediately activates drag (unchanged behavior)', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'mouse', 0, 0);
      result.current.begin('t-3', 'C', 3, evt as any);
    });

    expect(result.current.drag?.active).toBe(false);
    expect(result.current.drag?.pointerType).toBe('mouse');

    act(() => {
      // Even small movement on mouse should activate drag
      const evt = createPointerEvent('pointermove', 'mouse', 2, 2);
      window.dispatchEvent(evt);
    });

    // Mouse pointer activates drag immediately on any movement
    expect(result.current.drag?.active).toBe(true);
  });

  it('pen pointer with movement immediately activates drag (unchanged behavior)', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'pen', 0, 0);
      result.current.begin('t-4', 'D', 4, evt as any);
    });

    expect(result.current.drag?.pointerType).toBe('pen');

    act(() => {
      const evt = createPointerEvent('pointermove', 'pen', 1, 1);
      window.dispatchEvent(evt);
    });

    // Pen pointer also activates drag immediately (unchanged)
    expect(result.current.drag?.active).toBe(true);
  });

  it('touch pointer with <6px movement does not activate drag', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 100, 100);
      result.current.begin('t-5', 'E', 5, evt as any);
    });

    act(() => {
      // Move only 3 pixels (less than 6px threshold)
      const evt = createPointerEvent('pointermove', 'touch', 103, 103);
      window.dispatchEvent(evt);
    });

    // Should still not be active (below threshold); x/y = start position
    expect(result.current.drag?.active).toBe(false);
    expect(result.current.drag?.x).toBe(100);
    expect(result.current.drag?.y).toBe(100);
  });

  it('touch pointer with vertical-only 4px movement activates drag (fast lane)', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 100, 100);
      result.current.begin('t-v', 'V', 1, evt as any);
    });

    act(() => {
      // Pure vertical 4px upward — covers "lift tile straight up off rack".
      const evt = createPointerEvent('pointermove', 'touch', 100, 96);
      window.dispatchEvent(evt);
    });

    expect(result.current.drag?.active).toBe(true);
  });

  it('touch pointer dragging up-and-sideways toward the board activates the drag', () => {
    // Horizontal-dominant motion that is ALSO clearly upward = the finger is
    // heading to the board, not scrolling the rack. Previously this stayed
    // inactive (both activation paths required absDy >= absDx) so diagonal
    // drags silently died — the "dragging feels stuck" bug.
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 50, 100);
      result.current.begin('t-diag', 'D', 1, evt as any);
    });

    act(() => {
      // dx = +40, dy = -20 → horizontal-dominant but clearly upward
      const evt = createPointerEvent('pointermove', 'touch', 90, 80);
      window.dispatchEvent(evt);
    });

    expect(result.current.drag?.active).toBe(true);
  });

  it('touch pointer with horizontal-only swipe does NOT activate drag (rack scroll wins)', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 50, 50);
      result.current.begin('t-h', 'H', 1, evt as any);
    });

    act(() => {
      const evt = createPointerEvent('pointermove', 'touch', 90, 50);
      window.dispatchEvent(evt);
    });

    expect(result.current.drag?.active).toBe(false);
  });

  it('begin() ignores non-primary pointers so pinch second-finger never starts a drag', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 100, 100, undefined, {
        isPrimary: false,
      });
      result.current.begin('t-pinch', 'P', 1, evt as any);
    });

    expect(result.current.drag).toBeNull();
  });

  it('horizontal swipe >= 16px sets consumeDropFlag so the trailing click is suppressed', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 100, 100);
      result.current.begin('t-swipe', 'S', 1, evt as any);
    });

    act(() => {
      // 16px or more of horizontal movement triggers swipe flag
      const evt = createPointerEvent('pointermove', 'touch', 120, 100);
      window.dispatchEvent(evt);
    });

    act(() => {
      const evt = createPointerEvent('pointerup', 'touch', 120, 100);
      window.dispatchEvent(evt);
    });

    expect(onDrop).not.toHaveBeenCalled();
    expect(result.current.consumeDropFlag()).toBe(true);
    expect(result.current.consumeDropFlag()).toBe(false);
  });

  it('tap with <16px accidental horizontal drift does NOT suppress the click', () => {
    // This is the fix for rage clicks: small horizontal movements during a tap
    // should not suppress the subsequent click event. Only clear deliberate
    // swipes (16px+) should suppress the click.
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 100, 100);
      result.current.begin('t-tap-drift', 'L', 1, evt as any);
    });

    act(() => {
      // 10px horizontal drift + 8px vertical drift = accidental movement during tap
      const evt = createPointerEvent('pointermove', 'touch', 110, 108);
      window.dispatchEvent(evt);
    });

    act(() => {
      const evt = createPointerEvent('pointerup', 'touch', 110, 108);
      window.dispatchEvent(evt);
    });

    // The click should NOT be suppressed because the horizontal movement (10px)
    // is below the 16px threshold for a swipe
    expect(result.current.consumeDropFlag()).toBe(false);
  });

  it('drop snap: pointerup in the gap between two empty cells resolves to a cell', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));
    emptyCells = new Set(['0,0', '0,1']);

    const [c00x, c00y] = cellCenter(0, 0);
    act(() => {
      const evt = createPointerEvent('pointerdown', 'mouse', c00x - 12, c00y - 12);
      result.current.begin('t-snap', 'S', 1, evt as any);
    });
    act(() => {
      const evt = createPointerEvent('pointermove', 'mouse', c00x - 8, c00y - 8);
      window.dispatchEvent(evt);
    });
    act(() => {
      // Release in the 2px gap between (0,0) and (0,1)
      const gapX = CHROME + PITCH - 1;
      const evt = createPointerEvent('pointerup', 'mouse', gapX, c00y);
      window.dispatchEvent(evt);
    });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith('t-snap', 0, 0);
  });

  it('drop snap: a near-miss ~28px from a cell center still snaps (forgiving radius)', () => {
    // GIVEN only cell (0,0) is empty
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));
    emptyCells = new Set(['0,0']);

    act(() => {
      const evt = createPointerEvent('pointerdown', 'mouse', 5, 5);
      result.current.begin('t-near', 'N', 1, evt as any);
    });
    act(() => {
      const evt = createPointerEvent('pointermove', 'mouse', 8, 8);
      window.dispatchEvent(evt);
    });
    act(() => {
      // WHEN releasing ~25px below the (0,0) cell center — beyond the cell,
      // inside the forgiving 32px snap radius.
      const [cx, cy] = cellCenter(0, 0);
      const evt = createPointerEvent('pointerup', 'mouse', cx - 3, cy + 25);
      window.dispatchEvent(evt);
    });

    // THEN the tile still lands on the nearest empty cell
    expect(onDrop).toHaveBeenCalledWith('t-near', 0, 0);
  });

  it('drop snap: pointerup beyond SNAP_RADIUS_PX does not snap', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));
    emptyCells = new Set(['0,0']);

    act(() => {
      const evt = createPointerEvent('pointerdown', 'mouse', 5, 5);
      result.current.begin('t-far', 'F', 1, evt as any);
    });
    act(() => {
      const evt = createPointerEvent('pointermove', 'mouse', 8, 8);
      window.dispatchEvent(evt);
    });
    act(() => {
      const evt = createPointerEvent('pointerup', 'mouse', 200, 200);
      window.dispatchEvent(evt);
    });

    expect(onDrop).not.toHaveBeenCalled();
  });

  it('touch: no drop fires if pointerup before threshold reached', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));
    // The cell under (52,52) — floor((52-9)/20.13) = 2 — is empty and would
    // accept a drop if the drag were active.
    emptyCells = new Set(['2,2']);

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 50, 50);
      result.current.begin('t-7', 'G', 7, evt as any);
    });

    act(() => {
      // Small movement
      const evt = createPointerEvent('pointermove', 'touch', 52, 52);
      window.dispatchEvent(evt);
    });

    act(() => {
      // Pointerup over the empty cell while drag is still inactive
      const evt = createPointerEvent('pointerup', 'touch', 52, 52);
      window.dispatchEvent(evt);
    });

    // onDrop should NOT fire because drag.active was false
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('consumeDropFlag reflects successful drop', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop, getEmptyCells }));
    emptyCells = new Set(['3,3']);

    // Before any gesture, consumeDropFlag should return false
    expect(result.current.consumeDropFlag()).toBe(false);

    const [cx, cy] = cellCenter(3, 3);
    act(() => {
      const evt = createPointerEvent('pointerdown', 'mouse', cx - 5, cy - 5);
      result.current.begin('t-8', 'H', 8, evt as any);
    });

    act(() => {
      // Activate drag with mouse movement
      const evt = createPointerEvent('pointermove', 'mouse', cx, cy);
      window.dispatchEvent(evt);
    });

    act(() => {
      // End drag over the valid empty cell
      const evt = createPointerEvent('pointerup', 'mouse', cx, cy);
      window.dispatchEvent(evt);
    });

    expect(onDrop).toHaveBeenCalledWith('t-8', 3, 3);
    // Now consumeDropFlag should return true (and clear it)
    expect(result.current.consumeDropFlag()).toBe(true);
    // Second call should return false
    expect(result.current.consumeDropFlag()).toBe(false);
  });
});
