/**
 * T-Shape Selection Bug Tests
 *
 * Tests for the regression bug where T-shaped selections (bottom to right/left)
 * are incorrectly rejected.
 *
 * Root Cause: The scroll detection logic at line 591 of useGridInteraction.ts
 * treats primarily vertical movements as scroll gestures when:
 *   deltaY > deltaX * 1.5
 *
 * This was intended to allow users to scroll the page while touching the grid,
 * but it inadvertently BLOCKS all vertical word selections!
 *
 * Expected: Vertical selections should work just like horizontal ones.
 * The scroll detection should only apply at the START of a gesture, not
 * once the user has started selecting cells.
 */

import { renderHook, act } from '@testing-library/react';
import { useGridInteraction } from '../useGridInteraction';
import type { LetterGrid } from '@/types';

// Mock performance utils
vi.mock('../performanceUtils', () => ({
  getPerformanceConfig: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
  }),
}));

// Mock word path finder
vi.mock('@/utils/wordPathFinder', () => ({
  findWordPath: vi.fn(),
}));

// Mock client word validator
vi.mock('@/utils/clientWordValidator', () => ({
  normalizeWord: (word: string) => word.toUpperCase(),
}));

// Mock consts
vi.mock('@/utils/consts', () => ({
  getDeadzoneThreshold: () => 5,
}));

// processTouchMove is RAF-batched in production. Stub rAF synchronously so
// state updates land within the same act() block and assertions stay valid.
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

describe('useGridInteraction - T-Shape Selection Bug', () => {
  /**
   * Grid layout:
   *   0   1   2   3
   * 0 [A] [B] [C] [D]
   * 1 [E] [F] [G] [H]
   * 2 [I] [J] [K] [L]
   * 3 [M] [N] [O] [P]
   *
   * T-shape patterns tested:
   * - Down-Down-Right: A→E→I→J (vertical then horizontal)
   * - Down-Down-Left: B→F→J→I (vertical then horizontal)
   * - Right-Right-Down: A→B→C→G (horizontal then vertical)
   */
  const mockGrid: LetterGrid = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ];

  // Cell dimensions for a 400x400 grid with 4x4 cells
  const CELL_SIZE = 100;
  const CELL_RADIUS = CELL_SIZE / 2;
  const GRID_LEFT = 0;
  const GRID_TOP = 0;

  // Create a mock ref with proper cell measurements
  // All coordinates are in viewport (screen) coordinates
  const createMockGridRef = () => {
    const element = document.createElement('div');
    element.getBoundingClientRect = () => ({
      left: GRID_LEFT,
      top: GRID_TOP,
      width: 400,
      height: 400,
      right: 400,
      bottom: 400,
      x: GRID_LEFT,
      y: GRID_TOP,
      toJSON: () => ({}),
    });

    // Create 16 mock cells (4x4 grid)
    // Cells are positioned in viewport coordinates (same as touch events)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const cell = document.createElement('div');
        // Cell positions in viewport coordinates
        const left = GRID_LEFT + col * CELL_SIZE;
        const top = GRID_TOP + row * CELL_SIZE;
        cell.getBoundingClientRect = () => ({
          left,
          top,
          width: CELL_SIZE,
          height: CELL_SIZE,
          right: left + CELL_SIZE,
          bottom: top + CELL_SIZE,
          x: left,
          y: top,
          toJSON: () => ({}),
        });
        element.appendChild(cell);
      }
    }

    return { current: element };
  };

  // Helper to get touch coordinates for a cell in viewport coordinates
  // offset allows simulating touches that are not perfectly centered
  const getCellTouchCoords = (row: number, col: number, offsetX = 0, offsetY = 0) => {
    // Center of the cell in viewport coordinates
    const centerX = GRID_LEFT + col * CELL_SIZE + CELL_RADIUS;
    const centerY = GRID_TOP + row * CELL_SIZE + CELL_RADIUS;
    return {
      x: centerX + offsetX,
      y: centerY + offsetY,
    };
  };

  /**
   * This test verifies that vertical selections work at all.
   *
   * Pattern: A(0,0) → E(1,0) → I(2,0) → J(2,1)
   *
   * The bug: When the first move after touch start is vertical (deltaY > deltaX * 1.5),
   * the scroll detection logic at line 591 interprets it as a scroll gesture
   * and blocks all further selection processing.
   */
  it('should allow T-shape selection: vertical then horizontal (down-down-right)', () => {
    const gridRef = createMockGridRef();
    const onWordSubmit = vi.fn();
    const onPathSubmit = vi.fn();

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

    // Start at A (0,0) - center of cell
    act(() => {
      const coords = getCellTouchCoords(0, 0);
      const mockEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
      } as unknown as React.TouchEvent<HTMLDivElement>;
      result.current.handleTouchStart(0, 0, 'A', mockEvent);
    });

    expect(result.current.selectedCells).toHaveLength(1);
    expect(result.current.selectedCells[0].letter).toBe('A');

    // Move to E (1,0) - vertical move down
    act(() => {
      const coords = getCellTouchCoords(1, 0);
      const mockMoveEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(mockMoveEvent);
    });

    expect(result.current.selectedCells).toHaveLength(2);
    expect(result.current.selectedCells[1].letter).toBe('E');

    // Move to I (2,0) - vertical move down again
    act(() => {
      const coords = getCellTouchCoords(2, 0);
      const mockMoveEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(mockMoveEvent);
    });

    expect(result.current.selectedCells).toHaveLength(3);
    expect(result.current.selectedCells[2].letter).toBe('I');

    // Move to J (2,1) - HORIZONTAL after vertical (T-shape!)
    // Simulate touch entering from the left side of J (coming from I)
    // The touch is offset 30 pixels from center (30% of cell radius toward left edge)
    // This is within 0.95 threshold (47.5px from center) but outside 0.85 threshold (42.5px)
    act(() => {
      const coords = getCellTouchCoords(2, 1, -30, 0); // 30px left of center
      const mockMoveEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(mockMoveEvent);
    });

    // BUG: Without the fix, this assertion fails - J is not selected
    // because the touch at 30px from center exceeds the 0.85 threshold (42.5px)
    expect(result.current.selectedCells).toHaveLength(4);
    expect(result.current.selectedCells[3]?.letter).toBe('J');
  });

  /**
   * Test the opposite T-shape: vertical then horizontal LEFT
   * Pattern: B(0,1) → F(1,1) → J(2,1) → I(2,0)
   */
  it('should allow T-shape selection: vertical then horizontal (down-down-left)', () => {
    const gridRef = createMockGridRef();
    const onWordSubmit = vi.fn();
    const onPathSubmit = vi.fn();

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

    // Start at B (0,1)
    act(() => {
      const coords = getCellTouchCoords(0, 1);
      const mockEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
      } as unknown as React.TouchEvent<HTMLDivElement>;
      result.current.handleTouchStart(0, 1, 'B', mockEvent);
    });

    // Move to F (1,1) - vertical
    act(() => {
      const coords = getCellTouchCoords(1, 1);
      const mockMoveEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(mockMoveEvent);
    });

    // Move to J (2,1) - vertical
    act(() => {
      const coords = getCellTouchCoords(2, 1);
      const mockMoveEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(mockMoveEvent);
    });

    expect(result.current.selectedCells).toHaveLength(3);

    // Move to I (2,0) - HORIZONTAL left after vertical (T-shape!)
    // Touch enters from right side of I (coming from J)
    act(() => {
      const coords = getCellTouchCoords(2, 0, 30, 0); // 30px right of center
      const mockMoveEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(mockMoveEvent);
    });

    expect(result.current.selectedCells).toHaveLength(4);
    expect(result.current.selectedCells[3]?.letter).toBe('I');
  });

  /**
   * Test horizontal then vertical T-shape
   * Pattern: A(0,0) → B(0,1) → C(0,2) → G(1,2)
   */
  it('should allow T-shape selection: horizontal then vertical (right-right-down)', () => {
    const gridRef = createMockGridRef();
    const onWordSubmit = vi.fn();
    const onPathSubmit = vi.fn();

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

    // Start at A (0,0)
    act(() => {
      const coords = getCellTouchCoords(0, 0);
      const mockEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
      } as unknown as React.TouchEvent<HTMLDivElement>;
      result.current.handleTouchStart(0, 0, 'A', mockEvent);
    });

    // Move to B (0,1) - horizontal
    act(() => {
      const coords = getCellTouchCoords(0, 1);
      const mockMoveEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(mockMoveEvent);
    });

    // Move to C (0,2) - horizontal
    act(() => {
      const coords = getCellTouchCoords(0, 2);
      const mockMoveEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(mockMoveEvent);
    });

    expect(result.current.selectedCells).toHaveLength(3);

    // Move to G (1,2) - VERTICAL after horizontal (T-shape!)
    // Touch enters from top of G (coming from C above)
    act(() => {
      const coords = getCellTouchCoords(1, 2, 0, -30); // 30px above center
      const mockMoveEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(mockMoveEvent);
    });

    expect(result.current.selectedCells).toHaveLength(4);
    expect(result.current.selectedCells[3]?.letter).toBe('G');
  });

  /**
   * Verify diagonal moves still work (regression test)
   * Pattern: A(0,0) → F(1,1) - true diagonal
   */
  it('should still allow diagonal selection (regression test)', () => {
    const gridRef = createMockGridRef();
    const onWordSubmit = vi.fn();
    const onPathSubmit = vi.fn();

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

    // Start at A (0,0)
    act(() => {
      const coords = getCellTouchCoords(0, 0);
      const mockEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
      } as unknown as React.TouchEvent<HTMLDivElement>;
      result.current.handleTouchStart(0, 0, 'A', mockEvent);
    });

    // Move to F (1,1) - diagonal with offset (within 0.95 threshold)
    // Cell radius is 50px, 0.95 threshold = 47.5px max distance from center
    // Using offset -30, -30 gives distance of ~42.4px which is within threshold
    act(() => {
      const coords = getCellTouchCoords(1, 1, -30, -30); // Offset toward A
      const mockMoveEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(mockMoveEvent);
    });

    expect(result.current.selectedCells).toHaveLength(2);
    expect(result.current.selectedCells[1]?.letter).toBe('F');
  });

  /**
   * Verify straight lines still work (regression test)
   * Pattern: A(0,0) → B(0,1) → C(0,2) - straight horizontal
   */
  it('should still allow straight line selection (regression test)', () => {
    const gridRef = createMockGridRef();
    const onWordSubmit = vi.fn();
    const onPathSubmit = vi.fn();

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

    // Start at A (0,0)
    act(() => {
      const coords = getCellTouchCoords(0, 0);
      const mockEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
      } as unknown as React.TouchEvent<HTMLDivElement>;
      result.current.handleTouchStart(0, 0, 'A', mockEvent);
    });

    // Move to B (0,1) - horizontal
    act(() => {
      const coords = getCellTouchCoords(0, 1);
      const mockMoveEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(mockMoveEvent);
    });

    // Move to C (0,2) - horizontal
    act(() => {
      const coords = getCellTouchCoords(0, 2);
      const mockMoveEvent = {
        touches: [{ clientX: coords.x, clientY: coords.y }],
        cancelable: true,
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;
      result.current.handleTouchMove(mockMoveEvent);
    });

    expect(result.current.selectedCells).toHaveLength(3);
    expect(result.current.selectedCells.map(c => c.letter).join('')).toBe('ABC');
  });
});
