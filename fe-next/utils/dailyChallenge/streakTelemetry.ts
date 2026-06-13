/**
 * Daily streak lifecycle telemetry.
 *
 * Single emit-side for `growth:streak_*` events that PostHog's "Streak
 * Engagement" goal aggregates. Lives in utils/ so both `streaks.ts` and
 * `streakFreeze.ts` share one source of truth — the goal otherwise saw zero
 * conversions because no caller was emitting these events.
 *
 * Mirrors the swallow-on-error pattern at growthTracking.ts:219 — analytics
 * never block the game.
 */

import posthog from '@/lib/analytics/lazyPosthog';

export type StreakOutcome = 'continued' | 'broken' | 'started';

export interface StreakLifecyclePayload {
  outcome: StreakOutcome;
  newStreak: number;
  milestone: number | null;
  freezeUsed?: boolean;
}

export function emitStreakLifecycle(payload: StreakLifecyclePayload): void {
  if (typeof window === 'undefined') return;

  const { outcome, newStreak, milestone, freezeUsed } = payload;

  try {
    if (freezeUsed) {
      posthog.capture('growth:streak_freeze_used', { newStreak });
    }

    if (outcome === 'continued' || outcome === 'started') {
      posthog.capture('growth:streak_continued', { newStreak, freezeUsed: !!freezeUsed });
    } else if (outcome === 'broken') {
      posthog.capture('growth:streak_broken', { newStreak });
    }

    if (milestone) {
      posthog.capture('growth:streak_milestone', { milestone, newStreak });
    }
  } catch {
    // PostHog not initialized or opted out — telemetry must never break gameplay
  }
}
