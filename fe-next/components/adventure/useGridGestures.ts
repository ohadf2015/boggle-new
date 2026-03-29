/**
 * useGridGestures Hook
 *
 * Grid gesture handling for adventure mode (touch/mouse drag selection).
 * Extracted from AdventureGrid.tsx to improve maintainability.
 *
 * Handles:
 * - Drag state management (refs for tracking drag progress)
 * - Touch deadzone detection (prevents accidental over-selection)
 * - Grid measurement caching (avoids layout thrashing)
 * - Cell position detection (precise touch-to-cell mapping)
 * - Diagonal vs adjacent selection thresholds
 */

import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import type { GridTileState } from '@/types/adventure';
import {
  type GridMeasurements,
  measureAdventureGrid,
  getCellAtPosition,
  getTileIndex,
  isWithinSelectionThreshold,
  isDiagonalMove,
  isAdjacentCell,
  hasExceededDeadzone,
} from './adventureGridGeometry';
import { vibrateCellTap, vibrateCellDrag } from '@/components/grid/hapticFeedback';
import { createVelocityTracker } from '@/components/grid/velocityTracker';
import { getPerformanceConfig } from '@/components/grid/performanceUtils';

// ==============================================
// TYPES
// ==============================================

export interface UseGridGesturesProps {
  /** Ref to grid container DOM element */
  gridRef: RefObject<HTMLDivElement | null>;
  /** Grid dimension (4x4, 5x5, etc.) */
  gridSize: number;
  /** Array of tile states */
  tiles: GridTileState[];
  /** Whether grid is interactive */
  interactive: boolean;
  /** Whether grid is disabled */
  disabled: boolean;
  /** Currently selected tile indices (used to sync gesture tracking with selection state) */
  selectedIndices?: number[];
  /** Callback when tile is selected (click) */
  onTileSelect?: (index: number, tile: GridTileState) => void;
  /** Callback when drag selection starts */
  onDragStart?: (index: number, tile: GridTileState) => void;
  /** Callback when drag enters a new tile */
  onDragEnter?: (index: number, tile: GridTileState) => void;
  /** Callback when drag selection ends */
  onDragEnd?: () => void;
}

export interface UseGridGesturesReturn {
  /** Click handler for tiles */
  handleTileClick: (index: number, tile: GridTileState) => void;
  /** Drag start handler (mouse down / touch start) */
  handleDragStart: (e: React.MouseEvent | React.TouchEvent, index: number, tile: GridTileState) => void;
  /** Drag enter handler (mouse enter during drag) */
  handleDragEnter: (index: number, tile: GridTileState) => void;
  /** Drag end handler (mouse up) */
  handleDragEnd: () => void;
  /** Touch move handler (track finger movement for cell selection) */
  handleTouchMove: (e: React.TouchEvent) => void;
  /** Mouse up handler (ends drag and submits word) */
  handleMouseUp: () => void;
}

// ==============================================
// HOOK
// ==============================================

const EMPTY_INDICES: number[] = [];

/**
 * Manages grid gesture handling (touch/mouse drag for word selection)
 */
export function useGridGestures({
  gridRef,
  gridSize,
  tiles,
  interactive,
  disabled,
  selectedIndices = EMPTY_INDICES,
  onTileSelect,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: UseGridGesturesProps): UseGridGesturesReturn {
  // Track whether we're currently dragging
  const isDraggingRef = useRef(false);
  
  // Track last tile index for touch move to prevent duplicate calls
  const lastTouchTileIndexRef = useRef<number | null>(null);
  
  // Track whether deadzone has been exceeded
  const hasExceededDeadzoneRef = useRef(false);
  
  // Track start position for deadzone calculation
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  
  // Cache grid measurements to avoid layout thrashing
  const gridMeasurementsRef = useRef<GridMeasurements | null>(null);

  // Velocity tracker for adaptive selection threshold
  const velocityTrackerRef = useRef(createVelocityTracker());

  // RAF batching for low-end devices (matches classic mode)
  const performanceConfig = useMemo(() => getPerformanceConfig(), []);
  const pendingTouchRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Get cached or fresh grid measurements
  const getGridMeasurements = useCallback((): GridMeasurements | null => {
    if (!gridRef.current) return null;

    const now = performance.now();
    // Cache measurements for 100ms to avoid layout thrashing
    if (gridMeasurementsRef.current && now - gridMeasurementsRef.current.timestamp < 100) {
      return gridMeasurementsRef.current;
    }

    const measurements = measureAdventureGrid(gridRef.current, gridSize);
    if (measurements) {
      gridMeasurementsRef.current = measurements;
    }
    return measurements;
  }, [gridSize, gridRef]);

  // Handle tile click
  const handleTileClick = useCallback(
    (index: number, tile: GridTileState) => {
      if (disabled || tile.isCleared) return;
      if (interactive && onTileSelect) {
        onTileSelect(index, tile);
      }
    },
    [disabled, interactive, onTileSelect]
  );

  // Handle drag start (mouse down / touch start on tile)
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, index: number, tile: GridTileState) => {
      if (disabled || tile.isCleared || !interactive) return;
      isDraggingRef.current = true;
      lastTouchTileIndexRef.current = index;
      hasExceededDeadzoneRef.current = false;

      // Store start position for deadzone calculation
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startPosRef.current = { x: clientX, y: clientY };
      velocityTrackerRef.current.start(clientX, clientY);

      // Cache grid measurements at start of drag
      getGridMeasurements();

      vibrateCellTap(false);

      if (onDragStart) {
        onDragStart(index, tile);
      }
    },
    [disabled, interactive, onDragStart, getGridMeasurements]
  );

  // Handle drag enter (mouse enters tile during drag)
  const handleDragEnter = useCallback(
    (index: number, tile: GridTileState) => {
      if (disabled || tile.isCleared || !interactive) return;
      if (isDraggingRef.current && onDragEnter) {
        vibrateCellDrag(false);
        onDragEnter(index, tile);
      }
    },
    [disabled, interactive, onDragEnter]
  );

  // Handle drag end (mouse up)
  const handleDragEnd = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      lastTouchTileIndexRef.current = null;
      hasExceededDeadzoneRef.current = false;
      startPosRef.current = null;
      velocityTrackerRef.current.reset();
      if (onDragEnd) {
        onDragEnd();
      }
    }
  }, [onDragEnd]);

  // Core touch processing logic (shared between immediate and RAF-batched paths)
  const processTouchMove = useCallback(
    (touchX: number, touchY: number) => {
      // Get grid measurements for precise cell detection
      const measurements = getGridMeasurements();
      if (!measurements) {
        // Fallback to element-based detection
        const elementUnderTouch = document.elementFromPoint(touchX, touchY);
        if (!elementUnderTouch) return;

        const tileElement = elementUnderTouch.closest('[role="gridcell"]');
        if (!tileElement) return;

        const allTiles = gridRef.current?.querySelectorAll('[role="gridcell"]');
        if (!allTiles) return;

        const tileIndex = Array.from(allTiles).indexOf(tileElement);
        if (tileIndex === -1 || tileIndex === lastTouchTileIndexRef.current) return;

        const tile = tiles[tileIndex];
        if (!tile || tile.isCleared) return;

        lastTouchTileIndexRef.current = tileIndex;
        if (onDragEnter) onDragEnter(tileIndex, tile);
        return;
      }

      // Track velocity
      velocityTrackerRef.current.recordPosition(touchX, touchY);
      const velocity = velocityTrackerRef.current.getVelocity();

      // Use precise cell detection with selection threshold
      const cellPosition = getCellAtPosition(touchX, touchY, tiles, gridSize, measurements);
      if (!cellPosition) return;

      const newTileIndex = getTileIndex(cellPosition.row, cellPosition.col, gridSize);

      if (newTileIndex === lastTouchTileIndexRef.current) return;

      // Use the last SELECTED tile (not last touched) for diagonal/threshold calculation
      // This prevents desync when selectTile rejects a non-adjacent tile
      const lastSelectedIndex = selectedIndices.length > 0
        ? selectedIndices[selectedIndices.length - 1]
        : lastTouchTileIndexRef.current;
      const lastSelectedTile = lastSelectedIndex !== null ? tiles[lastSelectedIndex] : null;

      const diagonal = lastSelectedTile
        ? isDiagonalMove(lastSelectedTile, { row: cellPosition.row, col: cellPosition.col })
        : false;

      if (!isWithinSelectionThreshold(cellPosition, diagonal, velocity)) {
        return;
      }

      // Check adjacency against the last selected tile before accepting
      // This prevents lastTouchTileIndexRef from desyncing with the actual selection
      // Allow backtracking (tile already in selection) — selectTile handles truncation
      const isBacktrack = selectedIndices.includes(newTileIndex);
      if (!isBacktrack && lastSelectedTile && !isAdjacentCell(lastSelectedTile, { row: cellPosition.row, col: cellPosition.col })) {
        // Don't update lastTouchTileIndexRef — tile was not accepted
        return;
      }

      lastTouchTileIndexRef.current = newTileIndex;

      const tile = tiles[newTileIndex];
      if (!tile || tile.isCleared) return;

      vibrateCellDrag(false);
      if (onDragEnter) {
        onDragEnter(newTileIndex, tile);
      }
    },
    [tiles, gridSize, selectedIndices, onDragEnter, gridRef, getGridMeasurements]
  );

  // Handle touch move - delegates to shared processTouchMove with deadzone check
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDraggingRef.current || disabled || !interactive) return;

      const touch = e.touches[0];
      if (!touch) return;

      const touchX = touch.clientX;
      const touchY = touch.clientY;

      // Check deadzone - must exceed threshold before selecting new cells
      if (!hasExceededDeadzoneRef.current && startPosRef.current) {
        if (!hasExceededDeadzone(startPosRef.current.x, startPosRef.current.y, touchX, touchY)) {
          return;
        }
        // Scroll disambiguation: only treat as scroll if the touch has left the grid area vertically
        // Pure vertical drags within the grid are legitimate tile selections
        const deltaX = Math.abs(touchX - startPosRef.current.x);
        const deltaY = Math.abs(touchY - startPosRef.current.y);
        const gridElement = gridRef.current;
        if (deltaY > deltaX * 1.5 && lastTouchTileIndexRef.current !== null && gridElement) {
          const gridRect = gridElement.getBoundingClientRect();
          const isOutsideGrid = touchY < gridRect.top || touchY > gridRect.bottom;
          if (isOutsideGrid) {
            // Cancel drag but still fire onDragEnd so any partial selection
            // gets validated/cleared instead of hanging indefinitely.
            handleDragEnd();
            return;
          }
        }
        hasExceededDeadzoneRef.current = true;
      }

      processTouchMove(touchX, touchY);
    },
    [disabled, interactive, processTouchMove, gridRef, handleDragEnd]
  );

  // Handle mouse up (ends drag)
  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Global mouseup/touchend listeners to catch releases outside the grid
  useEffect(() => {
    const handleGlobalEnd = () => handleDragEnd();
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchend', handleGlobalEnd);
    return () => {
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [handleDragEnd]);

  // Register native non-passive touchmove listener for preventDefault during drag
  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;

    const nativeTouchMoveHandler = (e: TouchEvent) => {
      if (!isDraggingRef.current || disabled || !interactive) return;
      e.preventDefault();

      const touch = e.touches[0];
      if (!touch) return;

      const touchX = touch.clientX;
      const touchY = touch.clientY;

      // Check deadzone
      if (!hasExceededDeadzoneRef.current && startPosRef.current) {
        if (!hasExceededDeadzone(startPosRef.current.x, startPosRef.current.y, touchX, touchY)) {
          return;
        }
        // Scroll disambiguation: only treat as scroll if touch has left the grid vertically
        const deltaX = Math.abs(touchX - startPosRef.current.x);
        const deltaY = Math.abs(touchY - startPosRef.current.y);
        const gridElement = gridRef.current;
        if (deltaY > deltaX * 1.5 && lastTouchTileIndexRef.current !== null && gridElement) {
          const gridRect = gridElement.getBoundingClientRect();
          const isOutsideGrid = touchY < gridRect.top || touchY > gridRect.bottom;
          if (isOutsideGrid) {
            // Cancel drag but still fire onDragEnd so any partial selection
            // gets validated/cleared instead of hanging indefinitely.
            handleDragEnd();
            return;
          }
        }
        hasExceededDeadzoneRef.current = true;
      }

      // RAF batching on low-end devices (matches classic mode)
      if (performanceConfig.isLowEnd) {
        pendingTouchRef.current = { x: touchX, y: touchY };
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            const pending = pendingTouchRef.current;
            if (pending && isDraggingRef.current) processTouchMove(pending.x, pending.y);
            pendingTouchRef.current = null;
          });
        }
      } else {
        processTouchMove(touchX, touchY);
      }
    };

    element.addEventListener('touchmove', nativeTouchMoveHandler, { passive: false });
    return () => element.removeEventListener('touchmove', nativeTouchMoveHandler);
  }, [gridRef, disabled, interactive, performanceConfig.isLowEnd, processTouchMove, handleDragEnd]);

  // Invalidate grid measurement cache on resize/orientation change
  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;
    const invalidateCache = () => { gridMeasurementsRef.current = null; };
    const resizeObserver = new ResizeObserver(invalidateCache);
    resizeObserver.observe(element);
    window.addEventListener('orientationchange', invalidateCache);
    window.addEventListener('resize', invalidateCache);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('orientationchange', invalidateCache);
      window.removeEventListener('resize', invalidateCache);
    };
  }, [gridRef]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  return {
    handleTileClick,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handleTouchMove,
    handleMouseUp,
  };
}
