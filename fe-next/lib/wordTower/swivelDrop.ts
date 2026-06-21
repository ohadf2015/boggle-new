/**
 * Swivel-drop placement geometry for Word Tower.
 *
 * When the crane PLACES a word, the word's letter-bricks — a VERTICAL run in the
 * tower — swivel into the stack as ONE rigid piece, hinged at the joint where the
 * word attaches to the tower below, rather than each brick plopping in
 * independently with a fast snap. This module is the pure geometry + timing; the
 * Pixi layer (`swivelWordIn` in components/wordTower/towerSprites.ts) just drives
 * it on a rAF clock.
 *
 * Because the run is vertical (every brick shares the column's x), a rigid
 * rotation about the base pivot reduces to: each brick's rest offset from the
 * pivot is purely vertical (`dy`), and rotating that offset by θ gives the swung
 * position. The whole group also lowers a little into place (descent) so it reads
 * as "the crane sets the word down AND it swivels flat", not a pure spin.
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (k: number) => clamp(k, 0, 1);

const DEG = Math.PI / 180;

/** A CLEAN drop tips the run this far (deg) before settling upright. Bumped
 *  11→13 in the 2026-06-21 feel pass so a clean placement reads as a confident,
 *  weighty swing-in rather than a timid tip. */
export const SWIVEL_BASE_DEG = 13;
/** A sloppy drop (big tower lean) tips harder, up to this, in the lean's dir.
 *  Bumped 19→22 to make a recovery-from-lean drop visibly more dramatic. */
export const SWIVEL_MAX_DEG = 22;
/** The run's TOP brick never swings more than this horizontally (px) — keeps a
 *  tall word from carving an unphysical arc; caps the start angle by run height. */
export const SWIVEL_ARC_CAP_PX = 28;
/** How much the lean (deg) feeds the start tilt above the clean base amount. */
const LEAN_TO_DEG = 0.8;
/** How far (px) the whole run lifts above its rest at the start, then lowers in. */
export const SWIVEL_DESCENT_PX = 30;

/** Swivel duration (ms) — slower + weightier than the old 300ms snap. */
export const SWIVEL_MIN_MS = 520;
export const SWIVEL_MAX_MS = 760;
/** Per-extra-letter slowdown so longer girders settle a touch longer. */
const SWIVEL_PER_LETTER_MS = 38;

/** Tuned so the settle swings through upright exactly once (one overshoot):
 *  the only zero-crossing in (0,1) sits at ~t=0.34, the next is past k=1. */
const SETTLE_OMEGA = Math.PI * 1.45;

/**
 * Damped settle multiplier, 1 → 0, with a single overshoot: the run swings to
 * upright, tips slightly past it, then rests. The `(1 - k)` envelope guarantees
 * it lands at exactly 0 (flush brick), while the cosine provides the tip-through.
 */
export function swivelSettle(k: number): number {
  const t = clamp01(k);
  return (1 - t) * Math.cos(SETTLE_OMEGA * t);
}

/**
 * Group descent fraction, 0 → 1 (ease-out cubic). Multiplied by the descent
 * distance it lifts the whole run up at the start and lowers it flush by the end.
 */
export function swivelDescent(k: number): number {
  const t = clamp01(k);
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Start tilt (deg, signed) for a placed run. A clean drop (|lean|≈0) tips the
 * gentle base amount in the default (+) direction; a sloppier drop (larger
 * |lean|) tips harder and FOLLOWS the lean so the correction is seen. Always
 * capped so the top brick's horizontal swing stays within {@link
 * SWIVEL_ARC_CAP_PX} — tall words are forced to a gentler tip.
 *
 * @param lean   tower lean (deg, signed) at placement — sets direction + bias
 * @param topDy  vertical distance (px, >0) from the pivot to the run's TOP brick
 */
export function swivelStartDeg(lean: number, topDy: number): number {
  const mag = clamp(SWIVEL_BASE_DEG + Math.abs(lean) * LEAN_TO_DEG, SWIVEL_BASE_DEG, SWIVEL_MAX_DEG);
  const sign = lean < 0 ? -1 : 1; // clean (lean 0) tips right by default
  const dy = Math.max(1, topDy);
  const capRad = Math.asin(clamp(SWIVEL_ARC_CAP_PX / dy, 0, 1));
  const capped = Math.min(mag * DEG, capRad);
  return (sign * capped) / DEG;
}

export interface BrickRest {
  /** rest x — the column centre. */
  x: number;
  /** rest y — the brick's local slot. */
  y: number;
}

export interface BrickFrame {
  x: number;
  y: number;
  angleDeg: number;
}

/** How much of the swivel each brick's descent is staggered by, top vs bottom.
 *  At 0.35 the TOP brick of a run starts lowering ~35% of the way through, so a
 *  placed word visibly settles bottom→top under its own weight (a stacking
 *  "ripple") instead of the whole girder dropping as one flat slab. */
export const SWIVEL_DESCENT_STAGGER = 0.35;

/**
 * Per-brick lift fraction (1 = fully lifted at the start, 0 = flush at rest) for
 * the cascading descent. Brick `brickIndex` (0 = bottom of the run) lags higher
 * up the run so the base lands first and the crown tips in last. Two hard
 * invariants the tests pin: at k=1 every brick is flush (lift 0) so the word
 * lands exactly on its slot, and with `runLen<=1` or `stagger<=0` it collapses to
 * the original uniform `1 - swivelDescent(k)`.
 */
export function brickLiftFrac(
  k: number,
  brickIndex: number,
  runLen: number,
  stagger: number = SWIVEL_DESCENT_STAGGER,
): number {
  const t = clamp01(k);
  if (runLen <= 1 || stagger <= 0) return 1 - swivelDescent(t);
  const frac = clamp01(brickIndex / (runLen - 1)); // 0 bottom → 1 top
  const delay = clamp(stagger * frac, 0, 0.95);
  const localK = clamp01((t - delay) / (1 - delay));
  return 1 - swivelDescent(localK);
}

/**
 * Position + tilt of one brick at progress k, for a run rotating rigidly about
 * (pivotX, pivotY) from `startDeg` to upright while the run lowers `descentPx`
 * into place. At k=1 every brick lands exactly on its rest slot, upright.
 * Generic in dx so it is correct even if a future run isn't perfectly
 * column-aligned. `brickIndex`/`runLen`/`descentStagger` drive the cascading
 * descent (default `runLen=1` → no cascade, preserving the original feel).
 */
export function swivelBrickFrame(
  rest: BrickRest,
  pivotX: number,
  pivotY: number,
  startDeg: number,
  descentPx: number,
  k: number,
  brickIndex: number = 0,
  runLen: number = 1,
  descentStagger: number = 0,
): BrickFrame {
  const angleDeg = startDeg * swivelSettle(k);
  const theta = angleDeg * DEG;
  const lift = descentPx * brickLiftFrac(k, brickIndex, runLen, descentStagger); // starts high, eases to 0
  const py = pivotY - lift; // the pivot itself lowers into place
  const dx = rest.x - pivotX;
  const dy = rest.y - pivotY;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: pivotX + dx * cos - dy * sin,
    y: py + dx * sin + dy * cos,
    angleDeg,
  };
}

/** Swivel duration (ms) for a run of `runLen` bricks — clamped, length-scaled. */
export function swivelDurationMs(runLen: number): number {
  return clamp(SWIVEL_MIN_MS + Math.max(0, runLen - 2) * SWIVEL_PER_LETTER_MS, SWIVEL_MIN_MS, SWIVEL_MAX_MS);
}
