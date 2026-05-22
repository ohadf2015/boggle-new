import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordCraftDrag } from '../useWordCraftDrag';

describe('useWordCraftDrag — touch-pointer tap-tap default', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
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
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

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
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

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

    // After >6px movement, drag should become active
    expect(result.current.drag).not.toBeNull();
    expect(result.current.drag?.active).toBe(true);
    expect(result.current.drag?.x).toBe(100);
    expect(result.current.drag?.y).toBe(100);
  });

  it('mouse pointer with pointerdown + movement immediately activates drag (unchanged behavior)', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

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
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

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
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 100, 100);
      result.current.begin('t-5', 'E', 5, evt as any);
    });

    act(() => {
      // Move only 3 pixels (less than 6px threshold)
      const evt = createPointerEvent('pointermove', 'touch', 103, 103);
      window.dispatchEvent(evt);
    });

    // Should still not be active (below threshold)
    expect(result.current.drag?.active).toBe(false);
    expect(result.current.drag?.x).toBe(103);
    expect(result.current.drag?.y).toBe(103);
  });

  it('touch pointer with vertical-only 4px movement activates drag (fast lane)', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

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
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

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
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

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
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 100, 100, undefined, {
        isPrimary: false,
      });
      result.current.begin('t-pinch', 'P', 1, evt as any);
    });

    expect(result.current.drag).toBeNull();
  });

  it('horizontal swipe sets consumeDropFlag so the trailing click is suppressed', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 100, 100);
      result.current.begin('t-swipe', 'S', 1, evt as any);
    });

    act(() => {
      const evt = createPointerEvent('pointermove', 'touch', 115, 100);
      window.dispatchEvent(evt);
    });

    act(() => {
      const evt = createPointerEvent('pointerup', 'touch', 115, 100);
      window.dispatchEvent(evt);
    });

    expect(onDrop).not.toHaveBeenCalled();
    expect(result.current.consumeDropFlag()).toBe(true);
    expect(result.current.consumeDropFlag()).toBe(false);
  });

  it('drop snap: pointerup in a 2px gap resolves to the nearest empty cell', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

    const c1 = document.createElement('div');
    c1.dataset.boardCell = '0,0';
    c1.dataset.tileState = 'empty';
    Object.defineProperty(c1, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 30, bottom: 30, width: 30, height: 30, x: 0, y: 0, toJSON: () => ({}) }),
    });
    const c2 = document.createElement('div');
    c2.dataset.boardCell = '0,1';
    c2.dataset.tileState = 'empty';
    Object.defineProperty(c2, 'getBoundingClientRect', {
      value: () => ({ left: 32, top: 0, right: 62, bottom: 30, width: 30, height: 30, x: 32, y: 0, toJSON: () => ({}) }),
    });
    container.appendChild(c1);
    container.appendChild(c2);

    act(() => {
      const evt = createPointerEvent('pointerdown', 'mouse', 5, 5);
      result.current.begin('t-snap', 'S', 1, evt as any);
    });
    act(() => {
      const evt = createPointerEvent('pointermove', 'mouse', 8, 8);
      window.dispatchEvent(evt);
    });
    act(() => {
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(document.body);
      const evt = createPointerEvent('pointerup', 'mouse', 31, 15);
      window.dispatchEvent(evt);
      vi.spyOn(document, 'elementFromPoint').mockRestore();
    });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith('t-snap', 0, 0);
  });

  it('drop snap: a near-miss ~28px from a cell center still snaps (forgiving radius)', () => {
    // GIVEN one empty 30px cell at origin (center 15,15)
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

    const c1 = document.createElement('div');
    c1.dataset.boardCell = '0,0';
    c1.dataset.tileState = 'empty';
    Object.defineProperty(c1, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 30, bottom: 30, width: 30, height: 30, x: 0, y: 0, toJSON: () => ({}) }),
    });
    container.appendChild(c1);

    act(() => {
      const evt = createPointerEvent('pointerdown', 'mouse', 5, 5);
      result.current.begin('t-near', 'N', 1, evt as any);
    });
    act(() => {
      const evt = createPointerEvent('pointermove', 'mouse', 8, 8);
      window.dispatchEvent(evt);
    });
    act(() => {
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(document.body);
      // WHEN releasing 28px below the cell center (15,43) — beyond the old
      // 24px radius but within a more forgiving 32px radius.
      const evt = createPointerEvent('pointerup', 'mouse', 15, 43);
      window.dispatchEvent(evt);
      vi.spyOn(document, 'elementFromPoint').mockRestore();
    });

    // THEN the tile still lands on the nearest empty cell
    expect(onDrop).toHaveBeenCalledWith('t-near', 0, 0);
  });

  it('drop snap: pointerup beyond SNAP_RADIUS_PX does not snap', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

    const c1 = document.createElement('div');
    c1.dataset.boardCell = '0,0';
    c1.dataset.tileState = 'empty';
    Object.defineProperty(c1, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 30, bottom: 30, width: 30, height: 30, x: 0, y: 0, toJSON: () => ({}) }),
    });
    container.appendChild(c1);

    act(() => {
      const evt = createPointerEvent('pointerdown', 'mouse', 5, 5);
      result.current.begin('t-far', 'F', 1, evt as any);
    });
    act(() => {
      const evt = createPointerEvent('pointermove', 'mouse', 8, 8);
      window.dispatchEvent(evt);
    });
    act(() => {
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(document.body);
      const evt = createPointerEvent('pointerup', 'mouse', 200, 200);
      window.dispatchEvent(evt);
      vi.spyOn(document, 'elementFromPoint').mockRestore();
    });

    expect(onDrop).not.toHaveBeenCalled();
  });

  it('touch: no drop fires if pointerup before threshold reached', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

    act(() => {
      const evt = createPointerEvent('pointerdown', 'touch', 50, 50);
      result.current.begin('t-7', 'G', 7, evt as any);
    });

    act(() => {
      // Small movement
      const evt = createPointerEvent('pointermove', 'touch', 52, 52);
      window.dispatchEvent(evt);
    });

    // Create a board cell to drop onto
    const cell = document.createElement('div');
    cell.dataset.boardCell = '5,5';
    cell.dataset.tileState = 'empty';
    container.appendChild(cell);

    act(() => {
      // Point pointerup over the cell while drag is still inactive
      const evt = createPointerEvent('pointerup', 'touch', 52, 52);
      // Override elementFromPoint to return our test cell
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(cell);
      window.dispatchEvent(evt);
      vi.spyOn(document, 'elementFromPoint').mockRestore();
    });

    // onDrop should NOT fire because drag.active was false
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('consumeDropFlag reflects successful drop', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useWordCraftDrag({ onDrop }));

    // Before any gesture, consumeDropFlag should return false
    expect(result.current.consumeDropFlag()).toBe(false);

    act(() => {
      const evt = createPointerEvent('pointerdown', 'mouse', 0, 0);
      result.current.begin('t-8', 'H', 8, evt as any);
    });

    act(() => {
      // Activate drag with mouse movement
      const evt = createPointerEvent('pointermove', 'mouse', 5, 5);
      window.dispatchEvent(evt);
    });

    // Create a valid drop target
    const cell = document.createElement('div');
    cell.dataset.boardCell = '3,3';
    cell.dataset.tileState = 'empty';
    container.appendChild(cell);

    act(() => {
      // End drag over a valid empty cell
      const evt = createPointerEvent('pointerup', 'mouse', 5, 5);
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(cell);
      window.dispatchEvent(evt);
      vi.spyOn(document, 'elementFromPoint').mockRestore();
    });

    // Now consumeDropFlag should return true (and clear it)
    expect(result.current.consumeDropFlag()).toBe(true);
    // Second call should return false
    expect(result.current.consumeDropFlag()).toBe(false);
  });
});
