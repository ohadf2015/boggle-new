/**
 * useGridKeyboardNav
 *
 * Keyboard navigation for grid-based tile selection.
 * Arrow keys move a focus cursor, Enter selects the focused tile,
 * Escape clears the current selection.
 *
 * Follows WAI-ARIA grid pattern for keyboard accessibility.
 */

import { useState, useCallback, useEffect } from 'react';

interface UseGridKeyboardNavOptions {
  gridSize: number;
  totalTiles: number;
  disabled: boolean;
  selectTile: (index: number) => void;
  clearSelection: () => void;
  /** Currently selected indices — used to auto-focus adjacent tile after selection */
  selectedIndices: number[];
  /** Submit the current word */
  onSubmit?: () => void;
}

interface UseGridKeyboardNavReturn {
  /** Currently focused tile index (-1 = none) */
  focusedIndex: number;
  /** Set focused index programmatically */
  setFocusedIndex: (index: number) => void;
}

export function useGridKeyboardNav({
  gridSize,
  totalTiles,
  disabled,
  selectTile,
  clearSelection,
  selectedIndices,
  onSubmit,
}: UseGridKeyboardNavOptions): UseGridKeyboardNavReturn {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const moveFocus = useCallback((rowDelta: number, colDelta: number) => {
    setFocusedIndex(prev => {
      const current = prev < 0 ? 0 : prev;
      const row = Math.floor(current / gridSize);
      const col = current % gridSize;
      const newRow = Math.max(0, Math.min(gridSize - 1, row + rowDelta));
      const newCol = Math.max(0, Math.min(gridSize - 1, col + colDelta));
      const newIndex = newRow * gridSize + newCol;
      return newIndex < totalTiles ? newIndex : current;
    });
  }, [gridSize, totalTiles]);

  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Don't conflict with power-up shortcuts when no tile is focused
      if (focusedIndex < 0 && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveFocus(-1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveFocus(1, 0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moveFocus(0, -1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveFocus(0, 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0) {
            // If we have a selection and Enter is pressed, try to submit
            if (selectedIndices.length >= 2 && selectedIndices.includes(focusedIndex)) {
              onSubmit?.();
            } else {
              selectTile(focusedIndex);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (selectedIndices.length > 0) {
            clearSelection();
          } else {
            setFocusedIndex(-1);
          }
          break;
        case 'Backspace':
          e.preventDefault();
          // Remove last selected tile
          if (selectedIndices.length > 0) {
            const lastIdx = selectedIndices[selectedIndices.length - 1];
            selectTile(lastIdx); // Clicking last tile deselects it
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, focusedIndex, moveFocus, selectTile, clearSelection, selectedIndices, onSubmit]);

  return { focusedIndex, setFocusedIndex };
}
