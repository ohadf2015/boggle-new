/**
 * useWeeklyQuest Hook
 *
 * Fetches active weekly quest via Supabase REST.
 * Returns quest state, available quests, and selection function.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { supabase } from '@/lib/supabase';
import {
  getAvailableQuests, getWeekStart, getWeekNumber, pickAvatarReward,
  getDifficultyFromType, getDisplayTargetForType,
  type QuestTemplate, type ActiveQuest,
} from '@/shared/weeklyQuestTemplates';

interface UseWeeklyQuestReturn {
  activeQuest: ActiveQuest | null;
  availableQuests: QuestTemplate[];
  progress: number;
  isComplete: boolean;
  loading: boolean;
  selectingQuestId: string | null;
  selectQuest: (questId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

function parseRow(row: Record<string, unknown>): ActiveQuest {
  const reqs = typeof row.requirements === 'string'
    ? JSON.parse(row.requirements as string)
    : row.requirements;
  const prog = typeof row.current_progress === 'string'
    ? JSON.parse(row.current_progress as string)
    : row.current_progress;

  const questType = row.quest_type as string;
  const weekStart = row.week_start as string;
  const difficulty = (row.difficulty as ActiveQuest['difficulty']) ?? getDifficultyFromType(questType);
  const weekNum = getWeekNumber(weekStart);

  return {
    id: row.id as string,
    questType,
    title: row.title as string,
    description: row.description as string,
    target: reqs?.target ?? 0,
    displayTarget: getDisplayTargetForType(questType),
    current: prog?.current ?? 0,
    xpReward: row.xp_reward as number,
    completed: row.completed as boolean,
    difficulty,
    weekStart,
    avatarPartReward: pickAvatarReward(difficulty, weekNum),
  };
}

export function useWeeklyQuest(): UseWeeklyQuestReturn {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { playQuestCompleteSound } = useSoundEffects();
  const [activeQuest, setActiveQuest] = useState<ActiveQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingQuestId, setSelectingQuestId] = useState<string | null>(null);
  const available = getAvailableQuests();
  const prevQuestStateRef = useRef<{ id: string; completed: boolean } | null>(null);

  const fetchQuest = useCallback(async () => {
    if (!user?.id || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const weekStart = getWeekStart();
      const { data, error } = await supabase
        .from('weekly_quests')
        .select('id, quest_type, title, description, requirements, current_progress, xp_reward, completed, week_start')
        .eq('player_id', user.id)
        .eq('week_start', weekStart)
        .single();

      if (error || !data) {
        setActiveQuest(null);
      } else {
        setActiveQuest(parseRow(data as Record<string, unknown>));
      }
    } catch {
      setActiveQuest(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchQuest();

    // Re-fetch when user returns to the tab (e.g., after finishing a game) so
    // server-side progress updates are reflected immediately.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchQuest();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchQuest]);

  // Celebrate weekly quest completion on false → true transition.
  useEffect(() => {
    if (loading || !activeQuest) return;
    const prev = prevQuestStateRef.current;
    const isTransition = prev && prev.id === activeQuest.id && !prev.completed && activeQuest.completed;
    if (isTransition) {
      import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
        showQuestCompletionToast({
          questName: activeQuest.title ? t(activeQuest.title) : t('weeklyQuest.title'),
          xpReward: activeQuest.xpReward,
          dedupKey: `weekly:${activeQuest.questType}`,
          t,
          onComplete: playQuestCompleteSound,
        });
      });
    }
    prevQuestStateRef.current = { id: activeQuest.id, completed: activeQuest.completed };
  }, [activeQuest, loading, t, playQuestCompleteSound]);

  const handleSelectQuest = useCallback(async (questId: string) => {
    if (!user?.id) return;

    setSelectingQuestId(questId);
    try {
      const res = await fetch('/api/weekly-quest/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.quest) setActiveQuest(json.quest as ActiveQuest);
      }
    } catch {
      // silently ignore — user will see no quest selected
    }
    setSelectingQuestId(null);
  }, [user?.id]);

  return {
    activeQuest,
    availableQuests: available,
    progress: activeQuest?.current ?? 0,
    isComplete: activeQuest?.completed ?? false,
    loading,
    selectingQuestId,
    selectQuest: handleSelectQuest,
    refetch: fetchQuest,
  };
}
