'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, ArrowUp, ArrowLeft, ArrowRight, ArrowDownLeft, ArrowDownRight, ArrowUpLeft, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface GridPosition {
  row: number;
  col: number;
}

interface SelectedCell extends GridPosition {
  letter: string;
  index: number;
}

interface MiniGridProps {
  size: 3 | 4;
  letters: string[][];
  demoWord: string;
  demoPath: GridPosition[];
  onDemoComplete: () => void;
  showHints?: boolean;
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
  className,
}) => {
  const { t } = useLanguage();
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridMeasurementsRef = useRef<GridMeasurements | null>(null);
  const isSelectingRef = useRef(false); // Ref for use in event handlers
  const demoCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        }
        return;
      }

      // For demo mode, only allow selecting the next correct cell
      if (!isNextCorrectCell(row, col)) {
        return;
      }

      // Check adjacency with last selected cell
      if (selectedCells.length > 0) {
        const lastCell = selectedCells[selectedCells.length - 1];
        if (!areAdjacent(lastCell, { row, col })) {
          return;
        }
      }

      const newCell: SelectedCell = {
        row,
        col,
        letter: letters[row][col],
        index: selectedCells.length,
      };

      const newSelectedCells = [...selectedCells, newCell];
      setSelectedCells(newSelectedCells);

      // Check if demo is complete
      if (newSelectedCells.length === demoPath.length) {
        const formedWord = newSelectedCells.map((c) => c.letter).join('');
        if (formedWord === demoWord) {
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
    [selectedCells, letters, demoPath, demoWord, showSuccess, onDemoComplete, isCellSelected, isNextCorrectCell]
  );

  // Touch/Mouse event handlers - cell-level (for direct cell touches)
  const handleCellTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelecting(true);
    isSelectingRef.current = true;
    // Pre-measure grid for smooth subsequent touches
    measureGrid();
    selectCell(row, col);
  };

  // Grid-level touch start - catches touches anywhere in grid area
  const handleGridTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't double-handle if cell already handled it
    if (isSelectingRef.current) return;

    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    setIsSelecting(true);
    isSelectingRef.current = true;
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

  const handleTouchEnd = () => {
    setIsSelecting(false);
    isSelectingRef.current = false;
  };

  const handleMouseDown = (row: number, col: number) => {
    setIsSelecting(true);
    isSelectingRef.current = true;
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

  // Word preview
  const formedWord = selectedCells.map((c) => c.letter).join('');

  // Get the arrow component for the current direction
  const ArrowIcon = arrowDirection ? ArrowComponents[arrowDirection] : null;

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

            return (
              <motion.div
                key={`${rowIndex}-${colIndex}`}
                data-row={rowIndex}
                data-col={colIndex}
                className={cn(
                  'relative aspect-square rounded-neo border-3 sm:border-4 border-neo-black',
                  'flex items-center justify-center font-black text-2xl sm:text-3xl',
                  'cursor-pointer select-none touch-none transition-all',
                  // Larger touch targets for better mobile interaction (was 65px/80px)
                  'min-h-[80px] min-w-[80px] sm:min-h-[95px] sm:min-w-[95px]',
                  isSelected
                    ? 'bg-neo-lime shadow-hard-sm scale-95 text-neo-black'
                    : 'letter-tile-gradient-cream shadow-hard-sm sm:shadow-hard',
                  // Enhanced glow for hint cell - bright lime green
                  isHint && !isSelected && 'ring-4 ring-neo-lime shadow-[0_0_20px_rgba(132,204,22,0.6),0_0_40px_rgba(132,204,22,0.3)]'
                )}
                onTouchStart={(e) => handleCellTouchStart(e, rowIndex, colIndex)}
                onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                whileHover={{ scale: isSelected ? 0.95 : 1.08 }}
                whileTap={{ scale: 0.9 }}
                // Pulse animation for hint cell
                animate={isHint && !isSelected ? {
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    '0 0 20px rgba(132,204,22,0.6), 0 0 40px rgba(132,204,22,0.3)',
                    '0 0 30px rgba(132,204,22,0.8), 0 0 60px rgba(132,204,22,0.5)',
                    '0 0 20px rgba(132,204,22,0.6), 0 0 40px rgba(132,204,22,0.3)',
                  ]
                } : {}}
                transition={isHint && !isSelected ? {
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                } : {}}
              >
                {letter}

                {/* Selection number indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-2 -right-2 sm:-top-2.5 sm:-right-2.5 w-6 h-6 sm:w-7 sm:h-7 bg-neo-yellow border-2 border-neo-black rounded-full flex items-center justify-center text-xs sm:text-sm font-black shadow-hard-sm"
                    >
                      {selectedIndex + 1}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Animated arrow pointing at hint cell */}
                <AnimatePresence>
                  {isHint && !isSelected && ArrowIcon && (
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
                      <div className="bg-neo-lime border-2 border-neo-black rounded-full p-1.5 sm:p-2 shadow-hard">
                        <ArrowIcon className="w-4 h-4 sm:w-5 sm:h-5 text-neo-black" strokeWidth={3} />
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
