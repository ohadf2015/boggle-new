/**
 * Intensity Controller
 *
 * Makes invisible pacing adjustments based on player flow state.
 * CRITICAL: Adjusts PACING (hints, power-ups) NOT DIFFICULTY (timer, word count).
 *
 * DDA-02: AI Director adjusts intensity based on player flow state
 * DDA-03: Mid-game adjustments are invisible (gradual, not sudden)
 *
 * Anti-Pattern Avoidance:
 * - Adjustments are gradual (10% per transition, not instant 50% jumps)
 * - Only adjusts at natural transitions (combo breaks, power-up uses)
 * - Never adjusts during 'flow' or 'learning' states
 */

import type { FlowState, IntensityAdjustment } from '@/types/aiDirector';
import { DEFAULT_INTENSITY, ADJUSTMENT_RATE } from './constants';

// ==============================================
// INTENSITY LIMITS
// ==============================================

const INTENSITY_LIMITS = {
  hintEscalationRate: { min: 0.5, max: 2.0 },
  powerUpSpawnBonus: { min: 0, max: 2 },
  comboGracePeriod: { min: 0, max: 3 },
  celebrationDuration: { min: 0, max: 1 },
} as const;

// ==============================================
// STANDALONE ADJUSTMENT FUNCTION
// ==============================================

/**
 * Calculate new adjustments at a natural transition point
 *
 * @param flowState - Current flow state
 * @param current - Current intensity adjustments
 * @returns New intensity adjustments (unchanged for flow/learning)
 */
export function getAdjustmentsAtTransition(
  flowState: FlowState,
  current: IntensityAdjustment
): IntensityAdjustment {
  // Don't adjust if in flow or learning (good states)
  if (flowState === 'flow' || flowState === 'learning') {
    return current;
  }

  // Gradually ease difficulty for frustrated players
  if (flowState === 'frustrated') {
    return {
      hintEscalationRate: Math.min(
        INTENSITY_LIMITS.hintEscalationRate.max,
        current.hintEscalationRate + ADJUSTMENT_RATE
      ),
      powerUpSpawnBonus: Math.min(
        INTENSITY_LIMITS.powerUpSpawnBonus.max,
        current.powerUpSpawnBonus + 1
      ),
      comboGracePeriod: Math.min(
        INTENSITY_LIMITS.comboGracePeriod.max,
        current.comboGracePeriod + 0.5
      ),
      celebrationDuration: current.celebrationDuration,
    };
  }

  // Gradually increase challenge for bored players
  if (flowState === 'bored') {
    return {
      hintEscalationRate: Math.max(
        INTENSITY_LIMITS.hintEscalationRate.min,
        current.hintEscalationRate - ADJUSTMENT_RATE
      ),
      powerUpSpawnBonus: Math.max(
        INTENSITY_LIMITS.powerUpSpawnBonus.min,
        current.powerUpSpawnBonus - 1
      ),
      comboGracePeriod: Math.max(
        INTENSITY_LIMITS.comboGracePeriod.min,
        current.comboGracePeriod - 0.5
      ),
      celebrationDuration: Math.max(
        INTENSITY_LIMITS.celebrationDuration.min,
        current.celebrationDuration - 0.2
      ),
    };
  }

  return current;
}

// ==============================================
// INTENSITY CONTROLLER CLASS
// ==============================================

export interface IntensityController {
  getCurrentAdjustments: () => IntensityAdjustment;
  updateFlowState: (state: FlowState) => void;
  applyAtTransition: () => void;
  reset: () => void;
}

/**
 * Create an intensity controller instance
 * Manages stateful intensity adjustments over time
 */
export function createIntensityController(): IntensityController {
  let currentState: FlowState = 'learning';
  let currentAdjustments: IntensityAdjustment = { ...DEFAULT_INTENSITY };

  return {
    /**
     * Get current intensity adjustments
     */
    getCurrentAdjustments(): IntensityAdjustment {
      return { ...currentAdjustments };
    },

    /**
     * Update the current flow state (called when flow state changes)
     */
    updateFlowState(state: FlowState): void {
      currentState = state;
    },

    /**
     * Apply adjustments at a natural transition point
     * Call this at combo breaks, power-up activations, etc.
     */
    applyAtTransition(): void {
      currentAdjustments = getAdjustmentsAtTransition(currentState, currentAdjustments);
    },

    /**
     * Reset to default intensity (new level, game restart, etc.)
     */
    reset(): void {
      currentState = 'learning';
      currentAdjustments = { ...DEFAULT_INTENSITY };
    },
  };
}
