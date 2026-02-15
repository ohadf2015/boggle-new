'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Bomb, Rainbow, Snowflake, Shuffle,
  Zap, Magnet, Sparkles, Diamond,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlastTileState } from './types';
import { GRID_PADDING, GRID_GAP_CLASS } from '@/components/grid/gridLayoutConstants';

interface BlastTileOverlayProps {
  tileStates: BlastTileState[][];
  gridSize: number;
  /** Set of "row-col" keys for cells currently selected/dragged by the player */
  selectedPositions?: Set<string>;
}

/**
 * Full-cell background config for each special tile type.
 * These render ABOVE the letter cells (z-[11]) because cells have opaque backgrounds.
 */
const TILE_BACKGROUNDS: Record<string, {
  background: string;
  border: string;
  shadow: string;
  animationClass: string;
}> = {
  gold: {
    background: 'linear-gradient(135deg, rgba(255,215,0,0.55) 0%, rgba(255,180,0,0.4) 40%, rgba(255,230,80,0.55) 100%)',
    border: '3px solid rgba(255,215,0,0.75)',
    shadow: 'inset 0 0 20px rgba(255,215,0,0.45), 0 0 14px rgba(255,200,0,0.35), 0 0 28px rgba(255,215,0,0.15)',
    animationClass: 'blast-tile-gold',
  },
  bomb: {
    background: 'radial-gradient(circle at 35% 35%, rgba(255,100,60,0.55) 0%, rgba(200,30,0,0.45) 55%, rgba(100,0,0,0.35) 100%)',
    border: '3px solid rgba(255,70,40,0.7)',
    shadow: 'inset 0 0 18px rgba(255,30,0,0.4), 0 0 12px rgba(255,50,20,0.3), 0 0 24px rgba(255,0,0,0.15)',
    animationClass: 'blast-tile-bomb',
  },
  rainbow: {
    background: 'linear-gradient(135deg, rgba(255,100,200,0.5) 0%, rgba(160,80,255,0.5) 25%, rgba(80,200,255,0.5) 50%, rgba(100,255,160,0.5) 75%, rgba(255,200,80,0.5) 100%)',
    border: '3px solid rgba(168,85,247,0.7)',
    shadow: 'inset 0 0 18px rgba(168,85,247,0.35), 0 0 14px rgba(168,85,247,0.3), 0 0 28px rgba(255,100,200,0.15)',
    animationClass: 'blast-tile-rainbow',
  },
  ice: {
    background: 'linear-gradient(135deg, rgba(180,230,255,0.55) 0%, rgba(130,200,255,0.45) 50%, rgba(200,240,255,0.5) 100%)',
    border: '3px solid rgba(150,220,255,0.75)',
    shadow: 'inset 0 0 20px rgba(150,220,255,0.4), 0 0 12px rgba(180,230,255,0.3), 0 0 24px rgba(100,200,255,0.15)',
    animationClass: 'blast-tile-ice',
  },
  wildcard: {
    background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.45) 0%, rgba(200,200,255,0.3) 60%, rgba(150,150,200,0.25) 100%)',
    border: '3px dashed rgba(255,255,255,0.6)',
    shadow: 'inset 0 0 16px rgba(255,255,255,0.3), 0 0 12px rgba(200,200,255,0.2)',
    animationClass: 'blast-tile-wildcard',
  },
  lightning: {
    background: 'linear-gradient(135deg, rgba(255,225,0,0.55) 0%, rgba(0,191,255,0.45) 50%, rgba(255,255,0,0.5) 100%)',
    border: '3px solid rgba(255,225,0,0.75)',
    shadow: 'inset 0 0 20px rgba(255,255,0,0.4), 0 0 14px rgba(0,191,255,0.3), 0 0 28px rgba(255,255,0,0.15)',
    animationClass: 'blast-tile-lightning',
  },
  magnet: {
    background: 'radial-gradient(circle at 40% 40%, rgba(139,0,255,0.55) 0%, rgba(255,0,64,0.45) 55%, rgba(139,0,255,0.35) 100%)',
    border: '3px solid rgba(139,0,255,0.75)',
    shadow: 'inset 0 0 18px rgba(139,0,255,0.4), 0 0 14px rgba(255,0,64,0.3), 0 0 28px rgba(139,0,255,0.15)',
    animationClass: 'blast-tile-magnet',
  },
  prism: {
    background: 'conic-gradient(from 0deg, rgba(255,0,0,0.45), rgba(255,165,0,0.45), rgba(255,255,0,0.45), rgba(0,255,0,0.45), rgba(0,100,255,0.45), rgba(148,0,211,0.45), rgba(255,0,0,0.45))',
    border: '3px solid rgba(255,255,255,0.75)',
    shadow: 'inset 0 0 20px rgba(255,255,255,0.4), 0 0 14px rgba(168,85,247,0.35), 0 0 28px rgba(255,100,200,0.15)',
    animationClass: 'blast-tile-prism',
  },
  gem: {
    background: 'radial-gradient(circle at 40% 35%, rgba(80,200,120,0.6) 0%, rgba(0,148,80,0.45) 55%, rgba(0,100,50,0.35) 100%)',
    border: '3px solid rgba(80,200,120,0.75)',
    shadow: 'inset 0 0 18px rgba(80,200,120,0.4), 0 0 14px rgba(0,200,100,0.3), 0 0 28px rgba(0,255,100,0.12)',
    animationClass: 'blast-tile-gem',
  },
  frozen: {
    background: 'linear-gradient(135deg, rgba(200,220,255,0.6) 0%, rgba(160,200,240,0.5) 50%, rgba(220,240,255,0.55) 100%)',
    border: '4px solid rgba(180,220,255,0.8)',
    shadow: 'inset 0 0 22px rgba(180,220,255,0.4), 0 0 16px rgba(200,230,255,0.35), 0 0 30px rgba(150,200,255,0.15)',
    animationClass: 'blast-tile-frozen',
  },
};

/** Icon, color, and short effect label for each special tile type */
const TILE_ICONS: Record<string, { Icon: LucideIcon; color: string; label: string; labelBg: string }> = {
  gold:      { Icon: Star,      color: 'text-yellow-900',  label: '3×',   labelBg: 'bg-yellow-400/90 text-yellow-900' },
  bomb:      { Icon: Bomb,      color: 'text-white',       label: '8',    labelBg: 'bg-red-500/90 text-white' },
  rainbow:   { Icon: Rainbow,   color: 'text-white',       label: '+5',   labelBg: 'bg-purple-500/90 text-white' },
  ice:       { Icon: Snowflake, color: 'text-blue-200',    label: '×2',   labelBg: 'bg-blue-400/90 text-white' },
  wildcard:  { Icon: Shuffle,   color: 'text-white',       label: '?',    labelBg: 'bg-white/80 text-gray-800' },
  lightning: { Icon: Zap,       color: 'text-yellow-300',  label: 'col',  labelBg: 'bg-yellow-400/90 text-yellow-900' },
  magnet:    { Icon: Magnet,    color: 'text-white',       label: 'pull', labelBg: 'bg-purple-600/90 text-white' },
  prism:     { Icon: Sparkles,  color: 'text-white',       label: '×2',   labelBg: 'bg-pink-400/90 text-white' },
  gem:       { Icon: Diamond,   color: 'text-white',       label: '+3',   labelBg: 'bg-emerald-500/90 text-white' },
  frozen:    { Icon: Snowflake, color: 'text-blue-400',    label: '×3',   labelBg: 'bg-blue-300/90 text-blue-900' },
};

/**
 * BlastTileOverlay - Full-cell background treatments for special tiles + cleared gap cells.
 * Uses CSS Grid aligned to GridComponent's layout for pixel-perfect tile alignment.
 * Cleared cells render as dark inset gaps so the board visually "breathes" during cascade.
 */
export function BlastTileOverlay({
  tileStates,
  gridSize,
  selectedPositions,
}: BlastTileOverlayProps) {
  return (
    <div
      dir="ltr"
      data-testid="blast-tile-overlay"
      className={`absolute inset-0 pointer-events-none z-[11] grid ${GRID_GAP_CLASS}`}
      style={{
        padding: GRID_PADDING,
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
      }}
    >
      <AnimatePresence mode="sync">
        {tileStates.flat().map(tile => {
          const posKey = `${tile.row}-${tile.col}`;
          const isSelected = selectedPositions?.has(posKey) ?? false;

          // Cleared tile → dark void cell
          if (tile.isCleared) {
            return (
              <motion.div
                key={`gap-${posKey}`}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="rounded-lg"
                style={{
                  gridRow: tile.row + 1,
                  gridColumn: tile.col + 1,
                  background: 'radial-gradient(circle at 50% 50%, rgba(15,15,35,0.85) 0%, rgba(8,8,25,0.95) 100%)',
                  border: '2px solid rgba(255,255,255,0.06)',
                  boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.4)',
                }}
              />
            );
          }

          // Standard tile → no overlay
          if (tile.type === 'standard') return null;

          const config = TILE_BACKGROUNDS[tile.type];
          if (!config) return null;

          // Multi-hit tile visual states
          const isCrackedIce = tile.type === 'ice' && tile.hitsRemaining === 1;
          const isCrackedPrism = tile.type === 'prism' && tile.hitsRemaining === 1;
          const isCrackedFrozen = tile.type === 'frozen' && tile.hitsRemaining <= 2;
          const isWeakened = isCrackedIce || isCrackedPrism || isCrackedFrozen;

          // Gem glow intensifies as hitsRemaining decreases (3→2→1)
          const gemGlowIntensity = tile.type === 'gem' ? (3 - tile.hitsRemaining + 1) : 0;

          let background = config.background;
          let border = config.border;
          let shadow = config.shadow;
          if (isCrackedIce) {
            background = 'linear-gradient(135deg, rgba(180,230,255,0.35) 0%, rgba(100,180,220,0.25) 50%, rgba(180,230,255,0.35) 100%)';
            border = '3px solid rgba(255,255,255,0.5)';
            shadow = 'inset 0 0 16px rgba(150,220,255,0.3), 0 0 10px rgba(180,230,255,0.25)';
          } else if (isCrackedPrism) {
            background = 'conic-gradient(from 0deg, rgba(255,0,0,0.35), rgba(255,165,0,0.35), rgba(255,255,0,0.35), rgba(0,255,0,0.35), rgba(0,100,255,0.35), rgba(148,0,211,0.35), rgba(255,0,0,0.35))';
            border = '3px solid rgba(255,255,255,0.85)';
            shadow = 'inset 0 0 24px rgba(255,255,255,0.5), 0 0 18px rgba(255,200,100,0.4), 0 0 32px rgba(168,85,247,0.25)';
          } else if (isCrackedFrozen) {
            background = tile.hitsRemaining === 1
              ? 'linear-gradient(135deg, rgba(200,220,255,0.35) 0%, rgba(140,180,220,0.25) 30%, rgba(255,200,150,0.15) 60%, rgba(200,220,255,0.35) 100%)'
              : 'linear-gradient(135deg, rgba(200,220,255,0.45) 0%, rgba(160,200,240,0.35) 50%, rgba(220,240,255,0.4) 100%)';
            border = tile.hitsRemaining === 1
              ? '3px solid rgba(255,255,255,0.6)'
              : '3px solid rgba(180,220,255,0.6)';
            shadow = tile.hitsRemaining === 1
              ? 'inset 0 0 18px rgba(255,200,150,0.2), 0 0 14px rgba(200,230,255,0.3), 0 0 24px rgba(255,180,100,0.1)'
              : 'inset 0 0 20px rgba(180,220,255,0.35), 0 0 14px rgba(200,230,255,0.3)';
          }

          // Gem glow intensifies dramatically across 3 stages
          if (gemGlowIntensity > 0) {
            const glowBase = 16 + gemGlowIntensity * 6;
            const outerBase = 10 + gemGlowIntensity * 6;
            const haloBase = 20 + gemGlowIntensity * 8;
            shadow = `inset 0 0 ${glowBase}px rgba(80,200,120,${0.25 + gemGlowIntensity * 0.12}), 0 0 ${outerBase}px rgba(0,255,100,${0.2 + gemGlowIntensity * 0.12}), 0 0 ${haloBase}px rgba(0,255,100,${0.05 + gemGlowIntensity * 0.08})`;
          }

          const iconEntry = TILE_ICONS[tile.type];

          return (
            <motion.div
              key={`bg-${posKey}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: isWeakened ? [1, 0.85, 1] : 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={isWeakened
                ? { opacity: { duration: 1, repeat: Infinity, ease: 'easeInOut' }, type: 'spring', stiffness: 300, damping: 20 }
                : { type: 'spring', stiffness: 300, damping: 20 }
              }
              className={`relative rounded-lg ${config.animationClass}${isSelected ? ' blast-tile-selected' : ''}`}
              style={{
                gridRow: tile.row + 1,
                gridColumn: tile.col + 1,
                background,
                border,
                boxShadow: shadow,
              }}
            >
              {/* Effect badge - icon + short label showing what this tile does */}
              {iconEntry && (
                <span
                  className={cn(
                    'absolute bottom-0 right-0 flex items-center gap-px rounded-tl-md rounded-br-lg px-1 py-px',
                    'text-[8px] font-black leading-none',
                    iconEntry.labelBg,
                  )}
                  data-testid={`badge-${tile.type}`}
                >
                  <iconEntry.Icon className="w-2.5 h-2.5" />
                  <span>{iconEntry.label}</span>
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
