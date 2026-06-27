/**
 * useGridInteraction — combo auto-submit gating.
 *
 * Bug report (MP classic, desktop): after the player commits the first valid
 * word and `comboLevel > 0`, dragging a new word and pausing for ~500ms
 * silently auto-submits it before the player releases the mouse or double-
 * clicks. Desktop UX expectation = explicit submit (release or double-click);
 * the combo auto-submit is mobile-only ergonomics (finger-still-on-last-cell).
 *
 * Fix gates the combo auto-submit fire to real touch pointers
 * (`activePointerIsTouchRef.current === true`). Mouse drags ignore it.
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

describe('useGridInteraction — combo auto-submit gating', () => {
  it('does NOT combo-auto-submit a desktop mouse drag that pauses mid-word (MP classic regression)', () => {
    const onWordSubmit = vi.fn();
    const gridRef = buildRef();
    const { result } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid, interactive: true, comboLevel: 1,
        onWordSubmit, gridRef, language: 'en',
      })
    );

    // Mouse drag A(0,0) → B(0,1) → C(0,2), mouse button still down (no release).
    act(() => {
      result.current.handleMouseDown(0, 0, 'A', { clientX: 50, clientY: 50 } as React.MouseEvent<HTMLDivElement>);
    });
    act(() => {
      result.current.handleTouchMove({ clientX: 150, clientY: 50, cancelable: true, preventDefault: vi.fn() } as unknown as MouseEvent);
    });
    act(() => {
      result.current.handleTouchMove({ clientX: 250, clientY: 50, cancelable: true, preventDefault: vi.fn() } as unknown as MouseEvent);
    });

    // Player pauses while still holding mouse, up to just before the 1s desktop
    // idle-auto-submit default. The combo timer (500ms) would fire in this
    // window if the gate were absent; with the gate, a mouse pointer never trips
    // it. (The idle-auto-submit path that DOES fire at 1000ms is covered in
    // useGridInteraction.idleAutoSubmit.test.ts.)
    act(() => { vi.advanceTimersByTime(999); });

    expect(onWordSubmit).not.toHaveBeenCalled();
  });

  it('still combo-auto-submits a real touch drag that pauses mid-word (mobile combo flow preserved)', () => {
    const onWordSubmit = vi.fn();
    const gridRef = buildRef();
    const { result } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid, interactive: true, comboLevel: 1,
        onWordSubmit, gridRef, language: 'en',
      })
    );

    // Real touch drag A → B → C (finger still on glass).
    act(() => {
      result.current.handleTouchStart(0, 0, 'A', {
        touches: [{ clientX: 50, clientY: 50 }],
      } as unknown as React.TouchEvent<HTMLDivElement>);
    });
    act(() => {
      result.current.handleTouchMove({
        touches: [{ clientX: 150, clientY: 50 }], cancelable: true, preventDefault: vi.fn(),
      } as unknown as TouchEvent);
    });
    act(() => {
      result.current.handleTouchMove({
        touches: [{ clientX: 250, clientY: 50 }], cancelable: true, preventDefault: vi.fn(),
      } as unknown as TouchEvent);
    });

    act(() => { vi.advanceTimersByTime(600); });

    expect(onWordSubmit).toHaveBeenCalledTimes(1);
    expect(onWordSubmit.mock.calls[0][0]).toBe('ABC');
  });
});
