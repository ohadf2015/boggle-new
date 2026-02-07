/**
 * AdventureTile Component
 *
 * Individual tile rendering for adventure mode grid.
 * Extracted from AdventureGrid.tsx to improve maintainability.
 *
 * Handles:
 * - Tile selection states and animations
 * - Special tile types (gold, ice, bomb, rainbow, chain, time)
 * - World-specific theming
 * - Cascade animations
 * - Activation effects
 * - Performance-aware rendering
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GridTileState, TileType } from '@/types/adventure';
import { TileBadge } from './TileBadge';
import { OPTIMIZED_TIMING } from '@/lib/adventure/entryTiming';

// ==============================================
// TYPES
// ==============================================

export interface AdventureTileProps {
  /** Tile state data */
  tile: GridTileState;
  /** Tile index in grid */
  index: number;
  /** Whether tile is currently selected */
  isSelected: boolean;
  /** Whether tile is highlighted as hint */
  isHintHighlighted: boolean;
  /** Whether tile can be interacted with */
  canInteract: boolean;
  /** World ID for theming (1-3) */
  worldId: number;
  /** Row number for bomb preview highlighting (null if no bomb selected) */
  bombRowPreview: number | null;
  /** Whether cascade animation should play on mount */
  showCascade: boolean;
  /** Whether cascade animation has completed */
  cascadeComplete: boolean;
  /** Function to calculate cascade delay based on position */
  getCascadeDelay: (row: number, col: number) => number;
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;
  /** Whether complex animations are enabled (performance) */
  enableComplexAnimations: boolean;
  /** Click handler */
  onClick: () => void;
  /** Mouse down handler */
  onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void;
  /** Mouse enter handler */
  onMouseEnter: () => void;
  /** Touch start handler */
  onTouchStart: (e: React.TouchEvent) => void;
  /** Function to generate aria-label for tile */
  getTileAriaLabel: (tile: GridTileState) => string;
  /** Optional chain cascade delay (overrides tile.cascadeDelay) */
  chainCascadeDelay?: number;
}

// ==============================================
// CONSTANTS
// ==============================================

const TILE_TYPE_CLASSES: Record<TileType, string> = {
  standard: '',
  gold: 'tile-gold',
  ice: 'tile-ice',
  bomb: 'tile-bomb',
  rainbow: 'tile-rainbow',
  chain: 'tile-chain',
  time: 'tile-time',
  locked: 'tile-locked',
  multiplier: 'tile-multiplier',
};

// World-specific theming classes
const TEXTURE_CLASSES: Record<number, string> = {
  1: 'tile-texture-meadows',
  2: 'tile-texture-springs',
  3: 'tile-texture-caverns',
};

const BORDER_CLASSES: Record<number, string> = {
  1: 'tile-border-meadows',
  2: 'tile-border-springs',
  3: 'tile-border-caverns',
};

const LETTER_GLOW_CLASSES: Record<number, string> = {
  1: 'letter-glow-meadows',
  2: 'letter-glow-springs',
  3: 'letter-glow-caverns',
};

// World-specific standard tile background classes
const STANDARD_TILE_BG_CLASSES: Record<number, string> = {
  1: 'bg-gradient-to-br from-[#fdfcf0] via-[#f5f0e0] to-[#ede8d4]',
  2: 'bg-gradient-to-br from-[#f0f8ff] via-[#e6f2fa] to-[#daedf7]',
  3: 'bg-gradient-to-br from-[#f5f0ff] via-[#ede6fa] to-[#e5dcf5]',
};

// Tile types that should NOT receive texture/border theming
const SPECIAL_TILE_TYPES: Set<TileType> = new Set([
  'gold',
  'ice',
  'bomb',
  'rainbow',
  'chain',
  'time',
]);

// ==============================================
// COMPONENT
// ==============================================

/**
 * Individual adventure tile with theming, animations, and effects
 */
export const AdventureTile = memo(({
  tile,
  index,
  isSelected,
  isHintHighlighted,
  canInteract,
  worldId,
  bombRowPreview,
  showCascade,
  cascadeComplete,
  getCascadeDelay,
  prefersReducedMotion,
  enableComplexAnimations,
  onClick,
  onMouseDown,
  onMouseEnter,
  onTouchStart,
  getTileAriaLabel,
  chainCascadeDelay,
}: AdventureTileProps) => {
  // World-specific theming
  const isStandardTile = !SPECIAL_TILE_TYPES.has(tile.type);
  const textureClass = isStandardTile ? TEXTURE_CLASSES[worldId] : '';
  const borderClass = isStandardTile ? BORDER_CLASSES[worldId] : '';
  const letterGlowClass = LETTER_GLOW_CLASSES[worldId] || LETTER_GLOW_CLASSES[1];

  // Chain cascade delay takes priority over tile.cascadeDelay
  const effectiveCascadeDelay = chainCascadeDelay ?? tile.cascadeDelay;

  return (
    <motion.div
      key={tile.id}
      layoutId={tile.id}
      data-row={tile.row}
      data-col={tile.col}
      role="gridcell"
      aria-label={getTileAriaLabel(tile)}
      aria-selected={isSelected}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
      initial={showCascade && !cascadeComplete ? {
        y: -100,
        opacity: 0,
        scale: 0.8,
      } : undefined}
      animate={{
        y: isSelected ? -4 : 0,
        opacity: 1,
        scale: isSelected ? 1.15 : 1,
        rotate: isSelected && !prefersReducedMotion ? [0, -2, 2, 0] : 0,
      }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : showCascade && !cascadeComplete
            ? {
                // Optimized spring config for faster settle
                type: 'spring',
                stiffness: OPTIMIZED_TIMING.cascade.spring.stiffness,
                damping: OPTIMIZED_TIMING.cascade.spring.damping,
                mass: OPTIMIZED_TIMING.cascade.spring.mass,
                delay: getCascadeDelay(tile.row, tile.col) / 1000,
              }
            : {
                type: 'spring',
                stiffness: 300,
                damping: 20,
                mass: 0.5,
              }
      }
      whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
      style={{
        animationDelay: effectiveCascadeDelay
          ? `${effectiveCascadeDelay}ms`
          : undefined,
      }}
      className={cn(
        // Base tile styles - overflow-hidden ensures effects stay within cell bounds
        'relative aspect-square flex items-center justify-center',
        'font-black text-xl cursor-pointer overflow-hidden',
        'border-2 border-neo-black/30 rounded-neo',

        // World-specific theming
        textureClass,
        borderClass,

        // Type-specific classes
        TILE_TYPE_CLASSES[tile.type],

        // Enhanced effect classes for special tiles
        enableComplexAnimations && tile.type === 'gold' && 'tile-gold-enhanced',
        enableComplexAnimations && tile.type === 'ice' && !tile.isCleared && 'tile-ice-enhanced',
        enableComplexAnimations && tile.type === 'bomb' && 'tile-bomb-enhanced',
        enableComplexAnimations && tile.type === 'rainbow' && 'tile-rainbow-enhanced',
        enableComplexAnimations && tile.type === 'chain' && 'tile-chain-enhanced',
        enableComplexAnimations && tile.type === 'time' && 'tile-time-enhanced',

        // Activation effect classes (one-time animation when tile effect triggers)
        enableComplexAnimations && tile.activationEffect && `tile-effect-${tile.activationEffect}`,

        // State classes
        tile.isCleared && 'tile-cleared opacity-40 cursor-not-allowed',
        // Enhanced selection: CSS handles glow, ring, and animation
        isSelected && 'tile-selected-enhanced',
        tile.isFrozen && tile.type === 'ice' && 'tile-frozen',

        // Bomb row preview: highlight tiles in bomb's row when bomb is selected
        bombRowPreview !== null && tile.row === bombRowPreview && 'bomb-row-preview',

        // Hint highlight: show which tiles form the hinted word
        isHintHighlighted && !isSelected && [
          'ring-2 ring-neo-yellow',
          'shadow-[0_0_16px_rgba(255,225,53,0.7),0_0_32px_rgba(255,225,53,0.3)]',
          'animate-pulse',
        ],

        // Standard tile background - world-specific tint
        tile.type === 'standard' && (STANDARD_TILE_BG_CLASSES[worldId] || STANDARD_TILE_BG_CLASSES[1]),

        // Gold tile - golden glow
        tile.type === 'gold' && [
          'bg-gradient-to-br from-neo-yellow via-yellow-400 to-amber-500',
          'text-neo-black',
          'border-amber-600/60',
        ],

        // Ice tile - blue frost
        tile.type === 'ice' && [
          'bg-gradient-to-br from-cyan-200 via-blue-300 to-cyan-400',
          'text-blue-900',
          'border-cyan-500/60',
        ],

        // Bomb tile - danger red
        tile.type === 'bomb' && [
          'bg-gradient-to-br from-red-500 via-red-600 to-orange-600',
          'text-neo-white',
          'border-red-700/60',
        ],

        // Rainbow tile - animated via CSS
        tile.type === 'rainbow' && [
          'text-neo-black',
          'border-purple-500/60',
        ],

        // Chain tile - purple link
        tile.type === 'chain' && [
          'bg-gradient-to-br from-purple-400 via-violet-500 to-violet-600',
          'text-neo-white',
          'border-purple-700/60',
        ],

        // Time tile - emerald clock
        tile.type === 'time' && [
          'bg-gradient-to-br from-emerald-400 via-teal-500 to-teal-600',
          'text-neo-white',
          'border-emerald-600/60',
        ]
      )}
    >
      {/* ========== GOLD TILE EFFECTS ========== */}
      {tile.type === 'gold' && enableComplexAnimations && (
        <>
          <div className="tile-gold-sparkle tile-gold-sparkle--1" />
          <div className="tile-gold-sparkle tile-gold-sparkle--2" />
          <div className="tile-gold-sparkle tile-gold-sparkle--3" />
        </>
      )}

      {/* ========== ICE TILE EFFECTS ========== */}
      {/* Only show ice effects when tile is NOT cleared (melted) */}
      {tile.type === 'ice' && !tile.isCleared && enableComplexAnimations && (
        <>
          <span className="tile-ice-snowflake tile-ice-snowflake--1">❄</span>
          <span className="tile-ice-snowflake tile-ice-snowflake--2">❄</span>
          <span className="tile-ice-snowflake tile-ice-snowflake--3">❄</span>
        </>
      )}

      {/* ========== BOMB TILE EFFECTS ========== */}
      {tile.type === 'bomb' && !tile.isCleared && enableComplexAnimations && (
        <>
          <div className="tile-bomb-rings">
            <div className="tile-bomb-ring" />
            <div className="tile-bomb-ring tile-bomb-ring--2" />
            <div className="tile-bomb-ring tile-bomb-ring--3" />
          </div>
          <div className="tile-bomb-spark" />
        </>
      )}

      {/* ========== RAINBOW TILE EFFECTS ========== */}
      {tile.type === 'rainbow' && enableComplexAnimations && (
        <>
          <div className="tile-rainbow-particle tile-rainbow-particle--1" />
          <div className="tile-rainbow-particle tile-rainbow-particle--2" />
          <div className="tile-rainbow-particle tile-rainbow-particle--3" />
          <div className="tile-rainbow-star" />
        </>
      )}

      {/* ========== CHAIN TILE EFFECTS ========== */}
      {tile.type === 'chain' && enableComplexAnimations && (
        <>
          <div className="tile-chain-line tile-chain-line--top" />
          <div className="tile-chain-line tile-chain-line--bottom" />
        </>
      )}

      {/* ========== TIME TILE EFFECTS ========== */}
      {tile.type === 'time' && enableComplexAnimations && (
        <>
          <div className="tile-time-hand" />
          <div className="tile-time-particle tile-time-particle--1" />
          <div className="tile-time-particle tile-time-particle--2" />
          <div className="tile-time-particle tile-time-particle--3" />
        </>
      )}

      {/* ========== ACTIVATION EFFECT PARTICLES ========== */}
      {/* Melt effect - water drops and splash */}
      {tile.activationEffect === 'melt' && enableComplexAnimations && (
        <div className="tile-melt-splash" />
      )}

      {/* Explode effect - shockwaves and debris */}
      {tile.activationEffect === 'explode' && enableComplexAnimations && (
        <>
          <div className="tile-explode-shockwave" />
          <div className="tile-explode-shockwave tile-explode-shockwave--2" />
          <div className="tile-explode-shockwave tile-explode-shockwave--3" />
          <div className="tile-explode-debris tile-explode-debris--1" />
          <div className="tile-explode-debris tile-explode-debris--2" />
          <div className="tile-explode-debris tile-explode-debris--3" />
          <div className="tile-explode-debris tile-explode-debris--4" />
          <div className="tile-explode-debris tile-explode-debris--5" />
          <div className="tile-explode-debris tile-explode-debris--6" />
        </>
      )}

      {/* Collect effect - coins and sparkle */}
      {tile.activationEffect === 'collect' && enableComplexAnimations && (
        <>
          <div className="tile-collect-sparkle" />
          <div className="tile-collect-coin tile-collect-coin--1" />
          <div className="tile-collect-coin tile-collect-coin--2" />
          <div className="tile-collect-coin tile-collect-coin--3" />
          <div className="tile-collect-coin tile-collect-coin--4" />
        </>
      )}

      {/* Wildcard effect - rainbow rings and star */}
      {tile.activationEffect === 'wildcard' && enableComplexAnimations && (
        <>
          <div className="tile-wildcard-ring tile-wildcard-ring--1" />
          <div className="tile-wildcard-ring tile-wildcard-ring--2" />
          <div className="tile-wildcard-ring tile-wildcard-ring--3" />
          <div className="tile-wildcard-star" />
        </>
      )}

      {/* Link effect - pulse rings and icon */}
      {tile.activationEffect === 'link' && enableComplexAnimations && (
        <>
          <div className="tile-link-pulse" />
          <div className="tile-link-pulse tile-link-pulse--2" />
          <div className="tile-link-icon">🔗</div>
        </>
      )}

      {/* Time bonus effect - floating +5s and clock */}
      {tile.activationEffect === 'timeBonus' && enableComplexAnimations && (
        <>
          <div className="tile-time-plus" />
          <div className="tile-time-clock" />
          <div className="tile-time-ring" />
        </>
      )}

      {/* ========== SELECTION RIPPLE EFFECT ========== */}
      {/* Contained ripple that stays within cell bounds - no blur, no overflow */}
      {isSelected && enableComplexAnimations && !prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-neo"
          style={{
            background: 'radial-gradient(circle at center, rgba(255, 200, 100, 0.6) 0%, rgba(255, 200, 100, 0.2) 50%, transparent 70%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.6] }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      )}

      {/* Letter */}
      <span className={cn(
        'relative z-10 select-none',
        letterGlowClass,
        'drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]',
        (tile.type === 'gold' || tile.type === 'rainbow') && 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
      )}>
        {tile.letter}
      </span>

      {/* Tile badge (gold, rainbow, bomb, chain, time, frost overlay) */}
      <TileBadge type={tile.type} isFrozen={tile.isFrozen} />
    </motion.div>
  );
});

AdventureTile.displayName = 'AdventureTile';
