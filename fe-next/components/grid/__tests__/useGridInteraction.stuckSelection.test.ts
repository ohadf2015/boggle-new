/**
 * useGridInteraction — the drag-highlight class must never outlive the gesture.
 *
 * Bug (reported on Adventure mode): tiles keep *looking* selected after a word
 * is submitted. Two paths leave `blast-drag-selected` painted on live DOM:
 *
 *  1. Desktop click-select. `handleMouseDown` paints the class and sets
 *     `isTouchingRef`, but the global mouseup only calls `handleTouchEnd()`
 *     when `isDraggingRef` is true — a plain click never sets it, so nothing
 *     ever removes the class.
 *  2. `handleTouchEnd` bailed on `if (!interactive ...) return` BEFORE any
 *     cleanup. Adventure flips `interactive` off the moment the clock hits 0,
 *     so a finger released after that left `isTouchingRef` stuck true forever —
 *     which also makes every later submit skip its own selection clear.
 */
import { renderHook, act } from '@testing-library/react';
import { useGridInteraction } from '../useGridInteraction';
import type { LetterGrid } from '@/types';

vi.mock('../performanceUtils', () => ({
  getPerformanceConfig: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));
vi.mock('@/utils/wordPathFinder', () => ({ findWordPath: vi.fn() }));
vi.mock('@/utils/clientWordValidator', () => ({ normalizeWord: (w: string) => w.toUpperCase() }));
vi.mock('@/utils/consts', () => ({ getDeadzoneThreshold: () => 5 }));

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(performance.now()); return 0; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

const mockGrid: LetterGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

/** Grid ref whose cells carry data-row/data-col, so the cell-node map resolves. */
const buildRef = () => {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 400, height: 400,
    right: 400, bottom: 400, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect);
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div');
    const row = Math.floor(i / 4);
    const col = i % 4;
    cell.dataset.row = String(row);
    cell.dataset.col = String(col);
    cell.getBoundingClientRect = () => ({
      left: col * 100, top: row * 100, width: 100, height: 100,
      right: (col + 1) * 100, bottom: (row + 1) * 100,
      x: col * 100, y: row * 100, toJSON: () => ({}),
    } as DOMRect);
    el.appendChild(cell);
  }
  document.body.appendChild(el);
  return { current: el };
};

const painted = (gridRef: { current: HTMLElement }) =>
  gridRef.current.querySelectorAll('.blast-drag-selected').length;

describe('useGridInteraction — drag highlight never outlives the gesture', () => {
  it('clears the drag class after a desktop click that never became a drag', () => {
    const gridRef = buildRef();
    renderHookWith(gridRef, true).clickCellThenRelease();
    expect(painted(gridRef)).toBe(0);
  });

  it('clears the drag class when interactive flips off mid-gesture', () => {
    const gridRef = buildRef();
    const harness = renderHookWith(gridRef, true);
    harness.startTouch();
    expect(painted(gridRef)).toBeGreaterThan(0);
    harness.setInteractive(false);
    harness.endTouch();
    expect(painted(gridRef)).toBe(0);
  });

  it('releases the touching flag when interactive flips off, so later submits still clear', () => {
    vi.useFakeTimers();
    // useFakeTimers replaces rAF — re-stub it synchronous so processTouchMove runs.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0; });
    const gridRef = buildRef();
    const onWordSubmit = vi.fn();
    const harness = renderHookWith(gridRef, true, onWordSubmit);

    harness.startTouch();
    harness.setInteractive(false);
    harness.endTouch();
    harness.setInteractive(true);

    // A fresh word must still clear its selection 150ms after submit.
    harness.dragTwoCellsAndRelease();
    expect(onWordSubmit).toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(harness.result.current.selectedCells).toHaveLength(0);
    vi.useRealTimers();
  });
});

function renderHookWith(
  gridRef: { current: HTMLElement },
  initialInteractive: boolean,
  onWordSubmit: (word: string) => void = vi.fn(),
) {
  let interactive = initialInteractive;
  const { result, rerender } = renderHook(() =>
    useGridInteraction({
      grid: mockGrid,
      interactive,
      comboLevel: 0,
      onWordSubmit,
      gridRef,
      language: 'en',
    })
  );
  const touch = (x: number, y: number) =>
    ({ touches: [{ clientX: x, clientY: y }] }) as unknown as React.TouchEvent<HTMLDivElement>;

  return {
    result,
    setInteractive(next: boolean) {
      interactive = next;
      act(() => { rerender(); });
    },
    startTouch() {
      act(() => { result.current.handleTouchStart(0, 0, 'A', touch(50, 50)); });
    },
    endTouch() {
      act(() => { result.current.handleTouchEnd(); });
    },
    dragTwoCellsAndRelease() {
      act(() => { result.current.handleTouchStart(0, 0, 'A', touch(50, 50)); });
      act(() => {
        result.current.handleTouchMove({
          touches: [{ clientX: 150, clientY: 50 }], cancelable: true, preventDefault: vi.fn(),
        } as unknown as TouchEvent);
      });
      act(() => { result.current.handleTouchEnd(); });
    },
    clickCellThenRelease() {
      act(() => {
        result.current.handleMouseDown(0, 0, 'A', {
          clientX: 50, clientY: 50, preventDefault: vi.fn(), stopPropagation: vi.fn(),
        } as unknown as React.MouseEvent<HTMLDivElement>);
      });
      act(() => { window.dispatchEvent(new MouseEvent('mouseup')); });
    },
  };
}
