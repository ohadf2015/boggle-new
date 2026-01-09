'use client';

import { motion } from 'framer-motion';
import { memo, ReactNode } from 'react';
import { ArrowRight, Search, Users, Trophy, Gamepad2 } from 'lucide-react';
import Image from 'next/image';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

type MascotVariant = 'happy' | 'encouraging' | 'thinking' | 'oops' | 'celebrating';
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

const MASCOT_IMAGES: Record<MascotVariant, string> = {
  happy: '/mascot/lexi-happy.png',
  encouraging: '/mascot/lexi-encouraging.png',
  thinking: '/mascot/lexi-thinking.png',
  oops: '/mascot/lexi-oops.png',
  celebrating: '/mascot/lexi-celebrating.png',
};

const TYPE_CONFIG: Record<EmptyStateType, { icon: ReactNode; mascot: MascotVariant; emoji: string }> = {
  'no-words': { icon: <Search className="w-full h-full" />, mascot: 'encouraging', emoji: '🔎' },
  'waiting-players': { icon: <Users className="w-full h-full" />, mascot: 'happy', emoji: '👋' },
  'no-games': { icon: <Gamepad2 className="w-full h-full" />, mascot: 'encouraging', emoji: '🎮' },
  'no-results': { icon: <Trophy className="w-full h-full" />, mascot: 'thinking', emoji: '📊' },
  'error': { icon: null, mascot: 'oops', emoji: '😅' },
  'custom': { icon: null, mascot: 'happy', emoji: '✨' },
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
    sm: { container: 'p-4', mascot: 'w-16 h-16', icon: 'w-10 h-10', title: 'text-base', desc: 'text-xs' },
    md: { container: 'p-6', mascot: 'w-24 h-24', icon: 'w-12 h-12', title: 'text-lg', desc: 'text-sm' },
    lg: { container: 'p-8', mascot: 'w-32 h-32', icon: 'w-16 h-16', title: 'text-xl', desc: 'text-base' },
  };

  const arrowRotation = {
    left: 'rotate-180',
    right: 'rotate-0',
    up: '-rotate-90',
    down: 'rotate-90',
  };

  // Animation variants
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
        <motion.div
          className={`${sizeClasses[size].mascot} mx-auto mb-4 relative`}
          {...floatAnimation}
        >
          <Image
            src={MASCOT_IMAGES[actualMascot]}
            alt="Lexi mascot"
            fill
            className="object-contain"
            priority={false}
          />
        </motion.div>
      ) : actualIcon ? (
        <motion.div
          className={`${sizeClasses[size].icon} mx-auto mb-4 text-neo-yellow`}
          {...floatAnimation}
        >
          {actualIcon}
        </motion.div>
      ) : (
        <motion.div
          className="text-5xl mb-4"
          {...floatAnimation}
        >
          {config.emoji}
        </motion.div>
      )}

      {/* Title */}
      <h3 className={`${sizeClasses[size].title} font-neo-display font-black text-neo-yellow uppercase mb-2`}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={`${sizeClasses[size].desc} text-neo-white/70 font-neo-body max-w-xs mx-auto`}>
          {description}
        </p>
      )}

      {/* Arrow indicator */}
      {showArrow && (
        <motion.div
          className={`mt-4 text-neo-cyan ${arrowRotation[arrowDirection]}`}
          {...arrowAnimation}
        >
          <ArrowRight className="w-8 h-8 mx-auto" />
        </motion.div>
      )}

      {/* Action button */}
      {action && (
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {action}
        </motion.div>
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
          <span key={i} className={`w-2 h-2 bg-${color} rounded-full opacity-70`} />
        ))}
      </span>
    );
  }

  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
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

export default EmptyState;
