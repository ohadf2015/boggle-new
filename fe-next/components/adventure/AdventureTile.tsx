/**
 * AdventureTile Component
 *
 * Individual tile rendering for adventure mode grid.
 * Extracted from AdventureGrid.tsx to improve maintainability.
 *
 * Handles:
 * - Tile selection states and animations
 * - Special tile types (gold, ice, bomb, time)
 * - Standard tiles styled to match GridComponent (letter-tile-gradient)
 * - Cascade animations
 * - Activation effects
 * - Performance-aware rendering
 */

import React, { memo, useCallback } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
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
  /** Whether tile is adjacent to the last selected tile (selectable next) */
  isAdjacentHint?: boolean;
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
  /** Stable click handler — receives (index, tile) */
  onTileClick: (index: number, tile: GridTileState) => void;
  /** Stable drag start handler — receives (e, index, tile) */
  onTileDragStart: (e: React.MouseEvent | React.TouchEvent, index: number, tile: GridTileState) => void;
  /** Stable drag enter handler — receives (index, tile) */
  onTileDragEnter: (index: number, tile: GridTileState) => void;
  /** Function to generate aria-label for tile */
  getTileAriaLabel: (tile: GridTileState) => string;
  /** Whether tile is focused via keyboard navigation */
  isKeyboardFocused?: boolean;
  /** Whether tile is locked by boss ability (prevents selection, shows lock overlay) */
  isLocked?: boolean;
}

// ==============================================
// CONSTANTS
// ==============================================

const TILE_TYPE_CLASSES: Record<TileType, string> = {
  standard: '',
  gold: 'tile-gold',
  ice: 'tile-ice',
  bomb: 'tile-bomb',
  time: 'tile-time',
  locked: 'tile-locked',
  rainbow: 'tile-rainbow',
  chain: 'tile-chain',
  multiplier: 'tile-multiplier',
};

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
  isAdjacentHint = false,
  canInteract,
  worldId,
  bombRowPreview,
  showCascade,
  cascadeComplete,
  getCascadeDelay,
  prefersReducedMotion,
  enableComplexAnimations,
  onTileClick,
  onTileDragStart,
  onTileDragEnter,
  getTileAriaLabel,
  isKeyboardFocused = false,
  isLocked = false,
}: AdventureTileProps) => {
  // Stable handlers that don't create new closures per render
  const handleClick = useCallback(() => onTileClick(index, tile), [onTileClick, index, tile]);
  const handleMouseDown = useCallback((e: React.MouseEvent) => onTileDragStart(e, index, tile), [onTileDragStart, index, tile]);
  const handleMouseEnter = useCallback(() => onTileDragEnter(index, tile), [onTileDragEnter, index, tile]);
  const handleTouchStart = useCallback((e: React.TouchEvent) => onTileDragStart(e, index, tile), [onTileDragStart, index, tile]);

  const effectiveCascadeDelay = tile.cascadeDelay;

  return (
    <AdaptiveMotion.div
      key={tile.id}
      layout="position"
      data-row={tile.row}
      data-col={tile.col}
      role="gridcell"
      aria-label={getTileAriaLabel(tile)}
      aria-selected={isSelected}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      initial={showCascade && !cascadeComplete ? {
        y: -100,
        opacity: 0,
        scale: 0.8,
      } : undefined}
      animate={{
        y: isSelected ? -2 : 0,
        opacity: tile.isCleared ? 0.4 : 1,
        scale: isSelected ? 1.05 : 1,
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
        borderRadius: 'clamp(4px, 1cqi, 8px)',
        fontSize: 'var(--cell-font-size)',
        animationDelay: effectiveCascadeDelay
          ? `${effectiveCascadeDelay}ms`
          : undefined,
        // CSS custom properties used by boss grid effect CSS
        ['--tile-index' as string]: index,
        ['--tile-row' as string]: tile.row,
        ['--tile-col' as string]: tile.col,
      }}
      className={cn(
        // Base tile styles — match GridComponent baseline
        'relative aspect-square flex items-center justify-center',
        'font-black cursor-pointer overflow-hidden',
        // Neo-brutalist corners — lighter border + softer hard shadow for airy feel
        'rounded-neo border border-black/20',
        'shadow-[1px_1px_0px_rgba(0,0,0,0.4)]',
        // Hover: brightness lift to signal interactivity (no new shadow needed)
        canInteract && 'hover:brightness-110',

        // Type-specific classes
        TILE_TYPE_CLASSES[tile.type],

        // Enhanced effect classes for special tiles
        enableComplexAnimations && tile.type === 'gold' && 'tile-gold-enhanced',
        enableComplexAnimations && tile.type === 'ice' && !tile.isCleared && 'tile-ice-enhanced',
        enableComplexAnimations && tile.type === 'bomb' && 'tile-bomb-enhanced',
        enableComplexAnimations && tile.type === 'time' && 'tile-time-enhanced',

        // Activation effect classes (one-time animation when tile effect triggers)
        enableComplexAnimations && tile.activationEffect && `tile-effect-${tile.activationEffect}`,

        // State classes
        tile.isCleared && 'tile-cleared opacity-40 pointer-events-none cursor-not-allowed',
        isLocked && 'opacity-50 pointer-events-none cursor-not-allowed ring-2 ring-neo-red/60',
        // Enhanced selection: CSS handles glow, ring, and animation
        isSelected && 'tile-selected-enhanced',
        // Keyboard focus indicator — visible ring for arrow key navigation
        isKeyboardFocused && !isSelected && 'ring-2 ring-neo-lime ring-offset-1 ring-offset-transparent z-10',
        tile.isFrozen && tile.type === 'ice' && 'tile-frozen',

        // Bomb row preview: highlight tiles in bomb's row when bomb is selected
        bombRowPreview !== null && tile.row === bombRowPreview && 'bomb-row-preview',

        // Adjacent hint: subtle ring showing which tiles can be selected next (classic grid behavior)
        isAdjacentHint && !isSelected && !isHintHighlighted && 'ring-2 ring-neo-lime/40 z-5',

        // Hint highlight: match GridComponent's lime bg + yellow glow style
        isHintHighlighted && !isSelected && [
          'bg-neo-lime text-neo-black border-2 border-neo-black/60 z-10',
          'shadow-[0_0_12px_rgba(255,225,53,0.5)]',
          'animate-pulse motion-reduce:animate-none',
        ],

        // Standard tile background — use same gradient as GridComponent
        tile.type === 'standard' && 'letter-tile-gradient text-neo-black',

        // Gold tile - golden glow
        tile.type === 'gold' && [
          'bg-linear-to-br from-neo-yellow via-yellow-300 to-amber-400',
          'text-neo-black',
          'border-amber-400/40',
        ],

        // Ice tile - blue frost
        tile.type === 'ice' && [
          'bg-linear-to-br from-cyan-100 via-blue-200 to-cyan-300',
          'text-blue-800',
          'border-cyan-300/40',
        ],

        // Bomb tile - danger red
        tile.type === 'bomb' && [
          'bg-linear-to-br from-red-400 via-red-500 to-orange-500',
          'text-neo-white',
          'border-red-500/40',
        ],

        // Time tile - emerald clock
        tile.type === 'time' && [
          'bg-linear-to-br from-emerald-300 via-teal-400 to-teal-500',
          'text-neo-white',
          'border-emerald-400/40',
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

      {/* Time bonus effect - floating +5s and clock */}
      {tile.activationEffect === 'timeBonus' && enableComplexAnimations && (
        <>
          <div className="tile-time-plus" />
          <div className="tile-time-clock" />
          <div className="tile-time-ring" />
        </>
      )}

      {/* ========== ACTIVATION LABEL (floating "+2x", "+5s" etc.) ========== */}
      {tile.activationEffect && enableComplexAnimations && (
        <div className="tile-activation-label">
          {tile.activationEffect === 'explode' && '2x'}
          {tile.activationEffect === 'timeBonus' && '+5s'}
          {tile.activationEffect === 'collect' && '3x'}
          {tile.activationEffect === 'melt' && '💧'}
        </div>
      )}

      {/* ========== SELECTION RIPPLE EFFECT ========== */}
      {/* Contained ripple that stays within cell bounds - no blur, no overflow */}
      {/* Selection glow ring — prominent inset highlight + radial fill */}
      {isSelected && !prefersReducedMotion && (
        <AdaptiveMotion.div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            borderRadius: 'clamp(4px, 1cqi, 8px)',
            // Refined golden inset ring — visible but not heavy
            boxShadow: 'inset 0 0 0 1.5px rgba(255,225,53,0.7), inset 0 0 8px rgba(255,200,80,0.3)',
            background: 'radial-gradient(circle at center, rgba(255,210,80,0.2) 0%, rgba(255,200,80,0.08) 55%, transparent 75%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.85] }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      )}

      {/* Letter — inherits theme fonts (Fredoka/Rubik) like GridComponent */}
      <span
        className={cn(
          'relative z-20 select-none',
          // Subtle text shadow for legibility without heaviness
          'drop-shadow-[0_1px_1px_rgb(0_0_0/0.3)]',
          // Extra contrast on dark tiles where text is light
          (tile.type === 'bomb' || tile.type === 'time') &&
            'drop-shadow-[0_1px_2px_rgb(0_0_0/0.5)]',
          tile.type === 'gold' && 'drop-shadow-[0_1px_1px_rgb(0_0_0/0.25)]'
        )}
      >
        {tile.letter}
      </span>

      {/* Tile badge (gold, bomb, time, frost overlay) */}
      <TileBadge type={tile.type} isFrozen={tile.isFrozen} />

      {/* Boss lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none rounded-neo bg-black/30">
          <span className="text-neo-red text-[0.6em] drop-shadow-[0_1px_2px_rgb(0_0_0/0.8)]">🔒</span>
        </div>
      )}
    </AdaptiveMotion.div>
  );
});

AdventureTile.displayName = 'AdventureTile';
