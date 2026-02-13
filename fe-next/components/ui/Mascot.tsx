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
  | 'happy'       // main-nobg.gif - Happy/idle states
  | 'gaming'      // play-nobg.gif - Gaming/active/energetic states
  | 'thinking'    // study-nobg.gif - Thinking/focused/waiting states
  | 'oops'        // oops-nobg.gif - Error/mistake/surprised states
  | 'celebration' // celebration-nobg.gif - Victory/cheering states
  | 'dj'          // dj-nobg.gif - Party/music/dancing states
  | 'trophy'      // trophy-nobg.gif - Winner/achievement states
  | 'panic'       // panic-nobg.gif - Panicking/time pressure
  | 'crying'      // crying-nobg.gif - Sad/losing/defeated
  | 'onfire'      // onfire-nobg.gif - On fire/hot streak
  | 'bored'       // bored-nobg.gif - Bored/waiting/idle
  | 'mindblown'   // mindblown-nobg.gif - Amazed/shocked
  | 'encouraging' // encouraging-nobg.gif - Supportive/cheering on
  | 'explorer'    // explorer-nobg.gif - Adventuring/discovering
  | 'flexing'     // flexing-nobg.gif - Proud/strong/earned it
  | 'scared'      // scared-nobg.gif - Frightened/nervous
  | 'shopkeeper'  // shopkeeper-nobg.gif - Shop/store context
  | 'spectating'  // spectating-nobg.gif - Watching/observing
  | 'waving'      // waving-nobg.gif - Greeting/welcoming
  | 'powerup';    // powerup-nobg.gif - Power-up activation

/**
 * Mascot GIF paths (ALL mascots use animated GIFs)
 */
export const MASCOT_IMAGES: Record<MascotVariant, string> = {
  happy: '/mascot/main-nobg.gif',
  gaming: '/mascot/play-nobg.gif',
  thinking: '/mascot/study-nobg.gif',
  oops: '/mascot/oops-nobg.gif',
  celebration: '/mascot/celebration-nobg.gif',
  dj: '/mascot/dj-nobg.gif',
  trophy: '/mascot/trophy-nobg.gif',
  panic: '/mascot/panic-nobg.gif',
  crying: '/mascot/crying-nobg.gif',
  onfire: '/mascot/onfire-nobg.gif',
  bored: '/mascot/bored-nobg.gif',
  mindblown: '/mascot/mindblown-nobg.gif',
  encouraging: '/mascot/encouraging-nobg.gif',
  explorer: '/mascot/explorer-nobg.gif',
  flexing: '/mascot/flexing-nobg.gif',
  scared: '/mascot/scared-nobg.gif',
  shopkeeper: '/mascot/shopkeeper-nobg.gif',
  spectating: '/mascot/spectating-nobg.gif',
  waving: '/mascot/waving-nobg.gif',
  powerup: '/mascot/powerup-nobg.gif',
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

  // Automatically prioritize 'happy' variant (main mascot) if priority not explicitly set
  const shouldPrioritize = priority ?? (variant === 'happy');
  // Use lazy loading for non-priority mascots
  const loadingStrategy = shouldPrioritize ? undefined : 'lazy';

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
        priority={shouldPrioritize}
        loading={loadingStrategy as 'lazy' | undefined}
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

  // Automatically prioritize 'happy' variant (main mascot) if priority not explicitly set
  const shouldPrioritize = priority ?? (variant === 'happy');
  // Use lazy loading for non-priority mascots
  const loadingStrategy = shouldPrioritize ? undefined : 'lazy';

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
          priority={shouldPrioritize}
          loading={loadingStrategy as 'lazy' | undefined}
          unoptimized={isGif}
        />
      </motion.div>
    </motion.div>
  );
});

export default Mascot;
