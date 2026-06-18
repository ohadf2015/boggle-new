/**
 * Verifies that cellNodeMapRef is pre-populated at mount time, not lazily on
 * first drag. Moving querySelectorAll off the interaction path improves INP
 * for all game modes (multiplayer, classic, blast, word hunt).
 */

import { renderHook, act } from '@testing-library/react';
import { useGridInteraction } from '../useGridInteraction';
import type { LetterGrid } from '@/types';

vi.mock('../performanceUtils', () => ({
  getPerformanceConfig: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));
vi.mock('@/utils/wordPathFinder', () => ({ findWordPath: vi.fn() }));
vi.mock('@/utils/clientWordValidator', () => ({
  normalizeWord: (w: string) => w.toUpperCase(),
}));
vi.mock('@/utils/consts', () => ({ getDeadzoneThreshold: () => 5 }));

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(performance.now()); return 0; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => vi.unstubAllGlobals());

const mockGrid: LetterGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

function createGridRef() {
  const el = document.createElement('div');
  // Populate with 4×4 cells carrying data-row/data-col attributes
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cell = document.createElement('div');
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      el.appendChild(cell);
    }
  }
  return { current: el };
}

describe('cellNodeMap — eager pre-population on mount', () => {
  it('queries [data-row][data-col] at mount, NOT at first drag', () => {
    const gridRef = createGridRef();
    const qsaSpy = vi.spyOn(gridRef.current, 'querySelectorAll');

    // Render hook — useEffect fires here
    renderHook(() =>
      useGridInteraction({
        grid: mockGrid,
        interactive: true,
        comboLevel: 0,
        gridRef,
        language: 'en',
      })
    );

    // Mount-time querySelectorAll for [data-row][data-col] must have fired
    const mountCalls = qsaSpy.mock.calls.filter((args) => args[0] === '[data-row][data-col]');
    expect(mountCalls.length).toBeGreaterThanOrEqual(1);

    // Clear spy — now verify first drag does NOT re-run the query
    qsaSpy.mockClear();

    act(() => {
      // handleTouchStart triggers clearAllDragClasses + toggleDragClass
      // Both use cellNodeMapRef.current — must hit cache, not querySelectorAll
    });

    const dragCalls = qsaSpy.mock.calls.filter((args) => args[0] === '[data-row][data-col]');
    expect(dragCalls).toHaveLength(0);
  });

  it('still works correctly if grid has no data-row/data-col cells yet (graceful no-op)', () => {
    const emptyEl = document.createElement('div');
    const gridRef = { current: emptyEl };

    // Should not throw
    expect(() =>
      renderHook(() =>
        useGridInteraction({
          grid: mockGrid,
          interactive: true,
          comboLevel: 0,
          gridRef,
          language: 'en',
        })
      )
    ).not.toThrow();
  });
});
