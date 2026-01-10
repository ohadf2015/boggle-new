'use client';

import { motion, AnimatePresence, type TargetAndTransition } from 'framer-motion';
import { memo, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { MASCOT_IMAGES, MascotVariant } from './Mascot';

/**
 * Mood-based variants (emotional states) - these use fallback images
 */
export type MoodVariant = 'confused' | 'proud' | 'nervous' | 'sad' | 'winking';

/**
 * Activity-based variants (mascot doing things)
 * These now have their own dedicated images
 */
export type ActivityVariant =
  | 'eating_pizza'
  | 'drinking_coffee'
  | 'reading'
  | 'gaming'
  | 'dancing'
  | 'sleeping'
  | 'waving'
  | 'thumbs_up'
  | 'holding_trophy'
  | 'holding_sign'
  | 'typing'
  | 'cheering'
  | 'training';

/**
 * Extended mascot variants including interaction states and activities
 */
export type ExtendedMascotVariant = MascotVariant | MoodVariant | ActivityVariant;

/**
 * Fallback mapping for mood variants that don't have dedicated images
 */
const MOOD_FALLBACKS: Record<MoodVariant, MascotVariant> = {
  confused: 'thinking',
  proud: 'victory',
  nervous: 'oops',
  sad: 'sleepy',
  winking: 'happy',
};

/**
 * Get the base MascotVariant for any ExtendedMascotVariant
 * Most activity variants now have direct images
 */
function getBaseVariant(variant: ExtendedMascotVariant): MascotVariant {
  // If it's a mood variant, use fallback
  if (variant in MOOD_FALLBACKS) {
    return MOOD_FALLBACKS[variant as MoodVariant];
  }
  // For holding_sign (no image yet), fallback to pointing
  if (variant === 'holding_sign') {
    return 'pointing';
  }
  // All other variants have direct images
  return variant as MascotVariant;
}

/**
 * Default state transitions for interactions
 */
const DEFAULT_HOVER_TRANSITIONS: Partial<Record<ExtendedMascotVariant, ExtendedMascotVariant>> = {
  // Base emotions
  happy: 'excited',
  sleepy: 'surprised',
  thinking: 'happy',
  focused: 'excited',
  encouraging: 'celebrating',
  oops: 'nervous',
  celebrating: 'victory',
  victory: 'celebrating',
  surprised: 'excited',
  excited: 'celebrating',
  pointing: 'happy',
  // Mood variants
  confused: 'thinking',
  proud: 'celebrating',
  nervous: 'oops',
  sad: 'encouraging',
  winking: 'excited',
  // Activity variants - hover shows more energetic version
  eating_pizza: 'excited',
  drinking_coffee: 'happy',
  reading: 'surprised',
  gaming: 'celebrating',
  dancing: 'cheering',
  sleeping: 'surprised',
  waving: 'excited',
  thumbs_up: 'celebrating',
  holding_trophy: 'celebrating',
  holding_sign: 'excited',
  typing: 'excited',
  cheering: 'victory',
  training: 'excited',
};

const DEFAULT_CLICK_TRANSITIONS: Partial<Record<ExtendedMascotVariant, ExtendedMascotVariant>> = {
  // Base emotions
  happy: 'celebrating',
  sleepy: 'excited',
  thinking: 'surprised',
  focused: 'victory',
  encouraging: 'excited',
  oops: 'surprised',
  celebrating: 'victory',
  victory: 'excited',
  surprised: 'happy',
  excited: 'victory',
  pointing: 'celebrating',
  // Mood variants
  confused: 'surprised',
  proud: 'victory',
  nervous: 'surprised',
  sad: 'happy',
  winking: 'celebrating',
  // Activity variants - click shows celebratory reaction
  eating_pizza: 'celebrating',
  drinking_coffee: 'excited',
  reading: 'happy',
  gaming: 'victory',
  dancing: 'victory',
  sleeping: 'excited',
  waving: 'celebrating',
  thumbs_up: 'victory',
  holding_trophy: 'victory',
  holding_sign: 'celebrating',
  typing: 'victory',
  cheering: 'victory',
  training: 'victory',
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

/**
 * Click animation presets
 */
type ClickAnimation = 'bounce' | 'spin' | 'shake' | 'pop' | 'wiggle';

const CLICK_ANIMATIONS: Record<ClickAnimation, TargetAndTransition> = {
  bounce: {
    y: [0, -20, 0, -10, 0],
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  spin: {
    rotate: [0, 360],
    scale: [1, 1.1, 1],
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
  pop: {
    scale: [1, 1.3, 0.9, 1.1, 1],
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  wiggle: {
    rotate: [0, -15, 15, -10, 10, -5, 5, 0],
    transition: { duration: 0.5, ease: 'easeInOut' },
  },
};

interface InteractiveMascotProps {
  /** Base variant to display */
  variant: ExtendedMascotVariant;
  /** Size of the mascot */
  size?: MascotSize;
  /** Whether to animate the mascot (idle animation) */
  animated?: boolean;
  /** Custom class name for the container */
  className?: string;
  /** Priority loading for above-the-fold mascots */
  priority?: boolean;
  /** Alt text override */
  alt?: string;
  /** Enable hover interaction */
  enableHover?: boolean;
  /** Enable click interaction */
  enableClick?: boolean;
  /** Custom hover variant (overrides default) */
  hoverVariant?: ExtendedMascotVariant;
  /** Custom click variant (overrides default) */
  clickVariant?: ExtendedMascotVariant;
  /** Click animation type */
  clickAnimation?: ClickAnimation;
  /** Duration to show click variant before returning to base (ms) */
  clickDuration?: number;
  /** Callback when mascot is clicked */
  onClick?: () => void;
  /** Callback when mascot is hovered */
  onHover?: (isHovered: boolean) => void;
  /** Show tooltip on hover */
  tooltip?: string;
  /** Accessibility label */
  ariaLabel?: string;
}

/**
 * Get the actual image source for a variant
 * Activity variants now have dedicated images, mood variants use fallbacks
 */
function getImageSource(variant: ExtendedMascotVariant): string {
  const baseVariant = getBaseVariant(variant);
  return MASCOT_IMAGES[baseVariant];
}

/**
 * Get idle animation based on variant
 * Activity variants have their own unique animations
 */
function getIdleAnimation(variant: ExtendedMascotVariant): TargetAndTransition {
  const animations: Record<MascotVariant, TargetAndTransition> = {
    // Base emotional variants
    happy: {
      y: [0, -6, 0],
      rotate: [0, -2, 2, 0],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
    },
    celebrating: {
      y: [0, -12, 0, -6, 0],
      scale: [1, 1.05, 1],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    thinking: {
      y: [0, -3, 0],
      rotate: [0, 2, 0, -2, 0],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
    encouraging: {
      y: [0, -5, 0],
      x: [0, 2, -2, 0],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
    oops: {
      x: [0, -2, 2, -1, 1, 0],
      transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' },
    },
    victory: {
      y: [0, -10, 0, -5, 0],
      scale: [1, 1.05, 1],
      transition: { duration: 1.8, repeat: Infinity, ease: 'easeOut' },
    },
    focused: {
      scale: [1, 1.02, 1],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    surprised: {
      y: [0, -8, 0],
      scale: [1, 1.1, 1],
      transition: { duration: 0.6, repeat: Infinity, repeatDelay: 2, ease: 'easeOut' },
    },
    sleepy: {
      y: [0, 2, 0],
      rotate: [0, 1, 0, -1, 0],
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
    excited: {
      y: [0, -15, 0, -8, 0],
      scale: [1, 1.08, 1],
      rotate: [0, -5, 5, 0],
      transition: { duration: 1.2, repeat: Infinity, ease: 'easeOut' },
    },
    pointing: {
      x: [0, 4, 0],
      rotate: [0, 2, 0],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    // Activity variants - expressive animations matching each mood
    eating_pizza: {
      // Munching motion - happy satisfied eating
      y: [0, -4, 0, -2, 0],
      rotate: [0, -3, 3, -2, 2, 0],
      scale: [1, 1.05, 0.98, 1.03, 1],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
    drinking_coffee: {
      // Cozy sipping - slow, relaxed, content
      y: [0, -2, 0, -1, 0],
      rotate: [0, 2, 0, -1, 0],
      scale: [1, 1.02, 0.99, 1.01, 1],
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
    reading: {
      // Absorbed in book - subtle focused movement
      y: [0, -1, 0],
      rotate: [0, 0.5, 0, -0.5, 0],
      scale: [1, 1.01, 1],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
    gaming: {
      // Intense gaming - quick reactive movements
      x: [0, -3, 3, -2, 2, -1, 1, 0],
      y: [0, -5, -2, -4, 0],
      rotate: [0, -3, 3, -2, 0],
      transition: { duration: 0.6, repeat: Infinity, ease: 'easeOut' },
    },
    dancing: {
      // Groovy dance - rhythmic bouncy movement
      y: [0, -12, 0, -8, 0, -10, 0],
      rotate: [0, -10, 10, -8, 8, -5, 0],
      scale: [1, 1.08, 0.95, 1.06, 0.97, 1.04, 1],
      x: [0, 3, -3, 2, -2, 0],
      transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
    },
    sleeping: {
      // Peaceful sleep - gentle breathing rhythm
      y: [0, 3, 0, 2, 0],
      scale: [1, 0.96, 1, 0.98, 1],
      rotate: [0, 1, 0, -1, 0],
      transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
    },
    waving: {
      // Friendly wave - energetic greeting
      rotate: [0, -8, 8, -6, 6, -4, 4, 0],
      y: [0, -5, -3, -5, -2, -4, 0],
      scale: [1, 1.05, 1.02, 1.04, 1],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    thumbs_up: {
      // Confident approval - proud bounce
      y: [0, -8, 0, -4, 0],
      scale: [1, 1.08, 1, 1.04, 1],
      rotate: [0, -2, 2, 0],
      transition: { duration: 1.8, repeat: Infinity, ease: 'easeOut' },
    },
    holding_trophy: {
      // Victorious celebration - proud sway with trophy
      y: [0, -10, 0, -6, 0],
      rotate: [0, -4, 4, -2, 0],
      scale: [1, 1.1, 1, 1.05, 1],
      transition: { duration: 2, repeat: Infinity, ease: 'easeOut' },
    },
    typing: {
      // Focused typing - subtle rapid movements
      y: [0, -1, 0, -1, 0, -1, 0],
      scale: [1, 1.01, 1, 1.01, 1],
      x: [0, 0.5, -0.5, 0],
      transition: { duration: 0.5, repeat: Infinity, ease: 'linear' },
    },
    cheering: {
      // Enthusiastic cheer - high energy bouncing
      y: [0, -18, 0, -12, 0, -8, 0],
      rotate: [0, -8, 8, -6, 6, -3, 0],
      scale: [1, 1.15, 1, 1.1, 1, 1.05, 1],
      x: [0, -2, 2, -1, 1, 0],
      transition: { duration: 1.4, repeat: Infinity, ease: 'easeOut' },
    },
    training: {
      // Workout pump - powerful lifting motion
      y: [0, -8, -2, -6, 0],
      scale: [1, 1.12, 1.05, 1.1, 1],
      rotate: [0, -2, 0, 2, 0],
      transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  const baseVariant = getBaseVariant(variant);
  return animations[baseVariant];
}

/**
 * Interactive Mascot component with hover and click state changes
 *
 * @example
 * // Basic interactive mascot
 * <InteractiveMascot variant="happy" enableHover enableClick />
 *
 * // Custom interactions
 * <InteractiveMascot
 *   variant="thinking"
 *   hoverVariant="excited"
 *   clickVariant="celebrating"
 *   clickAnimation="bounce"
 *   onClick={() => console.log('Mascot clicked!')}
 * />
 *
 * // With tooltip
 * <InteractiveMascot
 *   variant="encouraging"
 *   enableHover
 *   enableClick
 *   tooltip="Click me!"
 * />
 */
export const InteractiveMascot = memo(function InteractiveMascot({
  variant,
  size = 'md',
  animated = true,
  className = '',
  priority = false,
  alt,
  enableHover = true,
  enableClick = true,
  hoverVariant,
  clickVariant,
  clickAnimation = 'bounce',
  clickDuration = 800,
  onClick,
  onHover,
  tooltip,
  ariaLabel,
}: InteractiveMascotProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const shouldAnimate = animated && !prefersReducedMotion && enableComplexAnimations;
  const isInteractive = (enableHover || enableClick) && !prefersReducedMotion;

  // Determine current display variant based on interaction state
  const currentVariant = useMemo(() => {
    if (isClicked) {
      return clickVariant || DEFAULT_CLICK_TRANSITIONS[variant] || variant;
    }
    if (isHovered && enableHover) {
      return hoverVariant || DEFAULT_HOVER_TRANSITIONS[variant] || variant;
    }
    return variant;
  }, [variant, isHovered, isClicked, enableHover, hoverVariant, clickVariant]);

  const imageSrc = getImageSource(currentVariant);
  const altText = alt || ariaLabel || `Lexi mascot - ${currentVariant}`;
  const idleAnimation = useMemo(() => getIdleAnimation(currentVariant), [currentVariant]);

  const handleMouseEnter = useCallback(() => {
    if (enableHover) {
      setIsHovered(true);
      setShowTooltip(true);
      onHover?.(true);
    }
  }, [enableHover, onHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowTooltip(false);
    onHover?.(false);
  }, [onHover]);

  const handleClick = useCallback(() => {
    if (!enableClick) return;

    setIsClicked(true);
    onClick?.();

    // Reset after duration
    setTimeout(() => {
      setIsClicked(false);
    }, clickDuration);
  }, [enableClick, onClick, clickDuration]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <div className={`relative inline-block ${className}`}>
      <motion.div
        className={`relative ${SIZE_CLASSES[size]} ${isInteractive ? 'cursor-pointer' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? 'button' : undefined}
        aria-label={ariaLabel || altText}
        whileHover={isInteractive && shouldAnimate ? { scale: 1.05 } : undefined}
        whileTap={isInteractive && shouldAnimate ? { scale: 0.95 } : undefined}
        animate={isClicked && shouldAnimate ? CLICK_ANIMATIONS[clickAnimation] : undefined}
      >
        {/* Idle animation wrapper */}
        <motion.div
          className="w-full h-full"
          animate={shouldAnimate && !isClicked ? idleAnimation : undefined}
        >
          {/* Image with crossfade on variant change */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentVariant}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
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
          </AnimatePresence>
        </motion.div>

        {/* Hover glow effect */}
        {isInteractive && shouldAnimate && (
          <motion.div
            className="absolute inset-0 rounded-full bg-neo-yellow/20 blur-xl -z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: isHovered ? 0.6 : 0,
              scale: isHovered ? 1.2 : 0.8
            }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Click sparkle effect */}
        {isClicked && shouldAnimate && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-neo-yellow rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                initial={{
                  x: 0,
                  y: 0,
                  scale: 0,
                  opacity: 1
                }}
                animate={{
                  x: Math.cos((i / 6) * Math.PI * 2) * 40,
                  y: Math.sin((i / 6) * Math.PI * 2) * 40,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 0.5,
                  ease: 'easeOut',
                  delay: i * 0.03,
                }}
              />
            ))}
          </>
        )}
      </motion.div>

      {/* Tooltip */}
      {tooltip && showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-neo-black text-neo-white text-xs font-bold rounded-neo whitespace-nowrap z-50"
        >
          {tooltip}
          {/* Tooltip arrow */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neo-black rotate-45" />
        </motion.div>
      )}
    </div>
  );
});

/**
 * Interactive Mascot with entrance animation
 */
export const InteractiveMascotWithEntrance = memo(function InteractiveMascotWithEntrance({
  delay = 0,
  ...props
}: InteractiveMascotProps & { delay?: number }) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const shouldAnimate = !prefersReducedMotion && enableComplexAnimations;

  return (
    <motion.div
      initial={shouldAnimate ? { scale: 0, opacity: 0, y: 20 } : undefined}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay,
      }}
    >
      <InteractiveMascot {...props} />
    </motion.div>
  );
});

export default InteractiveMascot;
