/**
 * Word Tower — carried-girder brick cap (pure).
 *
 * The crane carries the just-built word as a VERTICAL column of one-brick-per-
 * letter tiles. A long word (e.g. CONIFER → 7 bricks) builds a girder so tall it
 * runs off the top of the bay and crowds the HUD. The full word already lives in
 * the builder slot below, so the carried payload only needs to READ as "a stack
 * of letter blocks" — it does not need every glyph. We therefore cap the girder
 * to a few bricks and surface any remainder as a small "+N" badge on the top
 * brick, keeping the crane compact and the screen uncluttered.
 */

/** Max letter-bricks rendered on the carried girder (founder: "show up to 3"). */
export const CRANE_BEAM_MAX_BRICKS = 3;

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
