/**
 * AdventureTile Component
 *
 * Renders adventure mode tiles with special visual effects for different tile types.
 * Supports gold (3x), ice (frozen), bomb (row clear), and rainbow (wildcard) tiles.
 */

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Bomb } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TileState, TileType } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface AdventureTileProps {
  /** Tile state including letter, type, and status */
  tile: TileState;
  /** Whether this tile is currently selected */
  isSelected?: boolean;
  /** Additional CSS classes */
  className?: string;
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
};

const TILE_TYPE_LABELS: Record<TileType, string> = {
  standard: '',
  gold: 'gold tile (3x multiplier)',
  ice: 'ice tile (obstacle)',
  bomb: 'bomb tile (clears row)',
  rainbow: 'rainbow tile (wildcard)',
  chain: 'chain tile (link bonus)',
  time: 'time tile (+5 seconds)',
};

// ==============================================
// COMPONENT
// ==============================================

const AdventureTile = memo<AdventureTileProps>(
  ({ tile, isSelected = false, className }) => {
    const { letter, type, isCleared, isFrozen, cascadeDelay } = tile;

    // Build aria-label for accessibility
    const ariaLabel = type === 'standard'
      ? `Letter ${letter}`
      : `Letter ${letter}, ${TILE_TYPE_LABELS[type]}`;

    return (
      <motion.div
        role="gridcell"
        aria-label={ariaLabel}
        aria-selected={isSelected}
        className={cn(
          // Base styles
          'relative aspect-square flex items-center justify-center',
          'font-black cursor-pointer overflow-hidden',
          'border-2 border-neo-black/30 rounded-neo',
          'transition-all duration-200',

          // Type-specific classes
          TILE_TYPE_CLASSES[type],

          // State classes
          isCleared && 'tile-cleared opacity-40',
          isSelected && 'tile-selected ring-2 ring-neo-cyan z-10 scale-105',
          isFrozen && type === 'ice' && 'tile-frozen',

          // Base background for standard
          type === 'standard' && 'letter-tile-gradient text-neo-black',

          // Gold tile - golden glow
          type === 'gold' && [
            'bg-gradient-to-br from-neo-yellow via-yellow-400 to-amber-500',
            'text-neo-black shadow-[0_0_12px_rgba(255,225,53,0.6)]',
            'border-amber-600/60',
          ],

          // Ice tile - blue frost
          type === 'ice' && [
            'bg-gradient-to-br from-cyan-200 via-blue-300 to-cyan-400',
            'text-blue-900',
            'border-cyan-500/60',
          ],

          // Bomb tile - danger red
          type === 'bomb' && [
            'bg-gradient-to-br from-red-500 via-red-600 to-orange-600',
            'text-neo-white',
            'border-red-700/60',
          ],

          // Rainbow tile - multi-color
          type === 'rainbow' && [
            'text-neo-black',
            'border-purple-500/60',
          ],

          className
        )}
        style={{
          animationDelay: cascadeDelay ? `${cascadeDelay}ms` : undefined,
        }}
        initial={false}
        animate={{
          scale: isSelected ? 1.05 : 1,
          y: isSelected ? -2 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
        }}
      >
        {/* Rainbow gradient background animation */}
        {type === 'rainbow' && (
          <div
            className={cn(
              'rainbow-gradient absolute inset-0 rounded-neo',
              'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500',
              'animate-rainbow-shift bg-[length:200%_200%]'
            )}
            style={{
              animation: 'rainbow-shift 3s ease infinite',
            }}
          />
        )}

        {/* Frost overlay for ice tiles */}
        {type === 'ice' && isFrozen && (
          <div
            className={cn(
              'frost-overlay absolute inset-0 rounded-neo',
              'bg-gradient-to-br from-white/40 via-cyan-100/30 to-blue-200/40',
              'backdrop-blur-[1px]',
              'pointer-events-none'
            )}
          />
        )}

        {/* Bomb pulse animation */}
        {type === 'bomb' && !isCleared && (
          <motion.div
            className="bomb-pulse absolute inset-0 rounded-neo"
            animate={{
              boxShadow: [
                '0 0 0px rgba(255, 0, 0, 0)',
                '0 0 15px rgba(255, 0, 0, 0.6)',
                '0 0 0px rgba(255, 0, 0, 0)',
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Letter text */}
        <span
          className={cn(
            'relative z-10 select-none',
            'text-[clamp(1rem,4cqw,2rem)]',
            type === 'rainbow' && 'text-neo-black font-black'
          )}
        >
          {letter}
        </span>

        {/* Gold tile multiplier badge */}
        {type === 'gold' && (
          <span
            className={cn(
              'absolute -top-1 -right-1 z-20',
              'min-w-[20px] h-[20px]',
              'flex items-center justify-center',
              'bg-neo-black text-neo-yellow',
              'text-[10px] font-black',
              'rounded-full border-2 border-neo-yellow',
              'shadow-[0_0_8px_rgba(255,225,53,0.6)]'
            )}
          >
            3x
          </span>
        )}

        {/* Rainbow tile wildcard badge */}
        {type === 'rainbow' && (
          <span
            className={cn(
              'absolute -top-1 -right-1 z-20',
              'min-w-[20px] h-[20px]',
              'flex items-center justify-center',
              'bg-neo-black text-neo-white',
              'text-[14px] font-black',
              'rounded-full border-2 border-purple-500'
            )}
          >
            *
          </span>
        )}

        {/* Bomb icon */}
        {type === 'bomb' && (
          <Bomb
            data-testid="bomb-icon"
            className={cn(
              'absolute top-0.5 right-0.5 z-20',
              'w-4 h-4 text-neo-yellow',
              'drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]'
            )}
          />
        )}
      </motion.div>
    );
  }
);

AdventureTile.displayName = 'AdventureTile';

export default AdventureTile;
