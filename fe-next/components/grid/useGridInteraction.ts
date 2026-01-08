/**
 * useGridInteraction Hook
 * Handles touch/mouse interaction logic for the grid component
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getDeadzoneThreshold } from '@/utils/consts';
import type { LetterGrid, GridPosition, Language } from '@/types';
import type { CellPosition, SelectedCell } from './types';
import { getPerformanceConfig } from './performanceUtils';
import { findWordPath } from '@/utils/wordPathFinder';
import { normalizeWord } from '@/utils/clientWordValidator';

// Cached grid measurements to avoid layout thrashing on every touch move
interface GridMeasurements {
  gridRect: DOMRect;
  cellWidth: number;
  cellHeight: number;
  gridPaddingLeft: number;
  gridPaddingTop: number;
  gapX: number;
  gapY: number;
  cellWithGapWidth: number;
  cellWithGapHeight: number;
  timestamp: number;
}

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
  /** Callback when user taps a single cell without dragging (for tap-to-drag tutorial) */
  onSingleTapDetected?: (cell: { row: number; col: number; letter: string }) => void;
  language?: Language;
}

interface UseGridInteractionReturn {
  selectedCells: SelectedCell[];
  fadingCells: GridPosition[];
  focusedCell: GridPosition | null;
  /** Adjacent cells that can be selected next (for visual hints) */
  adjacentCells: GridPosition[];
  /** Swipe velocity for animation intensity */
  swipeVelocity: number;
  /** Currently hovered cell (for desktop preview) */
  hoveredCell: GridPosition | null;
  /** Whether user is in active selection mode (click-to-select started) */
  isSelecting: boolean;
  /** Whether user is dragging (mouse held down) */
  isDragging: boolean;
  handleTouchStart: (rowIndex: number, colIndex: number, letter: string, event: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => void;
  handleTouchMove: (e: TouchEvent | MouseEvent) => void;
  handleTouchEnd: () => void;
  handleMouseDown: (rowIndex: number, colIndex: number, letter: string, event: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseLeave: () => void;
  handleRightClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleDoubleClick: (rowIndex: number, colIndex: number) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  startSequentialFadeOut: (isCombo?: boolean) => void;
  undoLastCell: () => void;
  submitWord: () => void;
}

// Selection threshold - must be within this % of cell center to select
const CELL_SELECTION_THRESHOLD = 0.85;
// Diagonal selection threshold - slightly more lenient for diagonal movement
const DIAGONAL_SELECTION_THRESHOLD = 0.95;
// Velocity calculation - samples to average
const VELOCITY_SAMPLES = 3;

const noOp = () => { };

export function useGridInteraction({
  grid,
  interactive,
  comboLevel,
  onWordSubmit,
  onPathSubmit,
  externalSelectedCells,
  gridRef,
  fireRoundActive = false,
  onSingleTapDetected,
  language = 'en',
}: UseGridInteractionProps): UseGridInteractionReturn {
  const [internalSelectedCells, setInternalSelectedCells] = useState<SelectedCell[]>([]);
  const [fadingCells, setFadingCells] = useState<GridPosition[]>([]);
  const [focusedCell, setFocusedCell] = useState<GridPosition | null>(null);
  const [isKeyboardMode, setIsKeyboardMode] = useState<boolean>(false);
  const [adjacentCells, setAdjacentCells] = useState<GridPosition[]>([]);
  // Use ref for swipeVelocity to avoid re-renders on every touch move
  // This value is only used internally for velocity bonus calculation, not for rendering
  const swipeVelocityRef = useRef<number>(0);
  // Desktop-specific state
  const [hoveredCell, setHoveredCell] = useState<GridPosition | null>(null);
  const [isClickSelectMode, setIsClickSelectMode] = useState<boolean>(false);
  // FIXED: Use ref for isDragging to avoid async state update race condition
  // handleMouseMove fires before setIsDragging state update completes
  const isDraggingRef = useRef<boolean>(false);

  const isTouchingRef = useRef<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startCellRef = useRef<SelectedCell | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // For velocity calculation
  const touchHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const lastDirectionRef = useRef<{ dx: number; dy: number } | null>(null);

  // Grid measurement cache for performance optimization (avoids layout thrashing)
  const gridMeasurementsRef = useRef<GridMeasurements | null>(null);
  // RAF throttling for touch moves on low-end devices
  const pendingTouchRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  // Track if interaction is from touch device (for hybrid mode)
  const isTouchDeviceRef = useRef<boolean>(false);
  // Track last click time for double-click detection
  const lastClickTimeRef = useRef<number>(0);
  const lastClickCellRef = useRef<GridPosition | null>(null);

  // Get performance config once (cached)
  const performanceConfig = useMemo(() => getPerformanceConfig(), []);

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

  // Measure grid layout and cache it (expensive operation - avoid calling frequently)
  const measureGrid = useCallback((): GridMeasurements | null => {
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

    const measurements: GridMeasurements = {
      gridRect,
      cellWidth,
      cellHeight,
      gridPaddingLeft,
      gridPaddingTop,
      gapX,
      gapY,
      cellWithGapWidth: cellWidth + gapX,
      cellWithGapHeight: cellHeight + gapY,
      timestamp: performance.now(),
    };

    gridMeasurementsRef.current = measurements;
    return measurements;
  }, [grid, gridRef]);

  // Get cell at touch position with cell center distance info (uses cached measurements)
  const getCellAtPosition = useCallback((touchX: number, touchY: number): CellPosition | null => {
    if (!gridRef.current) return null;

    const cols = grid[0]?.length || 4;
    const rows = grid.length;

    // Use cached measurements or measure if cache is stale/missing
    // Cache is valid for 100ms to handle rapid touch events efficiently
    let measurements = gridMeasurementsRef.current;
    const now = performance.now();
    if (!measurements || now - measurements.timestamp > 100) {
      measurements = measureGrid();
      if (!measurements) return null;
    }

    const {
      gridRect,
      cellWidth,
      cellHeight,
      gridPaddingLeft,
      gridPaddingTop,
      cellWithGapWidth,
      cellWithGapHeight,
    } = measurements;

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
  }, [grid, gridRef, measureGrid]);

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

  // Submit word helper - can be called from various triggers
  const submitWord = useCallback(() => {
    if (selectedCells.length === 0) return;

    const formedWord = selectedCells.map(c => c.letter).join('');
    // Call onPathSubmit first so path is captured before word submission handlers run
    if (onPathSubmit) {
      onPathSubmit([...selectedCells]);
    }
    if (onWordSubmit) {
      onWordSubmit(formedWord);
    }

    // Haptic feedback
    if (window.navigator?.vibrate) {
      const wordLength = selectedCells.length;
      if (fireRoundActive) {
        if (comboLevel >= 7) {
          window.navigator.vibrate([100, 50, 100, 50, 100, 50, 150]);
        } else if (comboLevel >= 5) {
          window.navigator.vibrate([80, 40, 80, 40, 120]);
        } else if (comboLevel >= 3) {
          window.navigator.vibrate([60, 40, 60, 40, 100]);
        } else if (comboLevel >= 1) {
          window.navigator.vibrate([50, 30, 50, 30, 80]);
        } else if (wordLength >= 6) {
          window.navigator.vibrate([40, 30, 60]);
        } else if (wordLength >= 3) {
          window.navigator.vibrate(50);
        }
      } else {
        if (comboLevel >= 7) {
          window.navigator.vibrate([30, 20, 30]);
        } else if (comboLevel >= 5) {
          window.navigator.vibrate([25, 15, 25]);
        } else if (comboLevel >= 3) {
          window.navigator.vibrate([20, 10, 20]);
        } else if (comboLevel >= 1) {
          window.navigator.vibrate([15, 10, 15]);
        } else if (wordLength >= 6) {
          window.navigator.vibrate(20);
        } else if (wordLength >= 3) {
          window.navigator.vibrate(15);
        }
      }
    }

    // Clear selection with animation
    if (comboLevel > 0) {
      startSequentialFadeOut(true);
    } else {
      setTimeout(() => {
        setSelectedCells([]);
      }, 500);
    }

    // Exit click-select mode
    setIsClickSelectMode(false);
  }, [selectedCells, onWordSubmit, onPathSubmit, comboLevel, fireRoundActive, startSequentialFadeOut, setSelectedCells]);

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
          // Call onPathSubmit first so path is captured before word submission handlers run
          if (onPathSubmit) {
            onPathSubmit([...selectedCells]);
          }
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
    swipeVelocityRef.current = 0;

    // Store start cell
    startCellRef.current = { row: rowIndex, col: colIndex, letter };

    // Initialize selection
    setSelectedCells([{ row: rowIndex, col: colIndex, letter }]);

    // Haptic feedback - subtle but noticeable tap on first cell selection
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(fireRoundActive ? 18 : 12);
    }
  };

  // Core touch move processing logic (extracted for RAF throttling)
  const processTouchMove = useCallback((touchX: number, touchY: number) => {
    const now = Date.now();

    // Track touch history for velocity calculation
    touchHistoryRef.current.push({ x: touchX, y: touchY, time: now });
    if (touchHistoryRef.current.length > VELOCITY_SAMPLES * 2) {
      touchHistoryRef.current = touchHistoryRef.current.slice(-VELOCITY_SAMPLES);
    }

    // Update swipe velocity (using ref to avoid re-renders)
    const velocity = calculateVelocity();
    swipeVelocityRef.current = velocity;

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
      // Subtle but satisfying haptic during drag
      if (window.navigator?.vibrate) {
        // Consistent light taps - not overwhelming during fast swiping
        window.navigator.vibrate(fireRoundActive ? 12 : 8);
      }
    }
  }, [selectedCells, setSelectedCells, fireRoundActive, getCellAtPosition, calculateVelocity, isAdjacentCell, isDiagonalMove]);

  // Main touch move handler with RAF throttling for low-end devices
  const handleTouchMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!interactive || !isTouchingRef.current) return;
    if ('cancelable' in e && e.cancelable) e.preventDefault();

    const touch = 'touches' in e ? e.touches[0] : e;
    if (!touch) return;
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    // On low-end devices, use RAF throttling to limit processing to ~30fps
    // This prevents layout thrashing and keeps the UI responsive
    if (performanceConfig.isLowEnd) {
      // Store pending touch position
      pendingTouchRef.current = { x: touchX, y: touchY };

      // Schedule processing on next animation frame (if not already scheduled)
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const pending = pendingTouchRef.current;
          if (pending && isTouchingRef.current) {
            processTouchMove(pending.x, pending.y);
          }
          pendingTouchRef.current = null;
        });
      }
    } else {
      // Capable devices: process immediately for best responsiveness
      processTouchMove(touchX, touchY);
    }
  }, [interactive, performanceConfig.isLowEnd, processTouchMove]);

  const handleTouchEnd = useCallback(() => {
    if (!interactive || !isTouchingRef.current) return;
    isTouchingRef.current = false;

    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }

    // Clear gesture tracking state
    setAdjacentCells([]);
    swipeVelocityRef.current = 0;
    touchHistoryRef.current = [];
    lastDirectionRef.current = null;

    resetSelectionState();

    // Submit word
    if (selectedCells.length > 0 && (hasMovedRef.current || selectedCells.length >= 2)) {
      const formedWord = selectedCells.map(c => c.letter).join('');
      // Call onPathSubmit first so path is captured before word submission handlers run
      if (onPathSubmit) {
        onPathSubmit([...selectedCells]);
      }
      if (onWordSubmit) {
        onWordSubmit(formedWord);
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
      // Detect single tap without drag - user tapped one letter and released without moving
      // Only trigger for touch interactions (isTouchDeviceRef is set on touchstart)
      if (
        selectedCells.length === 1 &&
        !hasMovedRef.current &&
        isTouchDeviceRef.current &&
        onSingleTapDetected
      ) {
        const cell = selectedCells[0];
        onSingleTapDetected({
          row: cell.row,
          col: cell.col,
          letter: cell.letter,
        });
      }
      setSelectedCells([]);
    }

    hasMovedRef.current = false;
  }, [interactive, resetSelectionState, selectedCells, onWordSubmit, onPathSubmit, fireRoundActive, comboLevel, startSequentialFadeOut, setSelectedCells, onSingleTapDetected]);

  // Handle click-to-select for desktop (single clicks to build word)
  const handleCellClick = useCallback((
    rowIndex: number,
    colIndex: number,
    letter: string
  ) => {
    // Check for double-click
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    const sameCell = lastClickCellRef.current?.row === rowIndex &&
      lastClickCellRef.current?.col === colIndex;

    // Double-click on same cell = submit
    if (sameCell && timeSinceLastClick < 300 && selectedCells.length > 0) {
      submitWord();
      lastClickTimeRef.current = 0;
      lastClickCellRef.current = null;
      return;
    }

    lastClickTimeRef.current = now;
    lastClickCellRef.current = { row: rowIndex, col: colIndex };

    // If no cells selected, start selection
    if (selectedCells.length === 0) {
      setSelectedCells([{ row: rowIndex, col: colIndex, letter }]);
      setIsClickSelectMode(true);
      if (window.navigator?.vibrate) window.navigator.vibrate(12);
      return;
    }

    // Check if clicking on already selected cell
    const existingIndex = selectedCells.findIndex(
      c => c.row === rowIndex && c.col === colIndex
    );

    if (existingIndex !== -1) {
      // Clicking on last cell = submit word
      if (existingIndex === selectedCells.length - 1 && selectedCells.length >= 2) {
        submitWord();
        return;
      }
      // Clicking on earlier cell = backtrack
      setSelectedCells(selectedCells.slice(0, existingIndex + 1));
      if (window.navigator?.vibrate) window.navigator.vibrate(8);
      return;
    }

    // Check if new cell is adjacent to last selected
    const lastCell = selectedCells[selectedCells.length - 1];
    if (lastCell && isAdjacentCell(lastCell, { row: rowIndex, col: colIndex })) {
      setSelectedCells([...selectedCells, { row: rowIndex, col: colIndex, letter }]);
      if (window.navigator?.vibrate) window.navigator.vibrate(10);
    }
  }, [selectedCells, setSelectedCells, isAdjacentCell, submitWord]);

  const handleMouseDown = (
    rowIndex: number,
    colIndex: number,
    letter: string,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    // Don't use touch behavior for desktop - use click-to-select
    if (!isTouchDeviceRef.current) {
      // FIXED: Always use handleCellClick for desktop mouse input
      // This ensures click-to-select mode works correctly without being
      // cleared by handleTouchEnd on mouseup
      handleCellClick(rowIndex, colIndex, letter);

      // Also set up drag mode for users who want to drag-select
      // But only start dragging after movement (not on initial click)
      if (selectedCells.length === 0 || isClickSelectMode) {
        // Prepare for potential drag, but don't enter drag mode yet
        isTouchingRef.current = true;
        startPosRef.current = { x: event.clientX, y: event.clientY };
        hasMovedRef.current = false;
      }
      return;
    }
    handleTouchStart(rowIndex, colIndex, letter, event);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;

    // Track hover for desktop preview (even when not selecting)
    const hoveredCellPos = getCellAtPosition(e.clientX, e.clientY);
    if (hoveredCellPos) {
      setHoveredCell({ row: hoveredCellPos.row, col: hoveredCellPos.col });
    } else {
      setHoveredCell(null);
    }

    // FIXED: For desktop, enable drag mode only after user moves past deadzone
    // This allows click-to-select to work while also supporting drag-to-select
    if (isTouchingRef.current && !isDraggingRef.current && !isTouchDeviceRef.current) {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Only enter drag mode if user moved past deadzone threshold
      if (movement > getDeadzoneThreshold()) {
        isDraggingRef.current = true;
        hasMovedRef.current = true;
      }
    }

    // If dragging, process touch move
    if (isTouchingRef.current && isDraggingRef.current) {
      const mockEvent = {
        touches: [{ clientX: e.clientX, clientY: e.clientY }],
        cancelable: true,
        preventDefault: () => { }
      } as unknown as TouchEvent;
      handleTouchMove(mockEvent);
    }
  };

  // Handle mouse leaving grid area
  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  // Undo last selected cell - can be called from button, keyboard, or right-click
  const undoLastCell = useCallback(() => {
    if (selectedCells.length > 0) {
      setSelectedCells(selectedCells.slice(0, -1));
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(fireRoundActive ? 15 : 5);
      }
    }
  }, [selectedCells, setSelectedCells, fireRoundActive]);

  // Handle right-click to undo last cell
  const handleRightClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.preventDefault(); // Prevent context menu

    if (selectedCells.length > 0) {
      undoLastCell();
    } else if (isClickSelectMode) {
      // Exit click-select mode on right-click with no cells
      setIsClickSelectMode(false);
    }
  }, [interactive, selectedCells.length, undoLastCell, isClickSelectMode]);

  // Handle double-click on a cell
  const handleDoubleClick = useCallback((rowIndex: number, colIndex: number) => {
    if (!interactive) return;

    // Double-click on last selected cell submits the word
    const lastCell = selectedCells[selectedCells.length - 1];
    if (lastCell && lastCell.row === rowIndex && lastCell.col === colIndex) {
      if (selectedCells.length >= 2) {
        submitWord();
      }
    }
  }, [interactive, selectedCells, submitWord]);

  // Global mouse up
  useEffect(() => {
    const handleMouseUp = () => {
      // FIXED: Only call handleTouchEnd if user was actually dragging
      // For click-to-select mode, we don't want to clear selection on mouseup
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        handleTouchEnd();
      }
      // Always reset touching state on mouseup
      isTouchingRef.current = false;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleTouchEnd]);

  // Detect touch device (set on first touch)
  useEffect(() => {
    const handleFirstTouch = () => {
      isTouchDeviceRef.current = true;
      window.removeEventListener('touchstart', handleFirstTouch);
    };
    window.addEventListener('touchstart', handleFirstTouch, { passive: true });
    return () => window.removeEventListener('touchstart', handleFirstTouch);
  }, []);

  // Exit click-select mode when clicking outside grid or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        if (isClickSelectMode && selectedCells.length > 0) {
          // Submit word when clicking outside
          submitWord();
        } else {
          setIsClickSelectMode(false);
          setSelectedCells([]);
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isClickSelectMode) {
        setIsClickSelectMode(false);
        setSelectedCells([]);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscapeKey);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [gridRef, isClickSelectMode, selectedCells.length, submitWord, setSelectedCells]);

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
          // Call onPathSubmit first so path is captured before word submission handlers run
          if (onPathSubmit) {
            onPathSubmit([...selectedCells]);
          }
          if (onWordSubmit) {
            onWordSubmit(formedWord);
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
        // Handle letter typing (a-z)
        // Only auto-select if explicitly in keyboard mode or no active touch/drag in progress
        // This prevents interrupting user's swipe gestures
        if (e.key.length === 1 && /[a-zA-Z]/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          // Don't auto-select if user is actively dragging/touching (would interrupt swipe)
          if (isTouchingRef.current || isDraggingRef.current) {
            return; // Let the swipe continue, ignore keyboard input
          }

          e.preventDefault();

          // Determine the word we are trying to form
          let currentWord = '';
          if (selectedCells.length > 0) {
            currentWord = selectedCells.map(c => c.letter).join('');
          }
          const nextWord = currentWord + e.key;

          // Try to find a path for this word
          const path = findWordPath(nextWord, grid, language);

          if (path) {
            // Valid path found! Update selection
            // Convert PathCell[] to SelectedCell[] (SelectedCell needs letter property which PathCell has)
            const newSelection = path.map(p => ({
              row: p.row,
              col: p.col,
              letter: p.letter
            }));

            setSelectedCells(newSelection);
            setFocusedCell({ row: path[path.length - 1].row, col: path[path.length - 1].col });
            setIsKeyboardMode(true);

            if (window.navigator?.vibrate) {
              window.navigator.vibrate(fireRoundActive ? 20 : 8);
            }
          } else {
            // Don't auto-start new word on single key press if user has existing selection
            // This prevents unexpected clearing of user's current selection
            // Only allow starting new word if there's no current selection
            if (selectedCells.length === 0) {
              const startNewPath = findWordPath(e.key, grid, language);
              if (startNewPath) {
                const newSelection = startNewPath.map(p => ({
                  row: p.row,
                  col: p.col,
                  letter: p.letter
                }));
                setSelectedCells(newSelection);
                setFocusedCell({ row: startNewPath[0].row, col: startNewPath[0].col });
                setIsKeyboardMode(true);
                if (window.navigator?.vibrate) {
                  window.navigator.vibrate(fireRoundActive ? 20 : 8);
                }
              }
            }
            // If path not found and user has existing selection, do nothing
            // (don't clear their selection unexpectedly)
          }
          return;
        }
    }

    // Update focused cell
    if (newRow !== focusedCell.row || newCol !== focusedCell.col) {
      setFocusedCell({ row: newRow, col: newCol });
      setIsKeyboardMode(true);
      // Haptic feedback for navigation
      if (window.navigator?.vibrate) window.navigator.vibrate(10);
    }
  }, [interactive, grid, focusedCell, selectedCells, comboLevel, onWordSubmit, onPathSubmit, startSequentialFadeOut, setSelectedCells, isAdjacentCell, fireRoundActive, language]);

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
  }, [gridRef, handleTouchMove]);

  // Cleanup RAF on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // Invalidate grid measurement cache on resize/orientation change
  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;

    const invalidateCache = () => {
      gridMeasurementsRef.current = null;
    };

    // Use ResizeObserver for efficient resize detection
    const resizeObserver = new ResizeObserver(() => {
      invalidateCache();
    });
    resizeObserver.observe(element);

    // Also invalidate on orientation change and window resize
    window.addEventListener('orientationchange', invalidateCache);
    window.addEventListener('resize', invalidateCache);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('orientationchange', invalidateCache);
      window.removeEventListener('resize', invalidateCache);
    };
  }, [gridRef]);

  return {
    selectedCells,
    fadingCells,
    focusedCell,
    adjacentCells,
    swipeVelocity: swipeVelocityRef.current,
    hoveredCell,
    isSelecting: isClickSelectMode,
    isDragging: isDraggingRef.current,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseLeave,
    handleRightClick,
    handleDoubleClick,
    handleKeyDown,
    startSequentialFadeOut,
    undoLastCell,
    submitWord,
  };
}
