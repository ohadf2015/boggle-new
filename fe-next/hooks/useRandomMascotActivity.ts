import { useState, useEffect, useCallback, useRef } from 'react';
import type { ExtendedMascotVariant, ActivityVariant } from '@/components/ui/InteractiveMascot';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

/**
 * Default fun activities that can be randomly displayed
 */
export const DEFAULT_IDLE_ACTIVITIES: ActivityVariant[] = [
  'eating_pizza',
  'drinking_coffee',
  'gaming',
  'dancing',
  'playing_ball',
  'skateboarding',
  'juggling',
  'waving',
  'thumbs_up',
];

interface UseRandomMascotActivityOptions {
  /** Base variant to return to after activity */
  baseVariant: ExtendedMascotVariant;
  /** List of activities to randomly choose from */
  activities?: ActivityVariant[];
  /** Min interval between activities in ms (default: 10000 = 10s) */
  minInterval?: number;
  /** Max interval between activities in ms (default: 30000 = 30s) */
  maxInterval?: number;
  /** How long to show activity before returning to base in ms (default: 4000 = 4s) */
  activityDuration?: number;
  /** Whether to enable random activities (default: true) */
  enabled?: boolean;
}

interface UseRandomMascotActivityReturn {
  /** Current mascot variant (base or activity) */
  currentVariant: ExtendedMascotVariant;
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
  activities = DEFAULT_IDLE_ACTIVITIES,
  minInterval = 10000,
  maxInterval = 30000,
  activityDuration = 4000,
  enabled = true,
}: UseRandomMascotActivityOptions): UseRandomMascotActivityReturn {
  const { prefersReducedMotion } = useDevicePerformance();
  const [currentVariant, setCurrentVariant] = useState<ExtendedMascotVariant>(baseVariant);
  const [isDoingActivity, setIsDoingActivity] = useState(false);

  const nextActivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activityResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (nextActivityTimeoutRef.current) {
        clearTimeout(nextActivityTimeoutRef.current);
      }
      if (activityResetTimeoutRef.current) {
        clearTimeout(activityResetTimeoutRef.current);
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
   * Get random interval between min and max
   */
  const getRandomInterval = useCallback((): number => {
    return Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
  }, [minInterval, maxInterval]);

  /**
   * Trigger a random activity
   */
  const triggerActivity = useCallback(() => {
    if (isDoingActivity || prefersReducedMotion) return;

    const randomActivity = getRandomActivity();
    setCurrentVariant(randomActivity);
    setIsDoingActivity(true);

    // Reset to base after activity duration
    activityResetTimeoutRef.current = setTimeout(() => {
      setCurrentVariant(baseVariant);
      setIsDoingActivity(false);
    }, activityDuration);
  }, [
    isDoingActivity,
    prefersReducedMotion,
    getRandomActivity,
    baseVariant,
    activityDuration,
  ]);

  /**
   * Reset to base variant immediately
   */
  const resetToBase = useCallback(() => {
    if (activityResetTimeoutRef.current) {
      clearTimeout(activityResetTimeoutRef.current);
    }
    setCurrentVariant(baseVariant);
    setIsDoingActivity(false);
  }, [baseVariant]);

  /**
   * Schedule next random activity
   */
  const scheduleNextActivity = useCallback(() => {
    if (!enabled || prefersReducedMotion) return;

    const interval = getRandomInterval();

    nextActivityTimeoutRef.current = setTimeout(() => {
      triggerActivity();
      // Schedule the next one after this activity completes
      setTimeout(() => {
        scheduleNextActivity();
      }, activityDuration);
    }, interval);
  }, [enabled, prefersReducedMotion, getRandomInterval, triggerActivity, activityDuration]);

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

  // Update current variant when base variant changes
  useEffect(() => {
    if (!isDoingActivity) {
      setCurrentVariant(baseVariant);
    }
  }, [baseVariant, isDoingActivity]);

  return {
    currentVariant,
    isDoingActivity,
    triggerActivity,
    resetToBase,
  };
}
