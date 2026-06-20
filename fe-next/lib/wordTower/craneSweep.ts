/**
 * Word Tower — crane sweep motion (pure).
 *
 * The trolley sweeps the word-beam left↔right; the player taps to drop it. The
 * ORIGINAL sweep used `Math.sin`, whose velocity peaks at the zero-crossing —
 * i.e. the trolley moves FASTEST exactly at dead-centre, which is where the
 * `perfect` band lives. That made the target the hardest part of the sweep to
 * time ("impossible to place in the right spot"). We replace it with a
 * CONSTANT-VELOCITY triangle wave: every horizontal position is equally hard to
 * time, and dead-centre gets the same honest dwell as the edges — fair-hard.
 *
 * The period also ramps with tower height: slow + learnable near the ground,
 * faster (harder) the taller you climb, so difficulty escalates naturally
 * instead of sitting at a flat 1800 ms forever.
 */

/** Sweep period (ms) at the ground floor — generous, learnable.
 *  Founder ask (2026-06-20): "the placing of the word is moving too fast — it
 *  should be slower and stay more around the green placement." Slowed across the
 *  board so the trolley dwells longer over the centre and a relaxed tap reliably
 *  lands in the green window. */
export const SWEEP_PERIOD_START_MS = 3400;
/** Floor on the period (ms) — the fastest the sweep ever gets, however tall.
 *  Raised so even a tall tower never sweeps faster than a comfortably-timed tap. */
export const SWEEP_PERIOD_FLOOR_MS = 2200;
/** How many ms shorter (faster) the sweep gets per floor climbed. Gentled so the
 *  difficulty ramp is slower — the climb stays fair far higher up. */
export const SWEEP_PERIOD_STEP_MS = 40;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Crane sweep position at `elapsedMs`, signed in [-1, 1] (0 = centre), as a
 * CONSTANT-VELOCITY triangle wave. Phase-matched to the old sine so the visible
 * sweep looks the same (0 at the start, +1 a quarter in, 0 at half, -1 three
 * quarters in) — only the timing is now fair.
 *
 * The UI maps this to pixels; the drop error fed to `evaluatePlacement` is its
 * absolute value (plus any tower-sway offset at drop time).
 */
export function craneOffsetAt(elapsedMs: number, periodMs: number): number {
  if (periodMs <= 0) return 0;
  // Normalised phase in [0, 1).
  const p = ((elapsedMs % periodMs) + periodMs) % periodMs / periodMs;
  if (p < 0.25) return 4 * p; //        0   → +1   (rising quarter)
  if (p < 0.75) return 2 - 4 * p; //   +1   → -1   (falling half, 0 at p=0.5)
  return 4 * p - 4; //                 -1   →  0    (rising final quarter)
}

/**
 * Sweep period (ms) for a tower of `towerHeightFloors` floors. Starts at
 * {@link SWEEP_PERIOD_START_MS} and shortens by {@link SWEEP_PERIOD_STEP_MS} per
 * floor, clamped to {@link SWEEP_PERIOD_FLOOR_MS}. Monotonically non-increasing.
 */
export function sweepPeriodMs(towerHeightFloors: number): number {
  const floors = Number.isFinite(towerHeightFloors) ? Math.max(0, towerHeightFloors) : 0;
  return clamp(
    SWEEP_PERIOD_START_MS - floors * SWEEP_PERIOD_STEP_MS,
    SWEEP_PERIOD_FLOOR_MS,
    SWEEP_PERIOD_START_MS,
  );
}
