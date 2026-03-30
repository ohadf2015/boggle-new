import type { ChapterQuest, ChapterQuestType } from '@/types/adventure';

export function getChapterNumber(levelNumber: number): number {
  if (levelNumber <= 2) return 1;  // Chapter 1: levels 1-2
  if (levelNumber <= 4) return 2;  // Chapter 2: levels 3-4
  return 3;                         // Chapter 3: levels 5-7
}

// --- Quest title/description key mapping ---
const QUEST_KEYS: Record<ChapterQuestType, { titleKey: string; descriptionKey: string }> = {
  wordCountChapter: { titleKey: 'adventure.quests.chapter.wordCount.title', descriptionKey: 'adventure.quests.chapter.wordCount.desc' },
  defeatBossNoHint: { titleKey: 'adventure.quests.chapter.bossNoHint.title', descriptionKey: 'adventure.quests.chapter.bossNoHint.desc' },
  fullComboLevels: { titleKey: 'adventure.quests.chapter.fullCombo.title', descriptionKey: 'adventure.quests.chapter.fullCombo.desc' },
  perfectLevels: { titleKey: 'adventure.quests.chapter.perfectLevels.title', descriptionKey: 'adventure.quests.chapter.perfectLevels.desc' },
  longWordCount: { titleKey: 'adventure.quests.chapter.longWords.title', descriptionKey: 'adventure.quests.chapter.longWords.desc' },
  worldMechanicUse: { titleKey: 'adventure.quests.chapter.worldMechanic.title', descriptionKey: 'adventure.quests.chapter.worldMechanic.desc' },
  flashChallengeMaster: { titleKey: 'adventure.quests.chapter.flashChallenge.title', descriptionKey: 'adventure.quests.chapter.flashChallenge.desc' },
  bossHighHealth: { titleKey: 'adventure.quests.chapter.bossHighHealth.title', descriptionKey: 'adventure.quests.chapter.bossHighHealth.desc' },
  streakMaster: { titleKey: 'adventure.quests.chapter.streak.title', descriptionKey: 'adventure.quests.chapter.streak.desc' },
  scoreChallenge: { titleKey: 'adventure.quests.chapter.scoreChallenge.title', descriptionKey: 'adventure.quests.chapter.scoreChallenge.desc' },
};

interface QuestDef {
  chapter: number;
  type: ChapterQuestType;
  target: number;
  coins: number;
  xp: number;
  badge?: string;
  idSuffix: string;
}

function buildQuests(worldId: number, defs: QuestDef[]): ChapterQuest[] {
  return defs.map(d => ({
    id: `w${worldId}c${d.chapter}-${d.idSuffix}`,
    chapterNumber: d.chapter,
    worldId,
    type: d.type,
    ...QUEST_KEYS[d.type],
    target: d.target,
    reward: { coins: d.coins, xp: d.xp, ...(d.badge ? { badge: d.badge } : {}) },
  }));
}

// 3 chapters x 3 quests = 9 per world, 90 total
// Rewards scale: W1 ~60-110 coins, W10 ~180-280 coins. XP ~ 50% of coins. (Nerfed 30% in economy balance pass)
const WORLD_QUEST_DEFS: Record<number, QuestDef[]> = {
  // World 1 — Alphabet Meadows (tutorial): wordCount, longWords, bossNoHint (Ch3 only — boss is always level 7)
  1: [
    { chapter: 1, type: 'wordCountChapter', target: 20, coins: 70, xp: 35, idSuffix: 'words' },
    { chapter: 1, type: 'longWordCount', target: 5, coins: 60, xp: 30, idSuffix: 'long' },
    { chapter: 1, type: 'perfectLevels', target: 1, coins: 80, xp: 40, idSuffix: 'perfect' },
    { chapter: 2, type: 'wordCountChapter', target: 30, coins: 80, xp: 40, idSuffix: 'words' },
    { chapter: 2, type: 'perfectLevels', target: 2, coins: 130, xp: 65, idSuffix: 'perfect' },
    { chapter: 2, type: 'longWordCount', target: 8, coins: 70, xp: 35, idSuffix: 'long' },
    { chapter: 3, type: 'wordCountChapter', target: 40, coins: 100, xp: 50, idSuffix: 'words' },
    { chapter: 3, type: 'defeatBossNoHint', target: 1, coins: 110, xp: 55, badge: 'badge-boss-slayer', idSuffix: 'boss' },
    { chapter: 3, type: 'longWordCount', target: 12, coins: 80, xp: 40, idSuffix: 'long' },
  ],
  // World 2 — Synonym Springs: wordCount, worldMechanicUse (synonyms), perfectLevels
  2: [
    { chapter: 1, type: 'wordCountChapter', target: 25, coins: 80, xp: 40, idSuffix: 'words' },
    { chapter: 1, type: 'worldMechanicUse', target: 5, coins: 90, xp: 45, idSuffix: 'mechanic' },
    { chapter: 1, type: 'perfectLevels', target: 1, coins: 70, xp: 35, idSuffix: 'perfect' },
    { chapter: 2, type: 'wordCountChapter', target: 35, coins: 100, xp: 50, idSuffix: 'words' },
    { chapter: 2, type: 'worldMechanicUse', target: 10, coins: 120, xp: 60, idSuffix: 'mechanic' },
    { chapter: 2, type: 'perfectLevels', target: 2, coins: 110, xp: 55, idSuffix: 'perfect' },
    { chapter: 3, type: 'wordCountChapter', target: 45, coins: 110, xp: 55, idSuffix: 'words' },
    { chapter: 3, type: 'worldMechanicUse', target: 15, coins: 140, xp: 70, badge: 'badge-synonym-sage', idSuffix: 'mechanic' },
    { chapter: 3, type: 'perfectLevels', target: 3, coins: 130, xp: 65, idSuffix: 'perfect' },
  ],
  // World 3 — Root Caverns: wordCount, worldMechanicUse (roots), bossNoHint (Ch3 only)
  3: [
    { chapter: 1, type: 'wordCountChapter', target: 25, coins: 80, xp: 40, idSuffix: 'words' },
    { chapter: 1, type: 'worldMechanicUse', target: 5, coins: 100, xp: 50, idSuffix: 'mechanic' },
    { chapter: 1, type: 'longWordCount', target: 6, coins: 90, xp: 45, idSuffix: 'long' },
    { chapter: 2, type: 'wordCountChapter', target: 40, coins: 110, xp: 55, idSuffix: 'words' },
    { chapter: 2, type: 'worldMechanicUse', target: 10, coins: 130, xp: 65, idSuffix: 'mechanic' },
    { chapter: 2, type: 'streakMaster', target: 4, coins: 120, xp: 60, idSuffix: 'streak' },
    { chapter: 3, type: 'wordCountChapter', target: 50, coins: 120, xp: 60, idSuffix: 'words' },
    { chapter: 3, type: 'defeatBossNoHint', target: 1, coins: 140, xp: 70, badge: 'badge-root-scholar', idSuffix: 'boss' },
    { chapter: 3, type: 'worldMechanicUse', target: 15, coins: 150, xp: 75, badge: 'badge-cavern-conqueror', idSuffix: 'mechanic' },
  ],
  // World 4 — Idiom Archipelago: wordCount, longWords, streakMaster
  4: [
    { chapter: 1, type: 'wordCountChapter', target: 30, coins: 90, xp: 45, idSuffix: 'words' },
    { chapter: 1, type: 'longWordCount', target: 8, coins: 110, xp: 55, idSuffix: 'long' },
    { chapter: 1, type: 'streakMaster', target: 5, coins: 100, xp: 50, idSuffix: 'streak' },
    { chapter: 2, type: 'wordCountChapter', target: 45, coins: 120, xp: 60, idSuffix: 'words' },
    { chapter: 2, type: 'longWordCount', target: 12, coins: 130, xp: 65, idSuffix: 'long' },
    { chapter: 2, type: 'streakMaster', target: 8, coins: 130, xp: 65, idSuffix: 'streak' },
    { chapter: 3, type: 'wordCountChapter', target: 55, coins: 140, xp: 70, idSuffix: 'words' },
    { chapter: 3, type: 'longWordCount', target: 15, coins: 150, xp: 75, idSuffix: 'long' },
    { chapter: 3, type: 'streakMaster', target: 10, coins: 160, xp: 80, badge: 'badge-idiom-islander', idSuffix: 'streak' },
  ],
  // World 5 — Compound Canyon: scoreChallenge, longWords, bossHighHealth (Ch3 only — boss at level 7)
  5: [
    { chapter: 1, type: 'scoreChallenge', target: 500, coins: 110, xp: 55, idSuffix: 'score' },
    { chapter: 1, type: 'longWordCount', target: 10, coins: 110, xp: 55, idSuffix: 'long' },
    { chapter: 1, type: 'streakMaster', target: 4, coins: 130, xp: 65, idSuffix: 'streak' },
    { chapter: 2, type: 'scoreChallenge', target: 800, coins: 140, xp: 70, idSuffix: 'score' },
    { chapter: 2, type: 'longWordCount', target: 15, coins: 150, xp: 75, idSuffix: 'long' },
    { chapter: 2, type: 'perfectLevels', target: 2, coins: 160, xp: 80, idSuffix: 'perfect' },
    { chapter: 3, type: 'scoreChallenge', target: 1200, coins: 170, xp: 85, idSuffix: 'score' },
    { chapter: 3, type: 'bossHighHealth', target: 1, coins: 180, xp: 90, idSuffix: 'bossHP' },
    { chapter: 3, type: 'longWordCount', target: 20, coins: 190, xp: 95, badge: 'badge-canyon-crusher', idSuffix: 'long' },
  ],
  // World 6 — Anagram Labyrinth: wordCount, flashChallengeMaster (capped to levels×2), perfectLevels
  6: [
    { chapter: 1, type: 'wordCountChapter', target: 35, coins: 110, xp: 55, idSuffix: 'words' },
    { chapter: 1, type: 'flashChallengeMaster', target: 2, coins: 130, xp: 65, idSuffix: 'flash' },
    { chapter: 1, type: 'perfectLevels', target: 2, coins: 120, xp: 60, idSuffix: 'perfect' },
    { chapter: 2, type: 'wordCountChapter', target: 50, coins: 140, xp: 70, idSuffix: 'words' },
    { chapter: 2, type: 'flashChallengeMaster', target: 2, coins: 160, xp: 80, idSuffix: 'flash' },
    { chapter: 2, type: 'perfectLevels', target: 2, coins: 150, xp: 75, idSuffix: 'perfect' },
    { chapter: 3, type: 'wordCountChapter', target: 60, coins: 170, xp: 85, idSuffix: 'words' },
    { chapter: 3, type: 'flashChallengeMaster', target: 2, coins: 190, xp: 95, idSuffix: 'flash' },
    { chapter: 3, type: 'perfectLevels', target: 3, coins: 180, xp: 90, badge: 'badge-labyrinth-legend', idSuffix: 'perfect' },
  ],
  // World 7 — Mirror Palace: worldMechanicUse (palindromes), bossNoHint (Ch3 only), scoreChallenge
  7: [
    { chapter: 1, type: 'worldMechanicUse', target: 3, coins: 130, xp: 65, idSuffix: 'mechanic' },
    { chapter: 1, type: 'scoreChallenge', target: 800, coins: 130, xp: 65, idSuffix: 'score' },
    { chapter: 1, type: 'longWordCount', target: 10, coins: 140, xp: 70, idSuffix: 'long' },
    { chapter: 2, type: 'worldMechanicUse', target: 6, coins: 160, xp: 80, idSuffix: 'mechanic' },
    { chapter: 2, type: 'scoreChallenge', target: 1200, coins: 170, xp: 85, idSuffix: 'score' },
    { chapter: 2, type: 'perfectLevels', target: 2, coins: 180, xp: 90, idSuffix: 'perfect' },
    { chapter: 3, type: 'worldMechanicUse', target: 10, coins: 200, xp: 100, badge: 'badge-mirror-master', idSuffix: 'mechanic' },
    { chapter: 3, type: 'defeatBossNoHint', target: 1, coins: 210, xp: 105, idSuffix: 'boss' },
    { chapter: 3, type: 'scoreChallenge', target: 1500, coins: 200, xp: 100, idSuffix: 'score' },
  ],
  // World 8 — Neologism Nebula: longWords, flashChallengeMaster, streakMaster
  8: [
    { chapter: 1, type: 'longWordCount', target: 12, coins: 140, xp: 70, idSuffix: 'long' },
    { chapter: 1, type: 'flashChallengeMaster', target: 2, coins: 150, xp: 75, idSuffix: 'flash' },
    { chapter: 1, type: 'streakMaster', target: 8, coins: 150, xp: 75, idSuffix: 'streak' },
    { chapter: 2, type: 'longWordCount', target: 18, coins: 180, xp: 90, idSuffix: 'long' },
    { chapter: 2, type: 'flashChallengeMaster', target: 2, coins: 200, xp: 100, idSuffix: 'flash' },
    { chapter: 2, type: 'streakMaster', target: 12, coins: 190, xp: 95, idSuffix: 'streak' },
    { chapter: 3, type: 'longWordCount', target: 25, coins: 220, xp: 110, idSuffix: 'long' },
    { chapter: 3, type: 'flashChallengeMaster', target: 2, coins: 230, xp: 115, badge: 'badge-nebula-navigator', idSuffix: 'flash' },
    { chapter: 3, type: 'streakMaster', target: 15, coins: 220, xp: 110, idSuffix: 'streak' },
  ],
  // World 9 — Polyglot Peaks: wordCount, scoreChallenge, bossHighHealth (Ch3 only)
  9: [
    { chapter: 1, type: 'wordCountChapter', target: 40, coins: 150, xp: 75, idSuffix: 'words' },
    { chapter: 1, type: 'scoreChallenge', target: 1000, coins: 180, xp: 90, idSuffix: 'score' },
    { chapter: 1, type: 'streakMaster', target: 6, coins: 170, xp: 85, idSuffix: 'streak' },
    { chapter: 2, type: 'wordCountChapter', target: 55, coins: 200, xp: 100, idSuffix: 'words' },
    { chapter: 2, type: 'scoreChallenge', target: 1500, coins: 220, xp: 110, idSuffix: 'score' },
    { chapter: 2, type: 'longWordCount', target: 15, coins: 210, xp: 105, idSuffix: 'long' },
    { chapter: 3, type: 'wordCountChapter', target: 70, coins: 230, xp: 115, idSuffix: 'words' },
    { chapter: 3, type: 'scoreChallenge', target: 2000, coins: 250, xp: 125, idSuffix: 'score' },
    { chapter: 3, type: 'bossHighHealth', target: 1, coins: 250, xp: 125, badge: 'badge-polyglot-pinnacle', idSuffix: 'bossHP' },
  ],
  // World 10 — Lexicon Throne: perfectLevels (capped to chapter size), bossNoHint (Ch3 only), worldMechanicUse
  10: [
    { chapter: 1, type: 'perfectLevels', target: 2, coins: 180, xp: 90, idSuffix: 'perfect' },
    { chapter: 1, type: 'worldMechanicUse', target: 8, coins: 180, xp: 90, idSuffix: 'mechanic' },
    { chapter: 1, type: 'scoreChallenge', target: 1500, coins: 200, xp: 100, idSuffix: 'score' },
    { chapter: 2, type: 'perfectLevels', target: 2, coins: 220, xp: 110, idSuffix: 'perfect' },
    { chapter: 2, type: 'worldMechanicUse', target: 12, coins: 230, xp: 115, idSuffix: 'mechanic' },
    { chapter: 2, type: 'streakMaster', target: 12, coins: 250, xp: 125, idSuffix: 'streak' },
    { chapter: 3, type: 'perfectLevels', target: 3, coins: 270, xp: 135, idSuffix: 'perfect' },
    { chapter: 3, type: 'defeatBossNoHint', target: 1, coins: 280, xp: 140, badge: 'badge-lexicon-lord', idSuffix: 'boss' },
    { chapter: 3, type: 'worldMechanicUse', target: 15, coins: 260, xp: 130, badge: 'badge-throne-ascended', idSuffix: 'mechanic' },
  ],
};

// Build all quests from definitions
export const CHAPTER_QUESTS: ChapterQuest[] = Object.entries(WORLD_QUEST_DEFS)
  .flatMap(([worldId, defs]) => buildQuests(Number(worldId), defs));

export function getQuestsForChapter(worldId: number, chapterNumber: number): ChapterQuest[] {
  return CHAPTER_QUESTS.filter(q => q.worldId === worldId && q.chapterNumber === chapterNumber);
}
