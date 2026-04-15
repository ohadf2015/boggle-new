/**
 * Flash challenge + chapter quest types.
 */

export type FlashChallengeType =
  // Word pattern
  | 'longWord'
  | 'comboStreak'
  | 'specificLetter'
  | 'fastWord'
  | 'palindrome'
  | 'doubleLetters'
  | 'startsWith'
  | 'endsWith'
  // Board mechanic
  | 'useGoldTile'
  | 'exactLength';

export interface FlashChallenge {
  id: string;
  type: FlashChallengeType;
  descriptionKey: string;
  param: string | number;
  durationSeconds: number;
  rewardCoins: number;
  rewardScore: number;
}

export type ChapterQuestType =
  | 'wordCountChapter'
  | 'defeatBossNoHint'
  | 'fullComboLevels'
  | 'perfectLevels'
  | 'longWordCount'
  | 'worldMechanicUse'
  | 'flashChallengeMaster'
  | 'bossHighHealth'
  | 'streakMaster'
  | 'scoreChallenge';

export interface QuestReward {
  coins: number;
  xp: number;
  badge?: string;
}

export interface ChapterQuest {
  id: string;
  chapterNumber: number;
  worldId: number;
  type: ChapterQuestType;
  titleKey: string;
  descriptionKey: string;
  target: number;
  reward: QuestReward;
}

export interface ChapterQuestProgress {
  questId: string;
  current: number;
  isComplete: boolean;
  rewardClaimed: boolean;
}
