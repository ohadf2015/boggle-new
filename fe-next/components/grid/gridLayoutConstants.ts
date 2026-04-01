/**
 * Shared grid layout constants.
 * Used by GridComponent and BlastTileOverlay to ensure pixel-perfect alignment.
 */

/** Inner padding of the grid container */
export const GRID_PADDING = '0.4rem';

/**
 * Responsive gap strategy — viewport breakpoints map to tile-gap sizes:
 *
 *   default (≤359px / small mobile):     gap-0.5  →  2px
 *   360px+  (standard mobile portrait): gap-1    →  4px
 *   sm      (640-767px / large phone):   gap-1.5  →  6px
 *   md      (768-1023px / tablet):       gap-2    →  8px
 *   lg      (1024px+ / desktop):         gap-2    →  8px
 *
 * These gaps are intentionally small — tiles are touch targets first.
 * The grid container is sized via `aspect-square` + `min(100%, 80vh)` in
 * GameGridArea so it always fills available space without overflowing.
 * Viewport breakpoints (not container-query units) are appropriate here
 * because the grid is the primary content and tracks viewport width in
 * portrait orientation and viewport height in landscape.
 */
export const GRID_GAP_CLASS = 'gap-0.5 min-[360px]:gap-1 sm:gap-1.5 md:gap-2 lg:gap-2';
