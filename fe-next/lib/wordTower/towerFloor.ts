/**
 * Word Tower — floor geometry (pure, renderer-agnostic).
 *
 * A word is ONE floor: a horizontal course of its letter tiles, laid at the
 * offset the crane actually dropped it at. Two consequences, both deliberate
 * (Tower Bloxx):
 *
 *  1. The tower is a *record of your drops* — a sloppy run leaves a visible
 *     overhang, not a straight column that merely tilts.
 *  2. A long word is a WIDE floor, so it is a more forgiving platform for the
 *     next drop. Vocabulary buys physical stability: the word game and the
 *     stacking game finally spend the same currency.
 *
 * Replaces the vertical one-letter-per-row model in `towerColumn.ts`, which
 * existed to render the (since retired) Shiritori chain.
 */

/** Seam between letter tiles inside one floor (px). */
export const FLOOR_GAP = 3;
/** Tiles shrink rather than overflow, but never below this (legibility). */
export const FLOOR_MIN_TILE = 20;
/** A floor targets at most this fraction of the canvas width. */
export const FLOOR_WIDTH_CEILING_FRAC = 0.92;
/**
 * How far below the row height a tile may shrink (px).
 *
 * Rows are a FIXED height (`towerRowLayout.rowH = size + 2`) so the camera can
 * pin the crown to the build line. A tile that shrinks freely to fit the width
 * ceiling therefore leaves air above and below itself: at a 54px row an 8-letter
 * floor squeezed to 31px would float in 24px of gap, and the stack would read as
 * separated slabs instead of one building — on exactly the long words the
 * horizontal-floor model exists to reward. So the width target yields to the row:
 * a floor may be at most this much shorter than its row, and past that it grows
 * wider instead. The wheel holds 7 letters and each is spent once, so a real word
 * never exceeds 7 and never has to trade off at all.
 */
export const MAX_ROW_GAP_PX = 8;
/** A dropped floor always keeps at least this fraction of the narrower span
 *  supported — mirrors `MIN_CAUGHT_OVERLAP` in cranePlacement (cosy catch). */
export const MIN_OVERLAP_FRAC = 0.2;
/** Width of the ground pad the first floor lands on, in base tiles. */
export const GROUND_PAD_TILES = 5;

export interface FloorCourse {
  /** Tile side length for this floor (px). */
  size: number;
  gap: number;
  /** Total laid width of the floor (px). */
  width: number;
  /** Tile CENTRE offsets from the floor centre, in visual order (px). */
  xs: number[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Lay `letters` tiles as one horizontal floor centred on 0.
 *
 * Tiles stay at `baseSize` (so the stack reads as one consistent building)
 * until the floor would pass the width ceiling; past that they shrink to fit
 * rather than run off screen — a wide floor the player cannot see is not a
 * platform they can aim at.
 *
 * `dir === 'rtl'` puts the logical first letter in the right-most slot so
 * Hebrew reads correctly instead of mirror-flipped.
 */
export function floorCourse(
  letters: number,
  baseSize: number,
  canvasW: number,
  dir: 'ltr' | 'rtl' = 'ltr',
): FloorCourse {
  const n = Math.max(0, Math.floor(letters));
  if (n === 0) return { size: 0, gap: 0, width: 0, xs: [] };

  const gap = FLOOR_GAP;
  const ceiling = canvasW * FLOOR_WIDTH_CEILING_FRAC;
  const natural = n * baseSize + (n - 1) * gap;
  // Never shrink so far that the floor floats inside its fixed-height row —
  // unless the canvas itself is narrower than that, in which case staying ON
  // SCREEN wins over the row fit (a floor whose ends are cut off is worse than
  // a slightly short one).
  const fitFullCanvas = (canvasW - gap * (n - 1)) / n;
  const shortest = Math.max(FLOOR_MIN_TILE, Math.min(baseSize - MAX_ROW_GAP_PX, fitFullCanvas));
  const size = natural <= ceiling
    ? baseSize
    : clamp((ceiling - gap * (n - 1)) / n, shortest, baseSize);
  const width = n * size + (n - 1) * gap;
  const left = -width / 2;

  const xs = Array.from({ length: n }, (_, i) => {
    const slot = dir === 'rtl' ? n - 1 - i : i;
    return left + slot * (size + gap) + size / 2;
  });

  return { size, gap, width, xs };
}

/** Overlap of a floor centred at `offset` with a support centred at 0 (px). */
export function overlapWidth(offset: number, floorW: number, supportW: number): number {
  return Math.max(0, Math.min(floorW, supportW, (floorW + supportW) / 2 - Math.abs(offset)));
}

/** Largest offset that still leaves `MIN_OVERLAP_FRAC` of the narrower span
 *  supported. Wider support ⇒ more room to be wrong. */
export function maxOffsetPx(floorW: number, supportW: number): number {
  return (floorW + supportW) / 2 - MIN_OVERLAP_FRAC * Math.min(floorW, supportW);
}

/**
 * World x for the next floor. `signedError` is the normalised drop error
 * (−1 full-left … 0 dead centre … +1 full-right) straight off the crane.
 *
 * The offset is relative to the floor BELOW, so errors accumulate into a
 * genuinely wonky tower — then clamped to `maxDriftPx` so a long run of bad
 * drops can never walk the tower out of frame.
 */
export function nextFloorX(
  supportX: number,
  signedError: number,
  floorW: number,
  supportW: number,
  maxDriftPx: number,
): number {
  const reach = ((floorW + supportW) / 2) * clamp(signedError, -1, 1);
  const cap = maxOffsetPx(floorW, supportW);
  return clamp(supportX + clamp(reach, -cap, cap), -maxDriftPx, maxDriftPx);
}

/**
 * Width of what the next floor lands on: the floor below, or the ground pad
 * when the tower is empty.
 */
export function supportWidthPx(
  floorLetterCounts: readonly number[],
  baseSize: number,
  canvasW: number,
): number {
  const below = floorLetterCounts[floorLetterCounts.length - 1];
  if (!below) return GROUND_PAD_TILES * baseSize;
  return floorCourse(below, baseSize, canvasW).width;
}
