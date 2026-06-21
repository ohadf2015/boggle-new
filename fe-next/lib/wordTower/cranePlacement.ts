/**
 * Word Tower — Crane Stack placement model (pure).
 *
 * Founder idea: build a word, then place the block with a crane like Tower
 * Bloks. Cosy reconciliation (see spec 2026-05-24-word-tower-crane-stack):
 * the crane is a REWARD AMPLIFIER, not a fail-gate. A valid word always lands;
 * placement quality scales the height reward. A single miss never ends the run —
 * only three bad drops in a row wobble-topple one (recoverable) floor.
 */

export type PlacementQuality = 'perfect' | 'good' | 'sloppy' | 'miss';

export interface PlacementOutcome {
  quality: PlacementQuality;
  /** Fraction of the block that landed on its support (0..1). */
  overlap: number;
  /** Multiplier applied to the word's height gain. */
  heightMultiplier: number;
  perfect: boolean;
  /** Cosy: only a miss that follows enough instability topples a floor. */
  topples: boolean;
}

/** Normalised drop-error band edges (0 = dead centre).
 *
 * Founder ask (2026-06-19): "make the player stay more in the GREEN area so he
 * really feels he succeeded." The perfect + good ("green") windows are widened
 * so a reasonably-timed release reliably lands a celebrated drop — the crane is
 * a reward amplifier, not a precision fail-gate. Only a clearly mistimed release
 * falls to sloppy/miss. */
export const PERFECT_MAX = 0.18;
export const GOOD_MAX = 0.45;
export const SLOPPY_MAX = 0.62;
/** Cosy "catch": a missed drop still lands at least this much of the block. */
export const MIN_CAUGHT_OVERLAP = 0.2;
/** Bad drops in a row before a miss is allowed to topple a floor. */
export const TOPPLE_AFTER_SLOPPY = 2;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Classify a (clamped) drop error into its quality band — WITHOUT the streak /
 * topple context. This is the single source of truth for the band edges; the
 * crane reads it live (while the trolley sweeps) so the player can SEE whether
 * the current position would land perfect/good/sloppy/miss, and
 * {@link evaluatePlacement} reuses it so the live preview can never disagree with
 * the verdict that follows the drop.
 */
export function alignmentBand(offset: number): PlacementQuality {
  const e = clamp01(offset);
  if (e <= PERFECT_MAX) return 'perfect';
  if (e <= GOOD_MAX) return 'good';
  if (e <= SLOPPY_MAX) return 'sloppy';
  return 'miss';
}

/**
 * Evaluate a drop. `offset` is the normalised horizontal error (0 = centre,
 * 1 = fully off, clamped). `consecutiveSloppy` is how many bad drops preceded
 * this one (for the recoverable topple rule).
 */
export function evaluatePlacement(
  offset: number,
  consecutiveSloppy: number,
): PlacementOutcome {
  const e = clamp01(offset);

  switch (alignmentBand(e)) {
    case 'perfect':
      return { quality: 'perfect', overlap: 1, heightMultiplier: 1.4, perfect: true, topples: false };
    case 'good':
      return { quality: 'good', overlap: 1 - e, heightMultiplier: 1, perfect: false, topples: false };
    case 'sloppy':
      return { quality: 'sloppy', overlap: 1 - e, heightMultiplier: 0.6, perfect: false, topples: false };
    default:
      // Miss — cosy catch at a minimum width; topple only after enough instability.
      return {
        quality: 'miss',
        overlap: Math.max(MIN_CAUGHT_OVERLAP, 1 - e),
        heightMultiplier: 0.3,
        perfect: false,
        topples: consecutiveSloppy >= TOPPLE_AFTER_SLOPPY,
      };
  }
}

/**
 * Impact intensity (0..1) of a drop by quality — drives the *feel* layer
 * (screen-shake magnitude, dust-burst count, impact-ring size) in the Pixi
 * scene. PURELY cosmetic: never feeds the verdict or height math.
 *
 * A perfect drop is a small, crisp jolt (NOT zero — landing dead-centre should
 * feel satisfying, the old behaviour gave perfect drops no shake at all). A miss
 * slams the tower hardest. Monotonic so the harder the mistake, the heavier the
 * thud the player feels.
 */
export function dropQualityIntensity(quality: PlacementQuality): number {
  switch (quality) {
    case 'perfect':
      return 0.22;
    case 'good':
      return 0.42;
    case 'sloppy':
      return 0.66;
    default:
      return 1;
  }
}

/** Next instability count: clean drop resets it, a bad drop bumps it. */
export function nextConsecutiveSloppy(prev: number, quality: PlacementQuality): number {
  return quality === 'perfect' || quality === 'good' ? 0 : prev + 1;
}

/** Per-perfect bonus added to the height multiplier, and the cap on the run. */
export const PERFECT_STREAK_STEP = 0.12;
export const PERFECT_STREAK_BONUS_CAP = 0.5;

/** Next perfect-streak count: a perfect drop extends it, anything else resets. */
export function nextPerfectStreak(prev: number, quality: PlacementQuality): number {
  return quality === 'perfect' ? prev + 1 : 0;
}

/**
 * Extra height multiplier for a run of perfect drops — the "just one more" hook.
 * `streak` includes the current drop; a lone perfect (≤1) earns nothing, each
 * additional perfect adds {@link PERFECT_STREAK_STEP}, capped so it never runs away.
 */
export function perfectStreakBonus(streak: number): number {
  if (streak <= 1) return 0;
  return Math.min((streak - 1) * PERFECT_STREAK_STEP, PERFECT_STREAK_BONUS_CAP);
}

/**
 * Crane sweep position at `elapsedMs`, signed in [-1, 1] (0 = centre).
 *
 * Re-exported from {@link module:craneSweep} — the body moved there when the
 * sweep switched from an (unfair, centre-fastest) sine to a constant-velocity
 * triangle wave. Kept here so existing imports / the live-band preview keep
 * working unchanged.
 */
export { craneOffsetAt } from './craneSweep';
