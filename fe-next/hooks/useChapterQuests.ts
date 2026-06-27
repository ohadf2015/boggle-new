'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  /** Record the streak length reached — quest stores the max ("reach an N-word streak"). */
  recordStreakMaster: (streakLength: number) => void;
  recordBossHighHealth: () => void;
  recordFlashChallengeMaster: () => void;
  recordScoreChallenge: (score: number) => void;
  recordFullComboLevel: () => void;
}

type QuestUpdateMode = 'add' | 'max';

export function useChapterQuests({ worldId, chapterNumber }: UseChapterQuestsProps): UseChapterQuestsReturn {
  const quests = getQuestsForChapter(worldId, chapterNumber);
  const { progression, updateChapterQuestProgress } = useProgression();

  // Derive progress from persisted progression data
  // Claimed state is stored as `claimed:<questId>` in the same map
  const progress = useMemo<ChapterQuestProgress[]>(() => {
    const saved = progression?.chapterQuestProgress ?? {};
    return quests.map(q => {
      const current = Math.min(saved[q.id] ?? 0, q.target);
      return {
        questId: q.id,
        current,
        isComplete: current >= q.target,
        rewardClaimed: !!(saved[`claimed:${q.id}`]),
      };
    });
  }, [quests, progression?.chapterQuestProgress]);

  // Auto-claim rewards for newly completed quests (break infinite loop with ref)
  const claimingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const toClaim: string[] = [];
    for (const p of progress) {
      if (p.isComplete && !p.rewardClaimed && !claimingRef.current.has(p.questId)) {
        toClaim.push(p.questId);
      }
    }
    if (toClaim.length > 0) {
      for (const id of toClaim) claimingRef.current.add(id);
      updateChapterQuestProgress('__claim__', 1, toClaim.map(id => `claimed:${id}`));
    }
  }, [progress, updateChapterQuestProgress]);

  // Increment matching quests by type — delegates persistence to ProgressionContext.
  // mode 'max' is used for quests that track a peak value (streak length reached)
  // rather than a running total.
  const increment = useCallback((type: string, amount = 1, mode: QuestUpdateMode = 'add') => {
    const matchingIds = quests
      .filter(q => q.type === type)
      .map(q => q.id);
    if (matchingIds.length === 0) return;
    updateChapterQuestProgress(type, amount, matchingIds, mode);
  }, [quests, updateChapterQuestProgress]);

  // Stable callbacks — prevent re-renders in consumers that depend on these
  const recordWordsFound = useCallback((count: number) => increment('wordCountChapter', count), [increment]);
  const recordLevelPerfect = useCallback(() => increment('perfectLevels'), [increment]);
  const recordBossDefeatedNoHint = useCallback(() => increment('defeatBossNoHint'), [increment]);
  const recordLongWord = useCallback(() => increment('longWordCount'), [increment]);
  const recordWorldMechanicUse = useCallback(() => increment('worldMechanicUse'), [increment]);
  // "Reach a {target}-word streak" — record the streak length reached and keep
  // the highest (max), so a single long combo completes the quest.
  const recordStreakMaster = useCallback((streakLength: number) => increment('streakMaster', streakLength, 'max'), [increment]);
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
