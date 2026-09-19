/**
 * Word Tower v2 achievements — v2's own badge set, earned once ever.
 *
 * Pure checks over one run's stats; persistence is a tiny localStorage set so a
 * badge pops the first time only. Every id is an i18n key under
 * `wordTowerV2.ach.<id>` (name + desc).
 */

export interface RunStats {
  /** Floors hoisted and landed this run. */
  floors: number;
  /** Tallest the tower stood, in floors. */
  peakFloors: number;
  bestCombo: number;
  perfects: number;
  longestWord: number;
  tenants: number;
  crates: number;
  welds: number;
}

export function emptyStats(): RunStats {
  return { floors: 0, peakFloors: 0, bestCombo: 0, perfects: 0, longestWord: 0, tenants: 0, crates: 0, welds: 0 };
}

export type Tier = 'bronze' | 'silver' | 'gold';

export interface Achievement {
  id: string;
  tier: Tier;
  stat: keyof RunStats;
  goal: number;
}

const a = (id: string, tier: Tier, stat: keyof RunStats, goal: number): Achievement => ({ id, tier, stat, goal });

export const ACHIEVEMENTS: Achievement[] = [
  a('groundbreaker', 'bronze', 'floors', 1),
  a('fiveStory', 'bronze', 'floors', 5),
  a('highRise', 'silver', 'floors', 10),
  a('skyscraper', 'gold', 'floors', 20),
  a('megatower', 'gold', 'floors', 30),
  a('steadyHands', 'bronze', 'bestCombo', 3),
  a('surgeon', 'silver', 'bestCombo', 6),
  a('flawless', 'gold', 'bestCombo', 10),
  a('perfectionist', 'silver', 'perfects', 15),
  a('wordsmith', 'bronze', 'longestWord', 6),
  a('lexicon', 'gold', 'longestWord', 8),
  a('fullHouse', 'silver', 'tenants', 50),
  a('cityPlanner', 'gold', 'tenants', 150),
  a('lucky', 'bronze', 'crates', 5),
  a('welder', 'silver', 'welds', 1),
  a('sunsetView', 'bronze', 'peakFloors', 3),
  a('aboveClouds', 'silver', 'peakFloors', 6),
  a('orbiter', 'gold', 'peakFloors', 21),
];

export function newlyUnlocked(stats: RunStats, unlocked: Set<string>): string[] {
  return ACHIEVEMENTS.filter((x) => !unlocked.has(x.id) && stats[x.stat] >= x.goal).map((x) => x.id);
}

export function progressOf(x: Achievement, stats: RunStats): { current: number; goal: number } {
  return { current: Math.min(x.goal, stats[x.stat]), goal: x.goal };
}

const KEY = 'wordTowerV2.achievements';

export function loadUnlocked(): Set<string> {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    const known = new Set(ACHIEVEMENTS.map((x) => x.id));
    return new Set(Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && known.has(id)) : []);
  } catch {
    return new Set();
  }
}

export function saveUnlocked(unlocked: Set<string>): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...unlocked]));
  } catch {
    // Private mode: badges just re-pop next visit.
  }
}
