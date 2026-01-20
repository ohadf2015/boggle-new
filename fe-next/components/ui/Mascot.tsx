'use client';

import { motion, Variants } from 'framer-motion';
import { memo, useMemo } from 'react';
import Image from 'next/image';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

/**
 * Mascot variants - GIF-ONLY
 * All mascot images are animated GIFs with backgrounds removed
 */
export type MascotVariant =
  | 'happy'    // main-nobg.gif - Happy/idle/celebration states
  | 'gaming'   // play-nobg.gif - Gaming/active/energetic states
  | 'thinking' // study-nobg.gif - Thinking/focused/waiting states
  | 'oops';    // oops-nobg.gif - Error/mistake/surprised states

/**
 * Mascot GIF paths (ALL mascots use animated GIFs)
 */
export const MASCOT_IMAGES: Record<MascotVariant, string> = {
  happy: '/mascot/main-nobg.gif',
  gaming: '/mascot/play-nobg.gif',
  thinking: '/mascot/study-nobg.gif',
  oops: '/mascot/oops-nobg.gif',
};

/**
 * Get the image path for a mascot variant.
 * All variants use animated GIFs.
 *
 * @param variant - The mascot variant
 * @returns GIF image path
 */
export function getMascotImagePath(variant: MascotVariant): string {
  return MASCOT_IMAGES[variant];
}

/**
 * Check if a variant uses an animated GIF
 * All mascot variants use GIFs.
 *
 * @param variant - The mascot variant (unused, kept for backward compatibility)
 * @returns Always true (all mascots are GIFs)
 */
export function isGifVariant(variant: MascotVariant): boolean {
  return true;
}

/**
 * Size presets for the mascot
 */
type MascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE_CLASSES: Record<MascotSize, string> = {
  xs: 'w-10 h-10',
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-40 h-40',
  '2xl': 'w-48 h-48',
};

const SIZE_PIXELS: Record<MascotSize, number> = {
  xs: 40,
  sm: 64,
  md: 96,
  lg: 128,
  xl: 160,
  '2xl': 192,
};

interface MascotProps {
  /** Which mascot variant to display */
  variant: MascotVariant;
  /** Size of the mascot */
  size?: MascotSize;
  /** Whether to animate the mascot */
  animated?: boolean;
  /** Custom class name for the container */
  className?: string;
  /** Priority loading for above-the-fold mascots */
  priority?: boolean;
  /** Alt text override */
  alt?: string;
}

/**
 * Get animation config based on mascot variant
 * GIF-ONLY: Enhanced CSS animations that complement the GIF animation
 */
function getAnimationVariants(variant: MascotVariant): Variants {
  const animations: Record<MascotVariant, Variants> = {
    // Happy: Gentle floating bob (complements main-nobg.gif)
    happy: {
      animate: {
        y: [0, -8, 0],
        rotate: [0, -2, 2, 0],
        transition: {
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Gaming: Intense reactive motion (complements play-nobg.gif)
    gaming: {
      animate: {
        x: [0, -3, 3, -2, 2, -1, 1, 0],
        y: [0, -5, -2, -4, 0],
        rotate: [0, -3, 3, -2, 0],
        transition: {
          duration: 0.6,
          repeat: Infinity,
          ease: 'easeOut',
        },
      },
    },
    // Thinking: Slow thoughtful bob with head tilt (complements study-nobg.gif)
    thinking: {
      animate: {
        y: [0, -4, 0],
        rotate: [0, 3, 0, -3, 0],
        scale: [1, 1.02, 1],
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Oops: Nervous shake/wiggle (complements oops-nobg.gif)
    oops: {
      animate: {
        x: [0, -3, 3, -2, 2, 0],
        rotate: [0, -2, 2, -1, 1, 0],
        transition: {
          duration: 0.5,
          repeat: Infinity,
          repeatDelay: 2,
          ease: 'easeInOut',
        },
      },
    },
  };

  return animations[variant];
}

/**
 * Reusable Mascot component with built-in animations
 * GIF-ONLY: All mascots use animated GIF files
 *
 * @example
 * // Happy state - celebration, success, idle
 * <Mascot variant="happy" />
 *
 * // Gaming state - active, energetic, playing
 * <Mascot variant="gaming" size="lg" animated />
 *
 * // Thinking state - loading, waiting, focusing
 * <Mascot variant="thinking" size="md" animated />
 *
 * // Oops state - errors, mistakes, surprises
 * <Mascot variant="oops" size="sm" animated />
 */
export const Mascot = memo(function Mascot({
  variant,
  size = 'md',
  animated = true,
  className = '',
  priority = false,
  alt,
}: MascotProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const shouldAnimate = animated && !prefersReducedMotion && enableComplexAnimations;
  const animationVariants = useMemo(() => getAnimationVariants(variant), [variant]);

  const imageSrc = getMascotImagePath(variant);
  const isGif = isGifVariant(variant);
  const altText = alt || `Lexi mascot - ${variant}`;

  return (
    <motion.div
      className={`relative ${SIZE_CLASSES[size]} ${className}`}
      variants={animationVariants}
      animate={shouldAnimate ? 'animate' : undefined}
    >
      <Image
        src={imageSrc}
        alt={altText}
        width={SIZE_PIXELS[size]}
        height={SIZE_PIXELS[size]}
        className="object-contain drop-shadow-lg"
        priority={priority}
        unoptimized={isGif}
      />
    </motion.div>
  );
});

/**
 * Mascot with entrance animation
 */
export const MascotWithEntrance = memo(function MascotWithEntrance({
  variant,
  size = 'md',
  animated = true,
  className = '',
  priority = false,
  alt,
  delay = 0,
}: MascotProps & { delay?: number }) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const shouldAnimate = animated && !prefersReducedMotion && enableComplexAnimations;
  const loopVariants = useMemo(() => getAnimationVariants(variant), [variant]);

  const imageSrc = getMascotImagePath(variant);
  const isGif = isGifVariant(variant);
  const altText = alt || `Lexi mascot - ${variant}`;

  return (
    <motion.div
      className={`relative ${SIZE_CLASSES[size]} ${className}`}
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay,
      }}
    >
      <motion.div
        className="w-full h-full"
        variants={loopVariants}
        animate={shouldAnimate ? 'animate' : undefined}
      >
        <Image
          src={imageSrc}
          alt={altText}
          width={SIZE_PIXELS[size]}
          height={SIZE_PIXELS[size]}
          className="object-contain drop-shadow-lg"
          priority={priority}
          unoptimized={isGif}
        />
      </motion.div>
    </motion.div>
  );
});

export default Mascot;
