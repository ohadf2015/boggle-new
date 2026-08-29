/**
 * useAdventureSelection Hook
 *
 * Manages tile selection with adjacency validation for Adventure Mode.
 * Handles path building, deselection, and coordinate conversion.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  /** Callback to submit word on click (classic grid behavior: click last tile to submit) */
  onClickSubmit?: (word: string, indices: number[]) => void;
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
  /** Indices of tiles adjacent to the last selected tile (for visual hints) */
  adjacentIndices: number[];
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
  onClickSubmit,
}: UseAdventureSelectionProps): UseAdventureSelectionReturn {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const lastClickTimeRef = useRef(0);
  const lastClickIndexRef = useRef<number | null>(null);
  // Set by the selection updater when a click completes a word; flushed once
  // after commit so a re-invoked updater cannot submit the same word twice.
  const pendingSubmitRef = useRef<{ word: string; indices: number[] } | null>(null);

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

  // Select a tile by index (supports click-to-submit like classic grid)
  const selectTile = useCallback(
    (index: number) => {
      if (disabled) return;

      // Validate index
      if (index < 0 || index >= tiles.length || !tiles[index]) return;

      // Block selection of frozen tiles
      const targetTile = tiles[index];
      if (targetTile.isFrozen) return;

      const now = Date.now();
      const sameCell = lastClickIndexRef.current === index;
      const isDoubleClick = sameCell && now - lastClickTimeRef.current < 500;
      lastClickTimeRef.current = now;
      lastClickIndexRef.current = index;

      setSelectedIndices((prev) => {
        // If this is the first tile, select it
        if (prev.length === 0) {
          return [index];
        }

        const lastIndex = prev[prev.length - 1];

        // Classic grid behavior: clicking the last tile OR double-clicking with ≥2 tiles submits the word
        if (index === lastIndex && prev.length >= 2) {
          if (onClickSubmit) {
            const word = prev.map(i => tiles[i]?.letter || '').join('');
            // Record, don't dispatch: React may invoke this updater more than
            // once, and scheduling the submit here submitted the word twice.
            // The flush effect below fires it exactly once, after the commit.
            pendingSubmitRef.current = { word, indices: prev };
          }
          return [];
        }

        // Double-click on any selected tile with ≥2 tiles also submits
        if (isDoubleClick && prev.includes(index) && prev.length >= 2) {
          if (onClickSubmit) {
            const word = prev.map(i => tiles[i]?.letter || '').join('');
            pendingSubmitRef.current = { word, indices: prev };
          }
          return [];
        }

        // If clicking the last selected tile with only 1 tile, deselect it
        if (index === lastIndex) {
          return prev.slice(0, -1);
        }

        // If tile is already selected (not last), truncate path to that tile (backtracking)
        if (prev.includes(index)) {
          return prev.slice(0, prev.indexOf(index) + 1);
        }

        // Check if adjacent to last selected tile
        if (!isAdjacent(lastIndex, index, tiles)) {
          return prev;
        }

        // Add to selection
        return [...prev, index];
      });
    },
    [disabled, tiles, onClickSubmit]
  );

  // Flush a completed word once the selection commit has landed. Runs after the
  // state update (which is what the previous setTimeout(…, 0) was reaching for)
  // and, because the ref write is idempotent, exactly once per submitted word.
  useEffect(() => {
    const pending = pendingSubmitRef.current;
    if (!pending) return;
    pendingSubmitRef.current = null;
    // Keep the original macrotask deferral so the cleared board paints before the
    // submit handler runs; the ref is already nulled, so this fires exactly once.
    const id = setTimeout(() => onClickSubmit?.(pending.word, pending.indices), 0);
    return () => clearTimeout(id);
  }, [selectedIndices, onClickSubmit]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIndices([]);
  }, []);

  // Compute indices of tiles adjacent to the last selected tile (for visual hints)
  const adjacentIndices = useMemo(() => {
    if (selectedIndices.length === 0) return [];
    const lastIdx = selectedIndices[selectedIndices.length - 1];
    const adjacent: number[] = [];
    for (let i = 0; i < tiles.length; i++) {
      if (selectedIndices.includes(i)) continue;
      if (tiles[i]?.isCleared || tiles[i]?.isFrozen) continue;
      if (isAdjacent(lastIdx, i, tiles)) adjacent.push(i);
    }
    return adjacent;
  }, [selectedIndices, tiles]);

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
    adjacentIndices,
  };
}
