'use client';

/**
 * PracticeGridPreview - Interactive mini-grid for practicing word swiping
 *
 * Shown in the waiting room to let players practice the swipe mechanics
 * before the game starts. Uses a small fixed grid with encouraging feedback.
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RotateCcw, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PracticeGridPreviewProps {
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
}

// Small practice grids (3x3) with simple words to find
const PRACTICE_GRIDS = [
  {
    letters: [
      ['C', 'A', 'T'],
      ['D', 'O', 'G'],
      ['S', 'U', 'N'],
    ],
    words: ['CAT', 'DOG', 'SUN', 'COD', 'SOD', 'TAD', 'NUT', 'GUS'],
  },
  {
    letters: [
      ['P', 'A', 'N'],
      ['E', 'T', 'S'],
      ['R', 'A', 'W'],
    ],
    words: ['PAN', 'PET', 'SAT', 'TAR', 'WAR', 'RAW', 'SEW', 'TAP', 'PAT', 'ATE', 'EAT', 'SET'],
  },
  {
    letters: [
      ['F', 'U', 'N'],
      ['R', 'O', 'T'],
      ['B', 'A', 'T'],
    ],
    words: ['FUN', 'ROT', 'BAT', 'NUT', 'RUN', 'BUT', 'TAB', 'OAT', 'FOR', 'NOT'],
  },
];

interface SelectedCell {
  row: number;
  col: number;
  letter: string;
}

export function PracticeGridPreview({ t, className }: PracticeGridPreviewProps) {
  // Pick a random grid on mount
  const [gridIndex] = useState(() => Math.floor(Math.random() * PRACTICE_GRIDS.length));
  const practiceGrid = PRACTICE_GRIDS[gridIndex];

  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<'valid' | 'invalid' | 'duplicate' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Get formed word from selected cells
  const formedWord = useMemo(
    () => selectedCells.map(c => c.letter).join(''),
    [selectedCells]
  );

  // Check if two cells are adjacent
  const isAdjacent = useCallback((cell1: SelectedCell, cell2: SelectedCell): boolean => {
    const rowDiff = Math.abs(cell1.row - cell2.row);
    const colDiff = Math.abs(cell1.col - cell2.col);
    return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
  }, []);

  // Check if a cell is already selected
  const isCellSelected = useCallback((row: number, col: number): boolean => {
    return selectedCells.some(c => c.row === row && c.col === col);
  }, [selectedCells]);

  // Get cell from touch/mouse position
  const getCellFromPosition = useCallback((clientX: number, clientY: number): SelectedCell | null => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const cellSize = rect.width / 3;
    const col = Math.floor((clientX - rect.left) / cellSize);
    const row = Math.floor((clientY - rect.top) / cellSize);

    if (row < 0 || row > 2 || col < 0 || col > 2) return null;

    return {
      row,
      col,
      letter: practiceGrid.letters[row][col],
    };
  }, [practiceGrid.letters]);

  // Handle start of drag/touch
  const handleStart = useCallback((clientX: number, clientY: number) => {
    const cell = getCellFromPosition(clientX, clientY);
    if (cell) {
      setSelectedCells([cell]);
      setIsDragging(true);
      setLastResult(null);
    }
  }, [getCellFromPosition]);

  // Handle drag/touch move
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;

    const cell = getCellFromPosition(clientX, clientY);
    if (!cell) return;

    // Check if already selected
    if (isCellSelected(cell.row, cell.col)) {
      // Allow backtracking - if it's the second-to-last cell, remove the last one
      if (selectedCells.length >= 2) {
        const secondToLast = selectedCells[selectedCells.length - 2];
        if (secondToLast.row === cell.row && secondToLast.col === cell.col) {
          setSelectedCells(prev => prev.slice(0, -1));
        }
      }
      return;
    }

    // Check if adjacent to the last selected cell
    const lastCell = selectedCells[selectedCells.length - 1];
    if (lastCell && isAdjacent(lastCell, cell)) {
      setSelectedCells(prev => [...prev, cell]);
    }
  }, [isDragging, getCellFromPosition, isCellSelected, selectedCells, isAdjacent]);

  // Handle end of drag/touch
  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (formedWord.length >= 3) {
      // Check if it's a valid word
      const wordUpper = formedWord.toUpperCase();
      if (foundWords.has(wordUpper)) {
        setLastResult('duplicate');
      } else if (practiceGrid.words.includes(wordUpper)) {
        setFoundWords(prev => new Set([...prev, wordUpper]));
        setLastResult('valid');
      } else {
        setLastResult('invalid');
      }
    }

    // Clear selection after a brief delay
    setTimeout(() => {
      setSelectedCells([]);
    }, 300);
  }, [isDragging, formedWord, foundWords, practiceGrid.words]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleMouseLeave = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Reset the practice session
  const handleReset = useCallback(() => {
    setFoundWords(new Set());
    setLastResult(null);
    setSelectedCells([]);
  }, []);

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-neo-pink p-1.5 rounded border-2 border-neo-black text-neo-black">
            <Hand className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold uppercase tracking-wide text-neo-white">
            {t('practice.header') || 'Practice Mode'}
          </span>
        </div>
        <button
          onClick={handleReset}
          className="p-1.5 rounded-neo bg-slate-700/50 hover:bg-slate-700 transition-colors text-neo-cream/70 hover:text-neo-cream"
          title={t('practice.reset') || 'Reset'}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Practice Grid */}
      <div className="bg-slate-700/50 rounded-lg border-2 border-neo-black/30 p-3">
        {/* Instructions */}
        <p className="text-xs text-neo-cream/60 text-center mb-3">
          {t('practice.instructions') || 'Swipe across letters to form words (3+ letters)'}
        </p>

        {/* Grid Container */}
        <div className="flex justify-center">
          <div
            ref={gridRef}
            className="relative w-[180px] h-[180px] grid grid-cols-3 gap-1.5 select-none touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {practiceGrid.letters.map((row, rowIndex) =>
              row.map((letter, colIndex) => {
                const isSelected = isCellSelected(rowIndex, colIndex);
                const selectionIndex = selectedCells.findIndex(
                  c => c.row === rowIndex && c.col === colIndex
                );

                return (
                  <motion.div
                    key={`${rowIndex}-${colIndex}`}
                    animate={isSelected ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={cn(
                      'flex items-center justify-center',
                      'rounded-neo border-3 border-neo-black',
                      'text-2xl font-black uppercase',
                      'transition-colors duration-100',
                      isSelected
                        ? 'bg-neo-cyan text-neo-black shadow-hard-sm'
                        : 'bg-slate-600 text-neo-cream hover:bg-slate-500'
                    )}
                  >
                    {letter}
                    {selectionIndex >= 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-neo-lime text-neo-black text-[10px] font-black rounded-full flex items-center justify-center border border-neo-black">
                        {selectionIndex + 1}
                      </span>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Formed Word Display */}
        <AnimatePresence mode="wait">
          {formedWord.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-3 text-center"
            >
              <span className="px-4 py-1.5 bg-neo-navy rounded-neo border-2 border-neo-cyan text-neo-cyan font-black text-lg uppercase tracking-wider">
                {formedWord}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result feedback */}
        <AnimatePresence mode="wait">
          {lastResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                'mt-3 text-center py-2 rounded-neo border-2 font-bold text-sm',
                lastResult === 'valid'
                  ? 'bg-neo-lime/20 border-neo-lime text-neo-lime'
                  : lastResult === 'duplicate'
                  ? 'bg-neo-yellow/20 border-neo-yellow text-neo-yellow'
                  : 'bg-neo-red/20 border-neo-red text-neo-red'
              )}
            >
              {lastResult === 'valid' && (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t('practice.found') || 'Nice! Word found!'}
                </span>
              )}
              {lastResult === 'duplicate' && (
                t('practice.duplicate') || 'Already found this one!'
              )}
              {lastResult === 'invalid' && (
                t('practice.invalid') || 'Not a word - try again!'
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Found words counter */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-neo-cream/50">
            {t('practice.wordsFound') || 'Words found:'} {foundWords.size}
          </span>
          {foundWords.size > 0 && (
            <div className="flex flex-wrap gap-1 max-w-[150px] justify-end">
              {[...foundWords].slice(-4).map(word => (
                <span
                  key={word}
                  className="px-1.5 py-0.5 bg-neo-lime/20 text-neo-lime text-[10px] font-bold rounded border border-neo-lime/30"
                >
                  {word}
                </span>
              ))}
              {foundWords.size > 4 && (
                <span className="text-neo-cream/40">+{foundWords.size - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PracticeGridPreview;
