'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type WordFeedback = 'none' | 'valid' | 'invalid' | 'duplicate';

interface WordForgeGridProps {
  grid: string[][];
  onWordFound: (word: string) => void;
  bossConstraintId: string | null; // Used by boss constraint UI effects in v2
  checkWord?: (word: string) => boolean; // Dictionary check
}

interface TilePos {
  row: number;
  col: number;
}

/**
 * WordForgeGrid — Interactive Boggle-style letter grid.
 *
 * Players swipe/drag across adjacent tiles to form words.
 * Minimum 3 letters. Tiles can only be used once per word.
 * Adjacent = horizontal, vertical, or diagonal.
 */
export function WordForgeGrid({
  grid,
  onWordFound,
  bossConstraintId,
  checkWord,
}: WordForgeGridProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [path, setPath] = useState<TilePos[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [feedback, setFeedback] = useState<WordFeedback>('none');
  const [validatedPath, setValidatedPath] = useState<TilePos[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validatedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gridSize = grid.length;

  const isAdjacent = (a: TilePos, b: TilePos): boolean => {
    return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
  };

  const isInPath = (row: number, col: number): boolean => {
    return path.some(p => p.row === row && p.col === col);
  };

  const getCurrentWord = (): string => {
    return path.map(p => grid[p.row]?.[p.col] ?? '').join('');
  };

  const handleTileStart = (row: number, col: number) => {
    setIsDragging(true);
    setPath([{ row, col }]);
  };

  const handleTileEnter = (row: number, col: number) => {
    if (!isDragging) return;
    if (isInPath(row, col)) return;

    const last = path[path.length - 1];
    if (!last || !isAdjacent(last, { row, col })) return;

    setPath(prev => [...prev, { row, col }]);
    setRecentlyAdded(`${row}-${col}`);
    setTimeout(() => setRecentlyAdded(null), 200);
  };

  const showFeedback = useCallback((type: WordFeedback) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(type);
    feedbackTimerRef.current = setTimeout(() => setFeedback('none'), 600);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (path.length >= 3) {
      const word = getCurrentWord();
      if (word.length >= 3) {
        if (!checkWord || checkWord(word.toLowerCase())) {
          onWordFound(word);
          showFeedback('valid');
          // Flash validated tiles green
          if (!prefersReducedMotion) {
            setValidatedPath([...path]);
            if (validatedTimerRef.current) clearTimeout(validatedTimerRef.current);
            validatedTimerRef.current = setTimeout(() => setValidatedPath([]), 400);
          }
        } else {
          showFeedback('invalid');
        }
      }
    }
    setPath([]);
    setIsDragging(false);
  }, [path, grid, onWordFound, checkWord, showFeedback, prefersReducedMotion]);

  // Touch handlers for mobile
  const getTileFromTouch = (touch: React.Touch): TilePos | null => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const tileSize = rect.width / gridSize;
    const col = Math.floor(x / tileSize);
    const row = Math.floor(y / tileSize);
    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;
    return { row, col };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const pos = getTileFromTouch(e.touches[0]);
    if (pos) handleTileEnter(pos.row, pos.col);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const pos = getTileFromTouch(e.touches[0]);
    if (pos) handleTileStart(pos.row, pos.col);
  };

  const currentWord = getCurrentWord();

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Current word preview — grows with word length */}
      <div className="h-10 flex items-center justify-center">
        {currentWord.length > 0 && (
          <span className={cn(
            'font-black uppercase font-neo-display tracking-wider px-3 py-1',
            'bg-neo-cream/10 border-2 border-neo-cyan/30 rounded-neo text-neo-cyan',
            currentWord.length >= 3 ? 'opacity-100' : 'opacity-50',
            currentWord.length >= 7 ? 'text-xl' : currentWord.length >= 5 ? 'text-lg' : 'text-base',
          )}>
            {currentWord}
          </span>
        )}
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        className={cn(
          'game-board-frame relative select-none touch-none',
          feedback === 'valid' && 'ring-4 ring-neo-lime/50',
          feedback === 'invalid' && 'motion-safe:animate-neo-shake ring-4 ring-neo-red/50',
        )}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gap: '4px',
          padding: '8px',
        }}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleDragEnd}
      >
        {grid.map((row, ri) =>
          row.map((letter, ci) => {
            const tileKey = `${ri}-${ci}`;
            const inPath = isInPath(ri, ci);
            const pathIndex = path.findIndex(p => p.row === ri && p.col === ci);
            const isLast = pathIndex === path.length - 1 && path.length > 0;
            const isValidated = validatedPath.some(p => p.row === ri && p.col === ci);
            const justAdded = recentlyAdded === tileKey;
            const isShaking = feedback === 'invalid' && inPath;

            return (
              <motion.div
                key={tileKey}
                onMouseDown={() => handleTileStart(ri, ci)}
                onMouseEnter={() => handleTileEnter(ri, ci)}
                animate={
                  prefersReducedMotion
                    ? {}
                    : isValidated
                      ? { scale: [1, 1.15, 1], backgroundColor: 'var(--color-neo-lime, #BFFF00)' }
                      : isShaking
                        ? { x: [0, -3, 3, -2, 2, 0] }
                        : justAdded
                          ? { scale: [0.9, 1.05, 1] }
                          : {}
                }
                transition={{ duration: isValidated ? 0.4 : 0.15 }}
                className={cn(
                  'aspect-square flex items-center justify-center',
                  'border-3 border-neo-black rounded-neo shadow-hard-sm',
                  'text-lg sm:text-xl font-black font-neo-display uppercase',
                  'cursor-pointer select-none',
                  'transition-colors duration-75',
                  isValidated
                    ? 'bg-neo-lime text-neo-black z-10'
                    : inPath
                      ? cn(
                          'bg-neo-cyan text-neo-black scale-110 shadow-hard-cyan z-10',
                          isLast && 'ring-2 ring-neo-cyan/50',
                        )
                      : 'bg-neo-cream text-neo-black hover:bg-neo-cream/80',
                )}
              >
                {letter}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
