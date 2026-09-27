'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { memo } from 'react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { SilentVideo } from './SilentVideo';

/**
 * Size presets for the DJ mascot
 */
type MascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<MascotSize, string> = {
  xs: 'w-[100px] h-[100px]',
  sm: 'w-28 h-28',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
  xl: 'w-48 h-48',
};

const SIZE_PIXELS: Record<MascotSize, number> = {
  xs: 100,
  sm: 112,
  md: 128,
  lg: 160,
  xl: 192,
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
    <AdaptiveMotion.div
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
      <div className="w-full h-full">
        <SilentVideo
          src="/mascot/dj.webp"
          width={SIZE_PIXELS[size]}
          height={SIZE_PIXELS[size]}
          className="w-full h-full object-contain drop-shadow-lg"
          preload={priority ? 'auto' : 'metadata'}
          aria-label={altText}
        />
      </div>
    </AdaptiveMotion.div>
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
    <AdaptiveMotion.div
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
    </AdaptiveMotion.div>
  );
});

export default DJMascot;
