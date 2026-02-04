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

import { useCallback, useRef, type RefObject } from 'react';
import type { GridTileState } from '@/types/adventure';
import {
  type GridMeasurements,
  measureAdventureGrid,
  getCellAtPosition,
  getTileIndex,
  isWithinSelectionThreshold,
  isDiagonalMove,
  hasExceededDeadzone,
} from './adventureGridGeometry';

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

/**
 * Manages grid gesture handling (touch/mouse drag for word selection)
 */
export function useGridGestures({
  gridRef,
  gridSize,
  tiles,
  interactive,
  disabled,
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

      // Cache grid measurements at start of drag
      getGridMeasurements();

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
      if (onDragEnd) {
        onDragEnd();
      }
    }
  }, [onDragEnd]);

  // Handle touch move - find element under touch and trigger drag enter
  // Uses selection threshold to prevent accidental over-selection
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
          return; // Still within deadzone, don't select
        }
        hasExceededDeadzoneRef.current = true;
      }

      // Get grid measurements for precise cell detection
      const measurements = getGridMeasurements();
      if (!measurements) {
        // Fallback to element-based detection if measurements unavailable
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

      // Use precise cell detection with selection threshold
      const cellPosition = getCellAtPosition(touchX, touchY, tiles, gridSize, measurements);
      if (!cellPosition) return;

      const newTileIndex = getTileIndex(cellPosition.row, cellPosition.col, gridSize);

      // Skip if same tile as last touch
      if (newTileIndex === lastTouchTileIndexRef.current) return;

      // Get last selected tile for diagonal detection
      const lastIndex = lastTouchTileIndexRef.current;
      const lastTile = lastIndex !== null ? tiles[lastIndex] : null;

      // Check if movement is diagonal (more lenient threshold)
      const isDiagonal = lastTile
        ? isDiagonalMove(lastTile, { row: cellPosition.row, col: cellPosition.col })
        : false;

      // Apply selection threshold - must be close to cell center
      if (!isWithinSelectionThreshold(cellPosition, isDiagonal)) {
        return; // Touch too far from cell center, don't select
      }

      lastTouchTileIndexRef.current = newTileIndex;

      const tile = tiles[newTileIndex];
      if (!tile || tile.isCleared) return;

      // Trigger drag enter
      if (onDragEnter) {
        onDragEnter(newTileIndex, tile);
      }
    },
    [disabled, interactive, tiles, gridSize, onDragEnter, gridRef, getGridMeasurements]
  );

  // Handle mouse up (ends drag)
  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  return {
    handleTileClick,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handleTouchMove,
    handleMouseUp,
  };
}
