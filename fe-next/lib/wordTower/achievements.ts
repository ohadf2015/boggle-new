/**
 * Word Tower — achievements (pure, renderer-agnostic).
 *
 * Founder: add achievements + surprises. Each is a feat tested against the live
 * run stats; newly-satisfied ones pop a trophy toast and persist (client-side)
 * so they unlock once. Kept pure so the unlock logic is unit-testable.
 */

export interface AchievementStats {
  heightM: number;
  floors: number;
  /** Longest word built this run (length). */
  longestWord: number;
  longestCombo: number;
  /** Has the player passed a rival's record this run? */
  passedRival: boolean;
}

export interface Achievement {
  id: string;
  /** i18n key for the display name. */
  nameKey: string;
  icon: string;
  test: (s: AchievementStats) => boolean;
}

export const WORD_TOWER_ACHIEVEMENTS: ReadonlyArray<Achievement> = [
  { id: 'firstFloor', nameKey: 'wordTower.ach.firstFloor', icon: '🧱', test: (s) => s.floors >= 1 },
  { id: 'tenFloors', nameKey: 'wordTower.ach.tenFloors', icon: '🏗️', test: (s) => s.floors >= 10 },
  { id: 'skyHigh', nameKey: 'wordTower.ach.skyHigh', icon: '☁️', test: (s) => s.heightM >= 100 },
  { id: 'wordsmith', nameKey: 'wordTower.ach.wordsmith', icon: '✍️', test: (s) => s.longestWord >= 7 },
  { id: 'comboKing', nameKey: 'wordTower.ach.comboKing', icon: '🔥', test: (s) => s.longestCombo >= 5 },
  { id: 'rivalCrusher', nameKey: 'wordTower.ach.rivalCrusher', icon: '👑', test: (s) => s.passedRival },
  { id: 'unstoppable', nameKey: 'wordTower.ach.unstoppable', icon: '🚀', test: (s) => s.heightM >= 500 },
  { id: 'toTheMoon', nameKey: 'wordTower.ach.toTheMoon', icon: '🌙', test: (s) => s.heightM >= 1000 },
];

/** Achievements newly satisfied by `stats` that aren't already `unlocked`. */
export function newlyUnlocked(
  stats: AchievementStats,
  unlocked: ReadonlySet<string>,
  defs: ReadonlyArray<Achievement> = WORD_TOWER_ACHIEVEMENTS,
): Achievement[] {
  return defs.filter((a) => !unlocked.has(a.id) && a.test(stats));
}
