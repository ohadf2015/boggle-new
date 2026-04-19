/**
 * Weekly quest progress updates for POST /api/adventure/complete.
 * Split from route.ts. Runs inline (not in `after()`) so quest completion
 * can be surfaced to the client in the response payload.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  getWeekStart,
  getDifficultyFromType,
  getStatDelta,
  getWeekNumber,
  pickAvatarReward,
  type GameStats,
} from '@/shared/weeklyQuestTemplates';

export interface QuestUpdateResult {
  questType: string;
  xpReward: number;
  description: string;
  completed: boolean;
}

/**
 * Update weekly quest progress and grant avatar part on completion.
 * Returns the quest update summary when a quest transitions to completed,
 * or `null` when there is no active quest / no progress to report.
 */
export async function updateWeeklyQuestProgress(
  supabase: SupabaseClient,
  userId: string,
  stats: GameStats,
): Promise<QuestUpdateResult | null> {
  const weekStart = getWeekStart();

  const { data: quest, error: fetchErr } = await supabase
    .from('weekly_quests')
    .select('id, quest_type, current_progress, requirements, completed, week_start')
    .eq('player_id', userId)
    .eq('week_start', weekStart)
    .single();

  if (fetchErr || !quest || quest.completed) return null;

  const reqs = typeof quest.requirements === 'string'
    ? JSON.parse(quest.requirements)
    : quest.requirements;
  const prog = typeof quest.current_progress === 'string'
    ? JSON.parse(quest.current_progress)
    : quest.current_progress;

  const currentVal = prog?.current ?? 0;
  const target = reqs?.target ?? 0;
  const delta = getStatDelta(quest.quest_type, stats);
  if (delta <= 0) return null;

  const newCurrent = Math.min(currentVal + delta, target);
  const completed = newCurrent >= target;

  const updatePayload: Record<string, unknown> = {
    current_progress: JSON.stringify({ current: newCurrent }),
    completed,
  };
  if (completed) {
    updatePayload.completed_at = new Date().toISOString();
  }

  // RLS blocks UPDATE for non-service-role clients — must use admin client
  const admin = createAdminClient();
  if (admin) {
    await admin
      .from('weekly_quests')
      .update(updatePayload)
      .eq('id', quest.id);
  }

  if (completed && admin) {
    const difficulty = getDifficultyFromType(quest.quest_type);
    const weekNum = getWeekNumber(quest.week_start);
    const reward = pickAvatarReward(difficulty, weekNum);
    const partKey = `${reward.category}:${reward.partId}`;

    const { data: profile } = await admin
      .from('profiles')
      .select('premium_avatar_parts')
      .eq('id', userId)
      .single();

    const existing: string[] = (profile?.premium_avatar_parts as string[]) ?? [];
    if (!existing.includes(partKey)) {
      await admin
        .from('profiles')
        .update({ premium_avatar_parts: [...existing, partKey] })
        .eq('id', userId);
    }

    return { questType: quest.quest_type, xpReward: 0, description: quest.quest_type, completed: true };
  }

  return null;
}
