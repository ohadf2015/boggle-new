import type { ChapterQuest } from '@/types/adventure';

export function getChapterNumber(levelNumber: number): number {
  if (levelNumber <= 2) return 1;  // Chapter 1: levels 1-2
  if (levelNumber <= 4) return 2;  // Chapter 2: levels 3-4
  return 3;                         // Chapter 3: levels 5-7
}

export const CHAPTER_QUESTS: ChapterQuest[] = [
  // World 1 Chapter 1 (levels 1-5)
  { id: 'w1c1-words', chapterNumber: 1, worldId: 1, type: 'wordCountChapter', titleKey: 'adventure.quests.chapter.wordCount.title', descriptionKey: 'adventure.quests.chapter.wordCount.desc', target: 20, reward: { coins: 100, xp: 50 } },
  { id: 'w1c1-boss', chapterNumber: 1, worldId: 1, type: 'defeatBossNoHint', titleKey: 'adventure.quests.chapter.bossNoHint.title', descriptionKey: 'adventure.quests.chapter.bossNoHint.desc', target: 1, reward: { coins: 150, xp: 75, badge: 'badge-boss-slayer' } },
  { id: 'w1c1-long', chapterNumber: 1, worldId: 1, type: 'longWordCount', titleKey: 'adventure.quests.chapter.longWords.title', descriptionKey: 'adventure.quests.chapter.longWords.desc', target: 5, reward: { coins: 80, xp: 40 } },
  // World 1 Chapter 2 (levels 6-10)
  { id: 'w1c2-words', chapterNumber: 2, worldId: 1, type: 'wordCountChapter', titleKey: 'adventure.quests.chapter.wordCount.title', descriptionKey: 'adventure.quests.chapter.wordCount.desc', target: 30, reward: { coins: 120, xp: 60 } },
  { id: 'w1c2-perfect', chapterNumber: 2, worldId: 1, type: 'perfectLevels', titleKey: 'adventure.quests.chapter.perfectLevels.title', descriptionKey: 'adventure.quests.chapter.perfectLevels.desc', target: 2, reward: { coins: 180, xp: 90 } },
  { id: 'w1c2-long', chapterNumber: 2, worldId: 1, type: 'longWordCount', titleKey: 'adventure.quests.chapter.longWords.title', descriptionKey: 'adventure.quests.chapter.longWords.desc', target: 8, reward: { coins: 100, xp: 50 } },
];

export function getQuestsForChapter(worldId: number, chapterNumber: number): ChapterQuest[] {
  return CHAPTER_QUESTS.filter(q => q.worldId === worldId && q.chapterNumber === chapterNumber);
}
