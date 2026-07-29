import type { FlashChallenge } from '@/types/adventure';

/** All available flash challenges across all 10 types (rewards boosted 50% in engagement audit) */
export const FLASH_CHALLENGES: FlashChallenge[] = [
  // longWord
  { id: 'flash-long-5', type: 'longWord', descriptionKey: 'adventure.quests.flash.longWord', param: 5, durationSeconds: 30, rewardCoins: 45, rewardScore: 90 },
  { id: 'flash-long-6', type: 'longWord', descriptionKey: 'adventure.quests.flash.longWord', param: 6, durationSeconds: 30, rewardCoins: 75, rewardScore: 150 },
  { id: 'flash-long-7', type: 'longWord', descriptionKey: 'adventure.quests.flash.longWord', param: 7, durationSeconds: 30, rewardCoins: 105, rewardScore: 225 },

  // comboStreak
  { id: 'flash-combo-2', type: 'comboStreak', descriptionKey: 'adventure.quests.flash.comboStreak', param: 2, durationSeconds: 30, rewardCoins: 45, rewardScore: 90 },
  { id: 'flash-combo-3', type: 'comboStreak', descriptionKey: 'adventure.quests.flash.comboStreak', param: 3, durationSeconds: 30, rewardCoins: 60, rewardScore: 120 },
  { id: 'flash-combo-4', type: 'comboStreak', descriptionKey: 'adventure.quests.flash.comboStreak', param: 4, durationSeconds: 25, rewardCoins: 90, rewardScore: 180 },
  { id: 'flash-combo-5', type: 'comboStreak', descriptionKey: 'adventure.quests.flash.comboStreak', param: 5, durationSeconds: 25, rewardCoins: 120, rewardScore: 240 },

  // specificLetter
  { id: 'flash-letter-q', type: 'specificLetter', descriptionKey: 'adventure.quests.flash.specificLetter', param: 'Q', durationSeconds: 30, rewardCoins: 90, rewardScore: 180 },

  // fastWord
  { id: 'flash-fast-10', type: 'fastWord', descriptionKey: 'adventure.quests.flash.fastWord', param: 10, durationSeconds: 10, rewardCoins: 45, rewardScore: 90 },

  // startsWith
  { id: 'flash-starts-s', type: 'startsWith', descriptionKey: 'adventure.quests.flash.startsWith', param: 'S', durationSeconds: 30, rewardCoins: 50, rewardScore: 105 },
  { id: 'flash-starts-r', type: 'startsWith', descriptionKey: 'adventure.quests.flash.startsWith', param: 'R', durationSeconds: 30, rewardCoins: 50, rewardScore: 105 },

  // endsWith
  { id: 'flash-ends-ing', type: 'endsWith', descriptionKey: 'adventure.quests.flash.endsWith', param: 'ING', durationSeconds: 30, rewardCoins: 65, rewardScore: 135 },
  { id: 'flash-ends-ed', type: 'endsWith', descriptionKey: 'adventure.quests.flash.endsWith', param: 'ED', durationSeconds: 30, rewardCoins: 60, rewardScore: 120 },

  // doubleLetters
  { id: 'flash-double', type: 'doubleLetters', descriptionKey: 'adventure.quests.flash.doubleLetters', param: 1, durationSeconds: 30, rewardCoins: 65, rewardScore: 135 },

  // palindrome
  { id: 'flash-palindrome', type: 'palindrome', descriptionKey: 'adventure.quests.flash.palindrome', param: 3, durationSeconds: 45, rewardCoins: 150, rewardScore: 300 },

  // exactLength
  { id: 'flash-exact-5', type: 'exactLength', descriptionKey: 'adventure.quests.flash.exactLength', param: 5, durationSeconds: 30, rewardCoins: 60, rewardScore: 120 },
  { id: 'flash-exact-6', type: 'exactLength', descriptionKey: 'adventure.quests.flash.exactLength', param: 6, durationSeconds: 30, rewardCoins: 80, rewardScore: 165 },
  { id: 'flash-exact-7', type: 'exactLength', descriptionKey: 'adventure.quests.flash.exactLength', param: 7, durationSeconds: 30, rewardCoins: 105, rewardScore: 210 },

  // useGoldTile
  { id: 'flash-gold-tile', type: 'useGoldTile', descriptionKey: 'adventure.quests.flash.useGoldTile', param: 1, durationSeconds: 30, rewardCoins: 90, rewardScore: 180 },
];

function byId(id: string): FlashChallenge {
  const c = FLASH_CHALLENGES.find(ch => ch.id === id);
  if (!c) throw new Error(`Unknown flash challenge: ${id}`);
  return c;
}

/** World-tier challenge pools: 3-4 candidates each, randomly selected at runtime */
const WORLD_POOLS: Record<string, FlashChallenge[]> = {
  // Worlds 1-2: easy
  easy: [byId('flash-long-5'), byId('flash-combo-2'), byId('flash-starts-s'), byId('flash-fast-10')],
  // Worlds 3-4: medium
  medium: [byId('flash-long-6'), byId('flash-double'), byId('flash-ends-ing'), byId('flash-ends-ed')],
  // Worlds 5-6: hard
  hard: [byId('flash-palindrome'), byId('flash-exact-6'), byId('flash-gold-tile'), byId('flash-combo-3')],
  // Worlds 7-8: harder
  harder: [byId('flash-long-7'), byId('flash-combo-4'), byId('flash-palindrome'), byId('flash-letter-q')],
  // Worlds 9-10: expert
  expert: [byId('flash-exact-7'), byId('flash-combo-5'), byId('flash-palindrome'), byId('flash-starts-r')],
};

/** Challenge types that require English-specific letter params */
const ENGLISH_ONLY_TYPES = new Set(['startsWith', 'endsWith', 'specificLetter']);

/**
 * Returns world-appropriate flash challenges (3-4 candidates).
 * Caller picks one at random at runtime.
 * For non-English locales, filters out letter-based challenges that use English params.
 */
export function getFlashChallengeForWorld(worldId: number, locale: string = 'en'): FlashChallenge[] {
  let pool: FlashChallenge[];
  if (worldId <= 2) pool = WORLD_POOLS.easy;
  else if (worldId <= 4) pool = WORLD_POOLS.medium;
  else if (worldId <= 6) pool = WORLD_POOLS.hard;
  else if (worldId <= 8) pool = WORLD_POOLS.harder;
  else pool = WORLD_POOLS.expert;

  const filteredPool = locale === 'en' ? pool : pool.filter(c => !ENGLISH_ONLY_TYPES.has(c.type));

  return filteredPool.map(c => ({
    ...c,
    rewardCoins: Math.round(c.rewardCoins * (1 + (worldId - 1) * 0.15)),
    rewardScore: Math.round(c.rewardScore * (1 + (worldId - 1) * 0.15)),
  }));
}
