import type { FlashChallenge } from '@/types/adventure';

export const FLASH_CHALLENGES: FlashChallenge[] = [
  { id: 'flash-long-word-6', type: 'longWord', descriptionKey: 'adventure.quests.flash.longWord', param: 6, durationSeconds: 30, rewardCoins: 50, rewardScore: 100 },
  { id: 'flash-combo-3', type: 'comboStreak', descriptionKey: 'adventure.quests.flash.comboStreak', param: 3, durationSeconds: 30, rewardCoins: 40, rewardScore: 80 },
  { id: 'flash-letter-q', type: 'specificLetter', descriptionKey: 'adventure.quests.flash.specificLetter', param: 'Q', durationSeconds: 30, rewardCoins: 60, rewardScore: 120 },
  { id: 'flash-fast-word', type: 'fastWord', descriptionKey: 'adventure.quests.flash.fastWord', param: 10, durationSeconds: 10, rewardCoins: 30, rewardScore: 60 },
  { id: 'flash-long-word-7', type: 'longWord', descriptionKey: 'adventure.quests.flash.longWord', param: 7, durationSeconds: 30, rewardCoins: 70, rewardScore: 150 },
];

export function getFlashChallengeForWorld(worldId: number): FlashChallenge[] {
  if (worldId <= 3) return [FLASH_CHALLENGES[0], FLASH_CHALLENGES[3]];
  if (worldId <= 6) return [FLASH_CHALLENGES[1], FLASH_CHALLENGES[3]];
  return [FLASH_CHALLENGES[4], FLASH_CHALLENGES[2]];
}
