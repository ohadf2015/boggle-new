/**
 * Which class-streak number is allowed on screen.
 *
 * The assignment card had two sources for one number: a localStorage copy that
 * paints immediately and a server copy that lands ~200 ms later. That is
 * pitfalls Class 1 verbatim — the late source flips the early one, and the
 * student watches a proud "7-day class streak" blink down to "2".
 *
 * The old code justified it with "the device copy is never higher than the
 * truth, because it counts one phone". That is false: a phone that finished on
 * seven days the server never recorded (the server only started counting
 * yesterday) holds a number the class did not earn. The device copy is not a
 * conservative estimate, it is a different number.
 *
 * So: claim nothing until the server answers. The device copy survives only as
 * the offline fallback for a server we could not reach at all — and the caller
 * labels it, so an honest "we couldn't check" never looks authoritative.
 */

export type ClassStreakSource = 'pending' | 'server' | 'device';

export interface ClassStreakInput {
  /** Server value, or null while the read is in flight / has failed. */
  server: number | null | undefined;
  /** The localStorage copy for this class key. */
  device: number | null | undefined;
  /** True once the server read has definitively failed. */
  failed: boolean;
}

export interface ClassStreakResolution {
  streak: number;
  /** False while nothing may be claimed yet — render the flame as "—". */
  resolved: boolean;
  source: ClassStreakSource;
}

function clamp(value: number | null | undefined): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function resolveClassStreak(input: ClassStreakInput): ClassStreakResolution {
  if (input.server !== null && input.server !== undefined) {
    return { streak: clamp(input.server), resolved: true, source: 'server' };
  }
  if (input.failed) {
    return { streak: clamp(input.device), resolved: true, source: 'device' };
  }
  return { streak: 0, resolved: false, source: 'pending' };
}
