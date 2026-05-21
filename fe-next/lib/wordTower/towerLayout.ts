import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

/**
 * Pure layout math for the Word Tower scene. Kept renderer-agnostic (no Pixi /
 * DOM imports) so it is trivially unit-testable — the Pixi scene and the DOM
 * backdrop both consume these.
 */

export interface CourseTile {
  char: string;
  /** Left edge of the tile within the course band (px). */
  x: number;
  /** Square tile side length (px). */
  size: number;
}

export interface CourseLayout {
  tiles: CourseTile[];
  /** Total laid width of the course (px). */
  width: number;
  /** Tile side length, i.e. course height (px). */
  height: number;
}

interface CourseOpts {
  gap?: number;
  maxTile?: number;
  minTile?: number;
  /** Text direction — RTL places logical char 0 at the right-most slot. */
  dir?: 'ltr' | 'rtl';
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Lay a word out as a horizontal course of square letter-tiles, centered within
 * `courseW`. Unicode-safe (one tile per code point) and bidi-aware: for `rtl`
 * the logical first character is placed at the visual right edge so Hebrew /
 * Arabic words read correctly instead of mirror-flipped.
 */
export function courseTileLayout(word: string, courseW: number, opts: CourseOpts = {}): CourseLayout {
  const chars = Array.from(word);
  const n = chars.length;
  if (n === 0) return { tiles: [], width: 0, height: 0 };

  const gap = opts.gap ?? 4;
  const maxTile = opts.maxTile ?? 56;
  const minTile = opts.minTile ?? 18;
  const dir = opts.dir ?? 'ltr';

  const fit = (courseW - gap * (n - 1)) / n;
  const size = clamp(fit, minTile, maxTile);
  const width = n * size + (n - 1) * gap;
  const startX = (courseW - width) / 2;

  const tiles = chars.map((char, i) => {
    const slot = dir === 'rtl' ? n - 1 - i : i; // visual slot from the left
    return { char, x: startX + slot * (size + gap), size };
  });

  return { tiles, width, height: size };
}

/** Per-biome opacities for the construction backdrop layers (0..1). */
export interface BiomeBackdrop {
  /** Scaffold rails framing the tower. */
  scaffold: number;
  /** Tower crane + hook over the build line. */
  crane: number;
  /** Distant city skyline at the horizon. */
  skyline: number;
  /** Drifting clouds. */
  clouds: number;
}

/**
 * The rig fades out as you climb: full construction site on the ground
 * (`city`), thinning through the sky, gone in deep space. This reinforces the
 * altitude progression — you literally build away from the earthbound rig.
 */
const BACKDROP: Record<WordTowerBiomeId, BiomeBackdrop> = {
  city: { scaffold: 1, crane: 1, skyline: 1, clouds: 0.15 },
  sky: { scaffold: 0.7, crane: 0.6, skyline: 0.3, clouds: 0.6 },
  stratosphere: { scaffold: 0.35, crane: 0.25, skyline: 0, clouds: 0.35 },
  orbit: { scaffold: 0.12, crane: 0, skyline: 0, clouds: 0.1 },
  nebula: { scaffold: 0, crane: 0, skyline: 0, clouds: 0 },
  galaxy: { scaffold: 0, crane: 0, skyline: 0, clouds: 0 },
};

export function biomeBackdrop(biomeId: WordTowerBiomeId): BiomeBackdrop {
  return BACKDROP[biomeId];
}
