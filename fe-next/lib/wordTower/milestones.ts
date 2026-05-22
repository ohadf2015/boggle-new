/**
 * Word Tower — altitude milestones (pure, renderer-agnostic).
 *
 * Founder: add witty / funny elements. Crossing a milestone height pops a brief,
 * cheeky one-liner ("Cloud territory ☁️") — a small reward that also reinforces
 * the climb's scale. Spaced far apart so they stay special, not spammy.
 */

export interface Milestone {
  /** Altitude (m) at which it fires. */
  m: number;
  /** i18n key for the witty line. */
  key: string;
}

export const WORD_TOWER_MILESTONES: Milestone[] = [
  { m: 50, key: 'wordTower.milestone.m50' },
  { m: 150, key: 'wordTower.milestone.m150' },
  { m: 400, key: 'wordTower.milestone.m400' },
  { m: 900, key: 'wordTower.milestone.m900' },
  { m: 1800, key: 'wordTower.milestone.m1800' },
];

/**
 * The milestone just crossed climbing from `prevM` to `curM` (the HIGHEST one in
 * that range, so a big single jump doesn't queue several). Null if none crossed.
 */
export function milestoneCrossed(
  prevM: number,
  curM: number,
  milestones: ReadonlyArray<Milestone> = WORD_TOWER_MILESTONES,
): Milestone | null {
  if (curM <= prevM) return null;
  let hit: Milestone | null = null;
  for (const ms of milestones) {
    if (ms.m > prevM && ms.m <= curM) hit = ms;
  }
  return hit;
}
