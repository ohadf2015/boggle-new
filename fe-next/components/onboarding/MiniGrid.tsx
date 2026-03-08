'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, ArrowUp, ArrowLeft, ArrowRight, ArrowDownLeft, ArrowDownRight, ArrowUpLeft, ArrowUpRight, Hand, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { WordPathTrail } from '@/components/animations/WordPathTrail';

export interface GridPosition {
  row: number;
  col: number;
}

interface SelectedCell extends GridPosition {
  letter: string;
  index: number;
}

// Track cells that should shake (wrong cell tapped)
interface ShakingCell extends GridPosition {
  id: number; // Unique ID for animation key
}

interface MiniGridProps {
  size: 3 | 4;
  letters: string[][];
  demoWord: string;
  demoPath: GridPosition[];
  onDemoComplete: () => void;
  showHints?: boolean;
  autoTrace?: boolean;
  onAutoTraceComplete?: () => void;
  className?: string;
}

// Grid measurement cache to avoid layout thrashing during touch
interface GridMeasurements {
  gridRect: DOMRect;
  cellWidth: number;
  cellHeight: number;
  gridPaddingLeft: number;
  gridPaddingTop: number;
  cellWithGapWidth: number;
  cellWithGapHeight: number;
  timestamp: number;
}

// Get arrow direction from current cell to next cell
const getArrowDirection = (from: GridPosition | null, to: GridPosition): string => {
  if (!from) return 'point'; // First cell - just point at it

  const rowDiff = to.row - from.row;
  const colDiff = to.col - from.col;

  if (rowDiff === 0 && colDiff > 0) return 'right';
  if (rowDiff === 0 && colDiff < 0) return 'left';
  if (rowDiff > 0 && colDiff === 0) return 'down';
  if (rowDiff < 0 && colDiff === 0) return 'up';
  if (rowDiff > 0 && colDiff > 0) return 'down-right';
  if (rowDiff > 0 && colDiff < 0) return 'down-left';
  if (rowDiff < 0 && colDiff > 0) return 'up-right';
  if (rowDiff < 0 && colDiff < 0) return 'up-left';

  return 'point';
};

// Arrow component map
const ArrowComponents: Record<string, LucideIcon> = {
  'right': ArrowRight,
  'left': ArrowLeft,
  'down': ArrowDown,
  'up': ArrowUp,
  'down-right': ArrowDownRight,
  'down-left': ArrowDownLeft,
  'up-right': ArrowUpRight,
  'up-left': ArrowUpLeft,
  'point': ArrowDown, // Default pointing arrow
};

/**
 * MiniGrid - Simplified interactive grid for onboarding demo
 * Users swipe to form a specific word to learn the selection mechanic
 */
const MiniGrid: React.FC<MiniGridProps> = ({
  size,
  letters,
  demoWord,
  demoPath,
  onDemoComplete,
  showHints = true,
  autoTrace = false,
  onAutoTraceComplete,
  className,
}) => {
  const { t } = useLanguage();
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shakingCells, setShakingCells] = useState<ShakingCell[]>([]);
  const shakeIdRef = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridMeasurementsRef = useRef<GridMeasurements | null>(null);
  const isSelectingRef = useRef(false); // Ref for use in event handlers
  const demoCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trail visibility state
  const [hasUserTouched, setHasUserTouched] = useState(false);
  const [hasTimePassed, setHasTimePassed] = useState(false);
  const [showTrail, setShowTrail] = useState(false);

  // Set up 8-second timer for trail visibility
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasTimePassed(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  // Show trail when BOTH conditions are met
  useEffect(() => {
    if (hasUserTouched && hasTimePassed) {
      setShowTrail(true);
    }
  }, [hasUserTouched, hasTimePassed]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (demoCompleteTimeoutRef.current) {
        clearTimeout(demoCompleteTimeoutRef.current);
      }
    };
  }, []);

  // Keep isSelectingRef in sync
  useEffect(() => {
    isSelectingRef.current = isSelecting;
  }, [isSelecting]);

  // Measure grid layout and cache it
  const measureGrid = useCallback((): GridMeasurements | null => {
    if (!gridRef.current) return null;

    const gridRect = gridRef.current.getBoundingClientRect();
    const cols = letters[0]?.length || size;
    const rows = letters.length;

    const firstCell = gridRef.current.querySelector('[data-row="0"][data-col="0"]');
    if (!firstCell) return null;

    const firstCellRect = firstCell.getBoundingClientRect();
    const cellWidth = firstCellRect.width;
    const cellHeight = firstCellRect.height;
    const gridPaddingLeft = firstCellRect.left - gridRect.left;
    const gridPaddingTop = firstCellRect.top - gridRect.top;

    // Calculate gap between cells
    const secondCell = gridRef.current.querySelector('[data-row="0"][data-col="1"]');
    const gapX = secondCell
      ? secondCell.getBoundingClientRect().left - firstCellRect.right
      : 8; // Default gap

    const cellInSecondRow = rows > 1 ? gridRef.current.querySelector('[data-row="1"][data-col="0"]') : null;
    const gapY = cellInSecondRow
      ? cellInSecondRow.getBoundingClientRect().top - firstCellRect.bottom
      : gapX;

    const measurements: GridMeasurements = {
      gridRect,
      cellWidth,
      cellHeight,
      gridPaddingLeft,
      gridPaddingTop,
      cellWithGapWidth: cellWidth + gapX,
      cellWithGapHeight: cellHeight + gapY,
      timestamp: performance.now(),
    };

    gridMeasurementsRef.current = measurements;
    return measurements;
  }, [letters, size]);

  // Get cell at touch position using math (not elementFromPoint which is RTL-sensitive)
  const getCellAtPosition = useCallback((touchX: number, touchY: number): { row: number; col: number } | null => {
    if (!gridRef.current) return null;

    const cols = letters[0]?.length || size;
    const rows = letters.length;

    // Use cached measurements or measure if stale (cache valid for 500ms during active touch)
    let measurements = gridMeasurementsRef.current;
    const now = performance.now();
    if (!measurements || now - measurements.timestamp > 500) {
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

    // Calculate position relative to grid
    const adjustedX = touchX - gridRect.left - gridPaddingLeft;
    const adjustedY = touchY - gridRect.top - gridPaddingTop;

    // Calculate which cell based on position - use simple grid math
    const col = Math.floor(adjustedX / cellWithGapWidth);
    const row = Math.floor(adjustedY / cellWithGapHeight);

    // Bounds check
    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;

    // Simple rectangular bounds check with generous tolerance
    // Accept any touch within the cell area plus half the gap on each side
    const cellStartX = col * cellWithGapWidth;
    const cellStartY = row * cellWithGapHeight;
    const xInCell = adjustedX - cellStartX;
    const yInCell = adjustedY - cellStartY;

    // Very forgiving - accept touches anywhere in the cell's grid space
    // Only reject if clearly outside (negative or beyond cell+gap)
    if (xInCell < -10 || xInCell > cellWithGapWidth + 10) return null;
    if (yInCell < -10 || yInCell > cellWithGapHeight + 10) return null;

    return { row, col };
  }, [letters, size, measureGrid]);

  // Check if a cell is in the selected path
  const isCellSelected = useCallback((row: number, col: number): number | null => {
    const index = selectedCells.findIndex((c) => c.row === row && c.col === col);
    return index >= 0 ? index : null;
  }, [selectedCells]);

  // Check if cells are adjacent (including diagonals)
  const areAdjacent = (cell1: GridPosition, cell2: GridPosition): boolean => {
    const rowDiff = Math.abs(cell1.row - cell2.row);
    const colDiff = Math.abs(cell1.col - cell2.col);
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0);
  };

  // Check if this is the next correct cell in the demo path
  const isNextCorrectCell = useCallback((row: number, col: number): boolean => {
    if (selectedCells.length >= demoPath.length) return false;
    const nextCell = demoPath[selectedCells.length];
    return nextCell.row === row && nextCell.col === col;
  }, [selectedCells, demoPath]);

  // Trigger shake animation on a cell (visual feedback for wrong selection)
  const triggerCellShake = useCallback((row: number, col: number) => {
    shakeIdRef.current += 1;
    const shakeCell: ShakingCell = { row, col, id: shakeIdRef.current };
    setShakingCells(prev => [...prev, shakeCell]);

    // Remove shake after animation completes
    setTimeout(() => {
      setShakingCells(prev => prev.filter(c => c.id !== shakeCell.id));
    }, 500);

    // Haptic feedback for wrong selection
    if (window.navigator?.vibrate) {
      window.navigator.vibrate([30, 20, 30]);
    }
  }, []);

  // Check if a cell is currently shaking
  const isCellShaking = useCallback((row: number, col: number): boolean => {
    return shakingCells.some(c => c.row === row && c.col === col);
  }, [shakingCells]);

  // Handle cell selection
  const selectCell = useCallback(
    (row: number, col: number) => {
      // Don't allow selection if demo is complete
      if (showSuccess) return;

      // Check if already selected
      const selectedIndex = isCellSelected(row, col);
      if (selectedIndex !== null) {
        // If it's the last cell, allow deselection by removing it
        if (selectedIndex === selectedCells.length - 1) {
          setSelectedCells(selectedCells.slice(0, -1));
          // Haptic feedback for backtrack
          if (window.navigator?.vibrate) {
            window.navigator.vibrate(5);
          }
        }
        return;
      }

      // Check adjacency with last selected cell (if any cells are selected)
      if (selectedCells.length > 0) {
        const lastCell = selectedCells[selectedCells.length - 1];
        if (!areAdjacent(lastCell, { row, col })) {
          // Not adjacent - show shake feedback
          triggerCellShake(row, col);
          return;
        }
      }

      // For demo mode, only allow selecting the next correct cell
      if (!isNextCorrectCell(row, col)) {
        // Wrong cell - show shake feedback
        triggerCellShake(row, col);
        return;
      }

      const newCell: SelectedCell = {
        row,
        col,
        letter: letters[row][col],
        index: selectedCells.length,
      };

      const newSelectedCells = [...selectedCells, newCell];
      setSelectedCells(newSelectedCells);

      // Haptic feedback for successful selection
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(12);
      }

      // Check if demo is complete
      if (newSelectedCells.length === demoPath.length) {
        const completedWord = newSelectedCells.map((c) => c.letter).join('');
        if (completedWord === demoWord) {
          setShowSuccess(true);
          // Clear any existing timeout before setting new one
          if (demoCompleteTimeoutRef.current) {
            clearTimeout(demoCompleteTimeoutRef.current);
          }
          demoCompleteTimeoutRef.current = setTimeout(() => {
            onDemoComplete();
          }, 1500);
        }
      }
    },
    [selectedCells, letters, demoPath, demoWord, showSuccess, onDemoComplete, isCellSelected, isNextCorrectCell, triggerCellShake]
  );

  // Touch/Mouse event handlers - cell-level (for direct cell touches)
  const handleCellTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    // CRITICAL: Stop propagation to prevent parent swipe gesture from capturing the event
    e.preventDefault();
    e.stopPropagation();
    setIsSelecting(true);
    isSelectingRef.current = true;
    // Mark that user has touched the board (for trail visibility)
    setHasUserTouched(true);
    // Pre-measure grid for smooth subsequent touches
    measureGrid();
    selectCell(row, col);
  };

  // Grid-level touch start - catches touches anywhere in grid area
  const handleGridTouchStart = useCallback((e: React.TouchEvent) => {
    // CRITICAL: Stop propagation to prevent parent swipe gesture handlers
    e.stopPropagation();

    // Don't double-handle if cell already handled it
    if (isSelectingRef.current) return;

    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    setIsSelecting(true);
    isSelectingRef.current = true;
    // Mark that user has touched the board (for trail visibility)
    setHasUserTouched(true);
    measureGrid();

    const cell = getCellAtPosition(touch.clientX, touch.clientY);
    if (cell) {
      selectCell(cell.row, cell.col);
    }
  }, [getCellAtPosition, selectCell, measureGrid]);

  // Process touch move using mathematical cell detection
  const processTouchMove = useCallback((touchX: number, touchY: number) => {
    if (!isSelectingRef.current) return;

    const cell = getCellAtPosition(touchX, touchY);
    if (cell) {
      selectCell(cell.row, cell.col);
    }
  }, [getCellAtPosition, selectCell]);

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Stop propagation to prevent parent swipe gesture from triggering
    e.stopPropagation();
    setIsSelecting(false);
    isSelectingRef.current = false;
  };

  const handleMouseDown = (row: number, col: number) => {
    setIsSelecting(true);
    isSelectingRef.current = true;
    // Mark that user has touched the board (for trail visibility)
    setHasUserTouched(true);
    measureGrid();
    selectCell(row, col);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelectingRef.current) return;
    processTouchMove(e.clientX, e.clientY);
  }, [processTouchMove]);

  const handleMouseUp = () => {
    setIsSelecting(false);
    isSelectingRef.current = false;
  };

  // Attach touchmove listener with { passive: false } for proper touch handling
  // React's synthetic events are passive by default which can cause issues
  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (!isSelectingRef.current) return;
      // Prevent scrolling while selecting
      if (e.cancelable) e.preventDefault();

      const touch = e.touches[0];
      if (touch) {
        processTouchMove(touch.clientX, touch.clientY);
      }
    };

    element.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    return () => {
      element.removeEventListener('touchmove', handleNativeTouchMove);
    };
  }, [processTouchMove]);

  // Invalidate cache on resize/orientation change
  useEffect(() => {
    const invalidateCache = () => {
      gridMeasurementsRef.current = null;
    };

    window.addEventListener('resize', invalidateCache);
    window.addEventListener('orientationchange', invalidateCache);

    return () => {
      window.removeEventListener('resize', invalidateCache);
      window.removeEventListener('orientationchange', invalidateCache);
    };
  }, []);

  // Auto-trace animation: automatically highlights cells along the demo path
  const [autoTraceIndex, setAutoTraceIndex] = useState(-1);
  useEffect(() => {
    if (!autoTrace) {
      setAutoTraceIndex(-1);
      return;
    }

    // Animate through each cell in the path with delays
    const delayPerCell = Math.floor(2000 / demoPath.length);
    const timers: ReturnType<typeof setTimeout>[] = [];

    demoPath.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setAutoTraceIndex(i);
      }, (i + 1) * delayPerCell));
    });

    // Call onAutoTraceComplete after all cells highlighted
    timers.push(setTimeout(() => {
      onAutoTraceComplete?.();
    }, (demoPath.length + 1) * delayPerCell));

    return () => timers.forEach(clearTimeout);
  }, [autoTrace, demoPath, onAutoTraceComplete]);

  // Calculate which cells should show hint (next correct cell)
  const nextHintCell = useMemo(() => {
    if (!showHints || selectedCells.length >= demoPath.length) return null;
    return demoPath[selectedCells.length];
  }, [showHints, selectedCells, demoPath]);

  // Calculate arrow direction for hint
  const arrowDirection = useMemo(() => {
    if (!nextHintCell) return null;
    const lastSelected = selectedCells.length > 0 ? selectedCells[selectedCells.length - 1] : null;
    return getArrowDirection(lastSelected, nextHintCell);
  }, [nextHintCell, selectedCells]);

  // Get the arrow component for the current direction
  const ArrowIcon = arrowDirection ? ArrowComponents[arrowDirection] : null;

  // Convert selected cells to path points for trail
  const pathPoints = useMemo(() => {
    if (!gridRef.current || selectedCells.length === 0) return [];

    // Use a stable base timestamp derived from the selection count
    const baseTimestamp = selectedCells.length * 1000;

    return selectedCells.map((cell) => {
      const cellElement = gridRef.current?.querySelector(
        `[data-row="${cell.row}"][data-col="${cell.col}"]`
      );
      if (!cellElement) {
        // Fallback to mathematical calculation if element not found (e.g., in tests)
        const measurements = gridMeasurementsRef.current || measureGrid();
        if (!measurements) return null;

        const {
          cellWidth,
          cellHeight,
          gridPaddingLeft,
          gridPaddingTop,
          cellWithGapWidth,
          cellWithGapHeight,
        } = measurements;

        return {
          x: gridPaddingLeft + cell.col * cellWithGapWidth + cellWidth / 2,
          y: gridPaddingTop + cell.row * cellWithGapHeight + cellHeight / 2,
          timestamp: baseTimestamp + cell.index * 100,
        };
      }

      const rect = cellElement.getBoundingClientRect();
      const gridRect = gridRef.current?.getBoundingClientRect();
      if (!gridRect) return null;

      return {
        x: rect.left + rect.width / 2 - gridRect.left,
        y: rect.top + rect.height / 2 - gridRect.top,
        timestamp: baseTimestamp + cell.index * 100, // Stagger timestamps
      };
    }).filter((p): p is { x: number; y: number; timestamp: number } => p !== null);
  }, [selectedCells, measureGrid]);

  return (
    <div className={cn('relative', className)}>
      {/* Grid - always LTR to ensure consistent touch coordinates */}
      <div
        ref={gridRef}
        dir="ltr"
        className={cn(
          'grid gap-2 sm:gap-3 mx-auto relative',
          // Increased container sizes to accommodate larger touch targets
          size === 3 ? 'grid-cols-3 max-w-[280px] sm:max-w-[340px]' : 'grid-cols-4 max-w-[360px] sm:max-w-[420px]'
        )}
        style={{ touchAction: 'none' }} // Prevent browser default touch behaviors (scroll, zoom)
        onTouchStart={handleGridTouchStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchEnd={handleTouchEnd}
      >
        {letters.map((row, rowIndex) =>
          row.map((letter, colIndex) => {
            const selectedIndex = isCellSelected(rowIndex, colIndex);
            const isSelected = selectedIndex !== null;
            const isHint =
              nextHintCell?.row === rowIndex && nextHintCell?.col === colIndex;
            const isShaking = isCellShaking(rowIndex, colIndex);

            // Determine animation state: shaking > hint pulse > static
            const getAnimateState = () => {
              if (isShaking) {
                // Shake animation for wrong cell tap
                return {
                  x: [0, -8, 8, -6, 6, -4, 4, 0],
                  backgroundColor: ['rgb(255,107,107)', 'rgb(255,230,230)', 'rgb(255,107,107)'],
                };
              }
              // First cell gets extra prominent yellow pulse
              if (isHint && !isSelected && selectedCells.length === 0) {
                return {
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    '0 0 30px rgba(255,225,53,0.8), 0 0 60px rgba(255,225,53,0.5)',
                    '0 0 50px rgba(255,225,53,1), 0 0 80px rgba(255,225,53,0.7)',
                    '0 0 30px rgba(255,225,53,0.8), 0 0 60px rgba(255,225,53,0.5)',
                  ],
                };
              }
              // Subsequent hint cells get lime pulse
              if (isHint && !isSelected && selectedCells.length > 0) {
                return {
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    '0 0 20px rgba(132,204,22,0.6), 0 0 40px rgba(132,204,22,0.3)',
                    '0 0 30px rgba(132,204,22,0.8), 0 0 60px rgba(132,204,22,0.5)',
                    '0 0 20px rgba(132,204,22,0.6), 0 0 40px rgba(132,204,22,0.3)',
                  ],
                };
              }
              return {};
            };

            const getTransition = () => {
              if (isShaking) {
                return { duration: 0.4, ease: 'easeInOut' as const };
              }
              if (isHint && !isSelected) {
                return { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const };
              }
              return {};
            };

            return (
              <motion.div
                key={`${rowIndex}-${colIndex}`}
                data-row={rowIndex}
                data-col={colIndex}
                className={cn(
                  'relative aspect-square rounded-neo border-3 sm:border-4 border-neo-black',
                  'flex items-center justify-center font-black text-2xl sm:text-3xl text-neo-black',
                  'cursor-pointer select-none touch-none transition-colors',
                  // Larger touch targets for better mobile interaction (was 65px/80px)
                  'min-h-[80px] min-w-[80px] sm:min-h-[95px] sm:min-w-[95px]',
                  isSelected
                    ? 'bg-neo-lime shadow-hard-sm scale-95'
                    : 'letter-tile-gradient-cream shadow-hard-sm sm:shadow-hard',
                  // Extra prominent glow for FIRST cell - bright yellow to grab attention
                  isHint && !isSelected && selectedCells.length === 0 && 'ring-4 ring-neo-yellow bg-neo-yellow/20 shadow-[0_0_30px_rgba(255,225,53,0.8),0_0_60px_rgba(255,225,53,0.5)]',
                  // Enhanced glow for subsequent hint cells - bright lime green
                  isHint && !isSelected && selectedCells.length > 0 && 'ring-4 ring-neo-lime shadow-[0_0_20px_rgba(132,204,22,0.6),0_0_40px_rgba(132,204,22,0.3)]',
                  // Red border flash for wrong cell
                  isShaking && 'border-neo-red'
                )}
                onTouchStart={(e) => handleCellTouchStart(e, rowIndex, colIndex)}
                onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                whileHover={{ scale: isSelected ? 0.95 : 1.08 }}
                whileTap={{ scale: 0.9 }}
                animate={getAnimateState()}
                transition={getTransition()}
              >
                {letter}

                {/* Selection number indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-2 -right-2 sm:-top-2.5 sm:-right-2.5 w-6 h-6 sm:w-7 sm:h-7 bg-neo-lime border-2 border-neo-black rounded-full flex items-center justify-center text-xs sm:text-sm font-black shadow-hard-sm"
                    >
                      {selectedIndex + 1}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* START HERE indicator for first cell */}
                <AnimatePresence>
                  {isHint && !isSelected && selectedCells.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        scale: [1, 1.05, 1],
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        scale: {
                          duration: 1.2,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }
                      }}
                      className="absolute -top-12 sm:-top-14 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap"
                    >
                      <div className="bg-neo-yellow text-neo-black border-3 border-neo-black rounded-neo px-3 py-1.5 sm:px-4 sm:py-2 shadow-hard flex items-center gap-1.5">
                        <Hand className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" strokeWidth={2.5} />
                        <span className="font-black text-xs sm:text-sm uppercase tracking-wide">
                          {t('onboarding.welcome.startHere')}
                        </span>
                      </div>
                      {/* Arrow pointing down to the cell */}
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-neo-black" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Animated arrow pointing at hint cell (for non-first cells) */}
                <AnimatePresence>
                  {isHint && !isSelected && selectedCells.length > 0 && ArrowIcon && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{
                        opacity: 1,
                        y: [0, -8, 0],
                      }}
                      exit={{ opacity: 0 }}
                      transition={{
                        y: {
                          duration: 0.8,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }
                      }}
                      className="absolute -top-8 sm:-top-10 left-1/2 -translate-x-1/2 z-10"
                    >
                      <div className="bg-neo-lime text-neo-black border-2 border-neo-black rounded-full p-1.5 sm:p-2 shadow-hard">
                        <ArrowIcon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={3} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Word preview - shows current progress, always LTR for English letters */}
      <motion.div
        className="mt-4 sm:mt-6 text-center"
        dir="ltr"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="inline-flex items-center gap-1 bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard">
          {demoWord.split('').map((targetLetter, i) => (
            <motion.span
              key={i}
              className={cn(
                'w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md border-2 border-neo-black font-black text-lg sm:text-xl',
                i < selectedCells.length
                  ? 'bg-neo-lime text-neo-black'
                  : 'bg-neo-black/10 text-neo-black/30'
              )}
              animate={i < selectedCells.length ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.2 }}
            >
              {i < selectedCells.length ? selectedCells[i].letter : targetLetter}
            </motion.span>
          ))}
        </div>
        <div className="text-xs sm:text-sm text-neo-black/60 mt-2 font-bold">
          {selectedCells.length}/{demoWord.length} letters selected
        </div>
      </motion.div>

      {/* Auto-trace overlay - animated finger trace */}
      {autoTrace && autoTraceIndex >= 0 && (
        <div data-testid="auto-trace-overlay" className="absolute inset-0 pointer-events-none z-10">
          {demoPath.slice(0, autoTraceIndex + 1).map((pos, i) => (
            <motion.div
              key={`trace-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute w-6 h-6 bg-neo-pink rounded-full border-2 border-neo-black"
              style={{
                top: `${(pos.row / letters.length) * 100 + 50 / letters.length}%`,
                left: `${(pos.col / (letters[0]?.length || 3)) * 100 + 50 / (letters[0]?.length || 3)}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>
      )}

      {/* Word trail - shown only after 8 seconds AND user has touched */}
      {showTrail && pathPoints.length >= 2 && (
        <div className="absolute inset-0 pointer-events-none" data-testid="word-path-trail">
          <WordPathTrail
            points={pathPoints}
            isValid={selectedCells.length <= demoPath.length}
            showParticles
            showGlow
          />
        </div>
      )}

      {/* Success animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-neo-black/20 rounded-neo backdrop-blur-sm z-20"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="bg-neo-lime border-4 border-neo-black rounded-neo p-6 sm:p-8 shadow-hard-xl text-center"
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-4xl sm:text-5xl mb-2"
              >
                🎉
              </motion.div>
              <div className="text-2xl sm:text-3xl font-black text-neo-black mb-1">
                {t('onboarding.welcome.demoSuccess')}
              </div>
              <div className="text-sm sm:text-base font-bold text-neo-black/80">
                {t('onboarding.welcome.demoComplete')}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MiniGrid;
