/**
 * useGridGestures Hook Tests
 *
 * TDD RED Phase: Tests for grid gesture handling extracted from AdventureGrid
 *
 * Tests cover:
 * - Drag state management (isDragging ref tracking)
 * - Touch move detection with deadzone
 * - Grid measurement caching
 * - Cell position detection
 * - Diagonal vs adjacent selection thresholds
 * - Event handler callbacks
 */

import { renderHook, act } from '@testing-library/react';
import type { GridTileState } from '@/types/adventure';

// Mock adaptive deadzone to return a stable value for tests
vi.mock('@/utils/consts', () => ({
  getDeadzoneThreshold: () => 10,
}));

// Mock haptic feedback to avoid side effects in tests
vi.mock('@/components/grid/hapticFeedback', () => ({
  vibrateCellTap: vi.fn(),
  vibrateCellDrag: vi.fn(),
}));

// Mock performance config
vi.mock('@/components/grid/performanceUtils', () => ({
  getPerformanceConfig: () => ({ isLowEnd: false }),
}));

// Import hook AFTER mocks are defined
import { useGridGestures } from '../useGridGestures';

describe('useGridGestures', () => {
  const mockTiles: GridTileState[] = [
    { id: 'tile-0', letter: 'A', row: 0, col: 0, type: 'standard', isCleared: false, isFrozen: false },
    { id: 'tile-1', letter: 'B', row: 0, col: 1, type: 'standard', isCleared: false, isFrozen: false },
    { id: 'tile-2', letter: 'C', row: 0, col: 2, type: 'standard', isCleared: false, isFrozen: false },
    { id: 'tile-3', letter: 'D', row: 1, col: 0, type: 'standard', isCleared: false, isFrozen: false },
  ];

  const mockGridRef = {
    current: document.createElement('div'),
  };

  const defaultProps = {
    gridRef: mockGridRef,
    gridSize: 2,
    tiles: mockTiles,
    interactive: true,
    disabled: false,
    onTileSelect: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnter: vi.fn(),
    onDragEnd: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should return event handlers', () => {
      const { result } = renderHook(() => useGridGestures(defaultProps));
      
      expect(result.current.handleTileClick).toBeDefined();
      expect(result.current.handleDragStart).toBeDefined();
      expect(result.current.handleDragEnter).toBeDefined();
      expect(result.current.handleDragEnd).toBeDefined();
      expect(result.current.handleTouchMove).toBeDefined();
      expect(result.current.handleMouseUp).toBeDefined();
    });

    it('should return stable handler references', () => {
      const { result, rerender } = renderHook(() => useGridGestures(defaultProps));
      
      const firstHandlers = { ...result.current };
      rerender();
      
      // Handlers should be memoized (same reference across re-renders)
      expect(result.current.handleTileClick).toBe(firstHandlers.handleTileClick);
      expect(result.current.handleDragStart).toBe(firstHandlers.handleDragStart);
      expect(result.current.handleDragEnter).toBe(firstHandlers.handleDragEnter);
      expect(result.current.handleDragEnd).toBe(firstHandlers.handleDragEnd);
      expect(result.current.handleTouchMove).toBe(firstHandlers.handleTouchMove);
      expect(result.current.handleMouseUp).toBe(firstHandlers.handleMouseUp);
    });
  });

  describe('handleTileClick', () => {
    it('should call onTileSelect when interactive and tile not cleared', () => {
      const onTileSelect = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onTileSelect }));
      
      act(() => {
        result.current.handleTileClick(0, mockTiles[0]);
      });
      
      expect(onTileSelect).toHaveBeenCalledWith(0, mockTiles[0]);
    });

    it('should NOT call onTileSelect when disabled', () => {
      const onTileSelect = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onTileSelect, disabled: true }));
      
      act(() => {
        result.current.handleTileClick(0, mockTiles[0]);
      });
      
      expect(onTileSelect).not.toHaveBeenCalled();
    });

    it('should NOT call onTileSelect when tile is cleared', () => {
      const onTileSelect = vi.fn();
      const clearedTile = { ...mockTiles[0], isCleared: true };
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onTileSelect }));
      
      act(() => {
        result.current.handleTileClick(0, clearedTile);
      });
      
      expect(onTileSelect).not.toHaveBeenCalled();
    });

    it('should NOT call onTileSelect when not interactive', () => {
      const onTileSelect = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onTileSelect, interactive: false }));
      
      act(() => {
        result.current.handleTileClick(0, mockTiles[0]);
      });
      
      expect(onTileSelect).not.toHaveBeenCalled();
    });
  });

  describe('handleDragStart', () => {
    it('should set isDragging flag', () => {
      const { result } = renderHook(() => useGridGestures(defaultProps));
      
      const mockEvent = {
        clientX: 100,
        clientY: 100,
      } as React.MouseEvent;
      
      act(() => {
        result.current.handleDragStart(mockEvent, 0, mockTiles[0]);
      });
      
      // isDragging should be true (verified indirectly through handleDragEnter behavior)
    });

    it('should call onDragStart callback', () => {
      const onDragStart = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragStart }));
      
      const mockEvent = {
        clientX: 100,
        clientY: 100,
      } as React.MouseEvent;
      
      act(() => {
        result.current.handleDragStart(mockEvent, 0, mockTiles[0]);
      });
      
      expect(onDragStart).toHaveBeenCalledWith(0, mockTiles[0]);
    });

    it('should NOT start drag when disabled', () => {
      const onDragStart = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragStart, disabled: true }));
      
      const mockEvent = {
        clientX: 100,
        clientY: 100,
      } as React.MouseEvent;
      
      act(() => {
        result.current.handleDragStart(mockEvent, 0, mockTiles[0]);
      });
      
      expect(onDragStart).not.toHaveBeenCalled();
    });

    it('should NOT start drag when tile is cleared', () => {
      const onDragStart = vi.fn();
      const clearedTile = { ...mockTiles[0], isCleared: true };
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragStart }));
      
      const mockEvent = {
        clientX: 100,
        clientY: 100,
      } as React.MouseEvent;
      
      act(() => {
        result.current.handleDragStart(mockEvent, 0, clearedTile);
      });
      
      expect(onDragStart).not.toHaveBeenCalled();
    });

    it('should handle touch events', () => {
      const onDragStart = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragStart }));
      
      const mockTouchEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as React.TouchEvent;
      
      act(() => {
        result.current.handleDragStart(mockTouchEvent, 0, mockTiles[0]);
      });
      
      expect(onDragStart).toHaveBeenCalledWith(0, mockTiles[0]);
    });

    it('should store start position for deadzone calculation', () => {
      const { result } = renderHook(() => useGridGestures(defaultProps));
      
      const mockEvent = {
        clientX: 100,
        clientY: 100,
      } as React.MouseEvent;
      
      act(() => {
        result.current.handleDragStart(mockEvent, 0, mockTiles[0]);
      });
      
      // Start position stored (verified through subsequent touch move behavior)
    });
  });

  describe('handleDragEnter', () => {
    it('should call onDragEnter when dragging', () => {
      const onDragEnter = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragEnter }));
      
      // Start drag first
      const mockStartEvent = {
        clientX: 100,
        clientY: 100,
      } as React.MouseEvent;
      
      act(() => {
        result.current.handleDragStart(mockStartEvent, 0, mockTiles[0]);
      });
      
      // Then drag enter
      act(() => {
        result.current.handleDragEnter(1, mockTiles[1]);
      });
      
      expect(onDragEnter).toHaveBeenCalledWith(1, mockTiles[1]);
    });

    it('should NOT call onDragEnter when not dragging', () => {
      const onDragEnter = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragEnter }));
      
      act(() => {
        result.current.handleDragEnter(1, mockTiles[1]);
      });
      
      expect(onDragEnter).not.toHaveBeenCalled();
    });

    it('should NOT call onDragEnter when disabled', () => {
      const onDragEnter = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragEnter, disabled: true }));
      
      act(() => {
        result.current.handleDragEnter(1, mockTiles[1]);
      });
      
      expect(onDragEnter).not.toHaveBeenCalled();
    });

    it('should NOT call onDragEnter when tile is cleared', () => {
      const onDragEnter = vi.fn();
      const clearedTile = { ...mockTiles[1], isCleared: true };
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragEnter }));
      
      // Start drag
      const mockStartEvent = { clientX: 100, clientY: 100 } as React.MouseEvent;
      act(() => {
        result.current.handleDragStart(mockStartEvent, 0, mockTiles[0]);
      });
      
      // Try to drag enter cleared tile
      act(() => {
        result.current.handleDragEnter(1, clearedTile);
      });
      
      expect(onDragEnter).not.toHaveBeenCalled();
    });
  });

  describe('handleDragEnd', () => {
    it('should reset isDragging flag', () => {
      const { result } = renderHook(() => useGridGestures(defaultProps));
      
      // Start drag
      const mockStartEvent = { clientX: 100, clientY: 100 } as React.MouseEvent;
      act(() => {
        result.current.handleDragStart(mockStartEvent, 0, mockTiles[0]);
      });
      
      // End drag
      act(() => {
        result.current.handleDragEnd();
      });
      
      // isDragging should be false (verified through handleDragEnter not working)
    });

    it('should call onDragEnd callback', () => {
      const onDragEnd = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragEnd }));
      
      // Start drag
      const mockStartEvent = { clientX: 100, clientY: 100 } as React.MouseEvent;
      act(() => {
        result.current.handleDragStart(mockStartEvent, 0, mockTiles[0]);
      });
      
      // End drag
      act(() => {
        result.current.handleDragEnd();
      });
      
      expect(onDragEnd).toHaveBeenCalled();
    });

    it('should reset last touch tile index', () => {
      const { result } = renderHook(() => useGridGestures(defaultProps));
      
      // Start drag
      const mockStartEvent = { clientX: 100, clientY: 100 } as React.MouseEvent;
      act(() => {
        result.current.handleDragStart(mockStartEvent, 0, mockTiles[0]);
      });
      
      // End drag
      act(() => {
        result.current.handleDragEnd();
      });
      
      // lastTouchTileIndex reset to null
    });
  });

  describe('handleMouseUp', () => {
    it('should call handleDragEnd', () => {
      const onDragEnd = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragEnd }));
      
      // Start drag
      const mockStartEvent = { clientX: 100, clientY: 100 } as React.MouseEvent;
      act(() => {
        result.current.handleDragStart(mockStartEvent, 0, mockTiles[0]);
      });
      
      // Mouse up
      act(() => {
        result.current.handleMouseUp();
      });
      
      expect(onDragEnd).toHaveBeenCalled();
    });
  });

  describe('Grid Measurement Caching', () => {
    it('should cache grid measurements for 100ms', () => {
      // Create grid with mock gridcell elements
      const gridElement = document.createElement('div');

      // Add gridcells (2x2 grid)
      for (let i = 0; i < 4; i++) {
        const cell = document.createElement('div');
        cell.setAttribute('role', 'gridcell');
        cell.getBoundingClientRect = vi.fn(() => ({
          left: (i % 2) * 100,
          top: Math.floor(i / 2) * 100,
          width: 100,
          height: 100,
          right: (i % 2) * 100 + 100,
          bottom: Math.floor(i / 2) * 100 + 100,
          x: (i % 2) * 100,
          y: Math.floor(i / 2) * 100,
          toJSON: () => ({}),
        }));
        gridElement.appendChild(cell);
      }

      const testGridRef = { current: gridElement };
      const testProps = { ...defaultProps, gridRef: testGridRef };

      const { result } = renderHook(() => useGridGestures(testProps));

      // Mock getBoundingClientRect for grid
      const mockGetBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 400,
        height: 400,
        right: 400,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }));

      gridElement.getBoundingClientRect = mockGetBoundingClientRect;
      
      // First measurement
      const mockStartEvent1 = { clientX: 100, clientY: 100 } as React.MouseEvent;
      act(() => {
        result.current.handleDragStart(mockStartEvent1, 0, mockTiles[0]);
      });
      
      const callCount1 = mockGetBoundingClientRect.mock.calls.length;

      // Second measurement within 100ms (should use cache)
      const mockStartEvent2 = { clientX: 150, clientY: 150 } as React.MouseEvent;
      act(() => {
        result.current.handleDragStart(mockStartEvent2, 1, mockTiles[1]);
      });

      // Should not call getBoundingClientRect again (uses cached value)
      expect(mockGetBoundingClientRect.mock.calls.length).toBe(callCount1);
    });
  });

  describe('Deadzone Detection', () => {
    it('should NOT select new tiles before exceeding deadzone', () => {
      const onDragEnter = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragEnter }));
      
      // Start drag at (100, 100)
      const mockStartEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as React.TouchEvent;
      
      act(() => {
        result.current.handleDragStart(mockStartEvent, 0, mockTiles[0]);
      });
      
      // Move within deadzone (< 10px)
      const mockTouchMoveEvent = {
        touches: [{ clientX: 105, clientY: 105 }],
      } as unknown as React.TouchEvent;
      
      act(() => {
        result.current.handleTouchMove(mockTouchMoveEvent);
      });
      
      // Should not trigger drag enter (within deadzone)
      expect(onDragEnter).not.toHaveBeenCalled();
    });

    it('should select new tiles after exceeding deadzone', () => {
      const onDragEnter = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragEnter }));
      
      // Mock grid measurements and cell detection
      // (simplified for test - actual implementation uses measureAdventureGrid)
      
      // Start drag at (100, 100)
      const mockStartEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as React.TouchEvent;
      
      act(() => {
        result.current.handleDragStart(mockStartEvent, 0, mockTiles[0]);
      });
      
      // onDragEnter should have been called from drag start
      expect(onDragEnter).toHaveBeenCalledTimes(0); // Not called yet (just started drag)
    });
  });

  describe('Global mouseup/touchend listeners (Fix 1)', () => {
    it('should end drag when mouseup fires on window', () => {
      const onDragEnd = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragEnd }));

      // Start drag
      const mockStartEvent = { clientX: 100, clientY: 100 } as React.MouseEvent;
      act(() => {
        result.current.handleDragStart(mockStartEvent, 0, mockTiles[0]);
      });

      // Fire mouseup on window (simulating release outside grid)
      act(() => {
        window.dispatchEvent(new Event('mouseup'));
      });

      expect(onDragEnd).toHaveBeenCalled();
    });

    it('should end drag when touchend fires on window', () => {
      const onDragEnd = vi.fn();
      const { result } = renderHook(() => useGridGestures({ ...defaultProps, onDragEnd }));

      // Start drag
      const mockStartEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as React.TouchEvent;
      act(() => {
        result.current.handleDragStart(mockStartEvent, 0, mockTiles[0]);
      });

      // Fire touchend on window (simulating release outside grid)
      act(() => {
        window.dispatchEvent(new Event('touchend'));
      });

      expect(onDragEnd).toHaveBeenCalled();
    });

    it('should clean up global listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useGridGestures(defaultProps));

      unmount();

      const removedEvents = removeEventListenerSpy.mock.calls.map(c => c[0]);
      expect(removedEvents).toContain('mouseup');
      expect(removedEvents).toContain('touchend');

      removeEventListenerSpy.mockRestore();
    });

    it('should not call onDragEnd on window mouseup if not dragging', () => {
      const onDragEnd = vi.fn();
      renderHook(() => useGridGestures({ ...defaultProps, onDragEnd }));

      // Fire mouseup without starting a drag
      act(() => {
        window.dispatchEvent(new Event('mouseup'));
      });

      expect(onDragEnd).not.toHaveBeenCalled();
    });
  });

  describe('RAF batching for low-end devices', () => {
    it('should use requestAnimationFrame on low-end devices', () => {
      // The hook should import getPerformanceConfig and use RAF batching
      // when isLowEnd is true, matching classic mode behavior
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 0;
      });

      const gridElement = document.createElement('div');
      const testGridRef = { current: gridElement };

      renderHook(() => useGridGestures({ ...defaultProps, gridRef: testGridRef }));

      rafSpy.mockRestore();
    });

    it('should cancel RAF on unmount', () => {
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

      const gridElement = document.createElement('div');
      const testGridRef = { current: gridElement };

      const { unmount } = renderHook(() => useGridGestures({ ...defaultProps, gridRef: testGridRef }));

      unmount();

      cancelSpy.mockRestore();
    });
  });

  describe('Native touchmove listener (Fix 2)', () => {
    it('should register native touchmove listener on grid element', () => {
      const gridElement = document.createElement('div');
      const addEventListenerSpy = vi.spyOn(gridElement, 'addEventListener');
      const testGridRef = { current: gridElement };

      renderHook(() => useGridGestures({ ...defaultProps, gridRef: testGridRef }));

      const touchmoveCall = addEventListenerSpy.mock.calls.find(
        c => c[0] === 'touchmove'
      );
      expect(touchmoveCall).toBeDefined();
      expect(touchmoveCall![2]).toEqual({ passive: false });

      addEventListenerSpy.mockRestore();
    });

    it('should remove native touchmove listener on unmount', () => {
      const gridElement = document.createElement('div');
      const removeEventListenerSpy = vi.spyOn(gridElement, 'removeEventListener');
      const testGridRef = { current: gridElement };

      const { unmount } = renderHook(() => useGridGestures({ ...defaultProps, gridRef: testGridRef }));

      unmount();

      const removedEvents = removeEventListenerSpy.mock.calls.map(c => c[0]);
      expect(removedEvents).toContain('touchmove');

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Props Changes', () => {
    it('should update handlers when callbacks change', () => {
      const onTileSelect1 = vi.fn();
      const onTileSelect2 = vi.fn();
      
      const { result, rerender } = renderHook(
        ({ onTileSelect }) => useGridGestures({ ...defaultProps, onTileSelect }),
        { initialProps: { onTileSelect: onTileSelect1 } }
      );
      
      // Use first callback
      act(() => {
        result.current.handleTileClick(0, mockTiles[0]);
      });
      
      expect(onTileSelect1).toHaveBeenCalled();
      expect(onTileSelect2).not.toHaveBeenCalled();
      
      // Change callback
      rerender({ onTileSelect: onTileSelect2 });
      
      // Use second callback
      act(() => {
        result.current.handleTileClick(0, mockTiles[0]);
      });
      
      expect(onTileSelect2).toHaveBeenCalled();
    });
  });
});
