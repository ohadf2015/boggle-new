/**
 * Retention-streak analytics — records a play into the global daily streak
 * and emits the PostHog events the D1 dashboard reads:
 *
 *   streak_day_recorded  { streak, best, outcome, mode }   every new day played
 *   streak_freeze_used   { streak, missed_date, mode }     weekly freeze ate a gap
 *   streak_broken        { lost_streak, mode }             streak reset to 1
 *   streak_milestone     { streakDays, mode }              3/7/14/30/50/100
 *
 * Also mirrors current/best streak onto PostHog person properties so D1
 * cohorts can be sliced by "has an active streak".
 *
 * Never throws — analytics must not break gameplay. Kept out of
 * utils/growthTracking.ts on purpose: growthTracking imports THIS module, so
 * importing back would create a cycle.
 */

import posthog from '@/lib/analytics/lazyPosthog';
import { setPostHogUserProps } from '@/utils/posthogEngagement';
import {
  daysBetween,
  recordRetentionPlay,
  type StreakPlayOutcome,
} from './streak';

const MILESTONES = [3, 7, 14, 30, 50, 100];

type Capture = (event: string, props?: Record<string, unknown>) => void;

const safeCapture: Capture = (event, props) => {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch {
    /* posthog not loaded / blocked — analytics is best-effort */
  }
};

/**
 * Record a completed game into the daily retention streak and emit the
 * streak events. Idempotent within a UTC day — safe to call from every
 * mode's completion path.
 */
export function trackRetentionPlay(args: { mode: string; todayISO?: string }): void {
  if (typeof window === 'undefined') return;
  try {
    const result = recordRetentionPlay(args.todayISO);
    if (result.outcome === 'already-counted') return;

    const { state, outcome, previousStreak } = result;
    const base = { mode: args.mode };

    safeCapture('streak_day_recorded', {
      ...base,
      streak: state.current,
      best: state.best,
      outcome,
      freeze_available: state.freeze.available,
    });

    if (outcome === 'freeze-consumed' && state.lastPlayedDate) {
      // The missed day is yesterday relative to the just-recorded play.
      safeCapture('streak_freeze_used', {
        ...base,
        streak: state.current,
        days_missed: 1,
      });
    }

    if (outcome === 'broken' && previousStreak > 1) {
      safeCapture('streak_broken', {
        ...base,
        lost_streak: previousStreak,
      });
    }

    if (MILESTONES.includes(state.current)) {
      safeCapture('streak_milestone', { ...base, streakDays: state.current });
    }

    setPostHogUserProps({
      current_streak: state.current,
      best_streak: state.best,
      last_streak_day: state.lastPlayedDate,
    });
  } catch {
    /* localStorage / analytics unavailable — retention tracking is best-effort */
  }
}

export type { StreakPlayOutcome };
export { daysBetween };
