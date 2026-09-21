/**
 * One event for every end-of-round tap, so the funnel can read replay vs exit
 * (the 74-to-paywall vs 29-replay drop-off this results piece exists to move).
 * Its own module so a student's phone does not pull in the teacher's Pro hook.
 */
import posthog from '@/lib/analytics/lazyPosthog';

export const RESULTS_ACTION_EVENT = 'results_primary_action_clicked';

export type ResultsAction = 'rematch' | 'view_report' | 'play_again' | 'practice' | 'unlock_report';
export type ResultsSurface = 'teacher_card' | 'projector' | 'student';

export function trackResultsAction(action: ResultsAction, surface: ResultsSurface): void {
  try {
    posthog.capture(RESULTS_ACTION_EVENT, { action, surface });
  } catch {
    /* analytics must never block the tap */
  }
}
