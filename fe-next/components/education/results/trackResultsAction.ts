/**
 * One event for every end-of-round tap, so the funnel can read replay vs exit
 * (the 74-to-paywall vs 29-replay drop-off this results piece exists to move).
 * Its own module so a student's phone does not pull in the teacher's Pro hook.
 */
import posthog from '@/lib/analytics/lazyPosthog';

export const RESULTS_ACTION_EVENT = 'results_primary_action_clicked';
export const RETEACH_STARTED_EVENT = 'edu_reteach_started';

export type ResultsAction = 'rematch' | 'view_report' | 'play_again' | 'practice' | 'unlock_report' | 'share_parents';
export type ResultsSurface = 'teacher_card' | 'projector' | 'student' | 'reports';

export function trackResultsAction(action: ResultsAction, surface: ResultsSurface): void {
  try {
    posthog.capture(RESULTS_ACTION_EVENT, { action, surface });
  } catch {
    /* analytics must never block the tap */
  }
}

export function trackReteachStarted(props: { surface: ResultsSurface; words: number; plan: 'free' | 'pro' }): void {
  try {
    posthog.capture(RETEACH_STARTED_EVENT, props);
  } catch {
    /* analytics must never block the tap */
  }
}
