/**
 * useComboMilestone Hook
 *
 * Tracks combo count and triggers full-screen celebrations
 * at major milestones (10, 15, 20+ combo).
 */

import { useState, useCallback, useRef } from 'react';
import { useParticleBudget } from './useParticleBudget';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { fireLayeredCelebration } from '@/utils/confettiUtils';

// ==============================================
// TYPES
// ==============================================

export interface ComboMilestoneConfig {
  /** Combo count to trigger milestone */
  threshold: number;
  /** Translation key for milestone label */
  labelKey: string;
  /** Duration of celebration in ms */
  duration: number;
  /** Particle budget multiplier (0-1) */
  particleBudget: number;
}

export interface UseComboMilestoneReturn {
  /** Current active milestone (or null) */
  currentMilestone: ComboMilestoneConfig | null;
  /** Check if combo reaches a milestone */
  checkMilestone: (combo: number) => void;
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;
}

// ==============================================
// CONSTANTS
// ==============================================

/**
 * Combo milestone thresholds with increasing intensity
 *
 * - 10: "INCREDIBLE!" - 60% particles, 2s duration
 * - 15: "UNSTOPPABLE!" - 80% particles, 2.5s duration
 * - 20: "LEGENDARY!" - 100% particles, 3s duration
 */
export const COMBO_MILESTONES: ComboMilestoneConfig[] = [
  { threshold: 10, labelKey: 'adventure.combo.incredible', duration: 2000, particleBudget: 0.6 },
  { threshold: 15, labelKey: 'adventure.combo.mythic', duration: 2500, particleBudget: 0.8 },
  { threshold: 20, labelKey: 'adventure.combo.transcendent', duration: 3000, particleBudget: 1.0 },
  { threshold: 25, labelKey: 'adventure.combo.transcendent', duration: 3500, particleBudget: 1.0 },
];

// ==============================================
// HOOK
// ==============================================

/**
 * Hook for tracking combo milestones and triggering celebrations
 *
 * @example
 * ```tsx
 * const { currentMilestone, checkMilestone } = useComboMilestone();
 *
 * // Check on combo update
 * useEffect(() => {
 *   checkMilestone(combo);
 * }, [combo, checkMilestone]);
 *
 * // Render milestone label
 * {currentMilestone && <MilestoneLabel labelKey={currentMilestone.labelKey} />}
 * ```
 */
export function useComboMilestone(): UseComboMilestoneReturn {
  const [currentMilestone, setCurrentMilestone] = useState<ComboMilestoneConfig | null>(null);
  const budget = useParticleBudget();
  const prefersReducedMotion = usePrefersReducedMotion();
  const lastMilestoneRef = useRef<number | null>(null);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkMilestone = useCallback((combo: number) => {
    // Find highest milestone reached
    const milestone = [...COMBO_MILESTONES]
      .reverse()
      .find(m => combo >= m.threshold);

    // No milestone reached
    if (!milestone) {
      return;
    }

    // Same milestone as before (already triggered)
    if (lastMilestoneRef.current === milestone.threshold) {
      return;
    }

    // Update tracking
    lastMilestoneRef.current = milestone.threshold;
    setCurrentMilestone(milestone);

    // Clear any existing timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }

    // Fire celebration if animations allowed
    if (!prefersReducedMotion) {
      const scaledBudget = {
        ...budget,
        combo: Math.floor(budget.combo * milestone.particleBudget),
      };
      fireLayeredCelebration(milestone.duration, scaledBudget);
    }

    // Clear milestone after duration
    clearTimeoutRef.current = setTimeout(() => {
      setCurrentMilestone(null);
    }, milestone.duration);
  }, [budget, prefersReducedMotion]);

  return {
    currentMilestone,
    checkMilestone,
    prefersReducedMotion,
  };
}
