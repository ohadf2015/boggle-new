import React, { useRef } from 'react';
import SlotMachineCell from './SlotMachineCell';
import { cn } from '../lib/utils';
import type { Language, LetterGrid, GridPosition } from '@/types';
import 'animate.css';

// Pre-generate duration variations for cells using seeded values (deterministic)
// Using a simple seeded approach to avoid SSR/client mismatch
const DURATION_VARIATIONS = (() => {
  const variations: number[][] = [];
  for (let r = 0; r < 20; r++) {
    variations[r] = [];
    for (let c = 0; c < 20; c++) {
      // Use deterministic pseudo-random based on position
      const seed = (r * 20 + c) * 17 % 150;
      variations[r][c] = seed;
    }
  }
  return variations;
})();

// Pre-generate random delays for 'random' pattern using seeded values
const RANDOM_DELAYS = (() => {
  const delays: number[][] = [];
  for (let r = 0; r < 20; r++) {
    delays[r] = [];
    for (let c = 0; c < 20; c++) {
      // Use deterministic pseudo-random based on position
      const seed = ((r * 20 + c) * 31 + 7) % 400;
      delays[r][c] = seed;
    }
  }
  return delays;
})();

type AnimationPattern = 'cascade' | 'random' | 'columns' | 'rows' | 'spiral' | 'center-out';

interface SlotMachineGridProps {
  grid: LetterGrid;
  highlightedCells?: GridPosition[] | [number, number][];
  language?: Language;
  className?: string;
  animationDuration?: number;
  staggerDelay?: number;
  animationPattern?: AnimationPattern;
}

/**
 * SlotMachineGrid - A grid of letters with casino slot machine animation
 * Used in the waiting room to display shuffling letters with visual flair
 *
 * The animation works by keeping stable cell keys, so when letters change
 * the SlotMachineCell detects the change and triggers the slot machine spin effect.
 */
const SlotMachineGrid: React.FC<SlotMachineGridProps> = ({
  grid,
  highlightedCells = [],
  language = 'en',
  className,
  animationDuration = 800,
  staggerDelay = 40,
  animationPattern = 'cascade'
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  // Calculate delay for each cell based on animation pattern
  const getCellDelay = (rowIndex: number, colIndex: number, totalRows: number, totalCols: number): number => {
    switch (animationPattern) {
      case 'cascade':
        // Diagonal cascade from top-left to bottom-right
        return (rowIndex + colIndex) * staggerDelay;

      case 'columns':
        // Column by column, left to right
        return colIndex * staggerDelay * 2 + rowIndex * (staggerDelay / 2);

      case 'rows':
        // Row by row, top to bottom
        return rowIndex * staggerDelay * 2 + colIndex * (staggerDelay / 2);

      case 'random':
        // Use pre-computed random delays
        return RANDOM_DELAYS[rowIndex]?.[colIndex] ?? 0;

      case 'spiral': {
        // Spiral from outside to center
        const centerRow = Math.floor(totalRows / 2);
        const centerCol = Math.floor(totalCols / 2);
        const distance = Math.max(Math.abs(rowIndex - centerRow), Math.abs(colIndex - centerCol));
        const maxDistance = Math.max(centerRow, centerCol);
        return (maxDistance - distance) * staggerDelay * 2;
      }

      case 'center-out': {
        // From center outward
        const cRow = Math.floor(totalRows / 2);
        const cCol = Math.floor(totalCols / 2);
        const dist = Math.abs(rowIndex - cRow) + Math.abs(colIndex - cCol);
        return dist * staggerDelay;
      }

      default:
        return (rowIndex + colIndex) * staggerDelay;
    }
  };

  // Get duration variation for a cell
  const getDurationVariation = (row: number, col: number): number => DURATION_VARIATIONS[row]?.[col] ?? 0;

  // Check if a cell is highlighted
  const isCellHighlighted = (rowIndex: number, colIndex: number): boolean => {
    return highlightedCells.some(cell => {
      if ('row' in cell && 'col' in cell) {
        return cell.row === rowIndex && cell.col === colIndex;
      }
      return Array.isArray(cell) && cell[0] === rowIndex && cell[1] === colIndex;
    });
  };

  if (!grid || grid.length === 0) {
    return null;
  }

  const totalRows = grid.length;
  const totalCols = grid[0]?.length || 0;
  const isLargeGrid = totalCols > 8;

  return (
    // NEO-BRUTALIST: Clipboard frame wrapper with tilt
    <div
      className="game-board-frame relative w-full max-w-full"
      style={{ transform: 'rotate(-2deg)' }}
    >
      {/* Clipboard clip decoration */}
      <div className="clipboard-clip" />

      {/* Inner grid */}
      <div
        ref={gridRef}
        className={cn(
          "grid select-none relative rounded-neo p-2 sm:p-3 md:p-4 aspect-square w-full max-w-full md:max-w-[min(90vh,880px)]",
          isLargeGrid ? "gap-1 sm:gap-1" : "gap-1 sm:gap-1.5",
          // NEO-BRUTALIST: Cream paper background
          "bg-neo-cream border-2 border-neo-black/20",
          className
        )}
        style={{
          gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`,
          backgroundImage: 'var(--halftone-pattern)',
          backgroundColor: 'var(--neo-cream)',
          // Set responsive font size based on grid size using CSS calc
          // Formula: Each cell is (100% / gridSize), font should be ~50% of that
          '--cell-font-size': `calc((100cqw / ${totalCols}) * 0.50)`,
          // Enable container query units
          containerType: 'size',
        } as React.CSSProperties}
      >
      {grid.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const isHighlighted = isCellHighlighted(rowIndex, colIndex);
          const cellDelay = getCellDelay(rowIndex, colIndex, totalRows, totalCols);

          return (
            <SlotMachineCell
              key={`cell-${rowIndex}-${colIndex}`}
              letter={cell}
              delay={cellDelay}
              duration={animationDuration + getDurationVariation(rowIndex, colIndex)}
              language={language}
              isHighlighted={isHighlighted}
              size={isLargeGrid ? 'small' : 'normal'}
            />
          );
        })
      )}
      </div>
    </div>
  );
};

export default SlotMachineGrid;
