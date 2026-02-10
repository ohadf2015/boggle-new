'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { BlastTileState } from './types';

interface BlastTileOverlayProps {
  tileStates: BlastTileState[][];
  gridSize: number;
  containerWidth: number;
}

/**
 * Full-cell background config for each special tile type.
 * These render BEHIND the letter (z-index below GridComponent's cells)
 * to create distinctive visual treatments.
 */
const TILE_BACKGROUNDS: Record<string, {
  background: string;
  border: string;
  shadow: string;
  animationClass: string;
}> = {
  gold: {
    background: 'linear-gradient(135deg, rgba(255,215,0,0.45) 0%, rgba(255,180,0,0.3) 40%, rgba(255,230,80,0.45) 100%)',
    border: '2px solid rgba(255,215,0,0.6)',
    shadow: 'inset 0 0 16px rgba(255,215,0,0.35), 0 0 10px rgba(255,200,0,0.25)',
    animationClass: 'blast-tile-gold',
  },
  bomb: {
    background: 'radial-gradient(circle at 35% 35%, rgba(255,100,60,0.45) 0%, rgba(180,20,0,0.35) 60%, rgba(80,0,0,0.25) 100%)',
    border: '2px solid rgba(255,70,40,0.55)',
    shadow: 'inset 0 0 14px rgba(255,30,0,0.3), 0 0 8px rgba(255,50,20,0.2)',
    animationClass: 'blast-tile-bomb',
  },
  rainbow: {
    background: 'linear-gradient(135deg, rgba(255,100,200,0.4) 0%, rgba(160,80,255,0.4) 33%, rgba(80,200,255,0.4) 66%, rgba(100,255,160,0.4) 100%)',
    border: '2px solid rgba(168,85,247,0.55)',
    shadow: 'inset 0 0 14px rgba(168,85,247,0.25), 0 0 10px rgba(168,85,247,0.2)',
    animationClass: 'blast-tile-rainbow',
  },
};

/**
 * BlastTileOverlay - Full-cell background treatments for special tiles + cleared gap cells.
 * Renders underneath the grid letters as colored overlays with animations.
 * Cleared cells render as dark inset gaps so the board visually "breathes" during cascade.
 */
export function BlastTileOverlay({
  tileStates,
  gridSize,
  containerWidth,
}: BlastTileOverlayProps) {
  const cellSize = containerWidth / gridSize;
  const inset = 2; // Small inset to not cover cell borders

  return (
    <div className="absolute inset-0 pointer-events-none z-[5]">
      <AnimatePresence mode="sync">
        {tileStates.flat().map(tile => {
          const x = tile.col * cellSize;
          const y = tile.row * cellSize;

          // Cleared tile → dark gap cell
          if (tile.isCleared) {
            return (
              <motion.div
                key={`gap-${tile.row}-${tile.col}`}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute rounded-lg"
                style={{
                  left: x + inset,
                  top: y + inset,
                  width: cellSize - inset * 2,
                  height: cellSize - inset * 2,
                  background: 'rgba(10, 10, 30, 0.7)',
                  border: '2px solid rgba(255,255,255,0.05)',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
                }}
              />
            );
          }

          // Standard tile → no overlay
          if (tile.type === 'standard') return null;

          const config = TILE_BACKGROUNDS[tile.type];
          if (!config) return null;

          return (
            <motion.div
              key={`bg-${tile.row}-${tile.col}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
              className={`absolute rounded-lg ${config.animationClass}`}
              style={{
                left: x + inset,
                top: y + inset,
                width: cellSize - inset * 2,
                height: cellSize - inset * 2,
                background: config.background,
                border: config.border,
                boxShadow: config.shadow,
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
