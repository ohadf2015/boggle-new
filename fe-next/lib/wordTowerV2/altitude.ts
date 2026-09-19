/**
 * Height publishing for Word Tower v2. (The v1 biome mapping that lived here —
 * a metres multiplier onto v1's sky table — was replaced by v2's own floor-based
 * skies in biomes.ts.)
 */

/**
 * Settling Matter bodies wobble the measured height in the 3rd decimal forever.
 * Published raw at the 10Hz poll, that re-rendered the whole DOM sky 10x/s and
 * restarted every 700-1000ms ease before it could finish — the v2 flicker.
 * A block is ~1.4m, so ignoring moves under 5cm loses nothing real.
 */
const PUBLISH_EPS_M = 0.05;

export function publishHeightM(shownM: number, rawM: number): number {
  return Math.abs(rawM - shownM) < PUBLISH_EPS_M ? shownM : rawM;
}
