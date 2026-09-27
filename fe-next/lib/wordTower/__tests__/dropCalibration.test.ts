/**
 * Drop calibration — releasing on the target must be able to score `perfect`.
 *
 * The crane sweeps as a CONSTANT-VELOCITY triangle wave, so the trolley is never
 * stationary: every release inherits momentum and `landingOffset` carries the
 * block past the aim point. That carry used to reach 0.38 — more than twice the
 * 0.18 `perfect` window — which made a dead-centre release score `good` in every
 * single configuration. The required lead was wider than the window it aimed
 * into, so "I dropped it right and got marked down" was literally true.
 *
 * It went unnoticed because the crane telegraphed the live band in lime: players
 * released on the colour cue, not on the target, and never learned the release
 * point disagreed with the mark. With the telegraph gone the calibration has to
 * actually hold.
 *
 * These are the guard rails, not the feel: momentum still exists and still
 * rewards leading the target — it just can no longer exceed the window.
 */

import { landingOffset, MAX_DRIFT, CARRY_FACTOR } from '../dropKinematics';
import { alignmentBand, PERFECT_MAX, PERFECT_MAX_CEILING } from '../cranePlacement';
import { craneOffsetAt, craneSwingFactor, sweepPeriodMs } from '../craneSweep';
import { fallDurationMs } from '../fallProfile';

/** Real per-ms trolley velocity at the centre crossing, for a given word/height. */
function velocityAtCentre(len: number, floors: number): number {
  const period = sweepPeriodMs(floors);
  const k = craneSwingFactor(len);
  const t0 = period * 0.5 - 1;
  const t1 = period * 0.5 + 1;
  return ((craneOffsetAt(t1, period) * k) - (craneOffsetAt(t0, period) * k)) / (t1 - t0);
}

// Word length × tower height: short word on the ground through the longest beam
// on a fast, tall tower (the worst case for carry).
const CASES: { len: number; floors: number }[] = [
  { len: 3, floors: 0 }, { len: 3, floors: 10 }, { len: 3, floors: 30 },
  { len: 5, floors: 0 }, { len: 5, floors: 10 }, { len: 5, floors: 30 },
  { len: 8, floors: 0 }, { len: 8, floors: 10 }, { len: 8, floors: 30 },
];

describe('drop calibration — momentum must not exceed the perfect window', () => {
  it('keeps momentum a fraction of the perfect window, at both ends', () => {
    // Above the window: some configuration is unwinnable by aiming, however well
    // timed (the original bug — carry reached 0.38 against a 0.18 window).
    // At roughly the window: the cap does the player's work instead, because any
    // near-centre release gets dragged inside `perfect` and timing stops
    // mattering. It has to sit clearly below.
    expect(MAX_DRIFT).toBeLessThanOrEqual(PERFECT_MAX * 0.6);
    expect(MAX_DRIFT).toBeGreaterThan(0);
  });

  it.each(CASES)('scores a dead-centre release as perfect (len=$len, floors=$floors)', ({ len, floors }) => {
    const v = velocityAtCentre(len, floors);
    // The player releases when the beam is visually on the target.
    const projected = landingOffset(0, v, fallDurationMs(len));
    expect(Math.abs(projected)).toBeLessThanOrEqual(PERFECT_MAX);
    expect(alignmentBand(Math.abs(projected))).toBe('perfect');
  });

  it('still carries momentum — leading the target remains a real skill', () => {
    // Guard against "fixing" this by deleting the mechanic: a fast release must
    // still drift measurably, otherwise the Tower Bloxx lead is gone entirely.
    const v = velocityAtCentre(8, 30);
    const projected = landingOffset(0, v, fallDurationMs(8));
    expect(Math.abs(projected)).toBeGreaterThan(0.02);
    expect(CARRY_FACTOR).toBeGreaterThan(0);
  });

  it('still punishes a release far from the target', () => {
    // Calibration must not turn into "everything is perfect": a release most of
    // the way to the edge still misses, whatever the carry does.
    const v = velocityAtCentre(5, 10);
    const projected = landingOffset(0.9, v, fallDurationMs(5));
    expect(alignmentBand(Math.abs(projected))).not.toBe('perfect');
  });

  it('still requires timing — carry cannot rescue a release at the window edge', () => {
    // The proof that the cap is not swallowing the skill: release exactly one
    // perfect-window out, with the trolley carrying OUTWARD (the direction that
    // costs you), and it must miss perfect. Releasing at the same spot on the
    // inbound sweep does land it — that asymmetry IS the Tower Bloxx lead.
    const outward = Math.abs(velocityAtCentre(5, 10));
    const projected = landingOffset(PERFECT_MAX, outward, fallDurationMs(5));
    expect(alignmentBand(Math.abs(projected))).not.toBe('perfect');
  });

  it('holds at max upgrades, where the perfect window is widest', () => {
    // `perfectBandBonus` widens the window (ceiling 0.34), so the drift:window
    // ratio only improves — but assert it rather than assume, since a bound that
    // holds at base and collapses at max upgrades is the same class of bug.
    const v = velocityAtCentre(8, 30);
    const projected = landingOffset(0, v, fallDurationMs(8));
    expect(alignmentBand(Math.abs(projected), PERFECT_MAX_CEILING - PERFECT_MAX)).toBe('perfect');
  });
});
