'use client';

import { m, AnimatePresence, type TargetAndTransition } from 'framer-motion';
import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { haptics } from '@/utils/haptics';
import { getMascotImagePath, getMascotBgType, isVideoVariant, type MascotVariant } from './mascotData';
import type { MascotClipShape, MascotBorderColor } from './Mascot';
import { SilentVideo } from './SilentVideo';
import {
  getBaseVariant,
  type ExtendedMascotVariant,
  type MoodVariant,
  type ActivityVariant,
  VARIANT_MAP,
  BASE_VARIANTS,
} from './mascotUtils';

// Re-export types and utilities for backward compatibility
export { getBaseVariant, VARIANT_MAP, BASE_VARIANTS };
export type { ExtendedMascotVariant, MoodVariant, ActivityVariant };

/**
 * Default state transitions for interactions
 * All interactions transition between the 7 GIF variants
 */
const DEFAULT_HOVER_TRANSITIONS: Partial<Record<ExtendedMascotVariant, MascotVariant>> = {
  // Base GIF variants
  happy: 'gaming',        // Happy → Gaming (more energetic)
  gaming: 'happy',        // Gaming → Happy (nice!)
  thinking: 'happy',      // Thinking → Happy (done thinking)
  oops: 'thinking',       // Oops → Thinking (figuring it out)
  celebration: 'trophy',  // Celebration → Trophy (show off!)
  dj: 'celebration',      // DJ → Celebration (party time!)
  trophy: 'celebration',  // Trophy → Celebration (victory dance!)
  panic: 'encouraging',   // Panic → Encouraging (calm down)
  crying: 'encouraging',  // Crying → Encouraging (cheer up)
  onfire: 'flexing',      // On Fire → Flexing (show strength)
  bored: 'waving',        // Bored → Waving (perk up)
  mindblown: 'happy',     // Mindblown → Happy (compose)
  encouraging: 'happy',   // Encouraging → Happy (smile)
  explorer: 'mindblown',  // Explorer → Mindblown (discover)
  flexing: 'trophy',      // Flexing → Trophy (show off)
  scared: 'encouraging',  // Scared → Encouraging (brave up)
  shopkeeper: 'happy',    // Shopkeeper → Happy (welcome)
  spectating: 'onfire',   // Spectating → On Fire (get hyped)
  waving: 'happy',        // Waving → Happy (greet)
  powerup: 'onfire',      // Powerup → On Fire (unleash)
  dance: 'celebration',   // Dance → Celebration (party!)
  question: 'happy',      // Question → Happy (figured it out)
};

const DEFAULT_CLICK_TRANSITIONS: Partial<Record<ExtendedMascotVariant, MascotVariant>> = {
  // Base GIF variants
  happy: 'celebration',   // Happy → Celebration (let's celebrate!)
  gaming: 'trophy',       // Gaming → Trophy (victory!)
  thinking: 'oops',       // Thinking → Oops (oh!)
  oops: 'happy',          // Oops → Happy (recovered!)
  celebration: 'dj',      // Celebration → DJ (party mode!)
  dj: 'trophy',           // DJ → Trophy (winner!)
  trophy: 'celebration',  // Trophy → Celebration (celebrate win!)
  panic: 'happy',         // Panic → Happy (relief)
  crying: 'celebration',  // Crying → Celebration (overcome)
  onfire: 'celebration',  // On Fire → Celebration (peak!)
  bored: 'gaming',        // Bored → Gaming (let's play!)
  mindblown: 'celebration', // Mindblown → Celebration (amazement)
  encouraging: 'celebration', // Encouraging → Celebration (success!)
  explorer: 'trophy',     // Explorer → Trophy (found it!)
  flexing: 'celebration', // Flexing → Celebration (victory!)
  scared: 'onfire',       // Scared → On Fire (power through!)
  shopkeeper: 'trophy',   // Shopkeeper → Trophy (sold!)
  spectating: 'celebration', // Spectating → Celebration (impressed!)
  waving: 'celebration',  // Waving → Celebration (let's go!)
  powerup: 'trophy',      // Powerup → Trophy (powered up!)
  dance: 'dj',            // Dance → DJ (mix it up!)
  question: 'celebration', // Question → Celebration (eureka!)
};

const CLIP_CLASSES: Record<MascotClipShape, string> = {
  none: '',
  circle: 'rounded-full overflow-hidden',
  'rounded-square': 'rounded-neo overflow-hidden',
};

const BORDER_CLASSES: Record<MascotBorderColor, string> = {
  pink: 'border-3 border-neo-pink shadow-hard',
  lime: 'border-3 border-neo-lime shadow-hard',
  cyan: 'border-3 border-neo-cyan shadow-hard',
  purple: 'border-3 border-neo-purple shadow-hard',
  white: 'border-3 border-neo-white shadow-hard',
  none: '',
};

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

export interface InteractiveMascotProps {
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
  /** Fetch priority hint for the browser (high = LCP optimization) */
  fetchPriority?: 'high' | 'low' | 'auto';
  /** Override size classes with responsive Tailwind classes (e.g. "w-24 h-24 sm:w-32 sm:h-32") */
  sizeClassName?: string;
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
  /** Duration to show click variant before returning to base (ms) - default 1200ms for smooth perception */
  clickDuration?: number;
  /** Callback when mascot is clicked */
  onClick?: () => void;
  /** Callback when mascot is hovered */
  onHover?: (isHovered: boolean) => void;
  /** Show tooltip on hover */
  tooltip?: string;
  /** Accessibility label */
  ariaLabel?: string;
  /** Clip shape to mask GIF background */
  clipShape?: MascotClipShape;
  /** Border color when using a clip shape */
  clipBorder?: MascotBorderColor;
  /** Background behind the GIF inside the clip */
  clipBg?: string;
}

/**
 * Get the actual image source for a variant
 * Activity variants now have dedicated images, mood variants use fallbacks
 * GIF variants use animated GIFs, others use PNGs
 */
function getImageSource(variant: ExtendedMascotVariant): string {
  const baseVariant = getBaseVariant(variant);
  return getMascotImagePath(baseVariant);
}

/**
 * Get idle animation based on variant
 * CSS animations that complement the GIF animation
 */
function getIdleAnimation(variant: ExtendedMascotVariant): TargetAndTransition {
  const animations: Record<MascotVariant, TargetAndTransition> = {
    // Happy: Gentle floating bob (complements main-nobg.gif)
    happy: {
      y: [0, -6, 0],
      rotate: [0, -2, 2, 0],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
    },
    // Gaming: Intense reactive motion (complements play-nobg.gif)
    gaming: {
      x: [0, -3, 3, -2, 2, -1, 1, 0],
      y: [0, -5, -2, -4, 0],
      rotate: [0, -3, 3, -2, 0],
      transition: { duration: 0.6, repeat: Infinity, ease: 'easeOut' },
    },
    // Thinking: Slow thoughtful bob with head tilt (complements study-nobg.gif)
    thinking: {
      y: [0, -3, 0],
      rotate: [0, 2, 0, -2, 0],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
    // Oops: Nervous shake/wiggle (complements oops-nobg.gif)
    oops: {
      x: [0, -2, 2, -1, 1, 0],
      transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' },
    },
    // Celebration: Bouncy victory dance (complements celebration-nobg.gif)
    celebration: {
      y: [0, -10, 0, -6, 0],
      scale: [1, 1.05, 1, 1.03, 1],
      rotate: [0, -4, 4, -2, 2, 0],
      transition: { duration: 0.8, repeat: Infinity, ease: 'easeOut' },
    },
    // DJ: Rhythmic bounce (complements dj-nobg.gif)
    dj: {
      y: [0, -5, 0],
      rotate: [0, -3, 3, 0],
      scale: [1, 1.02, 1],
      transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' },
    },
    // Trophy: Proud pose with subtle sway (complements trophy-nobg.gif)
    trophy: {
      y: [0, -4, 0],
      rotate: [0, 2, -2, 0],
      scale: [1, 1.03, 1],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
    // Panic: Fast jitter
    panic: {
      x: [0, -3, 3, -2, 2, -1, 1, 0],
      y: [0, -2, 0, -1, 0],
      transition: { duration: 0.4, repeat: Infinity, ease: 'easeInOut' },
    },
    // Crying: Slow heaving bob
    crying: {
      y: [0, -3, 0],
      rotate: [0, -1, 1, 0],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    // On Fire: Intense upward energy
    onfire: {
      y: [0, -10, 0],
      scale: [1, 1.08, 1],
      transition: { duration: 0.5, repeat: Infinity, ease: 'easeOut' },
    },
    // Bored: Slow lazy sway
    bored: {
      y: [0, -2, 0],
      rotate: [0, 1, -1, 0],
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
    // Mindblown: Dramatic scale pop
    mindblown: {
      scale: [1, 1.1, 1],
      y: [0, -8, 0],
      transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
    },
    // Encouraging: Gentle nod
    encouraging: {
      y: [0, -5, 0],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
    // Explorer: Swaying walk
    explorer: {
      x: [0, -3, 3, 0],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
    // Flexing: Proud sway
    flexing: {
      scale: [1, 1.05, 1],
      y: [0, -3, 0],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    // Scared: Rapid trembling
    scared: {
      x: [0, -4, 4, -3, 3, -1, 1, 0],
      transition: { duration: 0.6, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' },
    },
    // Shopkeeper: Subtle lean
    shopkeeper: {
      y: [0, -3, 0],
      rotate: [0, 2, -2, 0],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
    },
    // Spectating: Relaxed bob
    spectating: {
      y: [0, -4, 0],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
    // Waving: Side-to-side tilt
    waving: {
      rotate: [0, -5, 5, 0],
      transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
    },
    // Powerup: Pulsing energy
    powerup: {
      scale: [1, 1.08, 1, 1.04, 1],
      y: [0, -8, 0],
      transition: { duration: 0.8, repeat: Infinity, ease: 'easeOut' },
    },
    // Sleepy: Slow drowsy drift
    sleepy: {
      y: [0, -2, 0],
      rotate: [0, 1, -1, 0],
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
    // Waiting: Idle tap
    waiting: {
      y: [0, -3, 0],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
    },
    // GG: Victory bounce
    gg: {
      y: [0, -8, 0],
      scale: [1, 1.05, 1],
      transition: { duration: 1, repeat: Infinity, ease: 'easeOut' },
    },
    // Scholar: Thoughtful nod
    scholar: {
      y: [0, -3, 0],
      rotate: [0, 2, 0, -2, 0],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
    // Rage: Intense shaking
    rage: {
      x: [0, -4, 4, -3, 3, -1, 1, 0],
      y: [0, -3, 0],
      transition: { duration: 0.4, repeat: Infinity, ease: 'easeOut' },
    },
    // Bomber: Recoil pulse
    bomber: {
      scale: [1, 1.06, 1],
      y: [0, -5, 0],
      transition: { duration: 0.7, repeat: Infinity, ease: 'easeOut' },
    },
    // Winner: Proud float
    winner: {
      y: [0, -10, 0, -6, 0],
      scale: [1, 1.05, 1, 1.03, 1],
      transition: { duration: 1, repeat: Infinity, ease: 'easeOut' },
    },
    // Knight: Stalwart sway
    knight: {
      y: [0, -4, 0],
      rotate: [0, -2, 2, 0],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
    // Sad: Slow droop
    sad: {
      y: [0, -2, 0],
      rotate: [0, -1, 1, 0],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
    // Ghostly: Ethereal float
    ghostly: {
      y: [0, -8, 0],
      opacity: [1, 0.7, 1],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
    },
    // Dance: Rhythmic bounce
    dance: {
      y: [0, -8, 0, -5, 0],
      rotate: [0, -4, 4, -2, 0],
      transition: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' },
    },
    // Question: Curious tilt
    question: {
      y: [0, -4, 0],
      rotate: [0, 3, -3, 0],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
    },
    // TrophyNobg: Proud sway (same as trophy)
    trophyNobg: {
      y: [0, -4, 0],
      rotate: [0, 2, -2, 0],
      scale: [1, 1.03, 1],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
    // ExplorerNobg: Walking sway
    explorerNobg: {
      x: [0, -3, 3, 0],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
    // CryingNobg: Heaving bob
    cryingNobg: {
      y: [0, -3, 0],
      rotate: [0, -1, 1, 0],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  const baseVariant = getBaseVariant(variant);
  return animations[baseVariant];
}

/**
 * Interactive Mascot component with hover and click state changes
 * GIF-ONLY: All variants use animated GIFs, extended variants map to 4 base GIFs
 *
 * @example
 * // Basic interactive mascot with base GIF variant
 * <InteractiveMascot variant="happy" enableHover enableClick />
 *
 * // Using extended semantic variant (maps to base GIF)
 * <InteractiveMascot variant="celebrating" enableHover enableClick />
 * // 'celebrating' → 'happy' GIF
 *
 * // Custom interactions with base GIF variants
 * <InteractiveMascot
 *   variant="thinking"
 *   hoverVariant="happy"
 *   clickVariant="gaming"
 *   clickAnimation="bounce"
 *   onClick={() => console.log('Mascot clicked!')}
 * />
 *
 * // With tooltip and activity variant
 * <InteractiveMascot
 *   variant="skateboarding"  // → gaming GIF
 *   enableHover
 *   enableClick
 *   tooltip="Click me!"
 * />
 */
/**
 * Lazy preload specific mascot images when needed
 * Only preloads the image if it hasn't been preloaded before
 */
const preloadedImages = new Set<string>();

function preloadMascotImage(src: string): void {
  if (preloadedImages.has(src)) return;

  const img = new window.Image();
  img.onload = () => {
    preloadedImages.add(src);
  };
  img.onerror = () => {
    preloadedImages.add(src); // Mark as attempted to avoid retries
  };
  img.src = src;
}

export const InteractiveMascot = memo(function InteractiveMascot({
  variant,
  size = 'md',
  animated = true,
  className = '',
  priority = false,
  fetchPriority,
  sizeClassName,
  alt,
  enableHover = true,
  enableClick = true,
  hoverVariant,
  clickVariant,
  clickAnimation = 'bounce',
  clickDuration = 1200,
  onClick,
  onHover,
  tooltip,
  ariaLabel,
  clipShape,
  clipBorder,
  clipBg,
}: InteractiveMascotProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear click timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  // Defer preloading hover/click variant GIFs until well after window load.
  // These GIFs/WebPs are 150KB-1.7MB each — fetching them during the initial
  // load window competes with LCP content for bandwidth, and their decode
  // bursts the main thread right when first input arrives (INP). 12s keeps
  // them out of both the real first-interaction window and the Lighthouse
  // trace; a user who hovers earlier simply sees the static variant first.
  useEffect(() => {
    if (!enableHover && !enableClick) return;

    const doPreload = () => {
      if (enableHover) {
        const hoverTarget = hoverVariant || DEFAULT_HOVER_TRANSITIONS[variant];
        if (hoverTarget) {
          preloadMascotImage(getImageSource(hoverTarget));
        }
      }
      if (enableClick) {
        const clickTarget = clickVariant || DEFAULT_CLICK_TRANSITIONS[variant];
        if (clickTarget) {
          preloadMascotImage(getImageSource(clickTarget));
        }
      }
    };

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const scheduleIdle = () => {
      timeoutId = setTimeout(doPreload, 30000);
    };

    // Wait for full page load before scheduling the idle preload
    if (document.readyState === 'complete') {
      scheduleIdle();
    } else {
      window.addEventListener('load', scheduleIdle, { once: true });
    }

    return () => {
      window.removeEventListener('load', scheduleIdle);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [variant, enableHover, enableClick, hoverVariant, clickVariant]);

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
  const baseVariant = useMemo(() => getBaseVariant(currentVariant), [currentVariant]);
  const isVideo = isVideoVariant(baseVariant);
  const altText = alt || ariaLabel || `Lexi mascot - ${currentVariant}`;
  const idleAnimation = useMemo(() => getIdleAnimation(currentVariant), [currentVariant]);

  // Auto-resolve clip/border/bg based on mascot background type
  const autoStyle = useMemo(() => {
    const bgType = getMascotBgType(baseVariant);
    // White bg: always enforce circle clip + border — callers cannot override to 'none'
    if (bgType === 'white') {
      return {
        shape: (clipShape && clipShape !== 'none' ? clipShape : 'circle') as MascotClipShape,
        border: (clipBorder && clipBorder !== 'none' ? clipBorder : 'pink') as MascotBorderColor,
        bg: clipBg ?? 'bg-white',
      };
    }
    if (clipShape !== undefined) {
      return { shape: clipShape, border: clipBorder ?? 'pink' as MascotBorderColor, bg: clipBg ?? 'bg-neo-navy' };
    }
    return { shape: 'none' as MascotClipShape, border: clipBorder ?? 'none' as MascotBorderColor, bg: clipBg ?? '' };
  }, [baseVariant, clipShape, clipBorder, clipBg]);

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

    haptics.tap();
    setIsClicked(true);
    onClick?.();

    // Reset after duration
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      setIsClicked(false);
      clickTimeoutRef.current = null;
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
      <m.div
        data-testid="interactive-mascot"
        data-variant={variant}
        className={`relative ${sizeClassName || SIZE_CLASSES[size]} ${isInteractive ? 'cursor-pointer' : ''} focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2`}
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
        <m.div
          className="w-full h-full"
          animate={shouldAnimate && !isClicked ? idleAnimation : undefined}
        >
          {/* Image with crossfade on variant change */}
          {/* Fast transition (200ms) for smoother, less noticeable changes */}
          {/* initial={false}: skip opacity:0 on first mount so the mascot paints at full
              opacity in the SSR HTML. Without this, Framer serialises `initial={{ opacity:0 }}`
              into the HTML → browser ignores the element for LCP until hydration completes. */}
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={currentVariant}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="w-full h-full"
            >
              <div data-mascot-bg={getMascotBgType(baseVariant)} className={`w-full h-full ${CLIP_CLASSES[autoStyle.shape]} ${BORDER_CLASSES[autoStyle.border]} ${autoStyle.shape !== 'none' ? autoStyle.bg : ''}`}>
                {isVideo ? (
                  <SilentVideo
                    key={imageSrc}
                    src={imageSrc}
                    aria-label={altText}
                    width={SIZE_PIXELS[size]}
                    height={SIZE_PIXELS[size]}
                    className={`object-contain w-full h-full ${autoStyle.shape !== 'none' ? 'scale-110' : ''} drop-shadow-lg`}
                    preload={priority ? 'auto' : 'metadata'}
                  />
                ) : (
                  <Image
                    src={imageSrc}
                    alt={altText}
                    width={SIZE_PIXELS[size]}
                    height={SIZE_PIXELS[size]}
                    className={`object-contain ${autoStyle.shape !== 'none' ? 'scale-110' : ''} drop-shadow-lg`}
                    priority={priority}
                    fetchPriority={fetchPriority}
                    unoptimized
                  />
                )}
              </div>
            </m.div>
          </AnimatePresence>
        </m.div>

        {/* Hover glow effect */}
        {isInteractive && shouldAnimate && (
          <m.div
            className="absolute inset-0 rounded-full bg-neo-lime/20 blur-xl -z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: isHovered ? 0.6 : 0,
              scale: isHovered ? 1.2 : 0.8
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}

        {/* Click sparkle effect */}
        {isClicked && shouldAnimate && (
          <>
            {[...Array(6)].map((_, i) => (
              <m.div
                key={`sparkle-${i}`}
                className="absolute w-2 h-2 bg-neo-lime rounded-full"
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
      </m.div>

      {/* Tooltip */}
      {tooltip && showTooltip && (
        <m.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-neo-black text-neo-white text-xs font-bold rounded-neo whitespace-nowrap z-50"
        >
          {tooltip}
          {/* Tooltip arrow */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neo-black rotate-45" />
        </m.div>
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
    <m.div
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
    </m.div>
  );
});

export default InteractiveMascot;
