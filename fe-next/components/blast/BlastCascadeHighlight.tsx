'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { CascadeHighlightData } from './types';
import { GRID_PADDING, GRID_GAP_CLASS } from '@/components/grid/gridLayoutConstants';

interface BlastCascadeHighlightProps {
  highlightData: CascadeHighlightData | null;
  gridSize: number;
}

/**
 * BlastCascadeHighlight — Grid overlay showing cascade word paths.
 * Renders at z-15 (between tile overlay z-11 and cascade overlay z-20).
 * Uses CSS Grid aligned to GridComponent for pixel-perfect positioning.
 */
export function BlastCascadeHighlight({
  highlightData,
  gridSize,
}: BlastCascadeHighlightProps) {
  if (!highlightData) return null;

  return (
    <div
      dir="ltr"
      data-testid="cascade-highlight-overlay"
      className={`absolute inset-0 pointer-events-none z-[15] grid ${GRID_GAP_CLASS}`}
      style={{
        padding: GRID_PADDING,
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
      }}
    >
      <AnimatePresence mode="sync">
        {highlightData.words.map((wordData, wordIdx) => (
          wordData.path.map(cell => (
            <motion.div
              key={`glow-${wordIdx}-${cell.row}-${cell.col}`}
              data-testid={`cascade-glow-${cell.row}-${cell.col}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0.6, 0.9, 0.6],
                scale: [1, 1.05, 1],
              }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{
                opacity: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="rounded-lg"
              style={{
                gridRow: cell.row + 1,
                gridColumn: cell.col + 1,
                // Warm amber for cascade highlights — distinct from player cyan selection
                background: 'radial-gradient(circle, rgba(255,180,50,0.35) 0%, rgba(255,140,0,0.2) 60%, transparent 100%)',
                border: '2px solid rgba(255,180,50,0.5)',
                boxShadow: '0 0 12px rgba(255,180,50,0.4), inset 0 0 8px rgba(255,140,0,0.2)',
              }}
            />
          ))
        ))}
      </AnimatePresence>
    </div>
  );
}
