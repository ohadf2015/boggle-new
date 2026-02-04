/**
 * useAdventureCinematics Hook
 *
 * Manages victory and defeat cinematic state for adventure mode.
 * Handles showing/hiding cinematics and tracking completion state.
 */

import { useState, useCallback } from 'react';

export interface UseAdventureCinematicsReturn {
  /** Whether victory cinematic is showing */
  showVictoryCinematic: boolean;
  /** Whether defeat cinematic is showing */
  showDefeatCinematic: boolean;
  /** Whether any cinematic has completed (used for modal timing) */
  cinematicComplete: boolean;
  /** Show victory cinematic */
  showVictory: () => void;
  /** Show defeat cinematic */
  showDefeat: () => void;
  /** Handle cinematic completion - hides cinematics and marks as complete */
  handleCinematicComplete: () => void;
  /** Reset all cinematic state */
  resetCinematics: () => void;
}

/**
 * Custom hook to manage adventure mode cinematics.
 *
 * Handles the state for victory and defeat animations that play
 * when a level is won or lost. Ensures proper sequencing with
 * level complete modals.
 *
 * @returns Cinematic state and control functions
 *
 * @example
 * ```tsx
 * const cinematics = useAdventureCinematics();
 *
 * // Show victory cinematic
 * cinematics.showVictory();
 *
 * // Render cinematics
 * {cinematics.showVictoryCinematic && <VictoryCinematic ... />}
 * {cinematics.showDefeatCinematic && <DefeatCinematic ... />}
 * ```
 */
export function useAdventureCinematics(): UseAdventureCinematicsReturn {
  const [showVictoryCinematic, setShowVictoryCinematic] = useState(false);
  const [showDefeatCinematic, setShowDefeatCinematic] = useState(false);
  const [cinematicComplete, setCinematicComplete] = useState(false);

  const showVictory = useCallback(() => {
    setShowVictoryCinematic(true);
    setCinematicComplete(false);
  }, []);

  const showDefeat = useCallback(() => {
    setShowDefeatCinematic(true);
    setCinematicComplete(false);
  }, []);

  const handleCinematicComplete = useCallback(() => {
    setShowVictoryCinematic(false);
    setShowDefeatCinematic(false);
    setCinematicComplete(true);
  }, []);

  const resetCinematics = useCallback(() => {
    setShowVictoryCinematic(false);
    setShowDefeatCinematic(false);
    setCinematicComplete(false);
  }, []);

  return {
    showVictoryCinematic,
    showDefeatCinematic,
    cinematicComplete,
    showVictory,
    showDefeat,
    handleCinematicComplete,
    resetCinematics,
  };
}
