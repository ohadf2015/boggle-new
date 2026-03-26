/**
 * useGridGestures Haptic Feedback Tests
 *
 * Fix 2: Haptic feedback on tile selection matching regular mode
 */

import { renderHook, act } from '@testing-library/react';
import type { GridTileState } from '@/types/adventure';
import { useGridGestures } from '../useGridGestures';

// Mock haptic feedback module
vi.mock('@/components/grid/hapticFeedback', () => ({
  vibrateCellTap: vi.fn(),
  vibrateCellDrag: vi.fn(),
}));

import { vibrateCellTap, vibrateCellDrag } from '@/components/grid/hapticFeedback';

describe('useGridGestures - haptic feedback', () => {
  const mockTiles: GridTileState[] = [
    { id: 'tile-0', letter: 'A', row: 0, col: 0, type: 'standard', isCleared: false, isFrozen: false },
    { id: 'tile-1', letter: 'B', row: 0, col: 1, type: 'standard', isCleared: false, isFrozen: false },
    { id: 'tile-2', letter: 'C', row: 1, col: 0, type: 'standard', isCleared: false, isFrozen: false },
    { id: 'tile-3', letter: 'D', row: 1, col: 1, type: 'standard', isCleared: false, isFrozen: false },
  ];

  const mockGridRef = { current: document.createElement('div') };

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

  it('should trigger vibrateCellTap on drag start', () => {
    const { result } = renderHook(() => useGridGestures(defaultProps));

    const mockEvent = { clientX: 100, clientY: 100 } as React.MouseEvent;
    act(() => {
      result.current.handleDragStart(mockEvent, 0, mockTiles[0]);
    });

    expect(vibrateCellTap).toHaveBeenCalledWith(false);
  });

  it('should trigger vibrateCellDrag on drag enter', () => {
    const { result } = renderHook(() => useGridGestures(defaultProps));

    // Start drag first
    const mockEvent = { clientX: 100, clientY: 100 } as React.MouseEvent;
    act(() => {
      result.current.handleDragStart(mockEvent, 0, mockTiles[0]);
    });

    // Enter another tile
    act(() => {
      result.current.handleDragEnter(1, mockTiles[1]);
    });

    expect(vibrateCellDrag).toHaveBeenCalledWith(false);
  });

  it('should NOT trigger haptic feedback when disabled', () => {
    const { result } = renderHook(() => useGridGestures({ ...defaultProps, disabled: true }));

    const mockEvent = { clientX: 100, clientY: 100 } as React.MouseEvent;
    act(() => {
      result.current.handleDragStart(mockEvent, 0, mockTiles[0]);
    });

    expect(vibrateCellTap).not.toHaveBeenCalled();
  });

  it('should NOT trigger haptic feedback when not interactive', () => {
    const { result } = renderHook(() => useGridGestures({ ...defaultProps, interactive: false }));

    const mockEvent = { clientX: 100, clientY: 100 } as React.MouseEvent;
    act(() => {
      result.current.handleDragStart(mockEvent, 0, mockTiles[0]);
    });

    expect(vibrateCellTap).not.toHaveBeenCalled();
  });
});
