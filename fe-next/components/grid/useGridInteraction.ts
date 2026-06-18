import { useState, useRef, useEffect, useCallback } from 'react';
import { getDeadzoneThreshold } from '@/utils/consts';
import type { LetterGrid, GridPosition, Language } from '@/types';
import type { CellPosition, SelectedCell } from './types';
import {
  type GridMeasurements,
  isAdjacentCell,
  isDiagonalMove,
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
  vibrateTierTransition,
} from './hapticFeedback';
import { createVelocityTracker } from './velocityTracker';
import { getSelectionEscalation } from './selectionEscalation';
import { useGridKeyboardHandler } from './useGridKeyboardHandler';
import { useGridClickHandler } from './useGridClickHandler';

interface UseGridInteractionProps {
  grid: LetterGrid;
  interactive: boolean;
  comboLevel: number;
  onWordSubmit?: (word: string, meta?: { inputMethod: 'kb' | 'drag' }) => void;
  onPathSubmit?: (cells: SelectedCell[]) => void;
  externalSelectedCells?: SelectedCell[];
  gridRef: React.RefObject<HTMLDivElement | null>;
  fireRoundActive?: boolean;
  onSingleTapDetected?: (cell: { row: number; col: number; letter: string }) => void;
  language?: Language;
  disableLetterKeyInput?: boolean;
  /** Optional filter — return false to prevent a cell from being selected (e.g. ice tiles).
   *  Third arg is the current drag path length (avoids stale React state during drag). */
  cellFilter?: (row: number, col: number, currentPathLength?: number) => boolean;
  /** Optional adjacency override — return true if cell2 is reachable from cell1 (e.g. portal teleportation). */
  isAdjacent?: (cell1: GridPosition, cell2: GridPosition) => boolean;
  /**
   * Desktop-only idle auto-submit. When set (ms), a selection of ≥3 cells that
   * sits unchanged for this long on a non-touch device submits automatically —
   * so click-built words and drag-then-stall don't leave the word stuck
   * (founder report: players thought they had to "click elsewhere" to submit).
   * Undefined = off (multiplayer/daily keep release/tap-to-submit only).
   * Mobile is excluded so a paused finger never fires early.
   */
  autoSubmitIdleMs?: number;
}

interface UseGridInteractionReturn {
  selectedCells: SelectedCell[];
  fadingCells: GridPosition[];
  focusedCell: GridPosition | null;
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
  cellFilter,
  isAdjacent: isAdjacentOverride,
  autoSubmitIdleMs,
}: UseGridInteractionProps): UseGridInteractionReturn {
  const [internalSelectedCells, setInternalSelectedCells] = useState<SelectedCell[]>([]);
  const [fadingCells, setFadingCells] = useState<GridPosition[]>([]);
  const [focusedCell, setFocusedCell] = useState<GridPosition | null>(null);
  const [, setIsKeyboardMode] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<GridPosition | null>(null);
  const [isClickSelectMode, setIsClickSelectMode] = useState(false);
  const isTouchingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const isScrollGestureRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  // Drag selection ref: tracks cells during drag without triggering React re-renders.
  // DOM classes are toggled directly on GridCell elements for instant visual feedback.
  const dragSelectionRef = useRef<SelectedCell[]>([]);
  const startCellRef = useRef<SelectedCell | null>(null);
  const isTouchDeviceRef = useRef(false);
  // Pointer type of the CURRENT interaction (not the device class). Idle
  // auto-submit gates on this — a touch-capable PC (touchscreen laptop / 2-in-1)
  // fires a stray window `touchstart` that flips isTouchDeviceRef forever, which
  // wrongly killed mouse-driven idle auto-submit. This tracks what's actually
  // driving the live selection: real TouchEvent = true, mouse = false.
  const activePointerIsTouchRef = useRef(false);
  const lastDirectionRef = useRef<{ dx: number; dy: number } | null>(null);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Desktop idle auto-submit (autoSubmitIdleMs). Guard prevents a re-arm during
  // the post-submit clear window (submitWord clears selection ~150ms later).
  const idleSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleSubmitGuardRef = useRef(false);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gridMeasurementsRef = useRef<GridMeasurements | null>(null);
  // Map of "row-col" → HTMLElement, built lazily on first lookup and
  // invalidated alongside gridMeasurementsRef when the grid resizes. Avoids a
  // querySelector per drag-step inside toggleDragClass (16+ DOM scans per word
  // on long touch swipes).
  const cellNodeMapRef = useRef<Map<string, HTMLElement> | null>(null);
  const pendingTouchRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  // Track scheduling state separately from id so re-entry detection is
  // robust against synchronous rAF stubs (used in tests).
  const rafScheduledRef = useRef(false);
  const velocityTrackerRef = useRef(createVelocityTracker());
  // Read combo via ref so handler closures stay stable as combo ticks. Without
  // this, every server-driven combo update re-creates processTouchMove +
  // handleTouchEnd + submitWord, which re-runs the useEffect that re-binds the
  // native touchmove listener mid-game.
  const comboLevelRef = useRef(comboLevel);
  useEffect(() => { comboLevelRef.current = comboLevel; }, [comboLevel]);
  const selectedCells = externalSelectedCells || internalSelectedCells;
  const setSelectedCells = externalSelectedCells ? noOp : setInternalSelectedCells;
  // Mirror selectedCells into a ref so submitWord / startSequentialFadeOut /
  // undoLastCell can be stable callbacks (no `selectedCells` in their deps).
  // Without this, selection updates during drag re-create the global mouseup/
  // touchend listeners attached at line 525, costing one rebind per pointer move.
  const selectedCellsRef = useRef(selectedCells);
  useEffect(() => { selectedCellsRef.current = selectedCells; }, [selectedCells]);

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

  // Build (or rebuild) the cell-node map by scanning grid children once.
  const getCellNodeMap = useCallback((): Map<string, HTMLElement> | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    if (cellNodeMapRef.current) return cellNodeMapRef.current;
    const map = new Map<string, HTMLElement>();
    const cells = grid.querySelectorAll<HTMLElement>('[data-row][data-col]');
    cells.forEach((el) => {
      map.set(`${el.dataset.row}-${el.dataset.col}`, el);
    });
    cellNodeMapRef.current = map;
    return map;
  }, [gridRef]);

  // Toggle 'blast-drag-selected' CSS class directly on GridCell DOM elements
  const toggleDragClass = useCallback((row: number, col: number, add: boolean) => {
    const map = getCellNodeMap();
    const el = map?.get(`${row}-${col}`);
    if (el) {
      if (add) el.classList.add('blast-drag-selected');
      else el.classList.remove('blast-drag-selected');
    }
  }, [getCellNodeMap]);

  const clearAllDragClasses = useCallback(() => {
    const map = cellNodeMapRef.current;
    if (map) {
      map.forEach((el) => el.classList.remove('blast-drag-selected'));
      return;
    }
    gridRef.current?.querySelectorAll('.blast-drag-selected').forEach(el => {
      el.classList.remove('blast-drag-selected');
    });
  }, [gridRef]);


  // Track fade timeouts so they can be cancelled when a new selection starts
  const fadeTimerIdsRef = useRef<NodeJS.Timeout[]>([]);
  // Tracks the non-combo post-submit "hold visible 150ms then clear" timer.
  // Cancelled in cancelFadeOut so a quick next-word tap isn't wiped by a
  // stale clear from the previous submission.
  const postSubmitClearRef = useRef<NodeJS.Timeout | null>(null);
  const cancelFadeOut = useCallback(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    if (postSubmitClearRef.current) {
      clearTimeout(postSubmitClearRef.current);
      postSubmitClearRef.current = null;
    }
    fadeTimerIdsRef.current.forEach(id => clearTimeout(id));
    fadeTimerIdsRef.current = [];
    setFadingCells([]);
  }, []);
  // `cellsOverride` lets callers pass an explicit fade source (e.g. handleTouchEnd
  // passes the just-released dragCells). Without override, reads from the
  // selectedCellsRef so this callback stays stable across drag steps.
  const startSequentialFadeOut = useCallback((isCombo = false, cellsOverride?: SelectedCell[]) => {
    const source = cellsOverride ?? selectedCellsRef.current;
    if (source.length === 0) return;
    cancelFadeOut();
    const cellsToFade = [...source];
    setFadingCells(cellsToFade);
    // Reduced delays for snappier desktop feel
    const cellFadeDelay = isCombo ? 80 : 50;
    const initialHold = isCombo ? 200 : 0;
    cellsToFade.forEach((cell, index) => {
      const id = setTimeout(() => {
        setFadingCells(prev => prev.filter(c => !(c.row === cell.row && c.col === cell.col)));
      }, initialHold + index * cellFadeDelay);
      fadeTimerIdsRef.current.push(id);
    });
    const totalDelay = initialHold + cellsToFade.length * cellFadeDelay + (isCombo ? 300 : 100);
    fadeTimeoutRef.current = setTimeout(() => {
      if (!isTouchingRef.current) {
        setSelectedCells([]);
        setFadingCells([]);
      }
      fadeTimeoutRef.current = null;
      fadeTimerIdsRef.current = [];
    }, totalDelay);
  }, [setSelectedCells, cancelFadeOut]);
  const submitWord = useCallback(() => {
    const current = selectedCellsRef.current;
    if (current.length === 0) return;
    const combo = comboLevelRef.current;
    const formedWord = current.map(c => c.letter).join('');
    if (onPathSubmit) onPathSubmit([...current]);
    if (onWordSubmit) onWordSubmit(formedWord, { inputMethod: 'drag' });
    vibrateWordSubmit(current.length, combo, fireRoundActive);
    if (combo > 0) {
      startSequentialFadeOut(true, current);
    } else {
      if (postSubmitClearRef.current) clearTimeout(postSubmitClearRef.current);
      postSubmitClearRef.current = setTimeout(() => {
        postSubmitClearRef.current = null;
        // Skip if user already started a new word — clearing would wipe it.
        if (isTouchingRef.current) return;
        setSelectedCells([]);
      }, 150);
    }
    setIsClickSelectMode(false);
  }, [onWordSubmit, onPathSubmit, fireRoundActive, startSequentialFadeOut, setSelectedCells]);
  const undoLastCell = useCallback(() => {
    const current = selectedCellsRef.current;
    if (current.length > 0) {
      setSelectedCells(current.slice(0, -1));
      vibrateUndo(fireRoundActive);
    }
  }, [setSelectedCells, fireRoundActive]);
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
        // Combo auto-submit is mobile-only ergonomics (finger-still-on-last-tile
        // chain-words). Desktop pauses mid-drag must NOT silently submit — players
        // expect explicit release/double-click. Reported in MP classic.
        if (!activePointerIsTouchRef.current) return;
        if (selectedCells.length >= 3 && isTouchingRef.current) {
          const formedWord = selectedCells.map(c => c.letter).join('');
          if (onPathSubmit) onPathSubmit([...selectedCells]);
          if (onWordSubmit) onWordSubmit(formedWord, { inputMethod: 'drag' });
          startSequentialFadeOut(true, selectedCells);
          isTouchingRef.current = false;
        }
      }, 500);
    }
    return () => {
      if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
    };
  }, [selectedCells, comboLevel, interactive, onWordSubmit, onPathSubmit, startSequentialFadeOut]);
  // Desktop idle auto-submit. Unlike the combo timer above this fires
  // regardless of combo and covers BOTH click-built words (which otherwise
  // only submit via re-click/double-click/click-outside) and drag-then-stall.
  // Re-arms on every selection change, so the player gets the full idle window
  // after their LAST letter. Touch devices are excluded — they submit on
  // finger lift, and an idle timer would fire on a mid-drag pause.
  useEffect(() => {
    if (!interactive || autoSubmitIdleMs == null || activePointerIsTouchRef.current) return;
    if (selectedCells.length < 3) { idleSubmitGuardRef.current = false; return; }
    if (idleSubmitGuardRef.current) return; // already auto-submitted this selection
    idleSubmitTimeoutRef.current = setTimeout(() => {
      if (activePointerIsTouchRef.current) return;
      if (selectedCellsRef.current.length < 3) return;
      idleSubmitGuardRef.current = true;
      submitWord();
      // Reset drag state so a later mouseup (drag-then-stall case) doesn't
      // re-submit the same word via handleTouchEnd reading dragSelectionRef.
      isTouchingRef.current = false;
      isDraggingRef.current = false;
      hasMovedRef.current = false;
      dragSelectionRef.current = [];
      clearAllDragClasses();
    }, autoSubmitIdleMs);
    return () => {
      if (idleSubmitTimeoutRef.current) { clearTimeout(idleSubmitTimeoutRef.current); idleSubmitTimeoutRef.current = null; }
    };
  }, [selectedCells, interactive, autoSubmitIdleMs, submitWord, clearAllDragClasses]);
  const handleTouchStart = useCallback((
    rowIndex: number, colIndex: number, letter: string,
    event: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>
  ) => {
    if (!interactive) return;
    // Tap-last-tile-to-submit on touch (mirrors desktop useGridClickHandler).
    // Without this, mobile players who tap the final tile expecting submit
    // wipe their word — rage-click signal in /en + /es multiplayer
    // (PostHog 14d: 18 rage clicks across 8 sessions).
    {
      const dragCells = dragSelectionRef.current;
      const lastCell = dragCells[dragCells.length - 1];
      if (
        lastCell &&
        lastCell.row === rowIndex &&
        lastCell.col === colIndex &&
        dragCells.length >= 2
      ) {
        submitWord();
        return;
      }
    }
    isTouchingRef.current = true;
    // Real TouchEvent has `touches`; a mouse-routed call (handleMouseDown on a
    // touch-capable device) does not — that distinction drives idle auto-submit.
    activePointerIsTouchRef.current = 'touches' in event;
    hasMovedRef.current = false;
    isScrollGestureRef.current = false;
    // Cancel any in-progress fade-out so player can immediately start selecting
    cancelFadeOut();
    const touch = 'touches' in event ? event.touches?.[0] : event;
    if (!touch) return;
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    velocityTrackerRef.current.start(touch.clientX, touch.clientY);
    lastDirectionRef.current = null;
    startCellRef.current = { row: rowIndex, col: colIndex, letter };
    // Check cell filter — skip if cell is not selectable (e.g. ice tile)
    if (cellFilter && !cellFilter(rowIndex, colIndex, 0)) return;
    // Init drag ref + DOM class (no React re-render during drag)
    const cell = { row: rowIndex, col: colIndex, letter };
    dragSelectionRef.current = [cell];
    // Sync to React state so submitWord/undoLastCell see the initial selection
    setSelectedCells([cell]);
    clearAllDragClasses();
    toggleDragClass(rowIndex, colIndex, true);
    vibrateCellTap(fireRoundActive);
  }, [interactive, fireRoundActive, cancelFadeOut, clearAllDragClasses, toggleDragClass, setSelectedCells, cellFilter, submitWord]);

  const processTouchMove = useCallback((touchX: number, touchY: number) => {
    velocityTrackerRef.current.recordPosition(touchX, touchY);
    const velocity = velocityTrackerRef.current.getVelocity();
    const deltaX = touchX - startPosRef.current.x;
    const deltaY = touchY - startPosRef.current.y;
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (!hasMovedRef.current && totalMovement < getDeadzoneThreshold()) return;
    hasMovedRef.current = true;
    // GridCell/GridCellEffects/GridComponent gate heavy paint (chromatic-
    // aberration filter on the board, blur+glow, particle bursts, WebGL
    // VFXTileEffect, transition strategy) on `isDragging`. The mouse path
    // sets this in handleMouseMove; the touch path is what mobile MP players
    // actually use. Without flipping it here, every per-letter re-render on
    // mobile repaints the full effect stack and stutters after 2+ letters.
    isDraggingRef.current = true;
    const currentCell = getCellAtPos(touchX, touchY);
    if (!currentCell) return;
    // Read from drag ref (no React state dependency during drag)
    const dragCells = dragSelectionRef.current;
    const lastCell = dragCells[dragCells.length - 1];
    if (!lastCell) return;
    if (currentCell.row === lastCell.row && currentCell.col === lastCell.col) return;
    const isDiagonal = isDiagonalMove(lastCell, currentCell);
    if (!isWithinSelectionThreshold(currentCell, isDiagonal, velocity)) return;
    lastDirectionRef.current = { dx: currentCell.col - lastCell.col, dy: currentCell.row - lastCell.row };
    const existingIndex = dragCells.findIndex(c => c.row === currentCell.row && c.col === currentCell.col);
    if (existingIndex !== -1) {
      // Backtrack: remove cells after the existing index, toggle off their DOM classes
      if (existingIndex + 1 < dragCells.length) {
        for (let i = existingIndex + 1; i < dragCells.length; i++) {
          toggleDragClass(dragCells[i].row, dragCells[i].col, false);
        }
        const trimmed = dragCells.slice(0, existingIndex + 1);
        dragSelectionRef.current = trimmed;
        // Sync React state — without this, word preview / combo / escalation
        // hold the stale longer path until next forward step or release.
        setSelectedCells(trimmed);
        vibrateBacktrack(fireRoundActive);
      }
      return;
    }
    const checkAdjacent = isAdjacentOverride ?? isAdjacentCell;
    if (checkAdjacent(lastCell, currentCell)) {
      // Check cell filter — pass current drag length so gem filter uses real-time count
      if (cellFilter && !cellFilter(currentCell.row, currentCell.col, dragCells.length)) return;
      const newCount = dragCells.length + 1;
      const combo = comboLevelRef.current;
      const prevTier = getSelectionEscalation(dragCells.length - 1, dragCells.length, combo).tier;
      const newTier = getSelectionEscalation(dragCells.length, newCount, combo).tier;
      const newCell = { row: currentCell.row, col: currentCell.col, letter: currentCell.letter };
      const newDragCells = [...dragCells, newCell];
      dragSelectionRef.current = newDragCells;
      setSelectedCells(newDragCells);
      toggleDragClass(currentCell.row, currentCell.col, true);
      if (newTier > prevTier) {
        vibrateTierTransition(newTier);
      } else {
        vibrateCellDrag(fireRoundActive, newTier);
      }
    }
  }, [fireRoundActive, getCellAtPos, toggleDragClass, setSelectedCells, cellFilter, isAdjacentOverride]);

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
        if (deltaY > deltaX * 1.5 && dragSelectionRef.current.length === 0) {
          isScrollGestureRef.current = true;
          return;
        }
        if ('cancelable' in e && e.cancelable) e.preventDefault();
      }
    } else {
      if ('cancelable' in e && e.cancelable) e.preventDefault();
    }
    // Always RAF-batch — native pointer/touch events fire 60-120Hz on iOS;
    // coalescing to one process per frame caps GridComponent re-renders to
    // display refresh rate without losing any meaningful selection event.
    pendingTouchRef.current = { x: touchX, y: touchY };
    if (!rafScheduledRef.current) {
      rafScheduledRef.current = true;
      rafIdRef.current = requestAnimationFrame(() => {
        rafScheduledRef.current = false;
        rafIdRef.current = null;
        const pending = pendingTouchRef.current;
        if (pending && isTouchingRef.current) processTouchMove(pending.x, pending.y);
        pendingTouchRef.current = null;
      });
    }
  }, [interactive, processTouchMove]);

  const handleTouchEnd = useCallback(() => {
    if (!interactive || !isTouchingRef.current) return;
    isTouchingRef.current = false;
    isDraggingRef.current = false;
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    velocityTrackerRef.current.reset();
    lastDirectionRef.current = null;
    startCellRef.current = null;
    // Read from drag ref and sync to React state
    const dragCells = dragSelectionRef.current;
    clearAllDragClasses();
    if (dragCells.length > 0 && (hasMovedRef.current || dragCells.length >= 2)) {
      setSelectedCells([...dragCells]);
      const formedWord = dragCells.map(c => c.letter).join('');
      if (onPathSubmit) onPathSubmit([...dragCells]);
      if (onWordSubmit) onWordSubmit(formedWord, { inputMethod: 'drag' });
      const combo = comboLevelRef.current;
      vibrateWordSubmit(dragCells.length, combo, fireRoundActive);
      if (combo > 0) {
        startSequentialFadeOut(true, dragCells);
      } else {
        if (postSubmitClearRef.current) clearTimeout(postSubmitClearRef.current);
        postSubmitClearRef.current = setTimeout(() => {
          postSubmitClearRef.current = null;
          // Skip clear if user already started a new word.
          if (isTouchingRef.current) return;
          setSelectedCells([]);
        }, 150);
      }
    } else {
      if (dragCells.length === 1 && !hasMovedRef.current && onSingleTapDetected) {
        const cell = dragCells[0];
        onSingleTapDetected({ row: cell.row, col: cell.col, letter: cell.letter });
      }
      setSelectedCells([]);
    }
    dragSelectionRef.current = [];
    hasMovedRef.current = false;
  }, [interactive, onWordSubmit, onPathSubmit, fireRoundActive, startSequentialFadeOut, setSelectedCells, onSingleTapDetected, clearAllDragClasses]);

  // Click-to-select handler for desktop (extracted)
  const handleCellClick = useGridClickHandler({
    selectedCells,
    setSelectedCells,
    submitWord,
    fireRoundActive,
    setIsClickSelectMode,
    cellFilter,
  });

  const handleMouseDown = useCallback((
    rowIndex: number, colIndex: number, letter: string, event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!isTouchDeviceRef.current) {
      activePointerIsTouchRef.current = false;
      handleCellClick(rowIndex, colIndex, letter);
      if (selectedCells.length === 0 || isClickSelectMode) {
        isTouchingRef.current = true;
        startPosRef.current = { x: event.clientX, y: event.clientY };
        hasMovedRef.current = false;
        isDraggingRef.current = false;
        // Init drag ref so processTouchMove can read from it during mouse drag
        cancelFadeOut();
        const cell = { row: rowIndex, col: colIndex, letter };
        dragSelectionRef.current = [cell];
        clearAllDragClasses();
        toggleDragClass(rowIndex, colIndex, true);
        velocityTrackerRef.current.start(event.clientX, event.clientY);
      }
      return;
    }
    handleTouchStart(rowIndex, colIndex, letter, event);
  }, [handleCellClick, handleTouchStart, selectedCells.length, isClickSelectMode, cancelFadeOut, clearAllDragClasses, toggleDragClass]);

  const pendingMouseRef = useRef<{ x: number; y: number } | null>(null);
  const mouseRafIdRef = useRef<number | null>(null);
  const lastHoveredCellRef = useRef<{ row: number; col: number } | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;

    // Dragging detection runs immediately (cheap). Gate on the live pointer
    // type, not device class — on a touch-capable PC isTouchDeviceRef flips
    // true after any stray touchstart, which would otherwise freeze mouse-drag
    // selection (it never builds past the first cell → nothing to submit).
    if (isTouchingRef.current && !isDraggingRef.current && !activePointerIsTouchRef.current) {
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

    // Hover highlight is throttled via RAF. Skip entirely during active drag —
    // hover state is meaningless mid-selection, and setHoveredCell would fire
    // ~60Hz parent re-renders on top of the legit drag-state updates.
    if (isTouchingRef.current) return;
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

  // Track isClickSelectMode in a ref so this effect (binds 2 global listeners)
  // doesn't re-run on every selection length change during drag.
  const isClickSelectModeRef = useRef(isClickSelectMode);
  useEffect(() => { isClickSelectModeRef.current = isClickSelectMode; }, [isClickSelectMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        if (isClickSelectModeRef.current && selectedCellsRef.current.length > 0) {
          submitWord();
        } else {
          setIsClickSelectMode(false);
          setSelectedCells([]);
        }
      }
    };
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isClickSelectModeRef.current) {
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
  }, [gridRef, submitWord, setSelectedCells]);

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
      if (postSubmitClearRef.current) { clearTimeout(postSubmitClearRef.current); postSubmitClearRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;
    // Pre-build on mount so first drag hits the fast path (no querySelectorAll on the interaction path).
    const buildCellNodeMap = () => {
      const cells = element.querySelectorAll<HTMLElement>('[data-row][data-col]');
      if (cells.length > 0) {
        const map = new Map<string, HTMLElement>();
        cells.forEach((el) => map.set(`${el.dataset.row}-${el.dataset.col}`, el));
        cellNodeMapRef.current = map;
      }
    };
    buildCellNodeMap();
    const invalidateCache = () => {
      gridMeasurementsRef.current = null;
      cellNodeMapRef.current = null;
    };
    const resizeObserver = new ResizeObserver(invalidateCache);
    resizeObserver.observe(element);
    window.addEventListener('orientationchange', invalidateCache);
    window.addEventListener('resize', invalidateCache);
    // Note: deliberately NOT listening to 'transitionend' here. Every selected
    // cell fires a 90–300ms shadow/background transition; bubbling those into
    // a measurement-cache flush thrashed the cache mid-drag (next pointermove
    // re-measured the grid via getBoundingClientRect on every cell). The
    // ResizeObserver + orientation/resize fallback already covers real layout
    // changes (board entrance animation finishes by triggering ResizeObserver
    // when its final size lands).
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
