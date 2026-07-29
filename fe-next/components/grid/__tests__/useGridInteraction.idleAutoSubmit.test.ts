/**
 * useGridInteraction — desktop idle auto-submit.
 *
 * Founder report (desktop practice): building a word leaves it stuck selected;
 * players think they must click elsewhere to submit. Industry standard is
 * release-to-submit (drag) + auto-submit-on-idle (click-build). We add an
 * opt-in `autoSubmitIdleMs`: on desktop, once ≥3 letters are selected and the
 * player stalls for that long, submit automatically. Mobile keeps
 * release-to-submit (idle disabled so a paused finger never fires early).
 */
import { renderHook, act } from '@testing-library/react';
import { useGridInteraction } from '../useGridInteraction';
import type { LetterGrid } from '@/types';

vi.mock('../performanceUtils', () => ({
  getPerformanceConfig: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));
vi.mock('@/utils/wordPathFinder', () => ({ findWordPath: vi.fn() }));
vi.mock('@/utils/clientWordValidator', () => ({
  normalizeWord: (word: string) => word.toUpperCase(),
}));
vi.mock('@/utils/consts', () => ({ getDeadzoneThreshold: () => 5 }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const mockGrid: LetterGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

const buildRef = () => {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect);
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div');
    const row = Math.floor(i / 4); const col = i % 4;
    cell.dataset.row = String(row); cell.dataset.col = String(col);
    cell.getBoundingClientRect = () => ({
      left: col * 100, top: row * 100, width: 100, height: 100,
      right: (col + 1) * 100, bottom: (row + 1) * 100, x: col * 100, y: row * 100, toJSON: () => ({}),
    } as DOMRect);
    el.appendChild(cell);
  }
  return { current: el };
};

// Click-build a word on desktop via the mouse-down click handler.
function clickBuild(result: { current: ReturnType<typeof useGridInteraction> }, cells: Array<[number, number, string]>) {
  for (const [r, c, letter] of cells) {
    act(() => {
      result.current.handleMouseDown(r, c, letter, { clientX: c * 100 + 50, clientY: r * 100 + 50 } as React.MouseEvent<HTMLDivElement>);
    });
  }
}

describe('useGridInteraction — desktop idle auto-submit', () => {
  it('auto-submits after the idle window once ≥3 letters are click-selected (desktop)', () => {
    const onWordSubmit = vi.fn();
    const gridRef = buildRef();
    const { result } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid, interactive: true, comboLevel: 0,
        onWordSubmit, gridRef, language: 'en', autoSubmitIdleMs: 1000,
      })
    );

    clickBuild(result, [[0, 0, 'A'], [0, 1, 'B'], [0, 2, 'C']]);
    expect(onWordSubmit).not.toHaveBeenCalled(); // not yet — still within idle window

    act(() => { vi.advanceTimersByTime(1000); });

    expect(onWordSubmit).toHaveBeenCalledTimes(1);
    expect(onWordSubmit.mock.calls[0][0]).toBe('ABC');
  });

  it('does NOT auto-submit a 2-letter selection (needs >2 letters)', () => {
    const onWordSubmit = vi.fn();
    const gridRef = buildRef();
    const { result } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid, interactive: true, comboLevel: 0,
        onWordSubmit, gridRef, language: 'en', autoSubmitIdleMs: 1000,
      })
    );

    clickBuild(result, [[0, 0, 'A'], [0, 1, 'B']]);
    act(() => { vi.advanceTimersByTime(2000); });

    expect(onWordSubmit).not.toHaveBeenCalled();
  });

  it('does NOT auto-submit when autoSubmitIdleMs is unset (MP/daily behavior preserved)', () => {
    const onWordSubmit = vi.fn();
    const gridRef = buildRef();
    const { result } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid, interactive: true, comboLevel: 0,
        onWordSubmit, gridRef, language: 'en',
      })
    );

    clickBuild(result, [[0, 0, 'A'], [0, 1, 'B'], [0, 2, 'C']]);
    act(() => { vi.advanceTimersByTime(3000); });

    expect(onWordSubmit).not.toHaveBeenCalled();
  });

  it('does NOT idle-auto-submit during a real touch drag (mobile lifts a finger to submit)', () => {
    const onWordSubmit = vi.fn();
    const gridRef = buildRef();
    const { result } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid, interactive: true, comboLevel: 0,
        onWordSubmit, gridRef, language: 'en', autoSubmitIdleMs: 1000,
      })
    );

    // Build a 3-letter word via real TouchEvents (finger still down).
    act(() => {
      result.current.handleTouchStart(0, 0, 'A', { touches: [{ clientX: 50, clientY: 50 }] } as unknown as React.TouchEvent<HTMLDivElement>);
    });
    act(() => {
      result.current.handleTouchMove({ touches: [{ clientX: 150, clientY: 50 }], cancelable: true, preventDefault: vi.fn() } as unknown as TouchEvent);
    });
    act(() => {
      result.current.handleTouchMove({ touches: [{ clientX: 250, clientY: 50 }], cancelable: true, preventDefault: vi.fn() } as unknown as TouchEvent);
    });
    act(() => { vi.advanceTimersByTime(2000); });

    // Finger is still down — release (handleTouchEnd) submits, idle must not.
    expect(onWordSubmit).not.toHaveBeenCalled();
  });

  it('idle-auto-submits a MOUSE drag even on a touch-capable device (touchscreen laptop)', () => {
    const onWordSubmit = vi.fn();
    const gridRef = buildRef();
    const { result } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid, interactive: true, comboLevel: 0,
        onWordSubmit, gridRef, language: 'en', autoSubmitIdleMs: 1000,
      })
    );

    // A stray touchstart flips the device-class flag (touchscreen PC). The
    // gate must key off the live pointer type, not this — a mouse drag still
    // auto-submits.
    act(() => { window.dispatchEvent(new Event('touchstart')); });

    // Mouse drag A→B→C (MouseEvents — no `touches`).
    act(() => {
      result.current.handleMouseDown(0, 0, 'A', { clientX: 50, clientY: 50 } as React.MouseEvent<HTMLDivElement>);
    });
    act(() => {
      result.current.handleTouchMove({ clientX: 150, clientY: 50, cancelable: true, preventDefault: vi.fn() } as unknown as MouseEvent);
    });
    act(() => {
      result.current.handleTouchMove({ clientX: 250, clientY: 50, cancelable: true, preventDefault: vi.fn() } as unknown as MouseEvent);
    });
    act(() => { vi.advanceTimersByTime(1000); });

    expect(onWordSubmit).toHaveBeenCalledTimes(1);
    expect(onWordSubmit.mock.calls[0][0]).toBe('ABC');
  });

  it('auto-submits on a drag-then-stall (>2 letters) and does NOT double-submit on the later mouseup', () => {
    const onWordSubmit = vi.fn();
    const gridRef = buildRef();
    const { result } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid, interactive: true, comboLevel: 0,
        onWordSubmit, gridRef, language: 'en', autoSubmitIdleMs: 1000,
      })
    );

    // Mouse-driven drag A(0,0) → B(0,1) → C(0,2), then the player holds still.
    act(() => {
      result.current.handleMouseDown(0, 0, 'A', { clientX: 50, clientY: 50 } as React.MouseEvent<HTMLDivElement>);
    });
    act(() => {
      result.current.handleTouchMove({ clientX: 150, clientY: 50, cancelable: true, preventDefault: vi.fn() } as unknown as MouseEvent);
    });
    act(() => {
      result.current.handleTouchMove({ clientX: 250, clientY: 50, cancelable: true, preventDefault: vi.fn() } as unknown as MouseEvent);
    });

    // Stall past the idle window → auto-submit fires once.
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onWordSubmit).toHaveBeenCalledTimes(1);
    expect(onWordSubmit.mock.calls[0][0]).toBe('ABC');

    // Player finally lifts the mouse. The global mouseup must NOT re-submit
    // (idle handler reset the drag refs, so handleTouchEnd is skipped).
    act(() => { window.dispatchEvent(new Event('mouseup')); });
    expect(onWordSubmit).toHaveBeenCalledTimes(1);
  });

  it('resets the idle timer on each new letter (full stall window after the last)', () => {
    const onWordSubmit = vi.fn();
    const gridRef = buildRef();
    const { result } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid, interactive: true, comboLevel: 0,
        onWordSubmit, gridRef, language: 'en', autoSubmitIdleMs: 1000,
      })
    );

    clickBuild(result, [[0, 0, 'A'], [0, 1, 'B'], [0, 2, 'C']]);
    act(() => { vi.advanceTimersByTime(700); }); // still building
    clickBuild(result, [[0, 3, 'D']]); // 4th letter resets the timer
    act(() => { vi.advanceTimersByTime(700); }); // 700ms < 1000ms since last letter
    expect(onWordSubmit).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(400); }); // now > 1000ms since last letter
    expect(onWordSubmit).toHaveBeenCalledTimes(1);
    expect(onWordSubmit.mock.calls[0][0]).toBe('ABCD');
  });
});
