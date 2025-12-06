/**
 * useGridInteraction Hook
 * Handles touch/mouse interaction logic for the grid component
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { getDeadzoneThreshold } from '@/utils/consts';
import type { LetterGrid, GridPosition } from '@/types';
import type { CellPosition, SelectedCell } from './types';

interface UseGridInteractionProps {
  grid: LetterGrid;
  interactive: boolean;
  comboLevel: number;
  onWordSubmit?: (word: string) => void;
  externalSelectedCells?: SelectedCell[];
  gridRef: React.RefObject<HTMLDivElement>;
}

interface UseGridInteractionReturn {
  selectedCells: SelectedCell[];
  fadingCells: GridPosition[];
  handleTouchStart: (rowIndex: number, colIndex: number, letter: string, event: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => void;
  handleTouchMove: (e: TouchEvent | MouseEvent) => void;
  handleTouchEnd: () => void;
  handleMouseDown: (rowIndex: number, colIndex: number, letter: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  startSequentialFadeOut: (isCombo?: boolean) => void;
}

// Selection threshold - must be within this % of cell center to select
const CELL_SELECTION_THRESHOLD = 0.85;

const noOp = () => {};

export function useGridInteraction({
  grid,
  interactive,
  comboLevel,
  onWordSubmit,
  externalSelectedCells,
  gridRef,
}: UseGridInteractionProps): UseGridInteractionReturn {
  const [internalSelectedCells, setInternalSelectedCells] = useState<SelectedCell[]>([]);
  const [fadingCells, setFadingCells] = useState<GridPosition[]>([]);

  const isTouchingRef = useRef<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startCellRef = useRef<SelectedCell | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use external control if provided, otherwise internal state
  const selectedCells = externalSelectedCells || internalSelectedCells;
  const setSelectedCells = externalSelectedCells ? noOp : setInternalSelectedCells;

  // Check if two cells are adjacent (8 directions including diagonals)
  const isAdjacentCell = (cell1: GridPosition, cell2: GridPosition): boolean => {
    const rowDiff = Math.abs(cell1.row - cell2.row);
    const colDiff = Math.abs(cell1.col - cell2.col);
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
  };

  // Get cell at touch position with cell center distance info
  const getCellAtPosition = useCallback((touchX: number, touchY: number): CellPosition | null => {
    if (!gridRef.current) return null;

    const gridRect = gridRef.current.getBoundingClientRect();
    const cols = grid[0]?.length || 4;
    const rows = grid.length;

    const firstCell = gridRef.current.children[0];
    if (!firstCell) return null;

    const firstCellRect = firstCell.getBoundingClientRect();
    const cellWidth = firstCellRect.width;
    const cellHeight = firstCellRect.height;
    const gridPaddingLeft = firstCellRect.left - gridRect.left;
    const gridPaddingTop = firstCellRect.top - gridRect.top;

    // Calculate horizontal gap between cells
    const lastCellInRow = gridRef.current.children[cols - 1];
    const gapX = lastCellInRow
      ? (lastCellInRow.getBoundingClientRect().left - firstCellRect.left - (cols - 1) * cellWidth) / Math.max(1, cols - 1)
      : 0;

    // Calculate vertical gap between cells
    const firstCellInSecondRow = rows > 1 ? gridRef.current.children[cols] : null;
    const gapY = firstCellInSecondRow
      ? (firstCellInSecondRow.getBoundingClientRect().top - firstCellRect.top - cellHeight)
      : gapX;

    const cellWithGapWidth = cellWidth + gapX;
    const cellWithGapHeight = cellHeight + gapY;

    const adjustedX = touchX - gridRect.left - gridPaddingLeft;
    const adjustedY = touchY - gridRect.top - gridPaddingTop;

    const col = Math.floor(adjustedX / cellWithGapWidth);
    const row = Math.floor(adjustedY / cellWithGapHeight);

    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;

    const gridRow = grid[row];
    const letter = gridRow?.[col];
    if (!letter) return null;

    // Calculate cell center for distance checking
    const cellCenterX = col * cellWithGapWidth + cellWidth / 2;
    const cellCenterY = row * cellWithGapHeight + cellHeight / 2;
    const distanceFromCenter = Math.sqrt(
      Math.pow(adjustedX - cellCenterX, 2) +
      Math.pow(adjustedY - cellCenterY, 2)
    );

    return {
      row,
      col,
      letter,
      distanceFromCenter,
      cellRadius: Math.min(cellWidth, cellHeight) / 2
    };
  }, [grid, gridRef]);

  // Reset selection state
  const resetSelectionState = useCallback(() => {
    startCellRef.current = null;
  }, []);

  // Sequential fade-out animation for combo trail
  const startSequentialFadeOut = useCallback((isCombo = false) => {
    if (selectedCells.length === 0) return;

    // Cancel any existing fade timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    // Copy selected cells for fading animation
    const cellsToFade = [...selectedCells];
    setFadingCells(cellsToFade);

    // Combo trails stay much longer and fade slower
    const cellFadeDelay = isCombo ? 120 : 80;
    const initialHold = isCombo ? 500 : 0;

    // Fade out each cell sequentially from START to END
    cellsToFade.forEach((cell, index) => {
      setTimeout(() => {
        setFadingCells(prev => prev.filter(c => !(c.row === cell.row && c.col === cell.col)));
      }, initialHold + index * cellFadeDelay);
    });

    // Clear all selections after animation completes
    const totalDelay = initialHold + cellsToFade.length * cellFadeDelay + (isCombo ? 800 : 200);
    fadeTimeoutRef.current = setTimeout(() => {
      if (!isTouchingRef.current) {
        setSelectedCells([]);
        setFadingCells([]);
      }
      fadeTimeoutRef.current = null;
    }, totalDelay);
  }, [selectedCells, setSelectedCells]);

  // Auto-validation for combo words
  useEffect(() => {
    if (!interactive || comboLevel === 0 || selectedCells.length === 0) {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
        autoSubmitTimeoutRef.current = null;
      }
      return;
    }

    if (selectedCells.length >= 3) {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }

      autoSubmitTimeoutRef.current = setTimeout(() => {
        if (selectedCells.length >= 3 && isTouchingRef.current) {
          const formedWord = selectedCells.map(c => c.letter).join('');
          if (onWordSubmit) {
            onWordSubmit(formedWord);
          }
          startSequentialFadeOut(true);
          isTouchingRef.current = false;
        }
      }, 500);
    }

    return () => {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
    };
  }, [selectedCells, comboLevel, interactive, onWordSubmit, startSequentialFadeOut]);

  const handleTouchStart = (
    rowIndex: number,
    colIndex: number,
    letter: string,
    event: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>
  ) => {
    if (!interactive) return;
    isTouchingRef.current = true;
    hasMovedRef.current = false;

    // Cancel any pending fade timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    // Clear any fading animation
    setFadingCells([]);

    // Store initial touch position
    const touch = 'touches' in event ? event.touches?.[0] : event;
    if (!touch) return;
    startPosRef.current = { x: touch.clientX, y: touch.clientY };

    // Store start cell
    startCellRef.current = { row: rowIndex, col: colIndex, letter };

    // Initialize selection
    setSelectedCells([{ row: rowIndex, col: colIndex, letter }]);

    // Haptic feedback
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(30);
    }
  };

  const handleTouchMove = (e: TouchEvent | MouseEvent) => {
    if (!interactive || !isTouchingRef.current) return;
    if ('cancelable' in e && e.cancelable) e.preventDefault();

    const touch = 'touches' in e ? e.touches[0] : e;
    if (!touch) return;
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    // Deadzone check
    const deltaX = touchX - startPosRef.current.x;
    const deltaY = touchY - startPosRef.current.y;
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (!hasMovedRef.current && totalMovement < getDeadzoneThreshold()) {
      return;
    }
    hasMovedRef.current = true;

    const currentCell = getCellAtPosition(touchX, touchY);
    if (!currentCell) return;

    const lastCell = selectedCells[selectedCells.length - 1];
    if (!lastCell) return;

    // Same cell - no change
    if (currentCell.row === lastCell.row && currentCell.col === lastCell.col) {
      return;
    }

    // Anti-accident: must be close enough to cell center
    const selectionThreshold = currentCell.cellRadius * CELL_SELECTION_THRESHOLD;
    if (currentCell.distanceFromCenter > selectionThreshold) {
      return;
    }

    // Backtracking
    const existingIndex = selectedCells.findIndex(
      c => c.row === currentCell.row && c.col === currentCell.col
    );

    if (existingIndex !== -1) {
      const newSelection = selectedCells.slice(0, existingIndex + 1);
      if (newSelection.length !== selectedCells.length) {
        setSelectedCells(newSelection);
        if (window.navigator?.vibrate) window.navigator.vibrate(15);
      }
      return;
    }

    // New cell - check adjacency
    if (isAdjacentCell(lastCell, currentCell)) {
      const newSelection = [...selectedCells, { row: currentCell.row, col: currentCell.col, letter: currentCell.letter }];
      setSelectedCells(newSelection);
      if (window.navigator?.vibrate) {
        const intensity = Math.min(20 + newSelection.length * 3 + comboLevel * 5, 60);
        window.navigator.vibrate(intensity);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!interactive || !isTouchingRef.current) return;
    isTouchingRef.current = false;

    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }

    resetSelectionState();

    // Submit word
    if (selectedCells.length > 0 && (hasMovedRef.current || selectedCells.length >= 2)) {
      const formedWord = selectedCells.map(c => c.letter).join('');
      if (onWordSubmit) {
        onWordSubmit(formedWord);
      }

      // Haptic feedback based on word length and combo
      if (window.navigator && window.navigator.vibrate) {
        const wordLength = selectedCells.length;
        if (comboLevel > 0) {
          if (comboLevel >= 7) {
            window.navigator.vibrate([100, 50, 100, 50, 100, 50, 150]);
          } else if (comboLevel >= 5) {
            window.navigator.vibrate([80, 40, 80, 40, 120]);
          } else if (comboLevel >= 3) {
            window.navigator.vibrate([60, 40, 60, 40, 100]);
          } else if (comboLevel >= 1) {
            window.navigator.vibrate([50, 30, 50, 30, 80]);
          }
        } else if (wordLength >= 6) {
          window.navigator.vibrate([40, 30, 60]);
        } else if (wordLength >= 3) {
          window.navigator.vibrate(50);
        }
      }

      if (comboLevel > 0) {
        startSequentialFadeOut(true);
      } else {
        setTimeout(() => {
          setSelectedCells([]);
        }, 500);
      }
    } else {
      setSelectedCells([]);
    }

    hasMovedRef.current = false;
  };

  const handleMouseDown = (
    rowIndex: number,
    colIndex: number,
    letter: string,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    handleTouchStart(rowIndex, colIndex, letter, event);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !isTouchingRef.current) return;

    const mockEvent = {
      touches: [{ clientX: e.clientX, clientY: e.clientY }],
      cancelable: true,
      preventDefault: () => {}
    } as unknown as TouchEvent;
    handleTouchMove(mockEvent);
  };

  // Global mouse up
  useEffect(() => {
    const handleMouseUp = () => handleTouchEnd();
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [selectedCells]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    selectedCells,
    fadingCells,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    startSequentialFadeOut,
  };
}
