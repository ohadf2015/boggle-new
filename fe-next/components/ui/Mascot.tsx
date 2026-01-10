'use client';

import { motion, Variants } from 'framer-motion';
import { memo, useMemo } from 'react';
import Image from 'next/image';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

/**
 * Base emotional mascot variants
 */
export type MascotVariant =
  | 'happy'
  | 'encouraging'
  | 'thinking'
  | 'oops'
  | 'celebrating'
  | 'victory'
  | 'focused'
  | 'surprised'
  | 'sleepy'
  | 'excited'
  | 'pointing'
  // Activity variants
  | 'eating_pizza'
  | 'drinking_coffee'
  | 'reading'
  | 'gaming'
  | 'dancing'
  | 'sleeping'
  | 'waving'
  | 'thumbs_up'
  | 'holding_trophy'
  | 'typing'
  | 'cheering'
  | 'training';

/**
 * Mascot image paths mapping
 */
export const MASCOT_IMAGES: Record<MascotVariant, string> = {
  // Base emotional variants
  happy: '/mascot/lexi-happy.png',
  encouraging: '/mascot/lexi-encouraging.png',
  thinking: '/mascot/lexi-thinking.png',
  oops: '/mascot/lexi-oops.png',
  celebrating: '/mascot/lexi-celebrating.png',
  victory: '/mascot/lexi-victory.png',
  focused: '/mascot/lexi-focused.png',
  surprised: '/mascot/lexi-surprised.png',
  sleepy: '/mascot/lexi-sleepy.png',
  excited: '/mascot/lexi-excited.png',
  pointing: '/mascot/lexi-pointing.png',
  // Activity variants
  eating_pizza: '/mascot/lexi-eating-pizza.png',
  drinking_coffee: '/mascot/lexi-drinking-coffee.png',
  reading: '/mascot/lexi-reading.png',
  gaming: '/mascot/lexi-gaming.png',
  dancing: '/mascot/lexi-dancing.png',
  sleeping: '/mascot/lexi-sleeping.png',
  waving: '/mascot/lexi-waving.png',
  thumbs_up: '/mascot/lexi-thumbs-up.png',
  holding_trophy: '/mascot/lexi-holding-trophy.png',
  typing: '/mascot/lexi-typing.png',
  cheering: '/mascot/lexi-cheering.png',
  training: '/mascot/lexi-training.png',
};

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
 */
function getAnimationVariants(variant: MascotVariant): Variants {
  const animations: Record<MascotVariant, Variants> = {
    // Happy: Gentle floating bob
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
    // Celebrating: Bouncy with excitement
    celebrating: {
      animate: {
        y: [0, -15, 0, -8, 0],
        scale: [1, 1.1, 1, 1.05, 1],
        rotate: [0, -5, 5, -3, 0],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Thinking: Slow thoughtful bob with head tilt
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
    // Encouraging: Wave-like pointing motion
    encouraging: {
      animate: {
        y: [0, -6, 0],
        rotate: [0, -4, 4, 0],
        x: [0, 3, -3, 0],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Oops: Nervous shake/wiggle
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
    // Victory: Triumphant bounce with crown wobble
    victory: {
      animate: {
        y: [0, -12, 0, -6, 0],
        scale: [1, 1.08, 1, 1.04, 1],
        rotate: [0, -3, 3, -2, 0],
        transition: {
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeOut',
        },
      },
    },
    // Focused: Intense concentration with slight pulse
    focused: {
      animate: {
        scale: [1, 1.02, 1],
        y: [0, -2, 0],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Surprised: Quick jump with shake
    surprised: {
      animate: {
        y: [0, -10, 0],
        scale: [1, 1.15, 1],
        rotate: [0, -5, 5, 0],
        transition: {
          duration: 0.6,
          repeat: Infinity,
          repeatDelay: 2,
          ease: 'easeOut',
        },
      },
    },
    // Sleepy: Gentle sway with slow breathing
    sleepy: {
      animate: {
        y: [0, 3, 0],
        rotate: [0, 2, 0, -2, 0],
        scale: [1, 0.98, 1, 0.98, 1],
        transition: {
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Excited: Energetic bounce with sparkle effect
    excited: {
      animate: {
        y: [0, -18, 0, -10, 0],
        scale: [1, 1.12, 1, 1.06, 1],
        rotate: [0, -8, 8, -4, 0],
        transition: {
          duration: 1.2,
          repeat: Infinity,
          ease: 'easeOut',
        },
      },
    },
    // Pointing: Gentle guide motion
    pointing: {
      animate: {
        x: [0, 5, 0],
        rotate: [0, 2, 0],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Activity: Eating pizza - happy munching motion
    eating_pizza: {
      animate: {
        y: [0, -4, 0, -2, 0],
        rotate: [0, -3, 3, -2, 2, 0],
        scale: [1, 1.05, 0.98, 1.03, 1],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Activity: Drinking coffee - cozy sipping motion
    drinking_coffee: {
      animate: {
        y: [0, -2, 0, -1, 0],
        rotate: [0, 2, 0, -1, 0],
        scale: [1, 1.02, 0.99, 1.01, 1],
        transition: {
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Activity: Reading - absorbed in book
    reading: {
      animate: {
        y: [0, -1, 0],
        rotate: [0, 0.5, 0, -0.5, 0],
        scale: [1, 1.01, 1],
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Activity: Gaming - intense reactive motion
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
    // Activity: Dancing - groovy rhythmic bounce
    dancing: {
      animate: {
        y: [0, -12, 0, -8, 0, -10, 0],
        rotate: [0, -10, 10, -8, 8, -5, 0],
        scale: [1, 1.08, 0.95, 1.06, 0.97, 1.04, 1],
        x: [0, 3, -3, 2, -2, 0],
        transition: {
          duration: 1.2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Activity: Sleeping - peaceful breathing
    sleeping: {
      animate: {
        y: [0, 3, 0, 2, 0],
        scale: [1, 0.96, 1, 0.98, 1],
        rotate: [0, 1, 0, -1, 0],
        transition: {
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Activity: Waving - energetic greeting
    waving: {
      animate: {
        rotate: [0, -8, 8, -6, 6, -4, 4, 0],
        y: [0, -5, -3, -5, -2, -4, 0],
        scale: [1, 1.05, 1.02, 1.04, 1],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
    // Activity: Thumbs up - confident approval
    thumbs_up: {
      animate: {
        y: [0, -8, 0, -4, 0],
        scale: [1, 1.08, 1, 1.04, 1],
        rotate: [0, -2, 2, 0],
        transition: {
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeOut',
        },
      },
    },
    // Activity: Holding trophy - victorious celebration
    holding_trophy: {
      animate: {
        y: [0, -10, 0, -6, 0],
        rotate: [0, -4, 4, -2, 0],
        scale: [1, 1.1, 1, 1.05, 1],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
        },
      },
    },
    // Activity: Typing - focused rapid work
    typing: {
      animate: {
        y: [0, -1, 0, -1, 0, -1, 0],
        scale: [1, 1.01, 1, 1.01, 1],
        x: [0, 0.5, -0.5, 0],
        transition: {
          duration: 0.5,
          repeat: Infinity,
          ease: 'linear',
        },
      },
    },
    // Activity: Cheering - high energy enthusiasm
    cheering: {
      animate: {
        y: [0, -18, 0, -12, 0, -8, 0],
        rotate: [0, -8, 8, -6, 6, -3, 0],
        scale: [1, 1.15, 1, 1.1, 1, 1.05, 1],
        x: [0, -2, 2, -1, 1, 0],
        transition: {
          duration: 1.4,
          repeat: Infinity,
          ease: 'easeOut',
        },
      },
    },
    // Activity: Training - powerful workout pump
    training: {
      animate: {
        y: [0, -8, -2, -6, 0],
        scale: [1, 1.12, 1.05, 1.1, 1],
        rotate: [0, -2, 0, 2, 0],
        transition: {
          duration: 1.2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    },
  };

  return animations[variant];
}

/**
 * Reusable Mascot component with built-in animations
 *
 * @example
 * // Basic usage
 * <Mascot variant="happy" />
 *
 * // With size and animation
 * <Mascot variant="victory" size="lg" animated />
 *
 * // For loading states
 * <Mascot variant="thinking" size="md" animated />
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

  const imageSrc = MASCOT_IMAGES[variant];
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

  const imageSrc = MASCOT_IMAGES[variant];
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
        />
      </motion.div>
    </motion.div>
  );
});

export default Mascot;
