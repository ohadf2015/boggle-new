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

  return {
    quests,
    progress,
    recordWordsFound: (count: number) => increment('wordCountChapter', count),
    recordLevelPerfect: () => increment('perfectLevels'),
    recordBossDefeatedNoHint: () => increment('defeatBossNoHint'),
    recordLongWord: () => increment('longWordCount'),
    recordWorldMechanicUse: () => increment('worldMechanicUse'),
    recordStreakMaster: () => increment('streakMaster'),
    recordBossHighHealth: () => increment('bossHighHealth'),
    recordFlashChallengeMaster: () => increment('flashChallengeMaster'),
    recordScoreChallenge: (score: number) => increment('scoreChallenge', score),
    recordFullComboLevel: () => increment('fullComboLevels'),
  };
}
