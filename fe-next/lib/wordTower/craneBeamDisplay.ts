/**
 * Word Tower — carried-girder brick cap + sizing (pure).
 *
 * The crane carries the just-built word as a VERTICAL column of one-brick-per-
 * letter tiles. Founder ask (2026-06-19): "when the crane puts the letters, show
 * ALL the letters it is trying to put." So the girder now renders the WHOLE word
 * (every glyph) instead of a 3-brick stub. To stop a long word from running off
 * the top of the bay, {@link craneBeamTilePx} shrinks each brick to fit a fixed
 * vertical budget — the column gets denser, not taller. A pathologically long
 * word (> the cap) still badges the remainder so the crane never overflows.
 */

/** Max letter-bricks rendered on the carried girder. High enough to show every
 *  letter of essentially any real word in full (founder: "show all the letters");
 *  the rare longer word badges the overflow so the bay never overflows. */
export const CRANE_BEAM_MAX_BRICKS = 10;

/** Vertical pixel budget the carried girder must fit within (the bay below the
 *  hook). Bricks shrink to share it once the word is long.
 *
 *  Trimmed 150 → 104: girder height is subtracted directly from the fall
 *  distance ({@link craneFallPx}), so a 150px column of letters was eating most
 *  of the drop. A shorter, denser girder both reads better hanging off a crane
 *  and leaves real air underneath to fall through. */
export const CRANE_BEAM_BUDGET_PX = 104;
/** Brick size clamps (px) — never so small it's illegible, never bigger than the
 *  comfortable default that short words use. */
export const CRANE_BEAM_TILE_MIN_PX = 13;
export const CRANE_BEAM_TILE_MAX_PX = 30;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Per-brick pixel size for a girder carrying `count` letters: the full word is
 * shown, so the bricks shrink to share {@link CRANE_BEAM_BUDGET_PX} once the
 * column is tall, clamped to a legible range. A short word keeps the comfy max.
 */
export function craneBeamTilePx(count: number): number {
  if (count <= 0) return CRANE_BEAM_TILE_MAX_PX;
  return Math.round(clamp(CRANE_BEAM_BUDGET_PX / count, CRANE_BEAM_TILE_MIN_PX, CRANE_BEAM_TILE_MAX_PX));
}

export interface CraneBeamBricks {
  /** Bricks to render, base→top (word[0] first). Length ≤ the cap. */
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
