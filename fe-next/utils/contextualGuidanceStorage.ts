/**
 * Contextual Guidance Storage
 *
 * Tracks which in-game guidance tooltips have been shown to the user.
 * Used to show combo, earthquake, and fire round explanations only once.
 */

const STORAGE_KEY = 'lexiclash_contextual_guidance';

export interface GuidanceState {
  comboShown: boolean;
  earthquakeShown: boolean;
  fireRoundShown: boolean;
  directionPatternShown: boolean;
  swipeTipShown: boolean;
  /** Whether the user has been shown the option to disable effects on first earthquake */
  effectsPreferenceShown: boolean;
}

const DEFAULT_STATE: GuidanceState = {
  comboShown: false,
  earthquakeShown: false,
  fireRoundShown: false,
  directionPatternShown: false,
  swipeTipShown: false,
  effectsPreferenceShown: false,
};

/**
 * Get the current guidance state from localStorage
 */
export function getGuidanceState(): GuidanceState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_STATE;
    }
    return { ...DEFAULT_STATE, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_STATE;
  }
}

/**
 * Mark a specific guidance type as shown
 */
export function markGuidanceShown(key: keyof GuidanceState): void {
  if (typeof window === 'undefined') return;

  const state = getGuidanceState();
  state[key] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
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
