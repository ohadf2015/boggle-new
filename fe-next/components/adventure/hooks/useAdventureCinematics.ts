/**
 * useAdventureCinematics Hook
 *
 * Manages victory and defeat cinematic state for adventure mode.
 * Handles showing/hiding cinematics and tracking completion state.
 */

import { useState, useCallback } from 'react';

export interface WorldUnlockCinematicState {
  previousWorldNumber: number;
  previousWorldName: string;
  newWorldNumber: number;
  newWorldName: string;
  previousColor: string;
  newColor: string;
  newSecondaryColor?: string;
  worldEmoji?: string;
  chapterNames?: string[];
}

export interface UseAdventureCinematicsReturn {
  /** Whether victory cinematic is showing */
  showVictoryCinematic: boolean;
  /** Whether defeat cinematic is showing */
  showDefeatCinematic: boolean;
  /** Whether world unlock cinematic is showing */
  showWorldUnlockCinematic: boolean;
  /** World unlock cinematic props */
  worldUnlockProps: WorldUnlockCinematicState | null;
  /** Whether any cinematic has completed (used for modal timing) */
  cinematicComplete: boolean;
  /** Show victory cinematic */
  showVictory: () => void;
  /** Show defeat cinematic */
  showDefeat: () => void;
  /** Show world unlock cinematic */
  showWorldUnlock: (props: WorldUnlockCinematicState) => void;
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
  const [showWorldUnlockCinematic, setShowWorldUnlockCinematic] = useState(false);
  const [worldUnlockProps, setWorldUnlockProps] = useState<WorldUnlockCinematicState | null>(null);
  const [cinematicComplete, setCinematicComplete] = useState(false);

  const showVictory = useCallback(() => {
    setShowVictoryCinematic(true);
    setCinematicComplete(false);
  }, []);

  const showDefeat = useCallback(() => {
    setShowDefeatCinematic(true);
    setCinematicComplete(false);
  }, []);

  const showWorldUnlock = useCallback((props: WorldUnlockCinematicState) => {
    setWorldUnlockProps(props);
    setShowWorldUnlockCinematic(true);
    setCinematicComplete(false);
  }, []);

  const handleCinematicComplete = useCallback(() => {
    setShowVictoryCinematic(false);
    setShowDefeatCinematic(false);
    setShowWorldUnlockCinematic(false);
    setWorldUnlockProps(null);
    setCinematicComplete(true);
  }, []);

  const resetCinematics = useCallback(() => {
    setShowVictoryCinematic(false);
    setShowDefeatCinematic(false);
    setShowWorldUnlockCinematic(false);
    setWorldUnlockProps(null);
    setCinematicComplete(false);
  }, []);

  return {
    showVictoryCinematic,
    showDefeatCinematic,
    showWorldUnlockCinematic,
    worldUnlockProps,
    cinematicComplete,
    showVictory,
    showDefeat,
    showWorldUnlock,
    handleCinematicComplete,
    resetCinematics,
  };
}
