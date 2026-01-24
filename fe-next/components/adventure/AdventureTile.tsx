/**
 * AdventureTile Component
 *
 * Renders adventure mode tiles with enhanced visual effects for different tile types.
 * Supports gold (3x), ice (frozen), bomb (row clear), rainbow (wildcard),
 * chain (link bonus), and time (+5s) tiles with GPU-accelerated animations.
 */

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Bomb, Link2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TileState, TileType } from '@/types/adventure';
import './AdventureTile.css';

// ==============================================
// TYPES
// ==============================================

interface AdventureTileProps {
  /** Tile state including letter, type, and status */
  tile: TileState;
  /** Whether this tile is currently selected */
  isSelected?: boolean;
  /** Whether to enable complex animations (for low-end devices) */
  enableEffects?: boolean;
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

// Tile type translation keys - labels are retrieved via t() for i18n support
const TILE_TYPE_KEYS: Record<TileType, string> = {
  standard: '',
  gold: 'adventure.tiles.gold',
  ice: 'adventure.tiles.ice',
  bomb: 'adventure.tiles.bomb',
  rainbow: 'adventure.tiles.rainbow',
  chain: 'adventure.tiles.chain',
  time: 'adventure.tiles.time',
};

// ==============================================
// EFFECT COMPONENTS
// ==============================================

/** Gold tile sparkle effects */
const GoldEffects = memo(() => (
  <>
    <div className="tile-gold-sparkle tile-gold-sparkle--1" />
    <div className="tile-gold-sparkle tile-gold-sparkle--2" />
    <div className="tile-gold-sparkle tile-gold-sparkle--3" />
  </>
));
GoldEffects.displayName = 'GoldEffects';

/** Ice tile snowflake effects */
const IceEffects = memo(() => (
  <>
    <span className="tile-ice-snowflake tile-ice-snowflake--1">❄</span>
    <span className="tile-ice-snowflake tile-ice-snowflake--2">❄</span>
    <span className="tile-ice-snowflake tile-ice-snowflake--3">❄</span>
  </>
));
IceEffects.displayName = 'IceEffects';

/** Bomb tile warning rings and spark */
const BombEffects = memo(() => (
  <>
    <div className="tile-bomb-rings">
      <div className="tile-bomb-ring" />
      <div className="tile-bomb-ring tile-bomb-ring--2" />
      <div className="tile-bomb-ring tile-bomb-ring--3" />
    </div>
    <div className="tile-bomb-spark" />
  </>
));
BombEffects.displayName = 'BombEffects';

/** Rainbow tile orbiting particles */
const RainbowEffects = memo(() => (
  <>
    <div className="tile-rainbow-particle tile-rainbow-particle--1" />
    <div className="tile-rainbow-particle tile-rainbow-particle--2" />
    <div className="tile-rainbow-particle tile-rainbow-particle--3" />
    <div className="tile-rainbow-star" />
  </>
));
RainbowEffects.displayName = 'RainbowEffects';

/** Chain tile energy lines */
const ChainEffects = memo(() => (
  <>
    <div className="tile-chain-line tile-chain-line--top" />
    <div className="tile-chain-line tile-chain-line--bottom" />
  </>
));
ChainEffects.displayName = 'ChainEffects';

/** Time tile clock hand and particles */
const TimeEffects = memo(() => (
  <>
    <div className="tile-time-hand" />
    <div className="tile-time-particle tile-time-particle--1" />
    <div className="tile-time-particle tile-time-particle--2" />
    <div className="tile-time-particle tile-time-particle--3" />
  </>
));
TimeEffects.displayName = 'TimeEffects';

// ==============================================
// COMPONENT
// ==============================================

const AdventureTile = memo<AdventureTileProps>(
  ({ tile, isSelected = false, enableEffects = true, className }) => {
    const { letter, type, isCleared, isFrozen, cascadeDelay } = tile;
    const { t } = useLanguage();

    // Build aria-label for accessibility with i18n support
    const tileTypeLabel = TILE_TYPE_KEYS[type] ? t(TILE_TYPE_KEYS[type]) : '';
    const ariaLabel = type === 'standard'
      ? `Letter ${letter}`
      : `Letter ${letter}, ${tileTypeLabel}`;

    // Enhanced class for special tiles with effects
    const enhancedClass = enableEffects ? {
      gold: 'tile-gold-enhanced',
      ice: 'tile-ice-enhanced',
      bomb: 'tile-bomb-enhanced',
      rainbow: 'tile-rainbow-enhanced',
      chain: 'tile-chain-enhanced',
      time: 'tile-time-enhanced',
      standard: '',
    }[type] : '';

    return (
      <motion.div
        role="gridcell"
        aria-label={ariaLabel}
        aria-selected={isSelected}
        className={cn(
          // Base styles
          'relative aspect-square flex items-center justify-center',
          'font-black cursor-pointer',
          'border-2 border-neo-black/30 rounded-neo',
          'transition-all duration-200',

          // Type-specific classes
          TILE_TYPE_CLASSES[type],
          enhancedClass,

          // State classes
          isCleared && 'tile-cleared opacity-40',
          isSelected && 'tile-selected-enhanced ring-2 ring-neo-lime z-10 scale-105',
          isFrozen && type === 'ice' && 'tile-frozen',

          // Base background for standard
          type === 'standard' && 'letter-tile-gradient text-neo-black overflow-hidden',

          // Gold tile - golden glow
          type === 'gold' && [
            'bg-gradient-to-br from-neo-yellow via-yellow-400 to-amber-500',
            'text-neo-black',
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

          // Rainbow tile - handled by CSS animation
          type === 'rainbow' && [
            'text-neo-black',
            'border-purple-500/60',
          ],

          // Chain tile - purple link
          type === 'chain' && [
            'bg-gradient-to-br from-purple-400 via-violet-500 to-violet-600',
            'text-neo-white',
            'border-purple-700/60',
          ],

          // Time tile - emerald clock
          type === 'time' && [
            'bg-gradient-to-br from-emerald-400 via-teal-500 to-teal-600',
            'text-neo-white',
            'border-emerald-600/60',
          ],

          className
        )}
        style={{
          animationDelay: cascadeDelay ? `${cascadeDelay}ms` : undefined,
        }}
        initial={false}
        animate={{
          scale: isSelected ? 1.08 : 1,
          y: isSelected ? -3 : 0,
          rotate: isSelected ? [0, -2, 2, 0] : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
          rotate: { duration: 0.3, ease: 'easeInOut' },
        }}
      >
        {/* ========== GOLD TILE EFFECTS ========== */}
        {type === 'gold' && enableEffects && <GoldEffects />}

        {/* ========== ICE TILE EFFECTS ========== */}
        {type === 'ice' && enableEffects && <IceEffects />}

        {/* Frost overlay for frozen ice tiles */}
        {type === 'ice' && isFrozen && (
          <div
            className={cn(
              'frost-overlay absolute inset-0 rounded-neo',
              'bg-gradient-to-br from-white/50 via-cyan-100/40 to-blue-200/50',
              'backdrop-blur-[2px]',
              'pointer-events-none z-5'
            )}
          />
        )}

        {/* ========== BOMB TILE EFFECTS ========== */}
        {type === 'bomb' && !isCleared && enableEffects && <BombEffects />}

        {/* ========== RAINBOW TILE EFFECTS ========== */}
        {type === 'rainbow' && enableEffects && <RainbowEffects />}

        {/* ========== CHAIN TILE EFFECTS ========== */}
        {type === 'chain' && enableEffects && <ChainEffects />}

        {/* ========== TIME TILE EFFECTS ========== */}
        {type === 'time' && enableEffects && <TimeEffects />}

        {/* Letter text */}
        <span
          className={cn(
            'relative z-10 select-none',
            'text-[clamp(1rem,4cqw,2rem)]',
            'drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]',
            type === 'rainbow' && 'text-neo-black font-black',
            // Enhanced text shadow for better visibility on animated backgrounds
            (type === 'gold' || type === 'rainbow') && 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
          )}
        >
          {letter}
        </span>

        {/* ========== BADGES ========== */}

        {/* Gold tile multiplier badge */}
        {type === 'gold' && (
          <span
            className={cn(
              'tile-gold-badge',
              'absolute -top-1.5 -right-1.5 z-20',
              'min-w-[22px] h-[22px]',
              'flex items-center justify-center',
              'bg-neo-black text-neo-yellow',
              'text-[11px] font-black',
              'rounded-full border-2 border-neo-yellow',
              'shadow-[0_0_10px_rgba(255,225,53,0.7)]'
            )}
          >
            3x
          </span>
        )}

        {/* Rainbow tile wildcard badge */}
        {type === 'rainbow' && (
          <span
            className={cn(
              'absolute -top-1.5 -right-1.5 z-20',
              'min-w-[22px] h-[22px]',
              'flex items-center justify-center',
              'bg-neo-black text-neo-white',
              'text-[16px] font-black',
              'rounded-full border-2 border-purple-400',
              'shadow-[0_0_10px_rgba(168,85,247,0.6)]'
            )}
          >
            ✦
          </span>
        )}

        {/* Bomb icon badge */}
        {type === 'bomb' && (
          <div
            className={cn(
              'absolute -top-1 -right-1 z-20',
              'w-5 h-5',
              'flex items-center justify-center',
              'bg-neo-black rounded-full',
              'border-2 border-orange-500',
              'shadow-[0_0_8px_rgba(255,100,0,0.6)]'
            )}
          >
            <Bomb
              data-testid="bomb-icon"
              className="w-3 h-3 text-neo-yellow"
            />
          </div>
        )}

        {/* Chain link badge */}
        {type === 'chain' && (
          <div
            className={cn(
              'absolute -top-1 -right-1 z-20',
              'w-5 h-5',
              'flex items-center justify-center',
              'bg-neo-black rounded-full',
              'border-2 border-purple-400',
              'shadow-[0_0_8px_rgba(138,43,226,0.6)]'
            )}
          >
            <Link2
              data-testid="chain-icon"
              className="w-3 h-3 text-purple-400"
            />
          </div>
        )}

        {/* Time bonus badge */}
        {type === 'time' && (
          <div
            className={cn(
              'absolute -top-1 -right-1 z-20',
              'w-5 h-5',
              'flex items-center justify-center',
              'bg-neo-black rounded-full',
              'border-2 border-emerald-400',
              'shadow-[0_0_8px_rgba(16,185,129,0.6)]'
            )}
          >
            <Clock
              data-testid="time-icon"
              className="w-3 h-3 text-emerald-400"
            />
          </div>
        )}
      </motion.div>
    );
  }
);

AdventureTile.displayName = 'AdventureTile';

export default AdventureTile;
