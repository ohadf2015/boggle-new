/**
 * Word Tower — per-tile visual variation (pure, deterministic).
 *
 * Every letter tile is otherwise drawn identically, so a tall stack reads as a
 * stamped column rather than a built tower (founder: "the letter boxes should
 * look more like a real tower builds, with variations of the boxes to feel
 * nicer"). This derives a small, STABLE jitter from the tile's position index:
 * a faint tonal shift on the face + a varied top-highlight strip, so each block
 * looks individually placed. Deterministic by `pos` → repaints never flicker.
 */
export interface TileVariation {
  /** Lightness shift applied to the face fill, ~[-0.06, +0.06]. */
  tone: number;
  /** Top highlight-strip height multiplier, ~[0.85, 1.15]. */
  highlight: number;
  /** Tiny horizontal "set" offset (px) so seams don't line up perfectly. */
  jitterX: number;
}

/** Deterministic hash → [0, 1) from an integer position. */
function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function tileVariation(pos: number): TileVariation {
  const a = hash01(pos);
  const b = hash01(pos + 97.31);
  const c = hash01(pos + 53.17);
  return {
    tone: (a - 0.5) * 0.12,
    highlight: 0.85 + b * 0.3,
    jitterX: (c - 0.5) * 2, // ±1px
  };
}
