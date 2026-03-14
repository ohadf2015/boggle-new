/**
 * Power Growth System
 *
 * Makes high-level players FEEL powerful through visible scaling.
 * Three layers: mastery aura, combo ceiling, boss power rating.
 */

/** Mastery aura intensity (0-1) based on player level. Drives tile glow CSS variable. */
export function getMasteryAura(playerLevel: number): number {
  return Math.min(1, Math.max(0, playerLevel) / 50);
}

/** Max combo multiplier scales with player level */
export function getComboCeiling(playerLevel: number): number {
  if (playerLevel <= 10) return 3;
  if (playerLevel <= 20) return 5;
  if (playerLevel <= 30) return 8;
  if (playerLevel <= 40) return 10;
  return 12;
}

/** Boss damage multiplier based on player level + upgrade count (1.0x to 1.8x) */
export function getPowerRating(playerLevel: number, upgradeCount: number): number {
  const base = playerLevel * 10 + upgradeCount * 5;
  return Math.min(1.8, 1 + base / 1000);
}
