import { useState, useEffect, useCallback, useRef } from 'react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { getMascotImagePath, type MascotVariant } from '@/components/ui/Mascot';
import { getBaseVariant, type ExtendedMascotVariant, type ActivityVariant } from '@/components/ui/mascotUtils';

/**
 * Preload cache to track already preloaded images
 */
const preloadedImages = new Set<string>();

/**
 * Lazy preload a mascot image
 */
function preloadMascotImage(variant: ExtendedMascotVariant): void {
  const baseVariant = getBaseVariant(variant);
  const src = getMascotImagePath(baseVariant);

  if (preloadedImages.has(src)) return;

  if (typeof window === 'undefined') return;

  const img = new window.Image();
  img.onload = () => {
    preloadedImages.add(src);
  };
  img.onerror = () => {
    preloadedImages.add(src); // Mark as attempted to avoid retries
  };
  img.src = src;
}

/**
 * Default fun activities that can be randomly displayed
 * NOTE: 'gaming' is now a base variant, not an activity variant
 */
export const DEFAULT_IDLE_ACTIVITIES: ActivityVariant[] = [
  'eating_pizza',
  'drinking_coffee',
  'dancing',
  'skateboarding',
  'holding_trophy',
  'cheering',
];

/**
 * Default emotional base variants to cycle through for variety
 * GIF-ONLY: All 7 base GIF variants
 */
export const DEFAULT_BASE_VARIANTS: MascotVariant[] = [
  'happy',
  'gaming',
  'thinking',
  'oops',
  'celebration',
  'dj',
  'trophy',
  'waving',
  'spectating',
  'mindblown',
  'flexing',
];

interface UseRandomMascotActivityOptions {
  /** Base variant to return to after activity (or primary variant if cycling) */
  baseVariant: ExtendedMascotVariant;
  /** Additional base variants to cycle through for variety (optional) */
  baseVariants?: MascotVariant[];
  /** List of activities to randomly choose from */
  activities?: ActivityVariant[];
  /** Min delay before first activity in ms (default: 8000 = 8s) */
  initialDelayMin?: number;
  /** Max delay before first activity in ms (default: 15000 = 15s) */
  initialDelayMax?: number;
  /** Min interval between subsequent activities in ms (default: 45000 = 45s) */
  minInterval?: number;
  /** Max interval between subsequent activities in ms (default: 90000 = 90s) */
  maxInterval?: number;
  /** How long to show activity before returning to base in ms (default: 4000 = 4s) */
  activityDuration?: number;
  /** Whether to enable random activities (default: true) */
  enabled?: boolean;
  /** Enable cycling through different base variants (default: false) */
  cycleBaseVariants?: boolean;
}

interface UseRandomMascotActivityReturn {
  /** Current mascot variant (base or activity) */
  currentVariant: ExtendedMascotVariant;
  /** Current base variant (may cycle if cycleBaseVariants is enabled) */
  currentBaseVariant: ExtendedMascotVariant;
  /** Whether currently showing an activity */
  isDoingActivity: boolean;
  /** Manually trigger a random activity */
  triggerActivity: () => void;
  /** Reset to base variant immediately */
  resetToBase: () => void;
}

/**
 * Hook to manage random idle activity animations for the mascot.
 * Periodically switches mascot to fun activities and back to base state.
 *
 * @example
 * ```tsx
 * const { currentVariant, triggerActivity } = useRandomMascotActivity({
 *   baseVariant: 'happy',
 *   activities: ['eating_pizza', 'gaming', 'dancing'],
 *   minInterval: 15000,
 *   maxInterval: 45000,
 * });
 *
 * return (
 *   <InteractiveMascot
 *     variant={currentVariant}
 *     onClick={triggerActivity}
 *   />
 * );
 * ```
 */
export function useRandomMascotActivity({
  baseVariant,
  baseVariants,
  activities = DEFAULT_IDLE_ACTIVITIES,
  initialDelayMin = 8000,
  initialDelayMax = 15000,
  minInterval = 45000,
  maxInterval = 90000,
  activityDuration = 4000,
  enabled = true,
  cycleBaseVariants = false,
}: UseRandomMascotActivityOptions): UseRandomMascotActivityReturn {
  const { prefersReducedMotion } = useDevicePerformance();
  const [currentVariant, setCurrentVariant] = useState<ExtendedMascotVariant>(baseVariant);
  const [currentBaseVariant, setCurrentBaseVariant] = useState<ExtendedMascotVariant>(baseVariant);
  const [isDoingActivity, setIsDoingActivity] = useState(false);

  const nextActivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activityResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rescheduleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scheduleNextActivityRef = useRef<(() => void) | null>(null);
  const isFirstActivityRef = useRef(true);
  const lastBaseIndexRef = useRef(0);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (nextActivityTimeoutRef.current) {
        clearTimeout(nextActivityTimeoutRef.current);
      }
      if (activityResetTimeoutRef.current) {
        clearTimeout(activityResetTimeoutRef.current);
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
      if (rescheduleTimeoutRef.current) {
        clearTimeout(rescheduleTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Get random activity from the list
   */
  const getRandomActivity = useCallback((): ActivityVariant => {
    const randomIndex = Math.floor(Math.random() * activities.length);
    return activities[randomIndex];
  }, [activities]);

  /**
   * Get a different random base variant from the list (avoids repeating the current one)
   */
  const getNextBaseVariant = useCallback((): ExtendedMascotVariant => {
    if (!cycleBaseVariants || !baseVariants || baseVariants.length === 0) {
      return baseVariant;
    }

    // Create combined list including the primary baseVariant
    const allVariants = [baseVariant, ...baseVariants.filter(v => v !== baseVariant)];

    if (allVariants.length <= 1) {
      return baseVariant;
    }

    // Pick a different index than the last one
    let newIndex: number;
    do {
      newIndex = Math.floor(Math.random() * allVariants.length);
    } while (newIndex === lastBaseIndexRef.current && allVariants.length > 1);

    lastBaseIndexRef.current = newIndex;
    return allVariants[newIndex];
  }, [cycleBaseVariants, baseVariants, baseVariant]);

  /**
   * Get random interval - uses shorter delay for first activity
   */
  const getRandomInterval = useCallback((): number => {
    if (isFirstActivityRef.current) {
      return Math.floor(Math.random() * (initialDelayMax - initialDelayMin + 1)) + initialDelayMin;
    }
    return Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
  }, [initialDelayMin, initialDelayMax, minInterval, maxInterval]);

  /**
   * Trigger a random activity
   */
  const triggerActivity = useCallback(() => {
    if (isDoingActivity || prefersReducedMotion) return;

    // Mark first activity as done
    isFirstActivityRef.current = false;

    const randomActivity = getRandomActivity();
    setCurrentVariant(randomActivity);
    setIsDoingActivity(true);

    // Reset to (potentially new) base after activity duration
    activityResetTimeoutRef.current = setTimeout(() => {
      const nextBase = getNextBaseVariant();
      setCurrentBaseVariant(nextBase);
      setCurrentVariant(nextBase);
      setIsDoingActivity(false);
    }, activityDuration);
  }, [
    isDoingActivity,
    prefersReducedMotion,
    getRandomActivity,
    getNextBaseVariant,
    activityDuration,
  ]);

  /**
   * Reset to base variant immediately
   */
  const resetToBase = useCallback(() => {
    if (activityResetTimeoutRef.current) {
      clearTimeout(activityResetTimeoutRef.current);
    }
    setCurrentVariant(currentBaseVariant);
    setIsDoingActivity(false);
  }, [currentBaseVariant]);

  /**
   * Schedule next random activity
   */
  const scheduleNextActivity = useCallback(() => {
    if (!enabled || prefersReducedMotion) return;

    const interval = getRandomInterval();

    // Preload the next activity image 2 seconds before showing it
    const preloadDelay = Math.max(0, interval - 2000);

    // Schedule preload
    preloadTimeoutRef.current = setTimeout(() => {
      const nextActivity = getRandomActivity();
      preloadMascotImage(nextActivity);
    }, preloadDelay);

    // Schedule the activity display
    nextActivityTimeoutRef.current = setTimeout(() => {
      triggerActivity();
      // Schedule the next one after this activity completes
      rescheduleTimeoutRef.current = setTimeout(() => {
        scheduleNextActivityRef.current?.();
      }, activityDuration);
    }, interval);
  }, [enabled, prefersReducedMotion, getRandomInterval, triggerActivity, activityDuration, getRandomActivity]);

  // Update ref whenever callback changes
  useEffect(() => {
    scheduleNextActivityRef.current = scheduleNextActivity;
  }, [scheduleNextActivity]);

  // Start scheduling when enabled
  useEffect(() => {
    if (enabled && !prefersReducedMotion && activities.length > 0) {
      scheduleNextActivity();
    }

    return () => {
      if (nextActivityTimeoutRef.current) {
        clearTimeout(nextActivityTimeoutRef.current);
      }
    };
  }, [enabled, prefersReducedMotion, activities.length, scheduleNextActivity]);

  // Update current base variant when baseVariant prop changes
  useEffect(() => {
    if (!isDoingActivity) {
      setCurrentBaseVariant(baseVariant);
      setCurrentVariant(baseVariant);
    }
  }, [baseVariant, isDoingActivity]);

  return {
    currentVariant,
    currentBaseVariant,
    isDoingActivity,
    triggerActivity,
    resetToBase,
  };
}
