/**
 * Star rating calculation for Blast Mode board completion.
 *
 * Formula:
 *   clearPct = tilesCleared / totalTiles * 100
 *   stars = clearPct >= 80 ? 3 : clearPct >= 50 ? 2 : 1
 */

/**
 * Calculate earned stars from tiles cleared vs total tiles.
 *
 * @param tilesCleared - Number of tiles cleared (or precomputed clearPct when totalTiles=100)
 * @param totalTiles   - Total tiles on the board (pass 100 to treat first arg as percentage)
 * @returns 1 | 2 | 3 stars
 */
export function calculateEarnedStars(tilesCleared: number, totalTiles: number): 1 | 2 | 3 {
  const clearPct = totalTiles > 0 ? (tilesCleared / totalTiles) * 100 : 0;
  if (clearPct >= 80) return 3;
  if (clearPct >= 50) return 2;
  return 1;
}
