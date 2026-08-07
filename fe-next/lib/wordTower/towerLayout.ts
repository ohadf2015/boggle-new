import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

/**
 * Pure layout math for the Word Tower scene. Kept renderer-agnostic (no Pixi /
 * DOM imports) so it is trivially unit-testable — the Pixi scene and the DOM
 * backdrop both consume these.
 */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Default number of committed rows kept on screen before the camera follows
 *  the climb. Founder ask (2026-06-19): "the tower should show only the top 2
 *  letter blocks when regular — scrolling reveals all the rest." Once the tower
 *  passes this, the base scrolls off below the deck and only the newest
 *  `maxVisibleRows` rows stay in the compact bottom construction zone; the user
 *  pans down to review everything below. */
export const DEFAULT_MAX_VISIBLE_ROWS = 3;

/** Where the crane drops + the newest tile pins, as a fraction of canvas height.
 *  Founder 2026-06-26: a LOW build line keeps the active ~3 blocks in the lower
 *  screen with the upper screen left as sky/biome ("most of the screen should be
 *  fun to watch"). Single source of truth — the crane chrome + both rails align
 *  to this same line (crane = this + a fixed chrome offset). */
export const WORD_TOWER_BUILD_LINE_FRACTION = 0.5;

/** Inputs for the grounded tower-camera row layout. */
export interface TowerRowLayoutInput {
  /** Committed rows the camera pins on. Pending preview rows are NOT counted —
   *  building a word must not bob the settled tower. */
  pinCount: number;
  /** Canvas height (px). */
  H: number;
  /** Height (px) of the bottom control deck; the tower never grounds into it. */
  bottomInsetPx: number;
  /** How many committed rows stay visible before the camera pans (default 3).
   *  Sets the build line `(maxVisibleRows-1)` rows above the grounded base. */
  maxVisibleRows?: number;
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
export function towerRowLayout({ pinCount, H, bottomInsetPx, maxVisibleRows = DEFAULT_MAX_VISIBLE_ROWS }: TowerRowLayoutInput): TowerRowLayout {
  const mvr = Math.max(1, Math.round(maxVisibleRows));
  // Founder 2026-06-26: "show ~3 building blocks; scroll for more; most of the
  // screen should be sky/biome." Compact, readable bricks (not chunky) — the
  // ~3-visible count now comes from the LOW build line (sky above), not from
  // oversizing the blocks.
  const size = Math.round(clamp(H * 0.066, 38, 54));
  const half = size / 2;
  const rowH = size + 2; // ~2px seam → tiles read as one cohesive stacked tower, not floating blocks
  // The build line sits low (WORD_TOWER_BUILD_LINE_FRACTION) so the upper screen
  // stays sky. The crane chrome + both rails align to this SAME line. The newest
  // committed tile pins here once the tower overflows.
  const topCenter = H * WORD_TOWER_BUILD_LINE_FRACTION + half;
  // The base floats exactly (mvr-1) rows BELOW the build line, so a fresh tower
  // never shows more than `mvr` committed rows: the active build zone is a tight
  // cluster hanging under the crane and the rest of the screen reads clean. We
  // never let that floor sink into the control deck (clamp for short screens).
  // Base tile sits flush on top of the control deck / ground line — no floating gap.
  const groundFloor = H - bottomInsetPx - half;
  const baseCenter = Math.min(topCenter + (mvr - 1) * rowH, groundFloor);
  // Overflow once the pinned top would rise above the build line; pan down to keep it there.
  // Round to whole pixels — H*0.28 isn't binary-exact, so the raw expression can
  // leave sub-pixel dust that reads as a non-zero shift while grounded.
  const shift = pinCount > 0 ? Math.max(0, Math.round(topCenter - baseCenter + (pinCount - 1) * rowH)) : 0;
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
  city: { scaffold: 1, crane: 1, skyline: 1, clouds: 0.45 },
  sky: { scaffold: 0.7, crane: 0.6, skyline: 0.3, clouds: 0.75 },
  stratosphere: { scaffold: 0.35, crane: 0.25, skyline: 0, clouds: 0.25 },
  orbit: { scaffold: 0.12, crane: 0, skyline: 0, clouds: 0.06 },
  nebula: { scaffold: 0, crane: 0, skyline: 0, clouds: 0 },
  galaxy: { scaffold: 0, crane: 0, skyline: 0, clouds: 0 },
};

export function biomeBackdrop(biomeId: WordTowerBiomeId): BiomeBackdrop {
  return BACKDROP[biomeId];
}
