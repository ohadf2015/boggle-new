'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { CascadeHighlightData } from './types';

interface BlastCascadeHighlightProps {
  highlightData: CascadeHighlightData | null;
  gridSize: number;
  cellSize: number;
}

/**
 * BlastCascadeHighlight — Grid overlay showing cascade word paths.
 * Renders at z-15 (between tile overlay z-5 and cascade overlay z-20).
 * Each tile in the cascade word path gets a glow pulse + connecting line.
 */
export function BlastCascadeHighlight({
  highlightData,
  cellSize,
}: BlastCascadeHighlightProps) {
  if (!highlightData) return null;

  const inset = 2;

  return (
    <div
      data-testid="cascade-highlight-overlay"
      className="absolute inset-0 pointer-events-none z-[15]"
    >
      <AnimatePresence mode="sync">
        {highlightData.words.map((wordData, wordIdx) => (
          <div key={`word-${wordIdx}`}>
            {/* Connecting line through the word column */}
            {wordData.path.length >= 2 && (
              <motion.div
                data-testid={`cascade-connector-${wordIdx}`}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 0.6 }}
                exit={{ scaleY: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="absolute origin-top"
                style={{
                  left: wordData.path[0].col * cellSize + cellSize / 2 - 1.5,
                  top: wordData.path[0].row * cellSize + cellSize / 2,
                  width: 3,
                  height: (wordData.path[wordData.path.length - 1].row - wordData.path[0].row) * cellSize,
                  background: 'linear-gradient(to bottom, rgba(255,0,255,0.8), rgba(168,85,247,0.6))',
                  borderRadius: 2,
                }}
              />
            )}

            {/* Glow cells for each tile in the path */}
            {wordData.path.map(cell => (
              <motion.div
                key={`glow-${cell.row}-${cell.col}`}
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
                className="absolute rounded-lg"
                style={{
                  left: cell.col * cellSize + inset,
                  top: cell.row * cellSize + inset,
                  width: cellSize - inset * 2,
                  height: cellSize - inset * 2,
                  background: 'radial-gradient(circle, rgba(255,0,255,0.35) 0%, rgba(168,85,247,0.2) 60%, transparent 100%)',
                  border: '2px solid rgba(255,0,255,0.5)',
                  boxShadow: '0 0 12px rgba(255,0,255,0.4), inset 0 0 8px rgba(255,0,255,0.2)',
                }}
              />
            ))}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
