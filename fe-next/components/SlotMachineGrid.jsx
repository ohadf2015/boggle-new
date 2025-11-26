import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import SlotMachineCell from './SlotMachineCell';
import { cn } from '../lib/utils';

/**
 * SlotMachineGrid - A grid of letters with casino slot machine animation
 * Used in the waiting room to display shuffling letters with visual flair
 */
const SlotMachineGrid = ({
  grid,
  highlightedCells = [],
  language = 'en',
  className,
  animationDuration = 800,
  staggerDelay = 50,
  animationPattern = 'cascade' // 'cascade', 'random', 'columns', 'rows'
}) => {
  const [previousGrid, setPreviousGrid] = useState(null);
  const [animationKey, setAnimationKey] = useState(0);
  const gridRef = useRef(null);

  // Detect grid changes and trigger animation
  useEffect(() => {
    if (grid && previousGrid) {
      // Check if grid actually changed
      const gridChanged = JSON.stringify(grid) !== JSON.stringify(previousGrid);
      if (gridChanged) {
        setAnimationKey(prev => prev + 1);
      }
    }
    setPreviousGrid(grid);
  }, [grid]);

  // Calculate delay for each cell based on animation pattern
  const getCellDelay = (rowIndex, colIndex, totalRows, totalCols) => {
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
        // Random delays for chaotic slot machine feel
        return Math.random() * (totalRows * totalCols * staggerDelay * 0.5);

      case 'spiral':
        // Spiral from outside to center
        const centerRow = Math.floor(totalRows / 2);
        const centerCol = Math.floor(totalCols / 2);
        const distance = Math.max(Math.abs(rowIndex - centerRow), Math.abs(colIndex - centerCol));
        const maxDistance = Math.max(centerRow, centerCol);
        return (maxDistance - distance) * staggerDelay * 2;

      case 'center-out':
        // From center outward
        const cRow = Math.floor(totalRows / 2);
        const cCol = Math.floor(totalCols / 2);
        const dist = Math.abs(rowIndex - cRow) + Math.abs(colIndex - cCol);
        return dist * staggerDelay;

      default:
        return (rowIndex + colIndex) * staggerDelay;
    }
  };

  // Check if a cell is highlighted
  const isCellHighlighted = (rowIndex, colIndex) => {
    return highlightedCells.some(cell =>
      (cell.row === rowIndex && cell.col === colIndex) ||
      (Array.isArray(cell) && cell[0] === rowIndex && cell[1] === colIndex)
    );
  };

  if (!grid || grid.length === 0) {
    return null;
  }

  const totalRows = grid.length;
  const totalCols = grid[0]?.length || 0;
  const isLargeGrid = totalCols > 8;

  return (
    <motion.div
      ref={gridRef}
      className={cn(
        "grid touch-none select-none relative rounded-2xl p-2 sm:p-3 md:p-4 aspect-square w-full max-w-[min(90vh,90vw)]",
        isLargeGrid ? "gap-0.5 sm:gap-1" : "gap-1 sm:gap-1.5",
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
        boxShadow: '0 0 60px rgba(6, 182, 212, 0.4), inset 0 0 40px rgba(6, 182, 212, 0.1)'
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Decorative frame lines (casino slot machine style) */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          border: '3px solid rgba(6, 182, 212, 0.3)',
          boxShadow: 'inset 0 0 30px rgba(6, 182, 212, 0.1)'
        }}
      />

      {/* Top highlight bar */}
      <div
        className="absolute top-0 left-4 right-4 h-1 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.5), transparent)',
          borderRadius: '0 0 4px 4px'
        }}
      />

      {/* Bottom highlight bar */}
      <div
        className="absolute bottom-0 left-4 right-4 h-1 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
          borderRadius: '4px 4px 0 0'
        }}
      />

      {grid.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const isHighlighted = isCellHighlighted(rowIndex, colIndex);
          const cellDelay = getCellDelay(rowIndex, colIndex, totalRows, totalCols);

          return (
            <SlotMachineCell
              key={`${rowIndex}-${colIndex}-${animationKey}`}
              letter={cell}
              delay={cellDelay}
              duration={animationDuration + Math.random() * 200}
              language={language}
              isHighlighted={isHighlighted}
              size={isLargeGrid ? 'small' : 'normal'}
            />
          );
        })
      )}

      {/* Ambient glow effect when grid changes */}
      <motion.div
        key={`glow-${animationKey}`}
        className="absolute inset-0 pointer-events-none rounded-2xl"
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.5 }}
        style={{
          background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.2), transparent 70%)'
        }}
      />
    </motion.div>
  );
};

export default SlotMachineGrid;
