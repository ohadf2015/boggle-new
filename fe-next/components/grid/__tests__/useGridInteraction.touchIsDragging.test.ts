/**
 * useGridInteraction — isDragging during touch swipe
 *
 * Regression test for MP-classic "slow after 2+ letters on mobile".
 *
 * The grid-cell perf gates added in commit 74eea1133 (chromatic-aberration
 * filter on the board, blur/glow/particles + WebGL VFXTileEffect inside
 * GridCellEffects, transition strategy in GridCell) all key off the hook's
 * returned `isDragging` flag. Before this fix `isDraggingRef.current` was
 * only set true in the mouse handler (handleMouseMove behind a
 * `!isTouchDeviceRef.current` guard); the touch path never set it, so
 * `isDragging` stayed false for the whole mobile swipe and every gated
 * heavy-paint effect re-ran per letter.
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
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(performance.now());
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useGridInteraction — isDragging on touch', () => {
  const mockGrid: LetterGrid = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ];

  const setup = () => {
    const gridRef: { current: HTMLDivElement } = {
      current: document.createElement('div'),
    };
    gridRef.current.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0,
      toJSON: () => ({}),
    });
    const mockCell = document.createElement('div');
    mockCell.getBoundingClientRect = () => ({
      left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0,
      toJSON: () => ({}),
    });
    gridRef.current.appendChild(mockCell);
    for (let i = 1; i < 16; i++) {
      gridRef.current.appendChild(mockCell.cloneNode(true));
    }
    return gridRef;
  };

  it('flips isDragging=true after a touch swipe past the deadzone', () => {
    const gridRef = setup();
    const { result, rerender } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid,
        interactive: true,
        comboLevel: 0,
        onWordSubmit: vi.fn(),
        onPathSubmit: vi.fn(),
        gridRef,
        language: 'en',
      }),
    );

    expect(result.current.isDragging).toBe(false);

    act(() => {
      result.current.handleTouchStart(0, 0, 'A', {
        touches: [{ clientX: 50, clientY: 50 }],
      } as unknown as React.TouchEvent<HTMLDivElement>);
    });

    // Swipe well past the 5px deadzone into a neighbouring cell
    act(() => {
      result.current.handleTouchMove({
        touches: [{ clientX: 150, clientY: 50 }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent);
    });
    // Re-render so the hook's returned `isDragging` re-reads the ref
    rerender();

    expect(result.current.isDragging).toBe(true);
  });

  it('resets isDragging=false after handleTouchEnd', () => {
    const gridRef = setup();
    const { result, rerender } = renderHook(() =>
      useGridInteraction({
        grid: mockGrid,
        interactive: true,
        comboLevel: 0,
        onWordSubmit: vi.fn(),
        onPathSubmit: vi.fn(),
        gridRef,
        language: 'en',
      }),
    );

    act(() => {
      result.current.handleTouchStart(0, 0, 'A', {
        touches: [{ clientX: 50, clientY: 50 }],
      } as unknown as React.TouchEvent<HTMLDivElement>);
    });
    act(() => {
      result.current.handleTouchMove({
        touches: [{ clientX: 150, clientY: 50 }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent);
    });
    rerender();
    expect(result.current.isDragging).toBe(true);

    act(() => {
      result.current.handleTouchEnd();
    });
    rerender();

    expect(result.current.isDragging).toBe(false);
  });
});
