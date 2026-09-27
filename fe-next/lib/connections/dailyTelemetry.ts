/**
 * Word Bridge DAILY telemetry — thin PostHog `capture` wrapper.
 *
 * The daily shipped with no events at all, which left two very different
 * problems looking identical: nobody finds the mode, versus everybody finds it
 * and bounces off the puzzles. The DB could only show the survivors (8 scored
 * runs since 2026-06-05), never the drop-off before them.
 *
 * Mirrors ./landingTelemetry.ts. Never throws — a telemetry failure must never
 * take down a run in progress.
 */

import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';

type Capture = (event: string, props?: Record<string, unknown>) => void;

const safeCapture: Capture = (event, props) => {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[connectionsDaily] capture failed', { event, err });
    }
  }
};

const SURFACE = 'connections_daily';

/** A player opened the day's set. The denominator for every rate below. */
export function trackDailyStarted(args: {
  locale: string;
  puzzleCount: number;
  dateISO: string;
}): void {
  safeCapture('connections_daily_started', {
    surface: SURFACE,
    locale: args.locale,
    puzzle_count: args.puzzleCount,
    puzzle_date: args.dateISO,
  });
}

/**
 * One bridge ended — solved, or the per-puzzle attempt budget ran out.
 * `puzzle_id` is what makes a single bad puzzle visible: a specific id with a
 * low solve rate across many players is a content bug, not a hard day.
 */
export function trackDailyBridgeResolved(args: {
  locale: string;
  puzzleId: string;
  index: number;
  solved: boolean;
  wrongAttempts: number;
  hintUsed: boolean;
}): void {
  safeCapture('connections_daily_bridge_resolved', {
    surface: SURFACE,
    locale: args.locale,
    puzzle_id: args.puzzleId,
    bridge_index: args.index,
    solved: args.solved,
    wrong_attempts: args.wrongAttempts,
    hint_used: args.hintUsed,
  });
}

/** The run reached its end screen. `blanked` is the retention-killer to watch. */
export function trackDailyCompleted(args: {
  locale: string;
  solved: number;
  total: number;
  score: number;
  durationSeconds: number;
}): void {
  safeCapture('connections_daily_completed', {
    surface: SURFACE,
    locale: args.locale,
    solved: args.solved,
    total: args.total,
    score: args.score,
    duration_seconds: args.durationSeconds,
    blanked: args.solved === 0,
  });
}

/** Shared the result grid — the only organic growth loop the daily has. */
export function trackDailyShared(args: {
  locale: string;
  solved: number;
  total: number;
}): void {
  safeCapture('connections_daily_shared', {
    surface: SURFACE,
    locale: args.locale,
    solved: args.solved,
    total: args.total,
  });
}
