/**
 * Tracking for wt2_exit events: fires when player leaves a Word Tower v2 screen.
 * Screens: 'home', 'run', 'results', 'estate', 'raid', 'wreck', 'loading', 'error'
 */

import { trackGrowthEvent } from '@/utils/growthTracking';
import { emitAbandonOnExit } from '@/utils/abandonOnPagehide';

export type Wt2Screen = 'home' | 'run' | 'results' | 'estate' | 'raid' | 'wreck' | 'loading' | 'error';

interface Wt2State {
  dictError: boolean;
  dictReady: boolean;
  phase: 'composing' | 'swinging' | 'over';
  showOver: boolean;
  resultsReady: boolean;
  forceResults: boolean;
  district: boolean;
  raiding: boolean;
  smashing: boolean;
  floors: number;
}

/**
 * Resolve the current WT2 screen from state variables.
 * Priority order ensures exactly one screen is active.
 */
export function resolveWt2Screen(state: Wt2State): Wt2Screen {
  // Error/loading screens (highest priority)
  if (state.dictError) return 'error';
  if (!state.dictReady) return 'loading';

  // Overlay screens take precedence
  if (state.smashing) return 'wreck';
  if (state.raiding) return 'raid';
  if (state.district) return 'estate';

  // Results screen
  if ((state.showOver && state.resultsReady) || state.forceResults) return 'results';

  // Lobby screen: composing or over phase with no floors built
  if (state.floors === 0 && state.phase !== 'over') return 'home';

  // Run screen (any non-over phase with floors, or over phase with floors remaining)
  if (state.phase !== 'over' || state.floors > 0) return 'run';

  // Default to home when nothing is active (phase is over and floors are 0)
  return 'home';
}

/**
 * Track an exit from a WT2 screen. Fired once per exit, synchronously,
 * before any async navigation.
 */
export function trackWt2Exit(from: Wt2Screen): void {
  trackGrowthEvent('wt2_exit', { from });
  // An exit with an unfinished run used to be the end of the trail: no
  // game_completed, no game_abandoned — an orphan start that made Word Tower
  // completion look near-zero (mobile 1 of 18 starts with a terminal event).
  // Map it to the terminal growth event; deferred a tick inside so a
  // same-commit completion (run -> results) cancels the phantom abandon.
  emitAbandonOnExit();
}

/**
 * Guard-protected exit tracking: fires once per guard lifetime.
 * Used to prevent double-taps from firing the event twice.
 */
export function trackWt2ExitOnce(guard: { current: boolean }, from: Wt2Screen): void {
  if (!guard.current) {
    guard.current = true;
    trackWt2Exit(from);
  }
}
