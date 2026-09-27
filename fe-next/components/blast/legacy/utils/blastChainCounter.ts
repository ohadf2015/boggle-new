/**
 * blastChainCounter.ts
 *
 * Pure logic for cascade chain counter color mapping and label formatting.
 * No React dependencies — safe to test in isolation.
 */

/**
 * Color progression for cascade chain levels.
 * Index 0 = level 0/1 (white), escalates through gold, orange.
 * Level 4+ uses "rainbow" (handled as special case, not a hex entry).
 */
export const CHAIN_COLOR_PROGRESSION: readonly string[] = [
  '#FFFFFF', // level 0/1: white
  '#FFD700', // level 2: gold
  '#FF6B35', // level 3: orange
] as const;

/**
 * Returns the display color for a given chain level.
 * - Level 0-1: white (#FFFFFF)
 * - Level 2: gold (#FFD700)
 * - Level 3: orange (#FF6B35)
 * - Level 4+: "rainbow" (caller applies gradient)
 */
export function getChainColor(level: number): string {
  if (level >= 4) return 'rainbow';
  if (level >= 3) return CHAIN_COLOR_PROGRESSION[2];
  if (level >= 2) return CHAIN_COLOR_PROGRESSION[1];
  return CHAIN_COLOR_PROGRESSION[0]; // level 0-1: white
}

/**
 * Returns the display label for a given chain level.
 * - Level <= 0: null (do not display)
 * - Level >= 1: "CHAIN x{level}"
 */
export function getChainLabel(level: number): string | null {
  if (level <= 0) return null;
  return `CHAIN x${level}`;
}
