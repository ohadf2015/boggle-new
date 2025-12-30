'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, ArrowUp, ArrowLeft, ArrowRight, ArrowDownLeft, ArrowDownRight, ArrowUpLeft, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Get cell element from row/col
  const getCellElement = (row: number, col: number): HTMLElement | null => {
    if (!gridRef.current) return null;
    return gridRef.current.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  };

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
          setTimeout(() => {
            onDemoComplete();
          }, 1500);
        }
      }
    },
    [selectedCells, letters, demoPath, demoWord, showSuccess, onDemoComplete, isCellSelected, isNextCorrectCell]
  );

  // Touch/Mouse event handlers
  const handleTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    e.preventDefault();
    setIsSelecting(true);
    selectCell(row, col);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSelecting) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element?.hasAttribute('data-row')) {
      const row = parseInt(element.getAttribute('data-row')!);
      const col = parseInt(element.getAttribute('data-col')!);
      selectCell(row, col);
    }
  };

  const handleTouchEnd = () => {
    setIsSelecting(false);
  };

  const handleMouseDown = (row: number, col: number) => {
    setIsSelecting(true);
    selectCell(row, col);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isSelecting) {
      selectCell(row, col);
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

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

  // Calculate cell positions for connection lines
  const [cellPositions, setCellPositions] = useState<Map<string, DOMRect>>(new Map());

  useEffect(() => {
    if (!gridRef.current) return;

    const updatePositions = () => {
      const positions = new Map<string, DOMRect>();
      for (let row = 0; row < letters.length; row++) {
        for (let col = 0; col < letters[row].length; col++) {
          const cell = gridRef.current?.querySelector(`[data-row="${row}"][data-col="${col}"]`);
          if (cell) {
            positions.set(`${row}-${col}`, cell.getBoundingClientRect());
          }
        }
      }
      setCellPositions(positions);
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [letters]);

  // Get the arrow component for the current direction
  const ArrowIcon = arrowDirection ? ArrowComponents[arrowDirection] : null;

  return (
    <div className={cn('relative', className)}>
      {/* Grid */}
      <div
        ref={gridRef}
        className={cn(
          'grid gap-2 sm:gap-3 mx-auto relative',
          size === 3 ? 'grid-cols-3 max-w-[260px] sm:max-w-[320px]' : 'grid-cols-4 max-w-[320px] sm:max-w-[380px]'
        )}
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
                  'min-h-[65px] min-w-[65px] sm:min-h-[80px] sm:min-w-[80px]',
                  isSelected
                    ? 'bg-neo-lime shadow-hard-sm scale-95 text-neo-black'
                    : 'bg-neo-cream shadow-hard-sm sm:shadow-hard',
                  // Enhanced glow for hint cell - bright lime green
                  isHint && !isSelected && 'ring-4 ring-neo-lime shadow-[0_0_20px_rgba(132,204,22,0.6),0_0_40px_rgba(132,204,22,0.3)]'
                )}
                onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex)}
                onTouchMove={handleTouchMove}
                onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
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

      {/* Word preview - shows current progress */}
      <motion.div
        className="mt-4 sm:mt-6 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="inline-flex items-center gap-1 bg-neo-cream border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard">
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
                Perfect!
              </div>
              <div className="text-sm sm:text-base font-bold text-neo-black/80">
                You got it! Now you know how to play.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MiniGrid;
