/**
 * Word Tower — carried-girder brick cap + sizing (pure).
 *
 * The crane carries the just-built word as the HORIZONTAL girder it will become:
 * one row of letter-bricks, exactly the floor that lands (see `towerFloor.ts`).
 * It used to hang as a vertical column, which read as a dangling spire and made
 * the thing on the hook look nothing like the thing on the tower.
 *
 * Founder ask (2026-06-19): "when the crane puts the letters, show ALL the
 * letters it is trying to put" — so the girder renders the WHOLE word. To stop a
 * long word running out of the bay, {@link craneBeamTilePx} shrinks each brick
 * to share a fixed WIDTH budget: the girder gets denser, not wider. A
 * pathologically long word (> the cap) badges the remainder.
 */

/** Max letter-bricks rendered on the carried girder. High enough to show every
 *  letter of essentially any real word in full (founder: "show all the letters");
 *  the rare longer word badges the overflow so the bay never overflows. */
export const CRANE_BEAM_MAX_BRICKS = 10;

/** WIDTH budget the carried girder must fit within (the bay under the jib).
 *  Bricks shrink to share it once the word is long. Matched to the landed
 *  floor's width ceiling (`FLOOR_WIDTH_CEILING_FRAC` of a phone canvas) so the
 *  girder on the hook is the same shape as the floor that lands. */
export const CRANE_BEAM_BUDGET_PX = 268;
/** Brick size clamps (px) — never so small it's illegible, never bigger than the
 *  comfortable default that short words use. */
export const CRANE_BEAM_TILE_MIN_PX = 18;
export const CRANE_BEAM_TILE_MAX_PX = 44;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Per-brick pixel size for a girder carrying `count` letters: the full word is
 * shown, so the bricks shrink to share {@link CRANE_BEAM_BUDGET_PX} once the
 * girder is wide, clamped to a legible range. A short word keeps the comfy max.
 */
export function craneBeamTilePx(count: number): number {
  if (count <= 0) return CRANE_BEAM_TILE_MAX_PX;
  return Math.round(clamp(CRANE_BEAM_BUDGET_PX / count, CRANE_BEAM_TILE_MIN_PX, CRANE_BEAM_TILE_MAX_PX));
}

export interface CraneBeamBricks {
  /** Bricks to render in reading order (word[0] first). Length ≤ the cap. */
  chars: string[];
  /** Letters hidden beyond the cap — surfaced as a "+N" badge (0 = none). */
  hiddenCount: number;
}

/**
 * Cap a word to at most `max` carried bricks. Words within the cap render in
 * full; longer words keep their first `max` letters (the chain-relevant head)
 * and report the remainder so the UI can badge it.
 */
export function craneBeamBricks(word: string, max: number = CRANE_BEAM_MAX_BRICKS): CraneBeamBricks {
  const chars = Array.from(word ?? '');
  if (max <= 0) return { chars: [], hiddenCount: chars.length };
  if (chars.length <= max) return { chars, hiddenCount: 0 };
  return { chars: chars.slice(0, max), hiddenCount: chars.length - max };
}
