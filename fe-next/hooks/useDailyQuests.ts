/**
 * useDailyQuests Hook
 *
 * Manages daily quest selection, progress tracking, and reward payout.
 * Quests are seeded by date — all players get the same 3 quests per day.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { getDailyQuests, type DailyQuest } from '@/lib/adventure/dailyQuests';

interface DailyQuestProgress {
  quest: DailyQuest;
  current: number;
  isComplete: boolean;
}

interface UseDailyQuestsProps {
  /** Initial progress from persistence (resets daily) */
  initialProgress?: Record<string, number>;
  /** Last date quests were active — for reset detection */
  lastQuestDate?: string;
  /** Callback to persist progress */
  onProgressChange?: (progress: Record<string, number>, date: string) => void;
}

export interface UseDailyQuestsReturn {
  /** Today's 3 quests with progress */
  quests: DailyQuestProgress[];
  /** Increment progress for a quest type */
  recordProgress: (type: DailyQuest['type'], amount?: number) => void;
  /** Get completed quests (for reward payout) */
  completedQuests: DailyQuestProgress[];
  /** Today's date string (YYYY-MM-DD) */
  todayStr: string;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useDailyQuests({
  initialProgress,
  lastQuestDate,
  onProgressChange,
}: UseDailyQuestsProps = {}): UseDailyQuestsReturn {
  const todayStr = useMemo(() => getTodayStr(), []);
  const dailyQuests = useMemo(() => getDailyQuests(todayStr), [todayStr]);

  // Reset progress if date changed
  const [progress, setProgress] = useState<Record<string, number>>(() => {
    if (lastQuestDate === todayStr && initialProgress) return initialProgress;
    return {};
  });

  const recordProgress = useCallback((type: DailyQuest['type'], amount = 1) => {
    setProgress(prev => {
      const updated = { ...prev };
      for (const quest of dailyQuests) {
        if (quest.type === type) {
          updated[quest.id] = (updated[quest.id] ?? 0) + amount;
        }
      }
      onProgressChange?.(updated, todayStr);
      return updated;
    });
  }, [dailyQuests, todayStr, onProgressChange]);

  const quests: DailyQuestProgress[] = useMemo(() =>
    dailyQuests.map(quest => ({
      quest,
      current: progress[quest.id] ?? 0,
      isComplete: (progress[quest.id] ?? 0) >= quest.target,
    })),
    [dailyQuests, progress]
  );

  const completedQuests = useMemo(() => quests.filter(q => q.isComplete), [quests]);

  return { quests, recordProgress, completedQuests, todayStr };
}
