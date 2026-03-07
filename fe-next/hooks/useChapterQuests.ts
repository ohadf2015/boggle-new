'use client';

import { useState, useCallback } from 'react';
import type { ChapterQuestProgress, ChapterQuest } from '@/types/adventure';
import { getQuestsForChapter } from '@/lib/adventure/questConfig';

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
}

export function useChapterQuests({ worldId, chapterNumber }: UseChapterQuestsProps): UseChapterQuestsReturn {
  const quests = getQuestsForChapter(worldId, chapterNumber);
  const [progress, setProgress] = useState<ChapterQuestProgress[]>(
    quests.map(q => ({ questId: q.id, current: 0, isComplete: false, rewardClaimed: false }))
  );

  const increment = useCallback((type: string, amount = 1) => {
    setProgress(prev =>
      prev.map(p => {
        const quest = quests.find(q => q.id === p.questId);
        if (!quest || quest.type !== type || p.isComplete) return p;
        const next = Math.min(p.current + amount, quest.target);
        return { ...p, current: next, isComplete: next >= quest.target };
      })
    );
  }, [quests]);

  return {
    quests,
    progress,
    recordWordsFound: (count: number) => increment('wordCountChapter', count),
    recordLevelPerfect: () => increment('perfectLevels'),
    recordBossDefeatedNoHint: () => increment('defeatBossNoHint'),
    recordLongWord: () => increment('longWordCount'),
  };
}
