'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';
import Image from 'next/image';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

/**
 * Size presets for the DJ mascot
 */
type MascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<MascotSize, string> = {
  xs: 'w-10 h-10',
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-40 h-40',
};

const SIZE_PIXELS: Record<MascotSize, number> = {
  xs: 40,
  sm: 64,
  md: 96,
  lg: 128,
  xl: 160,
};

interface DJMascotProps {
  /** Size of the mascot */
  size?: MascotSize;
  /** Custom class name for the container */
  className?: string;
  /** Priority loading for above-the-fold mascots */
  priority?: boolean;
  /** Alt text override */
  alt?: string;
}

/**
 * DJMascot - Decorative DJ mascot for multiplayer lobby
 *
 * Uses animated GIF with rhythmic CSS animation (bobbing to the beat).
 * Respects reduced motion preferences.
 *
 * @example
 * // In multiplayer lobby
 * <DJMascot size="md" />
 *
 * // Larger for hero placement
 * <DJMascot size="lg" className="hidden sm:block" />
 */
export const DJMascot = memo(function DJMascot({
  size = 'md',
  className = '',
  priority = false,
  alt,
}: DJMascotProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const shouldAnimate = !prefersReducedMotion && enableComplexAnimations;

  const altText = alt || 'DJ Lexi mascot';

  return (
    <motion.div
      className={`relative ${SIZE_CLASSES[size]} ${className}`}
      animate={
        shouldAnimate
          ? {
              // Rhythmic bounce like bobbing to music
              y: [0, -6, 0, -4, 0],
              rotate: [0, -2, 0, 2, 0],
              scale: [1, 1.02, 1, 1.01, 1],
            }
          : undefined
      }
      transition={{
        duration: 1.2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <Image
        src="/mascot/dj-nobg.gif"
        alt={altText}
        width={SIZE_PIXELS[size]}
        height={SIZE_PIXELS[size]}
        className="object-contain drop-shadow-lg"
        priority={priority}
        unoptimized
      />
    </motion.div>
  );
});

/**
 * DJMascot with entrance animation
 */
export const DJMascotWithEntrance = memo(function DJMascotWithEntrance({
  delay = 0,
  ...props
}: DJMascotProps & { delay?: number }) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const shouldAnimate = !prefersReducedMotion && enableComplexAnimations;

  return (
    <motion.div
      initial={shouldAnimate ? { scale: 0, opacity: 0, rotate: -15 } : undefined}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
        delay,
      }}
    >
      <DJMascot {...props} />
    </motion.div>
  );
});

export default DJMascot;
