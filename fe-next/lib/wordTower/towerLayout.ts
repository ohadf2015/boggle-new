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

/** Inputs for the grounded tower-camera row layout. */
export interface TowerRowLayoutInput {
  /** Committed rows the camera pins on. Pending preview rows are NOT counted —
   *  building a word must not bob the settled tower. */
  pinCount: number;
  /** Canvas height (px). */
  H: number;
  /** Height (px) of the bottom control deck; the tower never grounds into it. */
  bottomInsetPx: number;
}

export interface TowerRowLayout {
  size: number;
  half: number;
  rowH: number;
  /** Centre-y the newest committed tile is pinned to once the tower overflows. */
  topCenter: number;
  /** Centre-y of the base tile while the tower is short enough to stand grounded. */
  baseCenter: number;
  /** Downward camera travel applied once the committed tower outgrows the window. */
  shift: number;
  /** Centre-y for a tile at stack position `pos` (0 = base, growing upward). */
  centerY: (pos: number) => number;
}

/**
 * Grounded tower camera. The base stands just above the control deck and the
 * stack grows UP toward the crane build line (fixes the old top-anchored model
 * where the base floated/culled below the tray). Once the committed tower is
 * taller than the visible band, the whole stack pans DOWN (`shift`) so the
 * newest tile stays pinned at the build line and the base scrolls off the
 * bottom behind the deck — i.e. the camera follows the climb, Tower-Bloxx style.
 */
export function towerRowLayout({ pinCount, H, bottomInsetPx }: TowerRowLayoutInput): TowerRowLayout {
  const size = clamp(H * 0.066, 38, 54); // compact blocks — was 0.082/46–66 (read too big)
  const half = size / 2;
  const rowH = size + 2; // ~2px seam → tiles read as one cohesive stacked tower, not floating blocks
  const topCenter = H * 0.28 + half; // park the committed top in the upper-middle so a building word
                                     // has headroom above it (was 0.15 → new letters crammed under the header)
  const baseCenter = H - bottomInsetPx - half - Math.round(size * 0.12); // grounded just above the deck
  // Overflow once the pinned top would rise above the build line; pan down to keep it there.
  const shift = pinCount > 0 ? Math.max(0, topCenter - baseCenter + (pinCount - 1) * rowH) : 0;
  const centerY = (pos: number) => baseCenter - pos * rowH + shift;
  return { size, half, rowH, topCenter, baseCenter, shift, centerY };
}

/**
 * Lowest (most-negative) camera pan offset that brings the base tile fully into
 * the play area just above the control deck. The user pans UP from the build
 * line (pan 0) toward this floor to review the lower/older parts of the tower.
 * Returns 0 when the whole tower already fits (nothing below to reveal).
 */
export function towerPanMin(baseTileCenterY: number, H: number, bottomInsetPx: number, half: number): number {
  return Math.min(0, H - bottomInsetPx - half - baseTileCenterY);
}

/** Clamp a user pan offset to `[panMin, 0]` — can't pan above the newest tile
 *  (only sky there) nor below the base. */
export function clampPan(panY: number, panMin: number): number {
  return Math.max(panMin, Math.min(0, panY));
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
