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
/** Ceiling on the EFFECTIVE period (ms) — the SLOWEST the sweep can ever get,
 *  however many crane-slowing upgrades/mutators stack. Founder ask (2026-07-17):
 *  "the crane speed shouldn't be so slow even with the upgrades — the minimum
 *  speed should be normal, not super slow." Steady Cable + a tailwind day used to
 *  balloon the ground period to ~5.7 s, which crawled. Capping at the ground-floor
 *  default means the crane never sweeps slower than its normal, unupgraded pace —
 *  upgrades now only claw the FASTER high-floor pace back toward comfortable. */
export const SWEEP_PERIOD_CEILING_MS = SWEEP_PERIOD_START_MS;
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

/** Shortest buildable word — below this the swing sits at its gentle floor. */
export const SWING_MIN_LEN = 3;

/**
 * Fraction of the full sweep a beam of `letterCount` letters uses, in [0.5, 1].
 * The word is built letter-by-letter onto the crane, and each added letter makes
 * the load swing a bit wider (a heavier girder throws further), clamped to the
 * full sweep — the "max swing". A 3-letter word swings gently; ~8 letters hit the
 * cap. Applied to {@link craneOffsetAt}'s output, so the shown swing and the
 * scored release offset scale together (WYSIWYG preserved).
 */
export function craneSwingFactor(letterCount: number): number {
  const len = Number.isFinite(letterCount) ? Math.max(0, letterCount) : 0;
  return clamp(0.5 + 0.1 * (len - SWING_MIN_LEN), 0.5, 1);
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

/**
 * The FINAL sweep period the crane actually uses, after folding in the run's
 * crane-slowing modifiers, then clamped to a sane band.
 *
 * @param towerHeightFloors  drives the base height ramp ({@link sweepPeriodMs}).
 * @param sweepSpeedMult     Steady Cable upgrade (<1 slows → longer period).
 * @param sweepMult          daily mutator sweep factor (>1 slows, e.g. tailwind).
 *
 * The result is clamped to [{@link SWEEP_PERIOD_FLOOR_MS}, {@link SWEEP_PERIOD_CEILING_MS}]
 * so that:
 *  - a very tall tower never sweeps FASTER than the comfortable floor, and
 *  - no stack of slow-down bonuses can ever push it SLOWER than the ground-floor
 *    default (the "minimum speed stays normal" fix) — upgrades only help by
 *    pulling the faster high-floor pace back toward that comfortable ceiling.
 */
export function effectiveSweepPeriodMs(
  towerHeightFloors: number,
  sweepSpeedMult = 1,
  sweepMult = 1,
): number {
  const speed = Number.isFinite(sweepSpeedMult) && sweepSpeedMult > 0 ? sweepSpeedMult : 1;
  const mult = Number.isFinite(sweepMult) && sweepMult > 0 ? sweepMult : 1;
  const raw = (sweepPeriodMs(towerHeightFloors) * mult) / speed;
  return clamp(raw, SWEEP_PERIOD_FLOOR_MS, SWEEP_PERIOD_CEILING_MS);
}
