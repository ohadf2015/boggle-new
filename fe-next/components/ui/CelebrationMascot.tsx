'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { memo } from 'react';
import Image from 'next/image';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

/**
 * Celebration mascot variants
 * - trophy: For winning/ranking celebrations
 * - celebration: For achievements/progression celebrations
 */
export type CelebrationVariant = 'trophy' | 'celebration';

/**
 * Size presets for the celebration mascot
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

const VARIANT_PATHS: Record<CelebrationVariant, string> = {
  trophy: '/mascot/trophy-nobg.gif',
  celebration: '/mascot/celebration-nobg.gif',
};

interface CelebrationMascotProps {
  /** Which celebration variant to display */
  variant: CelebrationVariant;
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
 * CelebrationMascot - Decorative mascot for celebration/winning screens
 *
 * Uses animated GIFs with subtle CSS animations for extra flair.
 * Respects reduced motion preferences.
 *
 * @example
 * // Trophy for winning/ranking
 * <CelebrationMascot variant="trophy" size="lg" />
 *
 * // Celebration for achievements
 * <CelebrationMascot variant="celebration" size="md" />
 */
export const CelebrationMascot = memo(function CelebrationMascot({
  variant,
  size = 'md',
  className = '',
  priority = false,
  alt,
}: CelebrationMascotProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const shouldAnimate = !prefersReducedMotion && enableComplexAnimations;

  const imageSrc = VARIANT_PATHS[variant];
  const altText = alt || `Lexi mascot - ${variant}`;

  return (
    <AdaptiveMotion.div
      className={`relative ${SIZE_CLASSES[size]} ${className}`}
      animate={
        shouldAnimate
          ? {
              y: [0, -8, 0],
              scale: [1, 1.05, 1],
              rotate: [0, -3, 3, 0],
            }
          : undefined
      }
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <Image
        src={imageSrc}
        alt={altText}
        width={SIZE_PIXELS[size]}
        height={SIZE_PIXELS[size]}
        className="object-contain drop-shadow-lg"
        priority={priority}
        unoptimized
      />
    </AdaptiveMotion.div>
  );
});

/**
 * CelebrationMascot with entrance animation
 */
export const CelebrationMascotWithEntrance = memo(function CelebrationMascotWithEntrance({
  delay = 0,
  ...props
}: CelebrationMascotProps & { delay?: number }) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const shouldAnimate = !prefersReducedMotion && enableComplexAnimations;

  return (
    <AdaptiveMotion.div
      initial={shouldAnimate ? { scale: 0, opacity: 0, y: 20, rotate: -10 } : undefined}
      animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay,
      }}
    >
      <CelebrationMascot {...props} />
    </AdaptiveMotion.div>
  );
});

export default CelebrationMascot;
