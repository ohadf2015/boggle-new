'use client';

import { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import {
  Star, Bomb, Rainbow, Snowflake, Shuffle,
  Zap, Magnet, Sparkles, Diamond, Gem, CircleDollarSign,
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
  /** Set of tile types that match current wave objectives — highlighted with a pulsing border */
  objectiveTileTypes?: Set<string>;
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
    background: 'linear-gradient(135deg, rgba(255,215,0,0.30) 0%, rgba(255,180,0,0.22) 40%, rgba(255,230,80,0.30) 100%)',
    border: '3px solid rgba(255,215,0,0.75)',
    shadow: 'inset 0 0 14px rgba(255,215,0,0.25), 0 0 10px rgba(255,200,0,0.2), 0 0 20px rgba(255,215,0,0.08)',
    animationClass: 'blast-tile-gold',
  },
  bomb: {
    background: 'radial-gradient(circle at 35% 35%, rgba(255,100,60,0.30) 0%, rgba(200,30,0,0.25) 55%, rgba(100,0,0,0.18) 100%)',
    border: '3px solid rgba(255,70,40,0.7)',
    shadow: 'inset 0 0 12px rgba(255,30,0,0.22), 0 0 8px rgba(255,50,20,0.18), 0 0 16px rgba(255,0,0,0.08)',
    animationClass: 'blast-tile-bomb',
  },
  rainbow: {
    background: 'linear-gradient(135deg, rgba(255,100,200,0.28) 0%, rgba(160,80,255,0.28) 25%, rgba(80,200,255,0.28) 50%, rgba(100,255,160,0.28) 75%, rgba(255,200,80,0.28) 100%)',
    border: '3px solid rgba(168,85,247,0.7)',
    shadow: 'inset 0 0 12px rgba(168,85,247,0.2), 0 0 10px rgba(168,85,247,0.18), 0 0 20px rgba(255,100,200,0.08)',
    animationClass: 'blast-tile-rainbow',
  },
  ice: {
    background: 'linear-gradient(135deg, rgba(180,230,255,0.30) 0%, rgba(130,200,255,0.25) 50%, rgba(200,240,255,0.28) 100%)',
    border: '3px solid rgba(150,220,255,0.75)',
    shadow: 'inset 0 0 14px rgba(150,220,255,0.22), 0 0 8px rgba(180,230,255,0.18), 0 0 16px rgba(100,200,255,0.08)',
    animationClass: 'blast-tile-ice',
  },
  mirror: {
    background: 'radial-gradient(circle at 50% 50%, rgba(224,224,255,0.28) 0%, rgba(136,136,255,0.2) 60%, rgba(100,100,200,0.15) 100%)',
    border: '3px solid rgba(136,136,255,0.7)',
    shadow: 'inset 0 0 12px rgba(136,136,255,0.2), 0 0 8px rgba(180,180,255,0.15)',
    animationClass: 'blast-tile-mirror',
  },
  silver: {
    background: 'radial-gradient(circle at 40% 35%, rgba(232,232,232,0.30) 0%, rgba(176,176,176,0.22) 55%, rgba(140,140,140,0.16) 100%)',
    border: '3px solid rgba(192,192,192,0.75)',
    shadow: 'inset 0 0 12px rgba(200,200,200,0.22), 0 0 8px rgba(192,192,192,0.15)',
    animationClass: 'blast-tile-silver',
  },
  diamond: {
    background: 'radial-gradient(circle at 40% 35%, rgba(185,242,255,0.33) 0%, rgba(0,206,209,0.25) 55%, rgba(0,150,160,0.16) 100%)',
    border: '3px solid rgba(0,206,209,0.8)',
    shadow: 'inset 0 0 15px rgba(0,206,209,0.22), 0 0 10px rgba(100,255,255,0.18), 0 0 20px rgba(0,206,209,0.08)',
    animationClass: 'blast-tile-diamond',
  },
  lightning: {
    background: 'linear-gradient(135deg, rgba(255,225,0,0.30) 0%, rgba(0,191,255,0.25) 50%, rgba(255,255,0,0.28) 100%)',
    border: '3px solid rgba(255,225,0,0.75)',
    shadow: 'inset 0 0 14px rgba(255,255,0,0.22), 0 0 10px rgba(0,191,255,0.18), 0 0 20px rgba(255,255,0,0.08)',
    animationClass: 'blast-tile-lightning',
  },
  magnet: {
    background: 'radial-gradient(circle at 40% 40%, rgba(139,0,255,0.30) 0%, rgba(255,0,64,0.25) 55%, rgba(139,0,255,0.18) 100%)',
    border: '3px solid rgba(139,0,255,0.75)',
    shadow: 'inset 0 0 12px rgba(139,0,255,0.22), 0 0 10px rgba(255,0,64,0.18), 0 0 20px rgba(139,0,255,0.08)',
    animationClass: 'blast-tile-magnet',
  },
  prism: {
    background: 'conic-gradient(from 0deg, rgba(255,0,0,0.25), rgba(255,165,0,0.25), rgba(255,255,0,0.25), rgba(0,255,0,0.25), rgba(0,100,255,0.25), rgba(148,0,211,0.25), rgba(255,0,0,0.25))',
    border: '3px solid rgba(255,255,255,0.75)',
    shadow: 'inset 0 0 14px rgba(255,255,255,0.22), 0 0 10px rgba(168,85,247,0.2), 0 0 20px rgba(255,100,200,0.08)',
    animationClass: 'blast-tile-prism',
  },
  gem: {
    background: 'radial-gradient(circle at 40% 35%, rgba(80,200,120,0.33) 0%, rgba(0,148,80,0.25) 55%, rgba(0,100,50,0.18) 100%)',
    border: '3px solid rgba(80,200,120,0.75)',
    shadow: 'inset 0 0 12px rgba(80,200,120,0.22), 0 0 10px rgba(0,200,100,0.18), 0 0 20px rgba(0,255,100,0.07)',
    animationClass: 'blast-tile-gem',
  },
  frozen: {
    background: 'linear-gradient(135deg, rgba(180,180,240,0.33) 0%, rgba(140,140,220,0.28) 50%, rgba(200,190,255,0.30) 100%)',
    border: '4px solid rgba(160,140,240,0.8)',
    shadow: 'inset 0 0 15px rgba(160,140,240,0.22), 0 0 10px rgba(180,160,255,0.2), 0 0 20px rgba(140,120,240,0.08)',
    animationClass: 'blast-tile-frozen',
  },
};

/** Icon, color, and short effect label for each special tile type */
const TILE_ICONS: Record<string, { Icon: LucideIcon; color: string; label: string; labelBg: string }> = {
  gold:      { Icon: Star,              color: 'text-yellow-900',  label: '3×',   labelBg: 'bg-yellow-400/70 text-yellow-900' },
  bomb:      { Icon: Bomb,              color: 'text-white',       label: '8',    labelBg: 'bg-red-500/70 text-white' },
  rainbow:   { Icon: Rainbow,           color: 'text-white',       label: '+5',   labelBg: 'bg-purple-500/70 text-white' },
  ice:       { Icon: Snowflake,         color: 'text-blue-200',    label: '×2',   labelBg: 'bg-blue-400/70 text-white' },
  mirror:    { Icon: Shuffle,           color: 'text-indigo-200',  label: '2×',   labelBg: 'bg-indigo-500/70 text-white' },
  silver:    { Icon: CircleDollarSign,  color: 'text-gray-300',    label: '1.5×', labelBg: 'bg-gray-400/70 text-gray-900' },
  diamond:   { Icon: Diamond,           color: 'text-cyan-200',    label: '5×',   labelBg: 'bg-cyan-500/70 text-white' },
  lightning: { Icon: Zap,               color: 'text-yellow-300',  label: 'col',  labelBg: 'bg-yellow-400/70 text-yellow-900' },
  magnet:    { Icon: Magnet,            color: 'text-white',       label: 'pull', labelBg: 'bg-purple-600/70 text-white' },
  prism:     { Icon: Sparkles,          color: 'text-white',       label: '+',    labelBg: 'bg-pink-400/70 text-white' },
  gem:       { Icon: Gem,               color: 'text-white',       label: '×3',   labelBg: 'bg-emerald-500/70 text-white' },
  frozen:    { Icon: Snowflake,         color: 'text-indigo-300',  label: '×2',   labelBg: 'bg-indigo-400/70 text-white' },
};

/**
 * BlastTileOverlay - Full-cell background treatments for special tiles + cleared gap cells.
 * Uses CSS Grid aligned to GridComponent's layout for pixel-perfect tile alignment.
 * Cleared cells render as dark inset gaps so the board visually "breathes" during cascade.
 */
export const BlastTileOverlay = memo(function BlastTileOverlay({
  tileStates,
  gridSize,
  selectedPositions,
  objectiveTileTypes,
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
      <AdaptiveAnimatePresence>
        {tileStates.flat().map(tile => {
          const posKey = `${tile.row}-${tile.col}`;
          const isSelected = selectedPositions?.has(posKey) ?? false;

          // Cleared tile → dark void cell
          if (tile.isCleared) {
            return (
              <AdaptiveMotion.div
                key={`gap-${posKey}`}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 600, damping: 30 }}
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
          const isCrackedFrozen = tile.type === 'frozen' && tile.hitsRemaining === 1;
          const isWeakened = isCrackedIce || isCrackedPrism || isCrackedFrozen;

          // Gem glow intensifies as hitsRemaining decreases (3→2→1)
          const gemGlowIntensity = tile.type === 'gem' ? (3 - tile.hitsRemaining + 1) : 0;

          let background = config.background;
          let border = config.border;
          let shadow = config.shadow;
          if (isCrackedIce) {
            background = 'linear-gradient(135deg, rgba(180,230,255,0.2) 0%, rgba(100,180,220,0.15) 50%, rgba(180,230,255,0.2) 100%)';
            border = '3px solid rgba(255,255,255,0.5)';
            shadow = 'inset 0 0 10px rgba(150,220,255,0.18), 0 0 6px rgba(180,230,255,0.15)';
          } else if (isCrackedPrism) {
            background = 'conic-gradient(from 0deg, rgba(255,0,0,0.2), rgba(255,165,0,0.2), rgba(255,255,0,0.2), rgba(0,255,0,0.2), rgba(0,100,255,0.2), rgba(148,0,211,0.2), rgba(255,0,0,0.2))';
            border = '3px solid rgba(255,255,255,0.85)';
            shadow = 'inset 0 0 16px rgba(255,255,255,0.3), 0 0 12px rgba(255,200,100,0.22), 0 0 22px rgba(168,85,247,0.14)';
          } else if (isCrackedFrozen) {
            background = tile.hitsRemaining === 1
              ? 'linear-gradient(135deg, rgba(200,220,255,0.2) 0%, rgba(140,180,220,0.15) 30%, rgba(255,200,150,0.08) 60%, rgba(200,220,255,0.2) 100%)'
              : 'linear-gradient(135deg, rgba(200,220,255,0.25) 0%, rgba(160,200,240,0.2) 50%, rgba(220,240,255,0.22) 100%)';
            border = tile.hitsRemaining === 1
              ? '3px solid rgba(255,255,255,0.6)'
              : '3px solid rgba(180,220,255,0.6)';
            shadow = tile.hitsRemaining === 1
              ? 'inset 0 0 12px rgba(255,200,150,0.12), 0 0 10px rgba(200,230,255,0.18), 0 0 16px rgba(255,180,100,0.06)'
              : 'inset 0 0 14px rgba(180,220,255,0.2), 0 0 10px rgba(200,230,255,0.18)';
          }

          // Gem glow intensifies dramatically across 3 stages
          if (gemGlowIntensity > 0) {
            const glowBase = 11 + gemGlowIntensity * 4;
            const outerBase = 7 + gemGlowIntensity * 4;
            const haloBase = 14 + gemGlowIntensity * 6;
            shadow = `inset 0 0 ${glowBase}px rgba(80,200,120,${0.18 + gemGlowIntensity * 0.08}), 0 0 ${outerBase}px rgba(0,255,100,${0.14 + gemGlowIntensity * 0.08}), 0 0 ${haloBase}px rgba(0,255,100,${0.04 + gemGlowIntensity * 0.06})`;
          }

          const iconEntry = TILE_ICONS[tile.type];

          return (
            <AdaptiveMotion.div
              key={`bg-${posKey}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`relative rounded-lg ${config.animationClass}${isWeakened ? ' blast-tile-weakened' : ''}${isSelected ? ' blast-tile-selected' : ''}${objectiveTileTypes?.has(tile.type) ? ' blast-tile-objective' : ''}`}
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
                    'absolute bottom-0 right-0 flex items-center gap-0.5 rounded-tl-md rounded-br-lg px-1 py-0.5 opacity-90',
                    'text-[10px] font-black leading-none',
                    iconEntry.labelBg,
                  )}
                  data-testid={`badge-${tile.type}`}
                >
                  <iconEntry.Icon className="w-3.5 h-3.5" />
                  <span>{iconEntry.label}</span>
                </span>
              )}

              {/* Hits remaining badge for multi-hit tiles (ice, frozen, prism, gem) */}
              {tile.hitsRemaining > 0 && (
                <span
                  className={cn(
                    'absolute top-0 left-0 flex items-center justify-center rounded-br-md rounded-tl-lg',
                    'w-4 h-4 text-[10px] font-black leading-none animate-neo-pop',
                    tile.hitsRemaining === 1
                      ? 'bg-red-500/75 text-white'
                      : tile.hitsRemaining === 2
                      ? 'bg-amber-400/75 text-black'
                      : 'bg-white/65 text-black',
                  )}
                  data-testid={`hits-${tile.type}`}
                >
                  {tile.hitsRemaining}
                </span>
              )}
            </AdaptiveMotion.div>
          );
        })}
      </AdaptiveAnimatePresence>
    </div>
  );
});
