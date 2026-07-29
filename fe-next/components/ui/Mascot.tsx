'use client';

import { m, Variants } from 'framer-motion';
import { memo, useMemo } from 'react';
import Image from 'next/image';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { SilentVideo } from './SilentVideo';
import { getMascotImagePath, getMascotBgType, isVideoVariant, type MascotVariant } from './mascotData';

// Pure mascot data + resolvers live in ./mascotData (no 'use client') so server
// components can call them. Re-exported here for back-compat with existing
// importers of '@/components/ui/Mascot'.
export type { MascotVariant, MascotBgType } from './mascotData';
export {
  MASCOT_IMAGES,
  MASCOT_BG_TYPE,
  getMascotImagePath,
  getMascotBgType,
  getMascotBgTypeForSrc,
  isVideoVariant,
  isGifVariant,
} from './mascotData';

/**
 * Mascot variants - all animated WebP. Single render path via <Image unoptimized>.
 * Background categories tracked for clip styling only:
 * - dark: opaque dark bg, blends with app's neo-navy
 * - white: opaque white bg, auto-clipped to circle with neo border
 * - nobg: transparent, works on any surface
 */

/**
 * Size presets for the mascot
 */
type MascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE_CLASSES: Record<MascotSize, string> = {
  xs: 'w-[100px] h-[100px]',
  sm: 'w-28 h-28',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
  xl: 'w-48 h-48',
  '2xl': 'w-56 h-56',
};

const SIZE_PIXELS: Record<MascotSize, number> = {
  xs: 100,
  sm: 112,
  md: 128,
  lg: 160,
  xl: 192,
  '2xl': 224,
};

/**
 * Clip shape for mascot container.
 * Use when GIF has a background that can't be removed (e.g. white-on-white).
 * Matches the comeback-hero circle style: rounded-full + overflow-hidden + neo border.
 */
export type MascotClipShape = 'none' | 'circle' | 'rounded-square';

/** Tailwind classes for each clip shape */
const CLIP_CLASSES: Record<MascotClipShape, string> = {
  none: '',
  circle: 'rounded-full overflow-hidden',
  'rounded-square': 'rounded-neo overflow-hidden',
};

/** Border color presets matching neo color families */
export type MascotBorderColor = 'pink' | 'lime' | 'cyan' | 'purple' | 'white' | 'none';

const BORDER_CLASSES: Record<MascotBorderColor, string> = {
  pink: 'border-3 border-neo-pink shadow-hard',
  lime: 'border-3 border-neo-lime shadow-hard',
  cyan: 'border-3 border-neo-cyan shadow-hard',
  purple: 'border-3 border-neo-purple shadow-hard',
  white: 'border-3 border-neo-white shadow-hard',
  none: '',
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
  /** Clip shape to mask GIF background. Use for GIFs with non-transparent backgrounds. */
  clipShape?: MascotClipShape;
  /** Border color when using a clip shape (default: 'none') */
  clipBorder?: MascotBorderColor;
  /** Background behind the GIF inside the clip (default: 'bg-neo-navy') */
  clipBg?: string;
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
    // Celebration: Bouncy victory dance (complements celebration-nobg.gif)
    celebration: {
      animate: {
        y: [0, -12, 0, -8, 0],
        scale: [1, 1.05, 1, 1.03, 1],
        rotate: [0, -5, 5, -3, 3, 0],
        transition: {
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeOut',
        },
      },
    },
    // DJ: Rhythmic bounce (complements dj-nobg.gif)
    dj: {
      animate: {
        y: [0, -6, 0],
        rotate: [0, -3, 3, 0],
        scale: [1, 1.02, 1],
        transition: {
          duration: 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Trophy: Proud pose with subtle sway (complements trophy-nobg.gif)
    trophy: {
      animate: {
        y: [0, -4, 0],
        rotate: [0, 2, -2, 0],
        scale: [1, 1.03, 1],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Panic: Fast jitter with increasing intensity
    panic: {
      animate: {
        x: [0, -3, 3, -2, 2, -1, 1, 0],
        y: [0, -2, 0, -1, 0],
        transition: {
          duration: 0.4,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Crying: Slow heaving bob with slight tilt
    crying: {
      animate: {
        y: [0, -3, 0],
        rotate: [0, -1, 1, 0],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // On Fire: Intense upward energy with scale pulsing
    onfire: {
      animate: {
        y: [0, -10, 0],
        scale: [1, 1.08, 1],
        transition: {
          duration: 0.5,
          repeat: Infinity,
          ease: 'easeOut',
        },
      },
    },
    // Bored: Slow lazy sway
    bored: {
      animate: {
        y: [0, -2, 0],
        rotate: [0, 1, -1, 0],
        transition: {
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Mindblown: Dramatic scale pop with float
    mindblown: {
      animate: {
        scale: [1, 1.1, 1],
        y: [0, -8, 0],
        transition: {
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Encouraging: Gentle nod-like motion
    encouraging: {
      animate: {
        y: [0, -5, 0],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Explorer: Slight swaying walk motion
    explorer: {
      animate: {
        x: [0, -3, 3, 0],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Flexing: Proud sway with scale pulse
    flexing: {
      animate: {
        scale: [1, 1.05, 1],
        y: [0, -3, 0],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Scared: Rapid trembling
    scared: {
      animate: {
        x: [0, -4, 4, -3, 3, -1, 1, 0],
        transition: {
          duration: 0.6,
          repeat: Infinity,
          repeatDelay: 1,
          ease: 'easeInOut',
        },
      },
    },
    // Shopkeeper: Subtle lean forward/back
    shopkeeper: {
      animate: {
        y: [0, -3, 0],
        rotate: [0, 2, -2, 0],
        transition: {
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Spectating: Relaxed bob
    spectating: {
      animate: {
        y: [0, -4, 0],
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Waving: Side-to-side with tilt
    waving: {
      animate: {
        rotate: [0, -5, 5, 0],
        transition: {
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Powerup: Pulsing energy
    powerup: {
      animate: {
        scale: [1, 1.08, 1, 1.04, 1],
        y: [0, -8, 0],
        transition: {
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeOut',
        },
      },
    },
    // Sleepy: Slow drift down
    sleepy: {
      animate: {
        y: [0, 3, 0],
        rotate: [0, 2, -2, 0],
        transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    // Waiting: Patient swaying with hourglass
    waiting: {
      animate: {
        y: [0, -3, 0],
        rotate: [0, 1, -1, 0],
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    // GG: Confident swagger
    gg: {
      animate: {
        y: [0, -5, 0],
        scale: [1, 1.03, 1],
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    // Scholar: Focused reading bob
    scholar: {
      animate: {
        y: [0, -2, 0],
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    // Rage: Intense shaking
    rage: {
      animate: {
        x: [0, -4, 4, -3, 3, 0],
        scale: [1, 1.05, 1],
        transition: { duration: 0.4, repeat: Infinity, ease: 'easeOut' },
      },
    },
    // Bomber: Mischievous bounce
    bomber: {
      animate: {
        y: [0, -6, 0],
        rotate: [0, -3, 3, 0],
        transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    // Winner: Triumphant float
    winner: {
      animate: {
        y: [0, -10, 0],
        scale: [1, 1.06, 1],
        transition: { duration: 1.2, repeat: Infinity, ease: 'easeOut' },
      },
    },
    // Knight: Battle-ready stance
    knight: {
      animate: {
        y: [0, -4, 0],
        rotate: [0, -2, 2, 0],
        transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    // Sad: Gentle droop
    sad: {
      animate: {
        y: [0, 2, 0],
        rotate: [0, -1, 1, 0],
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    // Ghostly: Ethereal float
    ghostly: {
      animate: {
        y: [0, -8, 0],
        opacity: [1, 0.85, 1],
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    // Dance: Rhythmic bounce
    dance: {
      animate: {
        y: [0, -8, 0, -5, 0],
        rotate: [0, -4, 4, -2, 0],
        transition: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    // Question: Curious tilt
    question: {
      animate: {
        y: [0, -4, 0],
        rotate: [0, 3, -3, 0],
        transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    // TrophyNobg: Proud sway (same as trophy)
    trophyNobg: {
      animate: {
        y: [0, -4, 0],
        rotate: [0, 2, -2, 0],
        scale: [1, 1.03, 1],
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    // ExplorerNobg: Walking sway (same as explorer)
    explorerNobg: {
      animate: {
        x: [0, -3, 3, 0],
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      },
    },
    // CryingNobg: Heaving bob (same as crying)
    cryingNobg: {
      animate: {
        y: [0, -3, 0],
        rotate: [0, -1, 1, 0],
        transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
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
/**
 * Resolve clip/border/bg based on mascot background type.
 * - dark: no clip (blends with app bg)
 * - white: circle clip + pink border
 * - nobg: no clip (transparent works everywhere)
 */
function getAutoStyle(variant: MascotVariant, clipShape?: MascotClipShape, clipBorder?: MascotBorderColor, clipBg?: string) {
  const bgType = getMascotBgType(variant);

  // White bg: always enforce circle clip + border — callers cannot override to 'none'
  if (bgType === 'white') {
    return {
      shape: (clipShape && clipShape !== 'none' ? clipShape : 'circle') as MascotClipShape,
      border: (clipBorder && clipBorder !== 'none' ? clipBorder : 'pink') as MascotBorderColor,
      bg: clipBg ?? 'bg-white',
    };
  }

  if (clipShape !== undefined && clipShape !== 'none') {
    return { shape: clipShape, border: clipBorder ?? 'pink', bg: clipBg ?? 'bg-neo-navy' };
  }

  return { shape: (clipShape ?? 'none') as MascotClipShape, border: clipBorder ?? 'none', bg: clipBg ?? '' };
}

export const Mascot = memo(function Mascot({
  variant,
  size = 'md',
  animated = true,
  className = '',
  priority = false,
  alt,
  clipShape,
  clipBorder,
  clipBg,
}: MascotProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const shouldAnimate = animated && !prefersReducedMotion && enableComplexAnimations;
  const animationVariants = useMemo(() => getAnimationVariants(variant), [variant]);

  const imageSrc = getMascotImagePath(variant);
  const isVideo = isVideoVariant(variant);
  const altText = alt || `Lexi mascot - ${variant}`;

  const shouldPrioritize = priority ?? (variant === 'happy');
  const loadingStrategy = shouldPrioritize ? undefined : 'lazy';

  const { shape, border, bg } = getAutoStyle(variant, clipShape, clipBorder, clipBg);
  const hasClip = shape !== 'none';
  const mediaClass = `object-contain w-full h-full ${hasClip ? 'scale-110' : ''} drop-shadow-lg`;

  return (
    <m.div
      className={`relative shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      variants={animationVariants}
      animate={shouldAnimate ? 'animate' : undefined}
    >
      <div
        data-mascot-bg={getMascotBgType(variant)}
        className={`w-full h-full ${CLIP_CLASSES[shape]} ${BORDER_CLASSES[border]} ${hasClip ? bg : ''}`}
      >
        {isVideo ? (
          <SilentVideo
            src={imageSrc}
            aria-label={altText}
            width={SIZE_PIXELS[size]}
            height={SIZE_PIXELS[size]}
            className={mediaClass}
            preload={shouldPrioritize ? 'auto' : 'metadata'}
          />
        ) : (
          <Image
            src={imageSrc}
            alt={altText}
            width={SIZE_PIXELS[size]}
            height={SIZE_PIXELS[size]}
            className={`object-contain ${hasClip ? 'scale-110' : ''} drop-shadow-lg`}
            priority={shouldPrioritize}
            loading={loadingStrategy as 'lazy' | undefined}
            unoptimized
          />
        )}
      </div>
    </m.div>
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
  clipShape,
  clipBorder,
  clipBg,
}: MascotProps & { delay?: number }) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const shouldAnimate = animated && !prefersReducedMotion && enableComplexAnimations;
  const loopVariants = useMemo(() => getAnimationVariants(variant), [variant]);

  const imageSrc = getMascotImagePath(variant);
  const isVideo = isVideoVariant(variant);
  const altText = alt || `Lexi mascot - ${variant}`;

  const shouldPrioritize = priority ?? (variant === 'happy');
  const loadingStrategy = shouldPrioritize ? undefined : 'lazy';

  const { shape, border, bg } = getAutoStyle(variant, clipShape, clipBorder, clipBg);
  const hasClip = shape !== 'none';
  const mediaClass = `object-contain w-full h-full ${hasClip ? 'scale-110' : ''} drop-shadow-lg`;

  return (
    <m.div
      className={`relative shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay,
      }}
    >
      <m.div
        className="w-full h-full"
        variants={loopVariants}
        animate={shouldAnimate ? 'animate' : undefined}
      >
        <div
          className={`w-full h-full ${CLIP_CLASSES[shape]} ${BORDER_CLASSES[border]} ${hasClip ? bg : ''}`}
        >
          {isVideo ? (
            <SilentVideo
              src={imageSrc}
              aria-label={altText}
              width={SIZE_PIXELS[size]}
              height={SIZE_PIXELS[size]}
              className={mediaClass}
              preload={shouldPrioritize ? 'auto' : 'metadata'}
            />
          ) : (
            <Image
              src={imageSrc}
              alt={altText}
              width={SIZE_PIXELS[size]}
              height={SIZE_PIXELS[size]}
              className={`object-contain ${hasClip ? 'scale-110' : ''} drop-shadow-lg`}
              priority={shouldPrioritize}
              loading={loadingStrategy as 'lazy' | undefined}
              unoptimized
            />
          )}
        </div>
      </m.div>
    </m.div>
  );
});

export default Mascot;
