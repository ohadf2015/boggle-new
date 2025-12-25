'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Word preview
  const formedWord = selectedCells.map((c) => c.letter).join('');

  return (
    <div className={cn('relative', className)}>
      {/* Grid */}
      <div
        ref={gridRef}
        className={cn(
          'grid gap-1 sm:gap-2 mx-auto',
          size === 3 ? 'grid-cols-3 max-w-[280px]' : 'grid-cols-4 max-w-[320px]'
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
                  'relative aspect-square rounded-neo border-3 border-neo-black',
                  'flex items-center justify-center font-bold text-2xl sm:text-3xl',
                  'cursor-pointer select-none touch-none transition-all',
                  'min-h-[60px] min-w-[60px]',
                  isSelected
                    ? 'bg-neo-yellow shadow-hard-sm scale-95'
                    : 'bg-neo-cream shadow-hard',
                  isHint && !isSelected && 'ring-2 ring-neo-pink animate-pulse'
                )}
                onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex)}
                onTouchMove={handleTouchMove}
                onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                whileHover={{ scale: isSelected ? 0.95 : 1.05 }}
                whileTap={{ scale: 0.9 }}
              >
                {letter}

                {/* Selection number indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-neo-pink border-2 border-neo-black rounded-full flex items-center justify-center text-xs font-black shadow-hard-sm"
                    >
                      {selectedIndex + 1}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Word preview */}
      <motion.div
        className="mt-4 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-lg sm:text-xl font-bold text-neo-black">
          {formedWord || '...'  }
        </div>
        <div className="text-sm text-neo-black/60 mt-1">
          {selectedCells.length}/{demoWord.length} letters
        </div>
      </motion.div>

      {/* Success animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-neo-black/10 rounded-neo backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="bg-neo-lime border-4 border-neo-black rounded-neo p-4 sm:p-6 shadow-hard-xl text-center"
            >
              <div className="text-3xl sm:text-4xl font-black text-neo-black mb-2">
                🎉 Perfect!
              </div>
              <div className="text-lg sm:text-xl font-bold text-neo-black">
                You got it!
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MiniGrid;
