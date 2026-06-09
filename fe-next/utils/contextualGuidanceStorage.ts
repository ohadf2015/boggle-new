/**
 * Contextual Guidance Storage
 *
 * Tracks which in-game guidance tooltips have been shown to the user.
 * Used to show combo, earthquake, and fire round explanations only once.
 */

import {
  getJsonFromLocalStorage,
  saveJsonToLocalStorage,
  removeFromLocalStorage,
} from '@/utils/storageHelpers';

const STORAGE_KEY = 'lexiclash_contextual_guidance';

export interface GuidanceState {
  comboShown: boolean;
  earthquakeShown: boolean;
  fireRoundShown: boolean;
  directionPatternShown: boolean;
  swipeTipShown: boolean;
  /** Whether the user has been shown the option to disable effects on first earthquake */
  effectsPreferenceShown: boolean;
  /** Whether the user has seen the tap-to-drag tutorial (shown when tapping single letter without dragging) */
  dragTutorialShown: boolean;
  /** Whether the user has completed the first-play tutorial by making a word with combined directions */
  firstPlayTutorialCompleted: boolean;
  /** Whether the user has seen the multiplayer "How to Play" tutorial modal */
  multiplayerTutorialShown: boolean;
  /** Whether the in-game MP stuck-player coach has been shown (one-shot across sessions) */
  stuckCoachShown: boolean;
}

const DEFAULT_STATE: GuidanceState = {
  comboShown: false,
  earthquakeShown: false,
  fireRoundShown: false,
  directionPatternShown: false,
  swipeTipShown: false,
  effectsPreferenceShown: false,
  dragTutorialShown: false,
  firstPlayTutorialCompleted: false,
  multiplayerTutorialShown: false,
  stuckCoachShown: false,
};

/**
 * Get the current guidance state from localStorage
 */
export function getGuidanceState(): GuidanceState {
  const stored = getJsonFromLocalStorage<Partial<GuidanceState>>(STORAGE_KEY, {});
  return { ...DEFAULT_STATE, ...stored };
}

/**
 * Mark a specific guidance type as shown
 */
export function markGuidanceShown(key: keyof GuidanceState): void {
  const state = getGuidanceState();
  state[key] = true;
  saveJsonToLocalStorage(STORAGE_KEY, state);
}

/**
 * Check if a guidance tooltip should be shown (hasn't been shown before)
 */
export function shouldShowGuidance(key: keyof GuidanceState): boolean {
  return !getGuidanceState()[key];
}

/**
 * Reset all guidance state (useful for testing or "show tutorial again")
 */
export function resetGuidance(): void {
  removeFromLocalStorage(STORAGE_KEY);
}

/**
 * Check if all guidance has been shown (user is fully onboarded)
 */
export function hasCompletedAllGuidance(): boolean {
  const state = getGuidanceState();
  return (
    state.comboShown &&
    state.earthquakeShown &&
    state.fireRoundShown &&
    state.directionPatternShown &&
    state.swipeTipShown &&
    state.effectsPreferenceShown
  );
}
