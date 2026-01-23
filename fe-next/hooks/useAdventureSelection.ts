/**
 * useAdventureSelection Hook
 *
 * Manages tile selection with adjacency validation for Adventure Mode.
 * Handles path building, deselection, and coordinate conversion.
 */

import { useState, useCallback, useMemo } from 'react';
import type { GridTileState } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

export interface PathPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface UseAdventureSelectionProps {
  /** Flat array of grid tiles */
  tiles: GridTileState[];
  /** Grid size (4, 5, 6, or 7) */
  gridSize: number;
  /** Whether selection is disabled */
  disabled?: boolean;
  /** Grid container ref for coordinate calculation */
  gridRef?: React.RefObject<HTMLDivElement | null>;
}

export interface UseAdventureSelectionReturn {
  /** Currently selected tile indices */
  selectedIndices: number[];
  /** Current word built from selected tiles */
  currentWord: string;
  /** Whether user is actively selecting */
  isSelecting: boolean;
  /** Select a tile by index */
  selectTile: (index: number) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Get path as row/col coordinates */
  getPath: () => Array<{ row: number; col: number }>;
  /** Path points for trail animation */
  pathPoints: PathPoint[];
}

// ==============================================
// HELPERS
// ==============================================

/**
 * Check if two tiles are adjacent (including diagonals)
 */
function isAdjacent(
  idx1: number,
  idx2: number,
  tiles: GridTileState[]
): boolean {
  if (!tiles[idx1] || !tiles[idx2]) return false;

  const tile1 = tiles[idx1];
  const tile2 = tiles[idx2];

  const rowDiff = Math.abs(tile1.row - tile2.row);
  const colDiff = Math.abs(tile1.col - tile2.col);

  // Adjacent means within 1 step in both row and col (including diagonal)
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
}

// ==============================================
// HOOK
// ==============================================

export function useAdventureSelection({
  tiles,
  gridSize,
  disabled = false,
  gridRef,
}: UseAdventureSelectionProps): UseAdventureSelectionReturn {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Build current word from selected tiles
  const currentWord = useMemo(() => {
    return selectedIndices.map((idx) => tiles[idx]?.letter || '').join('');
  }, [selectedIndices, tiles]);

  // Whether user is actively selecting
  const isSelecting = selectedIndices.length > 0;

  // Calculate path points for trail animation
  const pathPoints = useMemo<PathPoint[]>(() => {
    if (selectedIndices.length === 0 || !gridRef?.current) return [];

    const gridContainer = gridRef.current;
    if (!gridContainer) return [];

    // Use a stable base timestamp derived from the selection count
    const baseTimestamp = selectedIndices.length * 1000;

    return selectedIndices
      .map((idx, index) => {
        const tile = tiles[idx];
        if (!tile) return null;

        // Try to find the cell element
        const cellElement = gridContainer.querySelector(
          `[data-row="${tile.row}"][data-col="${tile.col}"]`
        );

        if (!cellElement) {
          // Mathematical fallback if element not found
          // This approximation works for uniform grids
          const gridRect = gridContainer.getBoundingClientRect();

          // Estimate cell size based on grid size
          const cellSize = gridRect.width / gridSize;
          const gap = 4; // Default gap in pixels (matches Tailwind gap-1)

          return {
            x: tile.col * (cellSize + gap) + cellSize / 2,
            y: tile.row * (cellSize + gap) + cellSize / 2,
            timestamp: baseTimestamp + index * 100,
          };
        }

        const rect = cellElement.getBoundingClientRect();
        const gridRect = gridContainer.getBoundingClientRect();

        return {
          x: rect.left + rect.width / 2 - gridRect.left,
          y: rect.top + rect.height / 2 - gridRect.top,
          timestamp: baseTimestamp + index * 100,
        };
      })
      .filter((p): p is PathPoint => p !== null);
  }, [selectedIndices, tiles, gridRef, gridSize]);

  // Select a tile by index
  const selectTile = useCallback(
    (index: number) => {
      if (disabled) return;

      // Validate index
      if (index < 0 || index >= tiles.length || !tiles[index]) return;

      // Block selection of frozen tiles
      const targetTile = tiles[index];
      if (targetTile.isFrozen) return;

      setSelectedIndices((prev) => {
        // If this is the first tile, select it
        if (prev.length === 0) {
          return [index];
        }

        // If clicking the last selected tile, deselect it
        const lastIndex = prev[prev.length - 1];
        if (index === lastIndex) {
          return prev.slice(0, -1);
        }

        // If tile is already selected (not last), reject
        if (prev.includes(index)) {
          return prev;
        }

        // Check if adjacent to last selected tile
        if (!isAdjacent(lastIndex, index, tiles)) {
          return prev;
        }

        // Add to selection
        return [...prev, index];
      });
    },
    [disabled, tiles]
  );

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIndices([]);
  }, []);

  // Get path as row/col coordinates
  const getPath = useCallback(() => {
    return selectedIndices.map((idx) => ({
      row: tiles[idx]?.row ?? 0,
      col: tiles[idx]?.col ?? 0,
    }));
  }, [selectedIndices, tiles]);

  return {
    selectedIndices,
    currentWord,
    isSelecting,
    selectTile,
    clearSelection,
    getPath,
    pathPoints,
  };
}
