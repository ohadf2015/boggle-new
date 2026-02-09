'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Bomb, Rainbow } from 'lucide-react';
import type { BlastTileState } from './types';

interface BlastTileOverlayProps {
  tileStates: BlastTileState[][];
  gridSize: number;
  /** Container dimensions for positioning */
  containerWidth: number;
}

/** Badge colors per tile type */
const TILE_BADGE_STYLES: Record<string, { bg: string; icon: React.ReactNode; glow: string }> = {
  gold: {
    bg: 'bg-yellow-400 border-yellow-600',
    icon: <Gem className="w-3 h-3 text-yellow-800" />,
    glow: '0 0 8px rgba(255, 215, 0, 0.6)',
  },
  bomb: {
    bg: 'bg-red-500 border-red-700',
    icon: <Bomb className="w-3 h-3 text-white" />,
    glow: '0 0 8px rgba(255, 0, 0, 0.6)',
  },
  rainbow: {
    bg: 'bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 border-purple-500',
    icon: <Rainbow className="w-3 h-3 text-white" />,
    glow: '0 0 8px rgba(168, 85, 247, 0.6)',
  },
};

/**
 * BlastTileOverlay - Renders special tile badges and clear animations
 * over the GridComponent. Positioned absolutely to not affect grid layout.
 */
export function BlastTileOverlay({
  tileStates,
  gridSize,
  containerWidth,
}: BlastTileOverlayProps) {
  const cellSize = containerWidth / gridSize;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <AnimatePresence mode="sync">
        {tileStates.flat().map(tile => {
          const style = TILE_BADGE_STYLES[tile.type];
          if (!style || tile.type === 'standard') return null;

          const x = tile.col * cellSize;
          const y = tile.row * cellSize;

          // Don't render badge for cleared tiles (show clear animation instead)
          if (tile.isCleared) {
            return (
              <motion.div
                key={`clear-${tile.row}-${tile.col}`}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 0, opacity: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 15,
                  duration: 0.4,
                }}
                className="absolute"
                style={{
                  left: x + cellSize * 0.1,
                  top: y + cellSize * 0.1,
                  width: cellSize * 0.8,
                  height: cellSize * 0.8,
                }}
              >
                <div className="w-full h-full rounded-full bg-white/30" />
              </motion.div>
            );
          }

          // Render special tile badge
          return (
            <motion.div
              key={`badge-${tile.row}-${tile.col}`}
              initial={{ scale: 0, rotate: -30 }}
              animate={{
                scale: 1,
                rotate: 0,
              }}
              exit={{
                scale: 2,
                opacity: 0,
                rotate: 180,
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 15,
              }}
              className="absolute flex items-center justify-center"
              style={{
                left: x + cellSize * 0.6,
                top: y,
                width: cellSize * 0.4,
                height: cellSize * 0.4,
                zIndex: 20,
              }}
            >
              <div
                className={`
                  flex items-center justify-center
                  w-full h-full rounded-full
                  border-2 shadow-hard-xs
                  ${style.bg}
                `}
                style={{ boxShadow: style.glow }}
              >
                {style.icon}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Cleared tile dimming overlay */}
      {tileStates.flat()
        .filter(tile => tile.isCleared)
        .map(tile => {
          const x = tile.col * cellSize;
          const y = tile.row * cellSize;
          return (
            <motion.div
              key={`dim-${tile.row}-${tile.col}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="absolute rounded-lg"
              style={{
                left: x + 2,
                top: y + 2,
                width: cellSize - 4,
                height: cellSize - 4,
                background: 'radial-gradient(circle, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%)',
              }}
            />
          );
        })}
    </div>
  );
}
