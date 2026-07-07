'use client';

/**
 * GameBadge - Unified Animated Badge Component
 *
 * Consolidates all game-specific badge variants with animations into a single component.
 *
 * Replaced NewPlayerBadge (components/game/NewPlayerBadge.tsx) and
 * LateJoinerBadge (components/game/LateJoinerBadge.tsx) — both deleted.
 * NewBadge (components/brain/NewBadge.tsx), RankBadge and ScoreBadge
 * (components/daily/results/) were NOT actually migrated despite once being
 * listed here — they're still live, separate components. Fold them into
 * GameBadge only with the same call-site-by-call-site care as any other
 * live-component consolidation, not by assuming this comment is accurate.
 *
 * This component is specifically for game-related badges that need animations,
 * auto-hide functionality, and game-specific styling. For general-purpose badges
 * without animations, use the standard Badge component from ui/Badge.tsx.
 *
 * @module components/ui/GameBadge
 */

import React, { useEffect, useState, type ReactNode } from 'react';
import { type HTMLMotionProps } from 'framer-motion';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useSafeTimeout } from '@/hooks/useSafeTimeout';

// ==================== Types ====================

export type GameBadgeVariant =
  | 'new-player'      // Pink badge for new players
  | 'new-feature'     // Lime badge for new features/scores
  | 'late-joiner'     // Pink/transparent badge for late joiners
  | 'rank'            // Amber badge for rank display
  | 'score-success'   // Emerald badge for solved challenges
  | 'score-fail'      // Gray badge for failed challenges
  | 'streak'          // Orange badge for streaks
  | 'default';        // Default Neo-Navy styling

export type GameBadgeSize = 'xs' | 'sm' | 'md';

export type GameBadgeAnimation =
  | 'spring'   // Pop-in spring animation
  | 'pulse'    // Continuous pulsing
  | 'wobble'   // Rotation wobble (applies to icon only)
  | 'pop'      // Scale pop with rotation
  | false;     // No animation

export interface GameBadgeProps extends Omit<HTMLMotionProps<'span'>, 'children'> {
  /** Visual variant determining colors and styling */
  variant?: GameBadgeVariant;

  /** Size of the badge */
  size?: GameBadgeSize;

  /** Icon component (from lucide-react) or emoji string to display */
  icon?: React.ElementType | string;

  /** Animation type to apply */
  animate?: GameBadgeAnimation;

  /** Auto-hide after specified milliseconds (0 = no auto-hide) */
  autoHideMs?: number;

  /** Callback when badge auto-hides */
  onAutoHide?: () => void;

  /** Badge content (text or elements) */
  children: ReactNode;

  /** Additional CSS classes */
  className?: string;

  /** Click handler for interactive badges */
  onClick?: () => void;
}

// ==================== Variant Configurations ====================

const VARIANT_STYLES: Record<GameBadgeVariant, string> = {
  'new-player': 'bg-neo-pink text-neo-black border-neo-black/50',
  'new-feature': 'bg-neo-lime text-neo-black border-neo-black',
  'late-joiner': 'bg-neo-pink/20 text-neo-black border-neo-black',
  'rank': 'bg-amber-400 text-neo-black border-neo-black',
  'score-success': 'bg-emerald-500 text-white border-neo-black',
  'score-fail': 'bg-neo-gray text-white border-neo-black',
  'streak': 'bg-orange-500 text-white border-neo-black',
  'default': 'bg-neo-navy text-neo-white border-neo-white/20',
};

const SIZE_CLASSES: Record<GameBadgeSize, string> = {
  xs: 'text-[8px] px-1 py-0.5 gap-0.5',
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
};

const ICON_SIZES: Record<GameBadgeSize, string> = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
};

// ==================== Animation Configurations ====================

const ANIMATION_VARIANTS = {
  spring: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
    transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
  },
  pulse: {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.1, 1],
    },
    exit: { scale: 1, opacity: 0 },
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: "easeInOut" as const,
    },
  },
  wobble: {
    // Applied to icon only, not the whole badge
    initial: {},
    animate: {
      rotate: [0, 10, -10, 0],
    },
    exit: {},
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatDelay: 2,
    },
  },
  pop: {
    initial: { scale: 0, rotate: -10 },
    animate: { scale: 1, rotate: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: 'spring' as const, delay: 0.1 },
  },
};

// ==================== Component ====================

/**
 * GameBadge - Animated badge for game-specific UI elements
 *
 * @example
 * // New player badge with sparkles
 * <GameBadge variant="new-player" icon={Sparkles} animate="spring">
 *   {t('player.new')}
 * </GameBadge>
 *
 * @example
 * // Late joiner with emoji and auto-hide
 * <GameBadge
 *   variant="late-joiner"
 *   icon="🚀"
 *   animate="wobble"
 *   autoHideMs={30000}
 *   onAutoHide={() => console.log('Badge hidden')}
 * >
 *   {t('lateJoiner.badge')}
 * </GameBadge>
 *
 * @example
 * // Rank badge with trophy icon
 * <GameBadge variant="rank" icon={Trophy} animate="pop" size="md">
 *   Rank {rank}/{total}
 * </GameBadge>
 */
export const GameBadge = React.memo<GameBadgeProps>(({
  variant = 'default',
  size = 'sm',
  icon: Icon,
  animate = 'spring',
  autoHideMs = 0,
  onAutoHide,
  children,
  className,
  onClick,
  ...motionProps
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const { set: safeSetTimeout, clear: safeClearTimeout } = useSafeTimeout();

  // Auto-hide functionality
  useEffect(() => {
    if (!autoHideMs || autoHideMs <= 0) return;

    safeSetTimeout(() => {
      setIsVisible(false);
      onAutoHide?.();
    }, autoHideMs);

    return () => safeClearTimeout();
  }, [autoHideMs, onAutoHide, safeSetTimeout, safeClearTimeout]);

  // Base classes for all badges
  const baseClasses = cn(
    'inline-flex items-center font-black uppercase tracking-wider',
    'rounded-neo border-2 shadow-hard-sm',
    'transition-transform',
    SIZE_CLASSES[size],
    VARIANT_STYLES[variant],
    onClick && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
    className
  );

  // Render icon (component or emoji)
  const renderIcon = () => {
    if (!Icon) return null;

    // If Icon is a string (emoji), render as text
    if (typeof Icon === 'string') {
      return <span className="text-xs">{Icon}</span>;
    }

    // Otherwise render as React component (Lucide icon)
    const IconComponent = Icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className={ICON_SIZES[size]} />;
  };

  // Content without animation
  const staticContent = (
    <span
      className={baseClasses}
      onClick={onClick}
    >
      {renderIcon()}
      {children}
    </span>
  );

  // No animation - return content directly
  if (!animate) {
    if (autoHideMs > 0) {
      return (
        <AdaptiveAnimatePresence>
          {isVisible && staticContent}
        </AdaptiveAnimatePresence>
      );
    }
    return staticContent;
  }

  // Get animation configuration
  const animConfig = ANIMATION_VARIANTS[animate];

  // Wobble animation applies to icon only, not the whole badge
  if (animate === 'wobble' && Icon) {
    return (
      <AdaptiveAnimatePresence>
        {isVisible && (
          <span
            className={baseClasses}
            onClick={onClick}
          >
            <AdaptiveMotion.span
              animate={animConfig.animate}
              transition={animConfig.transition}
            >
              {renderIcon()}
            </AdaptiveMotion.span>
            {children}
          </span>
        )}
      </AdaptiveAnimatePresence>
    );
  }

  // Standard animation (spring, pulse, pop)
  return (
    <AdaptiveAnimatePresence>
      {isVisible && (
        <AdaptiveMotion.span
          className={baseClasses}
          onClick={onClick}
          initial={animConfig.initial}
          animate={animConfig.animate}
          exit={animConfig.exit}
          transition={animConfig.transition}
          {...motionProps}
        >
          {renderIcon()}
          {children}
        </AdaptiveMotion.span>
      )}
    </AdaptiveAnimatePresence>
  );
});

GameBadge.displayName = 'GameBadge';

export default GameBadge;
