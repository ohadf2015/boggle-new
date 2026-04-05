'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { memo } from 'react';
import Image from 'next/image';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import type { MascotClipShape, MascotBorderColor } from './Mascot';

const CLIP_CLASSES: Record<MascotClipShape, string> = {
  none: '',
  circle: 'rounded-full overflow-hidden',
  'rounded-square': 'rounded-neo overflow-hidden',
};

const BORDER_CLASSES: Record<MascotBorderColor, string> = {
  pink: 'border-[3px] border-neo-pink shadow-hard',
  lime: 'border-[3px] border-neo-lime shadow-hard',
  cyan: 'border-[3px] border-neo-cyan shadow-hard',
  purple: 'border-[3px] border-neo-purple shadow-hard',
  white: 'border-[3px] border-neo-white shadow-hard',
  none: '',
};

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

const VARIANT_PATHS: Record<CelebrationVariant, string> = {
  trophy: '/mascot/trophy.gif',
  celebration: '/mascot/celebration.gif',
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
  /** Clip shape to mask GIF background */
  clipShape?: MascotClipShape;
  /** Border color when using a clip shape */
  clipBorder?: MascotBorderColor;
  /** Background behind the GIF inside the clip */
  clipBg?: string;
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
  clipShape = 'circle',
  clipBorder = 'white',
  clipBg = 'bg-neo-navy',
}: CelebrationMascotProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const shouldAnimate = !prefersReducedMotion && enableComplexAnimations;

  const imageSrc = VARIANT_PATHS[variant];
  const altText = alt || `Lexi mascot - ${variant}`;
  const hasClip = clipShape !== 'none';

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
      <div className={`w-full h-full ${CLIP_CLASSES[clipShape]} ${BORDER_CLASSES[clipBorder]} ${hasClip ? clipBg : ''}`}>
        <Image
          src={imageSrc}
          alt={altText}
          width={SIZE_PIXELS[size]}
          height={SIZE_PIXELS[size]}
          className={`object-contain ${hasClip ? 'scale-110' : ''} drop-shadow-lg`}
          priority={priority}
          unoptimized
        />
      </div>
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
