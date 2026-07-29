/**
 * useAdventureEntryPhase Hook
 *
 * Manages the entry phase state machine for adventure levels.
 * Handles progression through: cascade → objectives → title → playing
 */

import { useState, useCallback } from 'react';

export type EntryPhase = 'cascade' | 'objectives' | 'title' | 'playing';

export interface UseAdventureEntryPhaseReturn {
  /** Current entry phase */
  entryPhase: EntryPhase;
  /** Advance to objectives phase */
  advanceToObjectives: () => void;
  /** Advance to title phase */
  advanceToTitle: () => void;
  /** Advance to playing phase */
  advanceToPlaying: () => void;
  /** Reset to cascade phase */
  resetToStart: () => void;
}

/**
 * Custom hook to manage adventure level entry phase progression.
 *
 * Handles the state machine for level intro animations:
 * 1. Cascade - Letters fall into grid
 * 2. Objectives - Objectives slide in
 * 3. Title - Level title animation
 * 4. Playing - Actual gameplay
 *
 * @returns Entry phase state and control functions
 *
 * @example
 * ```tsx
 * const entryPhase = useAdventureEntryPhase();
 *
 * // Progress through phases
 * entryPhase.advanceToObjectives(); // cascade → objectives
 * entryPhase.advanceToTitle();      // objectives → title
 * entryPhase.advanceToPlaying();    // title → playing
 *
 * // Check current phase
 * if (entryPhase.entryPhase === 'playing') {
 *   // Start game timer
 * }
 * ```
 */
export function useAdventureEntryPhase(): UseAdventureEntryPhaseReturn {
  const [entryPhase, setEntryPhase] = useState<EntryPhase>('cascade');

  const advanceToObjectives = useCallback(() => {
    setEntryPhase('objectives');
  }, []);

  const advanceToTitle = useCallback(() => {
    setEntryPhase('title');
  }, []);

  const advanceToPlaying = useCallback(() => {
    setEntryPhase('playing');
  }, []);

  const resetToStart = useCallback(() => {
    setEntryPhase('cascade');
  }, []);

  return {
    entryPhase,
    advanceToObjectives,
    advanceToTitle,
    advanceToPlaying,
    resetToStart,
  };
}
