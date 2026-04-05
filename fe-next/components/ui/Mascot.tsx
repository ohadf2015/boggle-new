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
  | 'happy'       // main.gif - Happy/idle states
  | 'gaming'      // play.gif - Gaming/active/energetic states
  | 'thinking'    // study.gif - Thinking/focused/waiting states
  | 'oops'        // oops.gif - Error/mistake/surprised states
  | 'celebration' // celebration.gif - Victory/cheering states
  | 'dj'          // dj.gif - Party/music/dancing states
  | 'trophy'      // trophy.gif - Winner/achievement states
  | 'panic'       // panic.gif - Panicking/time pressure
  | 'crying'      // crying.gif - Sad/losing/defeated
  | 'onfire'      // onfire.gif - On fire/hot streak
  | 'bored'       // bored.gif - Bored/waiting/idle
  | 'mindblown'   // mindblown.gif - Amazed/shocked
  | 'encouraging' // encouraging.gif - Supportive/cheering on
  | 'explorer'    // explorer.gif - Adventuring/discovering
  | 'flexing'     // flexing.gif - Proud/strong/earned it
  | 'scared'      // scared.gif - Frightened/nervous
  | 'shopkeeper'  // shopkeeper.gif - Shop/store context
  | 'spectating'  // spectating.gif - Watching/observing
  | 'waving'      // waving.gif - Greeting/welcoming
  | 'powerup'     // powerup.gif - Power-up activation
  | 'sleepy'      // sleepy.gif - Sleeping/idle timeout
  | 'waiting'     // waiting.gif - Loading/queue/patience
  | 'gg'          // gg.gif - Game over/good game
  | 'scholar'     // scholar.gif - Education/learning
  | 'rage'        // rage.gif - Competitive anger/losing badly
  | 'bomber'      // bomber.gif - Blast mode
  | 'winner'      // winner.gif - Victory/winning
  | 'knight'      // knight.gif - Battle/ranked/combat
  | 'sad'         // sad.gif - Loss/disappointment
  | 'ghostly';    // ghostly.gif - Spooky/halloween/sleepy

/**
 * Mascot GIF paths (ALL mascots use animated GIFs)
 */
export const MASCOT_IMAGES: Record<MascotVariant, string> = {
  happy: '/mascot/main.gif',
  gaming: '/mascot/play.gif',
  thinking: '/mascot/study.gif',
  oops: '/mascot/oops.gif',
  celebration: '/mascot/celebration.gif',
  dj: '/mascot/dj.gif',
  trophy: '/mascot/trophy.gif',
  panic: '/mascot/panic.gif',
  crying: '/mascot/crying.gif',
  onfire: '/mascot/onfire.gif',
  bored: '/mascot/bored.gif',
  mindblown: '/mascot/mindblown.gif',
  encouraging: '/mascot/encouraging.gif',
  explorer: '/mascot/explorer.gif',
  flexing: '/mascot/flexing.gif',
  scared: '/mascot/scared.gif',
  shopkeeper: '/mascot/shopkeeper.gif',
  spectating: '/mascot/spectating.gif',
  waving: '/mascot/waving.gif',
  powerup: '/mascot/powerup.gif',
  sleepy: '/mascot/sleepy.gif',
  waiting: '/mascot/waiting.gif',
  gg: '/mascot/gg.gif',
  scholar: '/mascot/scholar.gif',
  rage: '/mascot/rage.gif',
  bomber: '/mascot/bomber.gif',
  winner: '/mascot/winner.gif',
  knight: '/mascot/knight.gif',
  sad: '/mascot/sad.gif',
  ghostly: '/mascot/ghostly.gif',
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
  pink: 'border-[3px] border-neo-pink shadow-hard',
  lime: 'border-[3px] border-neo-lime shadow-hard',
  cyan: 'border-[3px] border-neo-cyan shadow-hard',
  purple: 'border-[3px] border-neo-purple shadow-hard',
  white: 'border-[3px] border-neo-white shadow-hard',
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
  clipShape = 'none',
  clipBorder = 'none',
  clipBg = 'bg-neo-navy',
}: MascotProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const shouldAnimate = animated && !prefersReducedMotion && enableComplexAnimations;
  const animationVariants = useMemo(() => getAnimationVariants(variant), [variant]);

  const imageSrc = getMascotImagePath(variant);
  const isGif = isGifVariant(variant);
  const altText = alt || `Lexi mascot - ${variant}`;

  const shouldPrioritize = priority ?? (variant === 'happy');
  const loadingStrategy = shouldPrioritize ? undefined : 'lazy';

  const hasClip = clipShape !== 'none';

  return (
    <motion.div
      className={`relative ${SIZE_CLASSES[size]} ${className}`}
      variants={animationVariants}
      animate={shouldAnimate ? 'animate' : undefined}
    >
      <div
        className={`w-full h-full ${CLIP_CLASSES[clipShape]} ${BORDER_CLASSES[clipBorder]} ${hasClip ? clipBg : ''}`}
      >
        <Image
          src={imageSrc}
          alt={altText}
          width={SIZE_PIXELS[size]}
          height={SIZE_PIXELS[size]}
          className={`object-contain ${hasClip ? 'scale-110' : ''} drop-shadow-lg`}
          priority={shouldPrioritize}
          loading={loadingStrategy as 'lazy' | undefined}
          unoptimized={isGif}
        />
      </div>
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
  clipShape = 'none',
  clipBorder = 'none',
  clipBg = 'bg-neo-navy',
}: MascotProps & { delay?: number }) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const shouldAnimate = animated && !prefersReducedMotion && enableComplexAnimations;
  const loopVariants = useMemo(() => getAnimationVariants(variant), [variant]);

  const imageSrc = getMascotImagePath(variant);
  const isGif = isGifVariant(variant);
  const altText = alt || `Lexi mascot - ${variant}`;

  const shouldPrioritize = priority ?? (variant === 'happy');
  const loadingStrategy = shouldPrioritize ? undefined : 'lazy';

  const hasClip = clipShape !== 'none';

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
        <div
          className={`w-full h-full ${CLIP_CLASSES[clipShape]} ${BORDER_CLASSES[clipBorder]} ${hasClip ? clipBg : ''}`}
        >
          <Image
            src={imageSrc}
            alt={altText}
            width={SIZE_PIXELS[size]}
            height={SIZE_PIXELS[size]}
            className={`object-contain ${hasClip ? 'scale-110' : ''} drop-shadow-lg`}
            priority={shouldPrioritize}
            loading={loadingStrategy as 'lazy' | undefined}
            unoptimized={isGif}
          />
        </div>
      </motion.div>
    </motion.div>
  );
});

export default Mascot;
