import { useState, useEffect, useCallback, useRef } from 'react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import type { TargetAndTransition, Transition } from 'framer-motion';

/**
 * Animation presets for mascot images
 * Each preset defines a unique motion pattern
 */
export type MascotAnimationPreset =
  | 'bounce'
  | 'wiggle'
  | 'float'
  | 'pulse'
  | 'sway'
  | 'hop'
  | 'dance'
  | 'nod';

interface AnimationDefinition {
  animate: TargetAndTransition;
  transition: Transition;
}

/**
 * Animation definitions for each preset
 */
const ANIMATION_DEFINITIONS: Record<MascotAnimationPreset, AnimationDefinition> = {
  bounce: {
    animate: {
      y: [0, -8, 0],
      rotate: [0, 2, -2, 0],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  wiggle: {
    animate: {
      rotate: [-4, 4, -4],
      scale: [1, 1.03, 1],
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  float: {
    animate: {
      y: [0, -6, 0],
      x: [-2, 2, -2],
    },
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.95, 1],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  sway: {
    animate: {
      rotate: [-6, 6],
      x: [-3, 3],
    },
    transition: {
      duration: 2.5,
      repeat: Infinity,
      repeatType: 'reverse' as const,
      ease: 'easeInOut',
    },
  },
  hop: {
    animate: {
      y: [0, -12, 0, -4, 0],
      scale: [1, 1.02, 0.98, 1.01, 1],
    },
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: 'easeOut',
      repeatDelay: 0.5,
    },
  },
  dance: {
    animate: {
      rotate: [-3, 3, -3],
      y: [0, -4, 0, -4, 0],
      scale: [1, 1.02, 1, 1.02, 1],
    },
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  nod: {
    animate: {
      rotate: [0, 5, 0, -5, 0],
      y: [0, 2, 0, 2, 0],
    },
    transition: {
      duration: 2.2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Default animation cycle order
 */
export const DEFAULT_ANIMATION_CYCLE: MascotAnimationPreset[] = [
  'bounce',
  'wiggle',
  'float',
  'pulse',
  'sway',
  'hop',
  'dance',
  'nod',
];

interface UseMascotImageAnimationOptions {
  /** Initial animation preset */
  initialPreset?: MascotAnimationPreset;
  /** Animation presets to cycle through */
  presets?: MascotAnimationPreset[];
  /** Min interval between animation changes in ms (default: 6000 = 6s) */
  minInterval?: number;
  /** Max interval between animation changes in ms (default: 12000 = 12s) */
  maxInterval?: number;
  /** Whether to cycle animations (default: true) */
  enabled?: boolean;
}

interface UseMascotImageAnimationReturn {
  /** Current animation preset */
  currentPreset: MascotAnimationPreset;
  /** Framer Motion animate prop */
  animate: TargetAndTransition;
  /** Framer Motion transition prop */
  transition: Transition;
  /** Manually trigger next animation */
  nextAnimation: () => void;
  /** Set a specific animation */
  setAnimation: (preset: MascotAnimationPreset) => void;
}

/**
 * Hook to cycle through different animation presets for mascot images.
 * Provides variety in mascot movements without changing the image itself.
 *
 * @example
 * ```tsx
 * const { animate, transition } = useMascotImageAnimation({
 *   initialPreset: 'bounce',
 *   presets: ['bounce', 'wiggle', 'float', 'dance'],
 * });
 *
 * return (
 *   <m.div animate={animate} transition={transition}>
 *     <Image src="/mascot.png" alt="Mascot" />
 *   </m.div>
 * );
 * ```
 */
export function useMascotImageAnimation({
  initialPreset = 'bounce',
  presets = DEFAULT_ANIMATION_CYCLE,
  minInterval = 6000,
  maxInterval = 12000,
  enabled = true,
}: UseMascotImageAnimationOptions = {}): UseMascotImageAnimationReturn {
  const { prefersReducedMotion } = useDevicePerformance();
  const [currentPreset, setCurrentPreset] = useState<MascotAnimationPreset>(initialPreset);
  const lastIndexRef = useRef(presets.indexOf(initialPreset));
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Get random interval for next animation change
   */
  const getRandomInterval = useCallback((): number => {
    return Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
  }, [minInterval, maxInterval]);

  /**
   * Pick next animation (different from current)
   */
  const nextAnimation = useCallback(() => {
    if (presets.length <= 1) return;

    let newIndex: number;
    do {
      newIndex = Math.floor(Math.random() * presets.length);
    } while (newIndex === lastIndexRef.current && presets.length > 1);

    lastIndexRef.current = newIndex;
    setCurrentPreset(presets[newIndex]);
  }, [presets]);

  /**
   * Set a specific animation
   */
  const setAnimation = useCallback((preset: MascotAnimationPreset) => {
    const index = presets.indexOf(preset);
    if (index !== -1) {
      lastIndexRef.current = index;
      setCurrentPreset(preset);
    }
  }, [presets]);

  // Auto-cycle animations
  useEffect(() => {
    if (!enabled || prefersReducedMotion || presets.length <= 1) {
      return;
    }

    const scheduleNext = () => {
      timeoutRef.current = setTimeout(() => {
        nextAnimation();
        scheduleNext();
      }, getRandomInterval());
    };

    scheduleNext();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, prefersReducedMotion, presets.length, nextAnimation, getRandomInterval]);

  // Get current animation definition
  const { animate, transition } = ANIMATION_DEFINITIONS[currentPreset];

  // If reduced motion, return minimal animation
  if (prefersReducedMotion) {
    return {
      currentPreset,
      animate: { opacity: 1 },
      transition: { duration: 0 },
      nextAnimation,
      setAnimation,
    };
  }

  return {
    currentPreset,
    animate,
    transition,
    nextAnimation,
    setAnimation,
  };
}
