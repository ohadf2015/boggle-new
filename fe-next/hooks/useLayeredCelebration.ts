/**
 * useLayeredCelebration - Trigger budget-aware layered particle celebrations
 *
 * This hook provides a wrapper around fireLayeredCelebration that:
 * - Respects device particle budgets (30/60/100 based on performance)
 * - Honors reduced motion preferences (accessibility)
 * - Returns stable function reference for callbacks
 *
 * Usage:
 * ```tsx
 * const { triggerCelebration } = useLayeredCelebration();
 *
 * // Trigger with device-appropriate particle budget
 * triggerCelebration();
 * ```
 */

import { useCallback } from 'react';
import { fireLayeredCelebration } from '../utils/confettiUtils';
import { useParticleBudget } from './useParticleBudget';
import { useDevicePerformance } from './useDevicePerformance';

export interface UseLayeredCelebrationReturn {
  triggerCelebration: () => void;
}

/**
 * Hook to trigger layered celebrations with budget awareness
 *
 * @returns Object with triggerCelebration function
 *
 * @example
 * ```tsx
 * function BossDefeatScreen() {
 *   const { triggerCelebration } = useLayeredCelebration();
 *
 *   useEffect(() => {
 *     // Fire celebration on mount
 *     triggerCelebration();
 *   }, [triggerCelebration]);
 *
 *   return <div>Victory!</div>;
 * }
 * ```
 */
export function useLayeredCelebration(): UseLayeredCelebrationReturn {
  const budget = useParticleBudget();
  const { prefersReducedMotion } = useDevicePerformance();

  const triggerCelebration = useCallback(() => {
    // Respect reduced motion preference (accessibility)
    if (prefersReducedMotion) {
      return;
    }

    // Don't fire if budget is zero
    if (budget.combo === 0) {
      return;
    }

    // Fire layered celebration with device-appropriate budget
    // Duration of 2000ms is default for celebrations
    fireLayeredCelebration(2000, budget);
  }, [budget, prefersReducedMotion]);

  return {
    triggerCelebration,
  };
}
