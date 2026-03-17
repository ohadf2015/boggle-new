import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getDeadzoneThreshold } from '@/utils/consts';
import type { LetterGrid, GridPosition, Language } from '@/types';
import type { CellPosition, SelectedCell } from './types';
import { getPerformanceConfig } from './performanceUtils';
import {
  type GridMeasurements,
  isAdjacentCell,
  isDiagonalMove,
  getSelectableAdjacentCells,
  measureGrid,
  getCellAtPosition,
  isWithinSelectionThreshold,
} from './gridGeometry';
import {
  vibrateWordSubmit,
  vibrateCellTap,
  vibrateCellDrag,
  vibrateBacktrack,
  vibrateUndo,
} from './hapticFeedback';
import { createVelocityTracker } from './velocityTracker';
import { useGridKeyboardHandler } from './useGridKeyboardHandler';
import { useGridClickHandler } from './useGridClickHandler';

interface UseGridInteractionProps {
  grid: LetterGrid;
  interactive: boolean;
  comboLevel: number;
  onWordSubmit?: (word: string) => void;
  onPathSubmit?: (cells: SelectedCell[]) => void;
  externalSelectedCells?: SelectedCell[];
  gridRef: React.RefObject<HTMLDivElement | null>;
  fireRoundActive?: boolean;
  onSingleTapDetected?: (cell: { row: number; col: number; letter: string }) => void;
  language?: Language;
  disableLetterKeyInput?: boolean;
}

interface UseGridInteractionReturn {
  selectedCells: SelectedCell[];
  fadingCells: GridPosition[];
  focusedCell: GridPosition | null;
  adjacentCells: GridPosition[];
  swipeVelocity: number;
  hoveredCell: GridPosition | null;
  isSelecting: boolean;
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
  disableLetterKeyInput = false,
}: UseGridInteractionProps): UseGridInteractionReturn {
  const [internalSelectedCells, setInternalSelectedCells] = useState<SelectedCell[]>([]);
  const [fadingCells, setFadingCells] = useState<GridPosition[]>([]);
  const [focusedCell, setFocusedCell] = useState<GridPosition | null>(null);
  const [, setIsKeyboardMode] = useState(false);
  const [adjacentCells, setAdjacentCells] = useState<GridPosition[]>([]);
  const [hoveredCell, setHoveredCell] = useState<GridPosition | null>(null);
  const [isClickSelectMode, setIsClickSelectMode] = useState(false);
  const isTouchingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const isScrollGestureRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startCellRef = useRef<SelectedCell | null>(null);
  const isTouchDeviceRef = useRef(false);
  const lastDirectionRef = useRef<{ dx: number; dy: number } | null>(null);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gridMeasurementsRef = useRef<GridMeasurements | null>(null);
  const pendingTouchRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const velocityTrackerRef = useRef(createVelocityTracker());
  const performanceConfig = useMemo(() => getPerformanceConfig(), []);
  const selectedCells = externalSelectedCells || internalSelectedCells;
  const setSelectedCells = externalSelectedCells ? noOp : setInternalSelectedCells;

  const getGridMeasurements = useCallback((): GridMeasurements | null => {
    if (!gridRef.current) return null;
    const now = performance.now();
    if (gridMeasurementsRef.current && now - gridMeasurementsRef.current.timestamp < 100) {
      return gridMeasurementsRef.current;
    }
    const measurements = measureGrid(gridRef.current, grid);
    if (measurements) gridMeasurementsRef.current = measurements;
    return measurements;
  }, [grid, gridRef]);
  const getCellAtPos = useCallback((touchX: number, touchY: number): CellPosition | null => {
    const measurements = getGridMeasurements();
    if (!measurements) return null;
    return getCellAtPosition(touchX, touchY, grid, measurements);
  }, [grid, getGridMeasurements]);
  useEffect(() => {
    const lastCell = selectedCells[selectedCells.length - 1];
    if (lastCell && isTouchingRef.current) {
      setAdjacentCells(getSelectableAdjacentCells(lastCell, grid, selectedCells));
    } else {
      setAdjacentCells([]);
    }
  }, [selectedCells, grid]);
  const startSequentialFadeOut = useCallback((isCombo = false) => {
    if (selectedCells.length === 0) return;
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    const cellsToFade = [...selectedCells];
    setFadingCells(cellsToFade);
    const cellFadeDelay = isCombo ? 120 : 80;
    const initialHold = isCombo ? 500 : 0;
    cellsToFade.forEach((cell, index) => {
      setTimeout(() => {
        setFadingCells(prev => prev.filter(c => !(c.row === cell.row && c.col === cell.col)));
      }, initialHold + index * cellFadeDelay);
    });
    const totalDelay = initialHold + cellsToFade.length * cellFadeDelay + (isCombo ? 800 : 200);
    fadeTimeoutRef.current = setTimeout(() => {
      if (!isTouchingRef.current) {
        setSelectedCells([]);
        setFadingCells([]);
      }
      fadeTimeoutRef.current = null;
    }, totalDelay);
  }, [selectedCells, setSelectedCells]);
  const submitWord = useCallback(() => {
    if (selectedCells.length === 0) return;
    const formedWord = selectedCells.map(c => c.letter).join('');
    if (onPathSubmit) onPathSubmit([...selectedCells]);
    if (onWordSubmit) onWordSubmit(formedWord);
    vibrateWordSubmit(selectedCells.length, comboLevel, fireRoundActive);
    if (comboLevel > 0) {
      startSequentialFadeOut(true);
    } else {
      setTimeout(() => setSelectedCells([]), 500);
    }
    setIsClickSelectMode(false);
  }, [selectedCells, onWordSubmit, onPathSubmit, comboLevel, fireRoundActive, startSequentialFadeOut, setSelectedCells]);
  const undoLastCell = useCallback(() => {
    if (selectedCells.length > 0) {
      setSelectedCells(selectedCells.slice(0, -1));
      vibrateUndo(fireRoundActive);
    }
  }, [selectedCells, setSelectedCells, fireRoundActive]);
  useEffect(() => {
    if (!interactive || comboLevel === 0 || selectedCells.length === 0) {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
        autoSubmitTimeoutRef.current = null;
      }
      return;
    }
    if (selectedCells.length >= 3) {
      if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = setTimeout(() => {
        if (selectedCells.length >= 3 && isTouchingRef.current) {
          const formedWord = selectedCells.map(c => c.letter).join('');
          if (onPathSubmit) onPathSubmit([...selectedCells]);
          if (onWordSubmit) onWordSubmit(formedWord);
          startSequentialFadeOut(true);
          isTouchingRef.current = false;
        }
      }, 500);
    }
    return () => {
      if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
    };
  }, [selectedCells, comboLevel, interactive, onWordSubmit, onPathSubmit, startSequentialFadeOut]);
  const handleTouchStart = useCallback((
    rowIndex: number, colIndex: number, letter: string,
    event: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>
  ) => {
    if (!interactive) return;
    isTouchingRef.current = true;
    hasMovedRef.current = false;
    isScrollGestureRef.current = false;
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    setFadingCells([]);
    const touch = 'touches' in event ? event.touches?.[0] : event;
    if (!touch) return;
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    velocityTrackerRef.current.start(touch.clientX, touch.clientY);
    lastDirectionRef.current = null;
    startCellRef.current = { row: rowIndex, col: colIndex, letter };
    setSelectedCells([{ row: rowIndex, col: colIndex, letter }]);
    vibrateCellTap(fireRoundActive);
  }, [interactive, setSelectedCells, fireRoundActive]);

  const processTouchMove = useCallback((touchX: number, touchY: number) => {
    velocityTrackerRef.current.recordPosition(touchX, touchY);
    const velocity = velocityTrackerRef.current.getVelocity();
    const deltaX = touchX - startPosRef.current.x;
    const deltaY = touchY - startPosRef.current.y;
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (!hasMovedRef.current && totalMovement < getDeadzoneThreshold()) return;
    hasMovedRef.current = true;
    const currentCell = getCellAtPos(touchX, touchY);
    if (!currentCell) return;
    const lastCell = selectedCells[selectedCells.length - 1];
    if (!lastCell) return;
    if (currentCell.row === lastCell.row && currentCell.col === lastCell.col) return;
    const isDiagonal = isDiagonalMove(lastCell, currentCell);
    if (!isWithinSelectionThreshold(currentCell, isDiagonal, velocity)) return;
    lastDirectionRef.current = { dx: currentCell.col - lastCell.col, dy: currentCell.row - lastCell.row };
    const existingIndex = selectedCells.findIndex(c => c.row === currentCell.row && c.col === currentCell.col);
    if (existingIndex !== -1) {
      const newSelection = selectedCells.slice(0, existingIndex + 1);
      if (newSelection.length !== selectedCells.length) {
        setSelectedCells(newSelection);
        vibrateBacktrack(fireRoundActive);
      }
      return;
    }
    if (isAdjacentCell(lastCell, currentCell)) {
      setSelectedCells([...selectedCells, { row: currentCell.row, col: currentCell.col, letter: currentCell.letter }]);
      vibrateCellDrag(fireRoundActive);
    }
  }, [selectedCells, setSelectedCells, fireRoundActive, getCellAtPos]);

  const handleTouchMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!interactive || !isTouchingRef.current) return;
    if (isScrollGestureRef.current) return;
    const touch = 'touches' in e ? e.touches[0] : e;
    if (!touch) return;
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    if (!hasMovedRef.current) {
      const deltaX = Math.abs(touchX - startPosRef.current.x);
      const deltaY = Math.abs(touchY - startPosRef.current.y);
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (totalMovement >= getDeadzoneThreshold()) {
        if (deltaY > deltaX * 1.5 && selectedCells.length === 0) {
          isScrollGestureRef.current = true;
          return;
        }
        if ('cancelable' in e && e.cancelable) e.preventDefault();
      }
    } else {
      if ('cancelable' in e && e.cancelable) e.preventDefault();
    }
    if (performanceConfig.isLowEnd) {
      pendingTouchRef.current = { x: touchX, y: touchY };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const pending = pendingTouchRef.current;
          if (pending && isTouchingRef.current) processTouchMove(pending.x, pending.y);
          pendingTouchRef.current = null;
        });
      }
    } else {
      processTouchMove(touchX, touchY);
    }
  }, [interactive, performanceConfig.isLowEnd, processTouchMove, selectedCells.length]);

  const handleTouchEnd = useCallback(() => {
    if (!interactive || !isTouchingRef.current) return;
    isTouchingRef.current = false;
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    setAdjacentCells([]);
    velocityTrackerRef.current.reset();
    lastDirectionRef.current = null;
    startCellRef.current = null;
    if (selectedCells.length > 0 && (hasMovedRef.current || selectedCells.length >= 2)) {
      const formedWord = selectedCells.map(c => c.letter).join('');
      if (onPathSubmit) onPathSubmit([...selectedCells]);
      if (onWordSubmit) onWordSubmit(formedWord);
      vibrateWordSubmit(selectedCells.length, comboLevel, fireRoundActive);
      if (comboLevel > 0) {
        startSequentialFadeOut(true);
      } else {
        setTimeout(() => setSelectedCells([]), 500);
      }
    } else {
      if (selectedCells.length === 1 && !hasMovedRef.current && isTouchDeviceRef.current && onSingleTapDetected) {
        const cell = selectedCells[0];
        onSingleTapDetected({ row: cell.row, col: cell.col, letter: cell.letter });
      }
      setSelectedCells([]);
    }
    hasMovedRef.current = false;
  }, [interactive, selectedCells, onWordSubmit, onPathSubmit, fireRoundActive, comboLevel, startSequentialFadeOut, setSelectedCells, onSingleTapDetected]);

  // Click-to-select handler for desktop (extracted)
  const handleCellClick = useGridClickHandler({
    selectedCells,
    setSelectedCells,
    submitWord,
    fireRoundActive,
    setIsClickSelectMode,
  });

  const handleMouseDown = useCallback((
    rowIndex: number, colIndex: number, letter: string, event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!isTouchDeviceRef.current) {
      handleCellClick(rowIndex, colIndex, letter);
      if (selectedCells.length === 0 || isClickSelectMode) {
        isTouchingRef.current = true;
        startPosRef.current = { x: event.clientX, y: event.clientY };
        hasMovedRef.current = false;
      }
      return;
    }
    handleTouchStart(rowIndex, colIndex, letter, event);
  }, [handleCellClick, handleTouchStart, selectedCells.length, isClickSelectMode]);

  const pendingMouseRef = useRef<{ x: number; y: number } | null>(null);
  const mouseRafIdRef = useRef<number | null>(null);
  const lastHoveredCellRef = useRef<{ row: number; col: number } | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;

    // Dragging detection runs immediately (cheap)
    if (isTouchingRef.current && !isDraggingRef.current && !isTouchDeviceRef.current) {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (movement > getDeadzoneThreshold()) {
        isDraggingRef.current = true;
        hasMovedRef.current = true;
      }
    }

    // Drag path selection runs immediately (needs low-latency response)
    if (isTouchingRef.current && isDraggingRef.current) {
      const mockEvent = {
        touches: [{ clientX: e.clientX, clientY: e.clientY }],
        cancelable: true,
        preventDefault: () => { }
      } as unknown as TouchEvent;
      handleTouchMove(mockEvent);
    }

    // Hover highlight is throttled via RAF to avoid unnecessary re-renders
    pendingMouseRef.current = { x: e.clientX, y: e.clientY };
    if (mouseRafIdRef.current === null) {
      mouseRafIdRef.current = requestAnimationFrame(() => {
        mouseRafIdRef.current = null;
        const pending = pendingMouseRef.current;
        if (!pending) return;
        const hoveredCellPos = getCellAtPos(pending.x, pending.y);
        const newHovered = hoveredCellPos ? { row: hoveredCellPos.row, col: hoveredCellPos.col } : null;
        const prev = lastHoveredCellRef.current;
        if (newHovered?.row !== prev?.row || newHovered?.col !== prev?.col) {
          lastHoveredCellRef.current = newHovered;
          setHoveredCell(newHovered);
        }
      });
    }
  }, [interactive, getCellAtPos, handleTouchMove]);

  const handleMouseLeave = useCallback(() => setHoveredCell(null), []);

  const handleRightClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.preventDefault();
    if (selectedCells.length > 0) {
      undoLastCell();
    } else if (isClickSelectMode) {
      setIsClickSelectMode(false);
    }
  }, [interactive, selectedCells.length, undoLastCell, isClickSelectMode]);

  const handleDoubleClick = useCallback((rowIndex: number, colIndex: number) => {
    if (!interactive) return;
    const lastCell = selectedCells[selectedCells.length - 1];
    if (lastCell && lastCell.row === rowIndex && lastCell.col === colIndex && selectedCells.length >= 2) {
      submitWord();
    }
  }, [interactive, selectedCells, submitWord]);

  // Keyboard handler (extracted)
  const handleKeyDown = useGridKeyboardHandler({
    grid,
    interactive,
    focusedCell,
    selectedCells,
    comboLevel,
    fireRoundActive,
    language,
    disableLetterKeyInput,
    isTouchingRef,
    isDraggingRef,
    onWordSubmit,
    onPathSubmit,
    setFocusedCell,
    setIsKeyboardMode,
    setSelectedCells,
    startSequentialFadeOut,
  });

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDraggingRef.current) { isDraggingRef.current = false; handleTouchEnd(); }
      isTouchingRef.current = false;
    };
    const handleGlobalTouchEnd = () => {
      if (isTouchingRef.current) handleTouchEnd();
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [handleTouchEnd]);

  useEffect(() => {
    const handleFirstTouch = () => {
      isTouchDeviceRef.current = true;
      window.removeEventListener('touchstart', handleFirstTouch);
    };
    window.addEventListener('touchstart', handleFirstTouch, { passive: true });
    return () => window.removeEventListener('touchstart', handleFirstTouch);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        if (isClickSelectMode && selectedCells.length > 0) {
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

  useEffect(() => {
    const handlePointerDown = () => setIsKeyboardMode(false);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => element.removeEventListener('touchmove', handleTouchMove);
  }, [gridRef, handleTouchMove]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
      if (mouseRafIdRef.current !== null) { cancelAnimationFrame(mouseRafIdRef.current); mouseRafIdRef.current = null; }
    };
  }, []);

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

  return {
    selectedCells,
    fadingCells,
    focusedCell,
    adjacentCells,
    swipeVelocity: velocityTrackerRef.current.getVelocity(),
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
