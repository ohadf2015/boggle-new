/**
 * Drift reconciliation for the desktop shell badge countdown ring.
 *
 * The badge ring (`components/ui/CircularTimer`, wrapping
 * react-countdown-circle-timer) seeds its countdown from `initialRemainingTime`
 * exactly once and then ticks on its OWN requestAnimationFrame loop — it never
 * re-reads the server's `remainingTime`. Over a match that diverges from the
 * server truth on reconnect, tab-throttle, or GC pauses (Recurring Pitfall
 * Class 3: client and server computing the "same" number independently WILL
 * drift; the server is the source of truth, the client only displays it).
 *
 * react-countdown-circle-timer can't follow a prop after mount, but it DOES
 * restart when its `key` changes. So we watch consecutive server readings and
 * only re-seed (bump the key) when the server jumps in a way the ring can't be
 * tracking on its own: it went UP (reconnect resend / new round), or it dropped
 * by more than a normal render cadence would explain (a stalled/throttled tab
 * catching up). Ordinary 1-Hz countdown ticks leave the ring untouched so it
 * keeps its smooth sweep instead of snapping every second. No wall-clock read is
 * needed (and none is allowed during render), so this stays a pure function.
 */
export interface TimerRingState {
  /** Seconds value the ring is currently seeded from (its restart point). */
  remaining: number;
  /** Key handed to the ring; bumped on each re-seed to force a restart. */
  key: number;
  /** Most recent server reading — drift detection only, not shown. */
  lastServer: number;
}

/**
 * Max seconds a single server reading may drop before we treat it as a jump
 * rather than a normal tick. Generous enough to absorb a couple of batched
 * 1-Hz ticks, tight enough to catch a throttled tab catching up.
 */
export const DEFAULT_RESYNC_THRESHOLD_SEC = 3;

export function reconcileTimerRing(
  state: TimerRingState | null,
  serverRemaining: number,
  thresholdSec: number = DEFAULT_RESYNC_THRESHOLD_SEC,
): TimerRingState {
  if (state === null) {
    return { remaining: serverRemaining, key: 0, lastServer: serverRemaining };
  }
  const drop = state.lastServer - serverRemaining; // >0 during normal countdown
  const jumped = drop < 0 || drop > thresholdSec;
  if (jumped) {
    return { remaining: serverRemaining, key: state.key + 1, lastServer: serverRemaining };
  }
  // Normal tick: keep the ring's seed + key stable (smooth, no remount); only
  // record the latest reading so the next comparison is against it.
  return { remaining: state.remaining, key: state.key, lastServer: serverRemaining };
}
