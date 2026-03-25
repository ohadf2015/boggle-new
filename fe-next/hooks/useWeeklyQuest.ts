/**
 * useWeeklyQuest Hook
 *
 * Fetches active weekly quest via Supabase REST.
 * Returns quest state, available quests, and selection function.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  getAvailableQuests, getWeekStart, getWeekNumber, pickAvatarReward,
  getDifficultyFromType,
  type QuestTemplate, type ActiveQuest,
} from '@/shared/weeklyQuestTemplates';

interface UseWeeklyQuestReturn {
  activeQuest: ActiveQuest | null;
  availableQuests: QuestTemplate[];
  progress: number;
  isComplete: boolean;
  loading: boolean;
  selectQuest: (questId: string) => Promise<void>;
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
  const [activeQuest, setActiveQuest] = useState<ActiveQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const available = getAvailableQuests();

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
  }, [fetchQuest]);

  const handleSelectQuest = useCallback(async (questId: string) => {
    if (!user?.id || !supabase) return;

    const template = available.find(q => q.id === questId);
    if (!template) return;

    const weekStart = getWeekStart();
    const { data, error } = await supabase
      .from('weekly_quests')
      .insert({
        player_id: user.id,
        week_start: weekStart,
        quest_type: template.type,
        title: template.description,
        description: template.description,
        requirements: JSON.stringify({ target: template.target, type: template.type }),
        current_progress: JSON.stringify({ current: 0 }),
        xp_reward: template.xpReward,
        completed: false,
      })
      .select('id, quest_type, title, description, requirements, current_progress, xp_reward, completed, week_start')
      .single();

    if (!error && data) {
      setActiveQuest(parseRow(data as Record<string, unknown>));
    }
  }, [user?.id, available]);

  return {
    activeQuest,
    availableQuests: available,
    progress: activeQuest?.current ?? 0,
    isComplete: activeQuest?.completed ?? false,
    loading,
    selectQuest: handleSelectQuest,
  };
}
