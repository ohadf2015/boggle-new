'use client';

import { useCallback, useMemo } from 'react';
import type { ChapterQuestProgress, ChapterQuest } from '@/types/adventure';
import { getQuestsForChapter } from '@/lib/adventure/questConfig';
import { useProgression } from '@/contexts/ProgressionContext';

interface UseChapterQuestsProps {
  worldId: number;
  chapterNumber: number;
}

interface UseChapterQuestsReturn {
  quests: ChapterQuest[];
  progress: ChapterQuestProgress[];
  recordWordsFound: (count: number) => void;
  recordLevelPerfect: () => void;
  recordBossDefeatedNoHint: () => void;
  recordLongWord: () => void;
  recordWorldMechanicUse: () => void;
  recordStreakMaster: () => void;
  recordBossHighHealth: () => void;
  recordFlashChallengeMaster: () => void;
  recordScoreChallenge: (score: number) => void;
  recordFullComboLevel: () => void;
}

export function useChapterQuests({ worldId, chapterNumber }: UseChapterQuestsProps): UseChapterQuestsReturn {
  const quests = getQuestsForChapter(worldId, chapterNumber);
  const { progression, updateChapterQuestProgress } = useProgression();

  // Derive progress from persisted progression data
  const progress = useMemo<ChapterQuestProgress[]>(() => {
    const saved = progression?.chapterQuestProgress ?? {};
    return quests.map(q => {
      const current = Math.min(saved[q.id] ?? 0, q.target);
      return {
        questId: q.id,
        current,
        isComplete: current >= q.target,
        rewardClaimed: false,
      };
    });
  }, [quests, progression?.chapterQuestProgress]);

  // Increment matching quests by type — delegates persistence to ProgressionContext
  const increment = useCallback((type: string, amount = 1) => {
    const matchingIds = quests
      .filter(q => q.type === type)
      .map(q => q.id);
    if (matchingIds.length === 0) return;
    updateChapterQuestProgress(type, amount, matchingIds);
  }, [quests, updateChapterQuestProgress]);

  // Stable callbacks — prevent re-renders in consumers that depend on these
  const recordWordsFound = useCallback((count: number) => increment('wordCountChapter', count), [increment]);
  const recordLevelPerfect = useCallback(() => increment('perfectLevels'), [increment]);
  const recordBossDefeatedNoHint = useCallback(() => increment('defeatBossNoHint'), [increment]);
  const recordLongWord = useCallback(() => increment('longWordCount'), [increment]);
  const recordWorldMechanicUse = useCallback(() => increment('worldMechanicUse'), [increment]);
  const recordStreakMaster = useCallback(() => increment('streakMaster'), [increment]);
  const recordBossHighHealth = useCallback(() => increment('bossHighHealth'), [increment]);
  const recordFlashChallengeMaster = useCallback(() => increment('flashChallengeMaster'), [increment]);
  const recordScoreChallenge = useCallback((score: number) => increment('scoreChallenge', score), [increment]);
  const recordFullComboLevel = useCallback(() => increment('fullComboLevels'), [increment]);

  return {
    quests,
    progress,
    recordWordsFound,
    recordLevelPerfect,
    recordBossDefeatedNoHint,
    recordLongWord,
    recordWorldMechanicUse,
    recordStreakMaster,
    recordBossHighHealth,
    recordFlashChallengeMaster,
    recordScoreChallenge,
    recordFullComboLevel,
  };
}
