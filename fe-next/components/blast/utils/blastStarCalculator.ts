/**
 * Star rating calculation for Blast Mode board completion.
 *
 * Formula:
 *   base = clearPct >= 80 ? 3 : clearPct >= 50 ? 2 : 1
 *   When `allObjectivesComplete === false`, cap the result at 2.
 *   3 stars now require BOTH ≥80% tiles cleared AND every wave objective met.
 */

/**
 * Calculate earned stars from tiles cleared vs total tiles.
 *
 * @param tilesCleared - Number of tiles cleared (or precomputed clearPct when totalTiles=100)
 * @param totalTiles   - Total tiles on the board (pass 100 to treat first arg as percentage)
 * @param allObjectivesComplete - Optional. When false, caps at 2 stars even with 80%+ clear.
 *                                Omit (or pass undefined) to preserve clear-only legacy scoring.
 * @returns 1 | 2 | 3 stars
 */
export function calculateEarnedStars(
  tilesCleared: number,
  totalTiles: number,
  allObjectivesComplete?: boolean,
): 1 | 2 | 3 {
  const clearPct = totalTiles > 0 ? (tilesCleared / totalTiles) * 100 : 0;
  const base: 1 | 2 | 3 = clearPct >= 80 ? 3 : clearPct >= 50 ? 2 : 1;
  if (allObjectivesComplete === false) return Math.min(base, 2) as 1 | 2;
  return base;
}
