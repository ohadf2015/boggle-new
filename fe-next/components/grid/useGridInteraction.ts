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
  /** Callback when word is submitted with its path - used for direction pattern detection */
  onPathSubmit?: (cells: SelectedCell[]) => void;
  externalSelectedCells?: SelectedCell[];
  gridRef: React.RefObject<HTMLDivElement | null>;
  fireRoundActive?: boolean;
}

interface UseGridInteractionReturn {
  selectedCells: SelectedCell[];
  fadingCells: GridPosition[];
  focusedCell: GridPosition | null;
  /** Adjacent cells that can be selected next (for visual hints) */
  adjacentCells: GridPosition[];
  /** Swipe velocity for animation intensity */
  swipeVelocity: number;
  handleTouchStart: (rowIndex: number, colIndex: number, letter: string, event: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => void;
  handleTouchMove: (e: TouchEvent | MouseEvent) => void;
  handleTouchEnd: () => void;
  handleMouseDown: (rowIndex: number, colIndex: number, letter: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  startSequentialFadeOut: (isCombo?: boolean) => void;
  undoLastCell: () => void;
}

// Selection threshold - must be within this % of cell center to select
const CELL_SELECTION_THRESHOLD = 0.85;
// Diagonal selection threshold - slightly more lenient for diagonal movement
const DIAGONAL_SELECTION_THRESHOLD = 0.95;
// Velocity calculation - samples to average
const VELOCITY_SAMPLES = 3;

const noOp = () => {};

export function useGridInteraction({
  grid,
  interactive,
  comboLevel,
  onWordSubmit,
  onPathSubmit,
  externalSelectedCells,
  gridRef,
  fireRoundActive = false,
}: UseGridInteractionProps): UseGridInteractionReturn {
  const [internalSelectedCells, setInternalSelectedCells] = useState<SelectedCell[]>([]);
  const [fadingCells, setFadingCells] = useState<GridPosition[]>([]);
  const [focusedCell, setFocusedCell] = useState<GridPosition | null>(null);
  const [isKeyboardMode, setIsKeyboardMode] = useState<boolean>(false);
  const [adjacentCells, setAdjacentCells] = useState<GridPosition[]>([]);
  const [swipeVelocity, setSwipeVelocity] = useState<number>(0);

  const isTouchingRef = useRef<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startCellRef = useRef<SelectedCell | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // For velocity calculation
  const touchHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const lastDirectionRef = useRef<{ dx: number; dy: number } | null>(null);

  // Use external control if provided, otherwise internal state
  const selectedCells = externalSelectedCells || internalSelectedCells;
  const setSelectedCells = externalSelectedCells ? noOp : setInternalSelectedCells;

  // Check if two cells are adjacent (8 directions including diagonals)
  const isAdjacentCell = useCallback((cell1: GridPosition, cell2: GridPosition): boolean => {
    const rowDiff = Math.abs(cell1.row - cell2.row);
    const colDiff = Math.abs(cell1.col - cell2.col);
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
  }, []);

  // Check if movement to a cell is diagonal
  const isDiagonalMove = useCallback((cell1: GridPosition, cell2: GridPosition): boolean => {
    const rowDiff = Math.abs(cell1.row - cell2.row);
    const colDiff = Math.abs(cell1.col - cell2.col);
    return rowDiff === 1 && colDiff === 1;
  }, []);

  // Get all adjacent cells that can be selected (not already selected)
  const getAdjacentCells = useCallback((lastCell: GridPosition | null): GridPosition[] => {
    if (!lastCell) return [];
    const rows = grid.length;
    const cols = grid[0]?.length || 4;
    const adjacent: GridPosition[] = [];

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const newRow = lastCell.row + dr;
        const newCol = lastCell.col + dc;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
          // Check if not already selected
          const isSelected = selectedCells.some(c => c.row === newRow && c.col === newCol);
          if (!isSelected) {
            adjacent.push({ row: newRow, col: newCol });
          }
        }
      }
    }
    return adjacent;
  }, [grid, selectedCells]);

  // Calculate swipe velocity from touch history
  const calculateVelocity = useCallback((): number => {
    const history = touchHistoryRef.current;
    if (history.length < 2) return 0;

    const recent = history.slice(-VELOCITY_SAMPLES);
    if (recent.length < 2) return 0;

    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeDiff = last.time - first.time;
    if (timeDiff === 0) return 0;

    const distance = Math.sqrt(
      Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
    );
    // Pixels per millisecond, normalized to a 0-1 scale (0.5+ is fast)
    return Math.min(1, distance / timeDiff / 2);
  }, []);

  // Update adjacent cells when selection changes
  useEffect(() => {
    const lastCell = selectedCells[selectedCells.length - 1];
    if (lastCell && isTouchingRef.current) {
      setAdjacentCells(getAdjacentCells(lastCell));
    } else {
      setAdjacentCells([]);
    }
  }, [selectedCells, getAdjacentCells]);

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
          if (onPathSubmit) {
            onPathSubmit([...selectedCells]);
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
  }, [selectedCells, comboLevel, interactive, onWordSubmit, onPathSubmit, startSequentialFadeOut]);

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

    // Clear touch history for fresh velocity tracking
    touchHistoryRef.current = [{ x: touch.clientX, y: touch.clientY, time: Date.now() }];
    lastDirectionRef.current = null;
    setSwipeVelocity(0);

    // Store start cell
    startCellRef.current = { row: rowIndex, col: colIndex, letter };

    // Initialize selection
    setSelectedCells([{ row: rowIndex, col: colIndex, letter }]);

    // Haptic feedback - light tap feedback
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(fireRoundActive ? 15 : 8);
    }
  };

  const handleTouchMove = (e: TouchEvent | MouseEvent) => {
    if (!interactive || !isTouchingRef.current) return;
    if ('cancelable' in e && e.cancelable) e.preventDefault();

    const touch = 'touches' in e ? e.touches[0] : e;
    if (!touch) return;
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    const now = Date.now();

    // Track touch history for velocity calculation
    touchHistoryRef.current.push({ x: touchX, y: touchY, time: now });
    if (touchHistoryRef.current.length > VELOCITY_SAMPLES * 2) {
      touchHistoryRef.current = touchHistoryRef.current.slice(-VELOCITY_SAMPLES);
    }

    // Update swipe velocity
    const velocity = calculateVelocity();
    setSwipeVelocity(velocity);

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

    // Check if this is a diagonal move - use more lenient threshold
    const isDiagonal = isDiagonalMove(lastCell, currentCell);
    const threshold = isDiagonal ? DIAGONAL_SELECTION_THRESHOLD : CELL_SELECTION_THRESHOLD;
    const selectionThreshold = currentCell.cellRadius * threshold;

    // Anti-accident: must be close enough to cell center
    // Fast swipes get more lenient threshold
    const velocityBonus = velocity > 0.3 ? 0.1 : 0;
    if (currentCell.distanceFromCenter > selectionThreshold * (1 + velocityBonus)) {
      return;
    }

    // Track direction for predictive selection hints
    const dx = currentCell.col - lastCell.col;
    const dy = currentCell.row - lastCell.row;
    lastDirectionRef.current = { dx, dy };

    // Backtracking
    const existingIndex = selectedCells.findIndex(
      c => c.row === currentCell.row && c.col === currentCell.col
    );

    if (existingIndex !== -1) {
      const newSelection = selectedCells.slice(0, existingIndex + 1);
      if (newSelection.length !== selectedCells.length) {
        setSelectedCells(newSelection);
        if (window.navigator?.vibrate) window.navigator.vibrate(fireRoundActive ? 8 : 3);
      }
      return;
    }

    // New cell - check adjacency
    if (isAdjacentCell(lastCell, currentCell)) {
      const newSelection = [...selectedCells, { row: currentCell.row, col: currentCell.col, letter: currentCell.letter }];
      setSelectedCells(newSelection);
      // Smooth, consistent haptic during drag - not increasing with word length
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(fireRoundActive ? 12 : 6);
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

    // Clear gesture tracking state
    setAdjacentCells([]);
    setSwipeVelocity(0);
    touchHistoryRef.current = [];
    lastDirectionRef.current = null;

    resetSelectionState();

    // Submit word
    if (selectedCells.length > 0 && (hasMovedRef.current || selectedCells.length >= 2)) {
      const formedWord = selectedCells.map(c => c.letter).join('');
      if (onWordSubmit) {
        onWordSubmit(formedWord);
      }
      if (onPathSubmit) {
        onPathSubmit([...selectedCells]);
      }

      // Haptic feedback based on word length and combo
      if (window.navigator && window.navigator.vibrate) {
        const wordLength = selectedCells.length;
        if (fireRoundActive) {
          // Full intensity haptics during fire round
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
        } else {
          // Reduced haptics when not in fire round
          if (comboLevel > 0) {
            if (comboLevel >= 7) {
              window.navigator.vibrate([30, 20, 30]);
            } else if (comboLevel >= 5) {
              window.navigator.vibrate([25, 15, 25]);
            } else if (comboLevel >= 3) {
              window.navigator.vibrate([20, 10, 20]);
            } else if (comboLevel >= 1) {
              window.navigator.vibrate([15, 10, 15]);
            }
          } else if (wordLength >= 6) {
            window.navigator.vibrate(20);
          } else if (wordLength >= 3) {
            window.navigator.vibrate(15);
          }
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
  }, [handleTouchEnd]); // Fixed: proper dependency

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;

    const rows = grid.length;
    const cols = grid[0]?.length || 4;

    // Initialize focused cell if not set
    if (focusedCell === null && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
      setFocusedCell({ row: 0, col: 0 });
      setIsKeyboardMode(true);
      e.preventDefault();
      return;
    }

    if (!focusedCell) return;

    let newRow = focusedCell.row;
    let newCol = focusedCell.col;

    switch (e.key) {
      case 'ArrowUp':
        newRow = Math.max(0, focusedCell.row - 1);
        e.preventDefault();
        break;
      case 'ArrowDown':
        newRow = Math.min(rows - 1, focusedCell.row + 1);
        e.preventDefault();
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, focusedCell.col - 1);
        e.preventDefault();
        break;
      case 'ArrowRight':
        newCol = Math.min(cols - 1, focusedCell.col + 1);
        e.preventDefault();
        break;
      case ' ': // Space to select/deselect cell
      case 'Enter': {
        e.preventDefault();
        const letter = grid[focusedCell.row]?.[focusedCell.col];
        if (!letter) return;

        // If Enter with cells selected, submit the word
        if (e.key === 'Enter' && selectedCells.length > 0) {
          const formedWord = selectedCells.map(c => c.letter).join('');
          if (onWordSubmit) {
            onWordSubmit(formedWord);
          }
          if (onPathSubmit) {
            onPathSubmit([...selectedCells]);
          }
          // Haptic feedback
          if (window.navigator?.vibrate) {
            window.navigator.vibrate(fireRoundActive ? 50 : 15);
          }
          if (comboLevel > 0) {
            startSequentialFadeOut(true);
          } else {
            setTimeout(() => setSelectedCells([]), 500);
          }
          return;
        }

        // Check if cell is already selected
        const existingIndex = selectedCells.findIndex(
          c => c.row === focusedCell.row && c.col === focusedCell.col
        );

        if (existingIndex !== -1) {
          // Deselect: remove this cell and all after it (backtracking)
          setSelectedCells(selectedCells.slice(0, existingIndex));
          if (window.navigator?.vibrate) window.navigator.vibrate(fireRoundActive ? 15 : 5);
        } else {
          // Select: check if adjacent to last selected cell (or first cell)
          const lastCell = selectedCells[selectedCells.length - 1];
          const isAdjacent = lastCell
            ? isAdjacentCell(lastCell, focusedCell)
            : true; // First cell is always valid

          if (isAdjacent) {
            setSelectedCells([...selectedCells, { row: focusedCell.row, col: focusedCell.col, letter }]);
            if (window.navigator?.vibrate) {
              window.navigator.vibrate(fireRoundActive ? 30 : 10);
            }
          }
        }
        return;
      }
      case 'Escape':
        // Clear selection
        setSelectedCells([]);
        setFocusedCell(null);
        setIsKeyboardMode(false);
        e.preventDefault();
        return;
      case 'Backspace':
      case 'Delete':
        // Remove last selected cell
        if (selectedCells.length > 0) {
          setSelectedCells(selectedCells.slice(0, -1));
          if (window.navigator?.vibrate) window.navigator.vibrate(fireRoundActive ? 15 : 5);
        }
        e.preventDefault();
        return;
      default:
        return;
    }

    // Update focused cell
    if (newRow !== focusedCell.row || newCol !== focusedCell.col) {
      setFocusedCell({ row: newRow, col: newCol });
      setIsKeyboardMode(true);
      // Haptic feedback for navigation
      if (window.navigator?.vibrate) window.navigator.vibrate(10);
    }
  }, [interactive, grid, focusedCell, selectedCells, comboLevel, onWordSubmit, onPathSubmit, startSequentialFadeOut, setSelectedCells, isAdjacentCell, fireRoundActive]);

  // Reset keyboard mode on touch/mouse interaction
  useEffect(() => {
    const handlePointerDown = () => {
      setIsKeyboardMode(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // Attach touchmove listener with { passive: false } to allow preventDefault
  // React's synthetic events are passive by default which prevents preventDefault from working
  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;

    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleTouchMove]);

  // Undo last selected cell - can be called from button or keyboard
  const undoLastCell = useCallback(() => {
    if (selectedCells.length > 0) {
      setSelectedCells(selectedCells.slice(0, -1));
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(fireRoundActive ? 15 : 5);
      }
    }
  }, [selectedCells, setSelectedCells, fireRoundActive]);

  return {
    selectedCells,
    fadingCells,
    focusedCell,
    adjacentCells,
    swipeVelocity,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleKeyDown,
    startSequentialFadeOut,
    undoLastCell,
  };
}
