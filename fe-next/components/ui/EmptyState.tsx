'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { memo, ReactNode } from 'react';
import { ArrowRight, Search, Users, Trophy, Gamepad2 } from 'lucide-react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { Mascot, MascotVariant } from './Mascot';

type EmptyStateType = 'no-words' | 'waiting-players' | 'no-games' | 'no-results' | 'error' | 'custom';

interface EmptyStateProps {
  /** Type of empty state - determines default icon and mascot */
  type?: EmptyStateType;
  /** Main heading text */
  title: string;
  /** Description/subtitle text */
  description?: string;
  /** Custom icon to show (overrides type default) */
  icon?: ReactNode;
  /** Show mascot character */
  showMascot?: boolean;
  /** Mascot expression variant */
  mascotVariant?: MascotVariant;
  /** Show animated arrow pointing to action */
  showArrow?: boolean;
  /** Arrow direction */
  arrowDirection?: 'left' | 'right' | 'up' | 'down';
  /** Custom action button */
  action?: ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const TYPE_CONFIG: Record<EmptyStateType, { icon: ReactNode; mascot: MascotVariant; emoji: string }> = {
  'no-words': { icon: <Search className="w-full h-full" />, mascot: 'explorer', emoji: '🔎' },
  'waiting-players': { icon: <Users className="w-full h-full" />, mascot: 'waiting', emoji: '👋' },
  'no-games': { icon: <Gamepad2 className="w-full h-full" />, mascot: 'sleepy', emoji: '🎮' },
  'no-results': { icon: <Trophy className="w-full h-full" />, mascot: 'thinking', emoji: '📊' },
  'error': { icon: null, mascot: 'oops', emoji: '😅' },
  'custom': { icon: null, mascot: 'encouraging', emoji: '✨' },
};

// Map size to mascot size
const SIZE_TO_MASCOT: Record<'sm' | 'md' | 'lg', 'xs' | 'sm' | 'md'> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
};

/**
 * Animated empty state component with mascot support
 * Used for no-data, waiting, and error states
 */
export const EmptyState = memo(function EmptyState({
  type = 'custom',
  title,
  description,
  icon,
  showMascot = true,
  mascotVariant,
  showArrow = false,
  arrowDirection = 'right',
  action,
  size = 'md',
}: EmptyStateProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const config = TYPE_CONFIG[type];
  const actualMascot = mascotVariant || config.mascot;
  const actualIcon = icon || config.icon;

  const sizeClasses = {
    sm: { container: 'p-4', icon: 'w-10 h-10', title: 'text-base', desc: 'text-xs' },
    md: { container: 'p-6', icon: 'w-12 h-12', title: 'text-lg', desc: 'text-sm' },
    lg: { container: 'p-8', icon: 'w-16 h-16', title: 'text-xl', desc: 'text-base' },
  };

  const arrowRotation = {
    left: 'rotate-180',
    right: 'rotate-0',
    up: '-rotate-90',
    down: 'rotate-90',
  };

  // Fallback float animation for icons/emoji
  const floatAnimation = prefersReducedMotion || !enableComplexAnimations
    ? {}
    : {
        animate: {
          y: [0, -8, 0],
          rotate: [0, -2, 2, 0],
        },
        transition: {
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      };

  const arrowAnimation = prefersReducedMotion || !enableComplexAnimations
    ? {}
    : {
        animate: { x: [0, 10, 0] },
        transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const },
      };

  return (
    <div className={`text-center ${sizeClasses[size].container}`}>
      {/* Mascot or Icon */}
      {showMascot ? (
        <div className="flex justify-center mb-4">
          <Mascot
            variant={actualMascot}
            size={SIZE_TO_MASCOT[size]}
            animated={!prefersReducedMotion && enableComplexAnimations}
          />
        </div>
      ) : actualIcon ? (
        <AdaptiveMotion.div
          className={`${sizeClasses[size].icon} mx-auto mb-4 text-neo-lime`}
          {...floatAnimation}
        >
          {actualIcon}
        </AdaptiveMotion.div>
      ) : (
        <AdaptiveMotion.div
          className="text-5xl mb-4"
          {...floatAnimation}
        >
          {config.emoji}
        </AdaptiveMotion.div>
      )}

      {/* Title */}
      <h3 className={`${sizeClasses[size].title} font-neo-display font-black text-neo-lime uppercase mb-2`}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={`${sizeClasses[size].desc} text-neo-white font-neo-body max-w-xs mx-auto`}>
          {description}
        </p>
      )}

      {/* Arrow indicator */}
      {showArrow && (
        <AdaptiveMotion.div
          className={`mt-4 text-neo-cyan ${arrowRotation[arrowDirection]}`}
          {...arrowAnimation}
        >
          <ArrowRight className="w-8 h-8 mx-auto" />
        </AdaptiveMotion.div>
      )}

      {/* Action button */}
      {action && (
        <AdaptiveMotion.div
          className="mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {action}
        </AdaptiveMotion.div>
      )}
    </div>
  );
});

/**
 * Bouncing dots loader for inline waiting states
 */
export const WaitingDots = memo(function WaitingDots({ color = 'neo-cyan' }: { color?: string }) {
  const { prefersReducedMotion } = useDevicePerformance();

  if (prefersReducedMotion) {
    return (
      <span className="inline-flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={`dot-${i}`} className={`w-2 h-2 bg-${color} rounded-full opacity-70`} />
        ))}
      </span>
    );
  }

  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <AdaptiveMotion.span
          key={`dot-${i}`}
          className={`w-2 h-2 bg-${color} rounded-full`}
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.5,
            delay: i * 0.12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  );
});

// Re-export MascotVariant for convenience
export type { MascotVariant };

export default EmptyState;
