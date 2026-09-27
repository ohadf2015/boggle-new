/**
 * The level clock, as one pure step.
 *
 * A level's deadline is wall-clock (`endAt`), so anything that stops the player
 * playing — the tab going to the background, a blocking overlay — used to drain
 * the clock anyway and could end the level while nothing was on screen. Pausing
 * slides the deadline forward by the elapsed time instead of counting down, so
 * the player always gets the seconds the level promised.
 *
 * Kept pure (and out of the hook) so the rule is testable without a DOM.
 */

/**
 * Longest combat advance one tick may carry. A background tab throttles the
 * 200ms interval to minutes, so the FIRST tick back would otherwise hand the
 * enemy reducer its whole backlog at once and one-shot the player. The clock
 * stays wall-clock honest (`msLeft`); only the fight refuses to fast-forward.
 */
export const MAX_TICK_MS = 1_000;
export interface ClockTick {
  /** Deadline after this tick — moved forward while paused, unchanged otherwise. */
  endAt: number;
  /** What the timer should read. */
  msLeft: number;
  /** Milliseconds to advance the combat reducer by — always 0 while paused. */
  dt: number;
  /** True once the clock has genuinely run out (never while paused). */
  expired: boolean;
}

export function tickClock(opts: { now: number; endAt: number; lastTick: number; paused?: boolean }): ClockTick {
  const { now, endAt, lastTick } = opts;
  // A clock that jumps backwards (system time change) must not hand out free time.
  const elapsed = Math.max(0, now - lastTick);
  if (opts.paused) {
    const slid = endAt + elapsed;
    return { endAt: slid, msLeft: Math.max(0, slid - now), dt: 0, expired: false };
  }
  const msLeft = Math.max(0, endAt - now);
  return { endAt, msLeft, dt: Math.min(elapsed, MAX_TICK_MS), expired: msLeft === 0 };
}
