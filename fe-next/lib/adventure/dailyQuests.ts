/**
 * Daily Quests — 3 rotating quests per day from a pool of 15.
 * Uses seeded randomness from date string so all players get same quests.
 */

export interface DailyQuest {
  id: string;
  type: 'wordCount' | 'longWord' | 'perfectStar' | 'comboStreak' | 'speedRun' | 'bossDefeat' | 'mechanicUse';
  titleKey: string;
  descriptionKey: string;
  target: number;
  rewardGold: number;
  rewardXp: number;
  rewardFragments?: number;
}

export const DAILY_QUEST_POOL: DailyQuest[] = [
  { id: 'dq-words-20', type: 'wordCount', titleKey: 'adventure.daily.wordCount.title', descriptionKey: 'adventure.daily.wordCount.desc', target: 20, rewardGold: 50, rewardXp: 30 },
  { id: 'dq-words-40', type: 'wordCount', titleKey: 'adventure.daily.wordCount.title', descriptionKey: 'adventure.daily.wordCount.desc', target: 40, rewardGold: 80, rewardXp: 50 },
  { id: 'dq-words-60', type: 'wordCount', titleKey: 'adventure.daily.wordCount.title', descriptionKey: 'adventure.daily.wordCount.desc', target: 60, rewardGold: 120, rewardXp: 70 },
  { id: 'dq-long-5', type: 'longWord', titleKey: 'adventure.daily.longWord.title', descriptionKey: 'adventure.daily.longWord.desc', target: 5, rewardGold: 60, rewardXp: 35 },
  { id: 'dq-long-10', type: 'longWord', titleKey: 'adventure.daily.longWord.title', descriptionKey: 'adventure.daily.longWord.desc', target: 10, rewardGold: 100, rewardXp: 60 },
  { id: 'dq-perfect-2', type: 'perfectStar', titleKey: 'adventure.daily.perfect.title', descriptionKey: 'adventure.daily.perfect.desc', target: 2, rewardGold: 80, rewardXp: 50 },
  { id: 'dq-perfect-3', type: 'perfectStar', titleKey: 'adventure.daily.perfect.title', descriptionKey: 'adventure.daily.perfect.desc', target: 3, rewardGold: 120, rewardXp: 70 },
  { id: 'dq-combo-5', type: 'comboStreak', titleKey: 'adventure.daily.combo.title', descriptionKey: 'adventure.daily.combo.desc', target: 5, rewardGold: 70, rewardXp: 40 },
  { id: 'dq-combo-10', type: 'comboStreak', titleKey: 'adventure.daily.combo.title', descriptionKey: 'adventure.daily.combo.desc', target: 10, rewardGold: 110, rewardXp: 65 },
  { id: 'dq-speed-60', type: 'speedRun', titleKey: 'adventure.daily.speed.title', descriptionKey: 'adventure.daily.speed.desc', target: 60, rewardGold: 90, rewardXp: 55 },
  { id: 'dq-boss-1', type: 'bossDefeat', titleKey: 'adventure.daily.boss.title', descriptionKey: 'adventure.daily.boss.desc', target: 1, rewardGold: 100, rewardXp: 60, rewardFragments: 1 },
  { id: 'dq-boss-2', type: 'bossDefeat', titleKey: 'adventure.daily.boss.title', descriptionKey: 'adventure.daily.boss.desc', target: 2, rewardGold: 180, rewardXp: 100, rewardFragments: 2 },
  { id: 'dq-mechanic-5', type: 'mechanicUse', titleKey: 'adventure.daily.mechanic.title', descriptionKey: 'adventure.daily.mechanic.desc', target: 5, rewardGold: 60, rewardXp: 35 },
  { id: 'dq-mechanic-10', type: 'mechanicUse', titleKey: 'adventure.daily.mechanic.title', descriptionKey: 'adventure.daily.mechanic.desc', target: 10, rewardGold: 100, rewardXp: 60 },
  { id: 'dq-words-80', type: 'wordCount', titleKey: 'adventure.daily.wordCount.title', descriptionKey: 'adventure.daily.wordCount.desc', target: 80, rewardGold: 150, rewardXp: 90, rewardFragments: 1 },
];

/** Seeded random from date string — deterministic per day */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 0x100000000;
  };
}

/** Quest types that require specific world progress */
const WORLD_RESTRICTED_TYPES: Record<string, number> = {
  bossDefeat: 2,    // bosses start at world 1 level 7, but W2+ is when players understand them
  mechanicUse: 2,   // world mechanics start at world 2
};

/** Get 3 daily quests for a given date, filtered by player's current world */
export function getDailyQuests(dateStr: string, currentWorld = 10): DailyQuest[] {
  const rng = seededRandom(dateStr);
  const pool = [...DAILY_QUEST_POOL].filter(q => {
    const minWorld = WORLD_RESTRICTED_TYPES[q.type];
    return !minWorld || currentWorld >= minWorld;
  });
  const selected: DailyQuest[] = [];

  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return selected;
}

/** Bonus gold awarded when all 3 daily quests are completed */
export const DAILY_QUEST_COMPLETION_BONUS = 50;

/** Check if all 3 daily quests are complete based on progress map */
export function checkAllDailyQuestsComplete(
  quests: DailyQuest[],
  progress: Record<string, number>
): boolean {
  if (quests.length !== 3) return false;
  return quests.every(q => (progress[q.id] ?? 0) >= q.target);
}
