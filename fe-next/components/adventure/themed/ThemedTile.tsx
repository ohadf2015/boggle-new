/**
 * ThemedTile Component
 *
 * Wraps tile content with world-specific styling (texture, border, letter glow).
 * Only applies theming to standard tiles - special tiles maintain their distinct appearance.
 *
 * Note: This is a lightweight wrapper component that adds world theming to existing tiles.
 * For full tile rendering with animations, see AdventureGrid which wraps content with this component.
 */

'use client';

import React, { memo, useMemo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Bomb, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdventureTheme } from '@/contexts/AdventureThemeContext';
import type { TileState, TileType } from '@/types/adventure';
import type { TileVisualConfig } from '@/lib/adventure/themes/types';

// ==============================================
// THEMING CONSTANTS (NEW - for texture/border overlay)
// ==============================================

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

// Tile types that should NOT receive texture/border theming
const SPECIAL_TILE_TYPES: Set<TileType> = new Set([
  'gold',
  'ice',
  'bomb',
  'time',
]);

// ==============================================
// TYPES
// ==============================================

interface ThemedTileProps {
  /** Tile state including letter, type, and status */
  tile: TileState;
  /** Whether this tile is currently selected */
  isSelected?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function buildTileClasses(
  config: TileVisualConfig,
  isSelected: boolean,
  isCleared: boolean,
  isFrozen: boolean
): string {
  const classes: string[] = [
    // Base from config
    config.baseClasses,
    config.borderColor,

    // Gradient background
    `bg-linear-to-br from-${config.gradientFrom} to-${config.gradientTo}`,

    // Shadow style
    config.shadowStyle === 'hard' && 'shadow-hard-sm',
    config.shadowStyle === 'glow' && config.shadowColor && `shadow-[0_0_12px_${config.shadowColor}]`,

    // State classes
    isCleared && 'opacity-40 pointer-events-none',
    isSelected && 'ring-2 z-10 scale-105',
    isFrozen && 'ring-2 ring-cyan-400',
  ].filter(Boolean) as string[];

  return cn(classes);
}

function getTileIcon(type: TileType): React.ReactNode {
  switch (type) {
    case 'bomb':
      return <Bomb className="w-4 h-4 text-neo-yellow drop-shadow-lg" />;
    case 'time':
      return <Clock className="w-4 h-4 text-emerald-200 drop-shadow-lg" />;
    default:
      return null;
  }
}

// ==============================================
// SUB-COMPONENTS
// ==============================================

interface TileOverlayProps {
  type: TileVisualConfig['overlayType'];
  config: TileVisualConfig;
}

const TileOverlay = memo<TileOverlayProps>(({ type, config }) => {
  switch (type) {
    case 'sparkle':
      return (
        <AdaptiveMotion.div
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo"
          animate={{
            background: [
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      );

    case 'frost':
      return (
        <div className={cn(
          'absolute inset-0 rounded-neo pointer-events-none',
          'bg-linear-to-br from-white/40 via-cyan-100/30 to-blue-200/40'
        )} />
      );

    case 'flames':
      return (
        <AdaptiveMotion.div
          className="absolute inset-0 pointer-events-none rounded-neo"
          style={{ boxShadow: '0 0 15px rgba(255, 100, 50, 0.7)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        />
      );

    case 'chain-link':
      return (
        <div className={cn(
          'absolute inset-0 rounded-neo pointer-events-none',
          'border-2 border-dashed border-purple-400/50'
        )} />
      );

    case 'clock':
      return (
        <AdaptiveMotion.div
          className="absolute inset-0 pointer-events-none rounded-neo"
          style={{ boxShadow: '0 0 12px rgba(50, 200, 150, 0.6)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      );

    case 'none':
    default:
      return null;
  }
});

TileOverlay.displayName = 'TileOverlay';

interface TileBadgeProps {
  text?: string;
  background?: string;
  config: TileVisualConfig;
}

const TileBadge = memo<TileBadgeProps>(({ text, background, config }) => {
  if (!text) return null;

  return (
    <span
      className={cn(
        'absolute -top-1 -end-1 z-20',
        'min-w-5 h-5',
        'flex items-center justify-center',
        'text-[10px] font-black text-neo-white',
        'rounded-full border-2 border-neo-black/50',
        background || config.badgeBackground
      )}
    >
      {text}
    </span>
  );
});

TileBadge.displayName = 'TileBadge';

// ==============================================
// MAIN COMPONENT
// ==============================================

const ThemedTile = memo<ThemedTileProps>(
  ({ tile, isSelected = false, className, onClick }) => {
    const { getTileConfig, theme, worldId } = useAdventureTheme();
    const { letter, type, isCleared, isFrozen, cascadeDelay } = tile;

    // Get theme-based visual config for this tile type
    const config = useMemo(() => getTileConfig(type), [getTileConfig, type]);

    // Build dynamic classes based on config
    const tileClasses = useMemo(
      () => buildTileClasses(config, isSelected, isCleared || false, isFrozen || false),
      [config, isSelected, isCleared, isFrozen]
    );

    // World-specific theming (NEW)
    const isStandardTile = !SPECIAL_TILE_TYPES.has(type);
    const textureClass = isStandardTile ? TEXTURE_CLASSES[worldId] : '';
    const borderClass = isStandardTile ? BORDER_CLASSES[worldId] : '';
    const letterGlowClass = LETTER_GLOW_CLASSES[worldId] || LETTER_GLOW_CLASSES[1];

    // Get the icon for special tiles
    const icon = getTileIcon(type);

    // Accessibility label
    const ariaLabel = type === 'standard'
      ? `Letter ${letter}`
      : `Letter ${letter}, ${type} tile`;

    // Animation variants based on theme
    const entryAnimation = theme.animations.tileEntry;
    const getEntryVariants = () => {
      switch (entryAnimation) {
        case 'cascade':
          return { initial: { y: -20, opacity: 0 }, animate: { y: 0, opacity: 1 } };
        case 'wave':
          return { initial: { x: -20, opacity: 0 }, animate: { x: 0, opacity: 1 } };
        case 'spiral':
          return { initial: { scale: 0, rotate: -180 }, animate: { scale: 1, rotate: 0 } };
        case 'fade':
        default:
          return { initial: { opacity: 0 }, animate: { opacity: 1 } };
      }
    };

    const entryVariants = getEntryVariants();

    return (
      <AdaptiveMotion.div
        role="gridcell"
        aria-label={ariaLabel}
        aria-selected={isSelected}
        onClick={onClick}
        className={cn(
          // Base styles
          'relative aspect-square flex items-center justify-center',
          'font-black cursor-pointer overflow-hidden',
          'transition-all duration-200',

          // Theme-based classes
          tileClasses,

          // World-specific theming (NEW)
          textureClass,
          borderClass,

          // Selection ring uses theme primary color
          isSelected && `ring-${theme.colors.primary}`,

          // Custom className
          className
        )}
        data-world={worldId}
        data-tile-type={type}
        style={{
          animationDelay: cascadeDelay ? `${cascadeDelay}ms` : undefined,
        }}
        initial={entryVariants.initial}
        animate={{
          ...entryVariants.animate,
          scale: isSelected ? 1.05 : 1,
          y: isSelected ? -2 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: cascadeDelay ? cascadeDelay / 1000 : 0,
        }}
        whileHover={!isCleared ? { scale: 1.02 } : undefined}
      >
        {/* Theme-specific overlay effects */}
        <TileOverlay type={config.overlayType} config={config} />

        {/* Show texture on standard tiles */}
        {config.showTexture && (
          <div className="absolute inset-0 opacity-10 bg-[url('/images/textures/grain.png')] rounded-neo" />
        )}

        {/* Letter text */}
        <span
          className={cn(
            'relative z-10 select-none',
            'text-[clamp(1rem,4cqw,2rem)]',
            type === 'standard' ? 'text-neo-black' : 'text-inherit',
            letterGlowClass  // World-specific letter glow (NEW)
          )}
        >
          {letter}
        </span>

        {/* Badge (for gold, rainbow, time tiles) */}
        <TileBadge
          text={config.badgeText}
          background={config.badgeBackground}
          config={config}
        />

        {/* Icon for bomb, chain, time tiles */}
        {icon && (
          <span className="absolute top-0.5 end-0.5 z-20">
            {icon}
          </span>
        )}

      </AdaptiveMotion.div>
    );
  }
);

ThemedTile.displayName = 'ThemedTile';

export default ThemedTile;
