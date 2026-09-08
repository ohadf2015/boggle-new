/**
 * First-15-seconds instrumentation for single player. Thin `posthog.capture`
 * wrapper — mirrors `lib/practice/telemetry.ts`'s shape (never throws;
 * analytics must not break gameplay).
 *
 * Kept as its own event rather than reusing `dead_time_detected`
 * (utils/growthTracking.ts trackDeadTime): that event already means
 * "player went idle mid-round past a threshold". This one fires once per
 * round, unconditionally, the instant the board becomes interactive — a
 * different signal with a different cardinality. Overloading the same event
 * name would silently multiply `dead_time_detected` volume by every SP round
 * and pollute every existing dashboard built on it.
 */
import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';

export interface BoardReadyTelemetryArgs {
  /** SinglePlayerGameState.mode ('solo-bots' | 'practice' | 'challenge') */
  mode: string;
  /** Wall-clock ms from SinglePlayerGame mount to the grid becoming non-null. */
  msToInteractive: number;
  /**
   * Round-timer remainingTime at the instant the board became interactive.
   * Should always equal timerSeconds — the round clock is held (see
   * useSinglePlayerCore's useGameTimer `isExternallyPaused: !grid || ...`)
   * until there is an actual board to play. A value below timerSeconds means
   * the clock is ticking again behind the loading state.
   */
  remainingTimeAtReady: number;
  timerSeconds: number;
}

export function trackBoardReady({
  mode,
  msToInteractive,
  remainingTimeAtReady,
  timerSeconds,
}: BoardReadyTelemetryArgs): void {
  try {
    posthog.capture('sp_board_ready', {
      mode,
      ms_to_interactive: msToInteractive,
      remaining_time_at_ready: remainingTimeAtReady,
      timer_seconds: timerSeconds,
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[boardReadyTelemetry] capture failed', { err });
    }
  }
}
