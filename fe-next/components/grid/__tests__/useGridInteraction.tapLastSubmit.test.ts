/**
 * useGridInteraction — tap-last-tile-to-submit on touch.
 *
 * Bug: Mobile multiplayer players (PostHog 14d: 18 rage-clicks across 8
 * sessions on /en/multiplayer + /es/multiplayer) tapped the last selected
 * tile expecting it to submit their word (mirroring desktop behavior in
 * useGridClickHandler:32+52). Touch path `handleTouchStart` always reset
 * dragSelectionRef + selectedCells to a single cell, wiping the in-progress
 * word and triggering rage-click loops.
 *
 * Fix: when handleTouchStart fires on the last cell of a selection ≥2,
 * submit instead of reset.
 */
import { renderHook, act } from '@testing-library/react';
import { useGridInteraction } from '../useGridInteraction';
import type { LetterGrid } from '@/types';

vi.mock('../performanceUtils', () => ({
  getPerformanceConfig: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
  }),
}));

vi.mock('@/utils/wordPathFinder', () => ({
  findWordPath: vi.fn(),
}));

vi.mock('@/utils/clientWordValidator', () => ({
  normalizeWord: (word: string) => word.toUpperCase(),
}));

vi.mock('@/utils/consts', () => ({
  getDeadzoneThreshold: () => 5,
}));

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(performance.now());
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => {
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
    left: 0, top: 0, width: 400, height: 400,
    right: 400, bottom: 400, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect);
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div');
    const row = Math.floor(i / 4);
    const col = i % 4;
    cell.getBoundingClientRect = () => ({
      left: col * 100, top: row * 100, width: 100, height: 100,
      right: (col + 1) * 100, bottom: (row + 1) * 100,
      x: col * 100, y: row * 100, toJSON: () => ({}),
    } as DOMRect);
    el.appendChild(cell);
  }
  return { current: el };
};

describe('useGridInteraction — tap-last-tile-to-submit on touch', () => {
  it('submits the word when the player taps the last selected tile (length ≥2)', () => {
    const onWordSubmit = vi.fn();
    const onPathSubmit = vi.fn();
    const gridRef = buildRef();

    const { result } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid,
        interactive: true,
        comboLevel: 0,
        onWordSubmit,
        onPathSubmit,
        gridRef,
        language: 'en',
      })
    );

    // Drag to spell A→B (length 2) on touch
    act(() => {
      const startEvent = {
        touches: [{ clientX: 50, clientY: 50 }],
      } as unknown as React.TouchEvent<HTMLDivElement>;
      result.current.handleTouchStart(0, 0, 'A', startEvent);
    });
    act(() => {
      const moveEvent = {
        touches: [{ clientX: 150, clientY: 50 }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(moveEvent);
    });

    onWordSubmit.mockClear();
    onPathSubmit.mockClear();

    // Player TAPS the last selected tile (B at row 0, col 1).
    // Expectation: submit. Bug behavior: reset selection to just [B].
    act(() => {
      const tapEvent = {
        touches: [{ clientX: 150, clientY: 50 }],
      } as unknown as React.TouchEvent<HTMLDivElement>;
      result.current.handleTouchStart(0, 1, 'B', tapEvent);
    });

    expect(onWordSubmit).toHaveBeenCalledTimes(1);
    expect(onWordSubmit.mock.calls[0][0]).toBe('AB');
  });

  it('does NOT submit when tapping the last tile of a single-letter selection', () => {
    const onWordSubmit = vi.fn();
    const gridRef = buildRef();

    const { result } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid,
        interactive: true,
        comboLevel: 0,
        onWordSubmit,
        gridRef,
        language: 'en',
      })
    );

    act(() => {
      const startEvent = {
        touches: [{ clientX: 50, clientY: 50 }],
      } as unknown as React.TouchEvent<HTMLDivElement>;
      result.current.handleTouchStart(0, 0, 'A', startEvent);
    });

    onWordSubmit.mockClear();

    // Tap same cell again with only 1 selected — should NOT submit.
    act(() => {
      const tapEvent = {
        touches: [{ clientX: 50, clientY: 50 }],
      } as unknown as React.TouchEvent<HTMLDivElement>;
      result.current.handleTouchStart(0, 0, 'A', tapEvent);
    });

    expect(onWordSubmit).not.toHaveBeenCalled();
  });

  it('starts a new selection when tapping a NON-last tile (e.g. distant cell)', () => {
    const onWordSubmit = vi.fn();
    const gridRef = buildRef();

    const { result } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid,
        interactive: true,
        comboLevel: 0,
        onWordSubmit,
        gridRef,
        language: 'en',
      })
    );

    act(() => {
      const startEvent = {
        touches: [{ clientX: 50, clientY: 50 }],
      } as unknown as React.TouchEvent<HTMLDivElement>;
      result.current.handleTouchStart(0, 0, 'A', startEvent);
    });
    act(() => {
      const moveEvent = {
        touches: [{ clientX: 150, clientY: 50 }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(moveEvent);
    });

    onWordSubmit.mockClear();

    // Tap a distant cell — should reset, not submit.
    act(() => {
      const tapEvent = {
        touches: [{ clientX: 350, clientY: 350 }],
      } as unknown as React.TouchEvent<HTMLDivElement>;
      result.current.handleTouchStart(3, 3, 'P', tapEvent);
    });

    expect(onWordSubmit).not.toHaveBeenCalled();
  });
});
