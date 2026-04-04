/**
 * useDailyQuests Hook
 *
 * Manages daily quest selection, progress tracking, and reward payout.
 * Quests are seeded by date — all players get the same 3 quests per day.
 */

'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getDailyQuests, type DailyQuest } from '@/lib/adventure/dailyQuests';
import { useAuth } from '@/contexts/AuthContext';
import logger from '@/utils/logger';

const LS_KEY = 'lexiclash_daily_quest_progress';

interface StoredQuestProgress {
  date: string;
  progress: Record<string, number>;
}

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
  /** Player's current world — filters out quests requiring later worlds */
  currentWorld?: number;
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

function loadLocalProgress(todayStr: string): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const stored: StoredQuestProgress = JSON.parse(raw);
    if (stored.date === todayStr && stored.progress) return stored.progress;
    // Stale date — clear it
    localStorage.removeItem(LS_KEY);
  } catch { /* corrupted data */ }
  return null;
}

function saveLocalProgress(progress: Record<string, number>, date: string): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ date, progress }));
  } catch { /* storage full / unavailable */ }
}

export function useDailyQuests({
  initialProgress,
  lastQuestDate,
  onProgressChange,
  currentWorld,
}: UseDailyQuestsProps = {}): UseDailyQuestsReturn {
  const todayStr = useMemo(() => getTodayStr(), []);
  const dailyQuests = useMemo(() => getDailyQuests(todayStr, currentWorld), [todayStr, currentWorld]);
  const { isAuthenticated } = useAuth();
  const hasSyncedRef = useRef(false);

  const syncProgressMutation = useMutation({
    mutationFn: async (progress: Record<string, number>) => {
      await fetch('/api/adventure/quest-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterQuestProgress: progress }),
      });
    },
    onError: (err) => {
      logger.error('useDailyQuests: failed to sync progress', err);
    },
  });

  // Reset progress if date changed; for guests, hydrate from localStorage
  const [progress, setProgress] = useState<Record<string, number>>(() => {
    if (lastQuestDate === todayStr && initialProgress) return initialProgress;
    // Fallback: try localStorage (primarily helps guests)
    if (typeof window !== 'undefined') {
      return loadLocalProgress(todayStr) ?? {};
    }
    return {};
  });

  // When a guest signs in, sync localStorage progress to the server
  useEffect(() => {
    if (!isAuthenticated || hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    const local = loadLocalProgress(todayStr);
    if (!local || Object.keys(local).length === 0) return;
    // Merge local into current state and push to server
    setProgress(prev => {
      const merged: Record<string, number> = { ...prev };
      for (const [key, value] of Object.entries(local)) {
        merged[key] = Math.max(merged[key] ?? 0, value);
      }
      // Fire server persist
      onProgressChange?.(merged, todayStr);
      // Post directly as fallback if no onProgressChange provided
      if (!onProgressChange) {
        syncProgressMutation.mutate(merged);
      }
      // Clear localStorage now that server has the data
      localStorage.removeItem(LS_KEY);
      return merged;
    });
  }, [isAuthenticated, todayStr, onProgressChange, syncProgressMutation]);

  const recordProgress = useCallback((type: DailyQuest['type'], amount = 1) => {
    setProgress(prev => {
      const updated = { ...prev };
      for (const quest of dailyQuests) {
        if (quest.type === type) {
          updated[quest.id] = (updated[quest.id] ?? 0) + amount;
        }
      }
      onProgressChange?.(updated, todayStr);
      // Always persist to localStorage as fallback (cheap insurance)
      saveLocalProgress(updated, todayStr);
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
