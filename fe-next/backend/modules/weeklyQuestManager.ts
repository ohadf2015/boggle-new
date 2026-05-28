/**
 * Weekly Quest Manager (Server-only)
 *
 * Every Monday, players pick 1 of 3 quests (Easy/Medium/Hard).
 * Progress tracked throughout the week.
 *
 * Pure types/helpers re-exported from shared/weeklyQuestTemplates.ts
 * so client code can import from there without pulling in Node.js deps.
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';
import {
  getWeekStart,
  getWeekNumber,
  getAvailableQuests,
  getDifficultyFromType,
  getStatDelta,
  pickAvatarReward,
  type QuestDifficulty,
  type QuestTemplate,
  type ActiveQuest,
  type GameStats,
} from '@/shared/weeklyQuestTemplates';

// Re-export shared types and pure functions for existing backend consumers
export {
  getWeekStart,
  getWeekNumber,
  getAvailableQuests,
  getDifficultyFromType,
  getStatDelta,
  pickAvatarReward,
  type QuestDifficulty,
  type QuestTemplate,
  type ActiveQuest,
  type GameStats,
};

// --- Public API (server-only, uses Supabase) ---

/** Player picks their quest for the week. Only one per week. */
export async function selectQuest(playerId: string, questId: string): Promise<ActiveQuest> {
  const supabase = getSupabase()!;
  const weekStart = getWeekStart();

  // Check for existing quest this week
  const { data: existing } = await supabase
    .from('weekly_quests')
    .select('id')
    .eq('player_id', playerId)
    .eq('week_start', weekStart)
    .single();

  if (existing) {
    throw new Error('Player has already selected a quest this week');
  }

  // Find quest template
  const available = getAvailableQuests();
  const template = available.find(q => q.id === questId);
  if (!template) throw new Error('Invalid quest id');

  const { data, error } = await supabase
    .from('weekly_quests')
    .insert({
      player_id: playerId,
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

  if (error) {
    logger.error('weeklyQuest', `Failed to insert weekly quest for ${playerId}: ${error.message}`);
    throw new Error('Failed to select quest');
  }

  return parseQuestRow(data);
}

/** Returns selected quest + current progress, or null */
export async function getActiveQuest(playerId: string): Promise<ActiveQuest | null> {
  const supabase = getSupabase()!;
  const weekStart = getWeekStart();

  const { data, error } = await supabase
    .from('weekly_quests')
    .select('id, quest_type, title, description, requirements, current_progress, xp_reward, completed, week_start')
    .eq('player_id', playerId)
    .eq('week_start', weekStart)
    .single();

  if (error || !data) return null;
  return parseQuestRow(data);
}

/** Update progress based on game stats. Returns updated quest or null. */
export async function updateQuestProgress(
  playerId: string,
  stats: GameStats,
): Promise<ActiveQuest | null> {
  const quest = await getActiveQuest(playerId);
  if (!quest || quest.completed) return null;

  const delta = getStatDelta(quest.questType, stats);
  if (delta <= 0) return null;

  const supabase = getSupabase()!;
  const newCurrent = Math.min(quest.current + delta, quest.target);
  const completed = newCurrent >= quest.target;

  let affectedByThisCall = true;

  if (completed) {
    // When completing: use conditional update to detect race conditions.
    // Only grant XP if THIS call actually completed the quest (not a concurrent call).
    const { data, error } = await supabase
      .from('weekly_quests')
      .update({
        current_progress: JSON.stringify({ current: newCurrent }),
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', quest.id)
      .eq('completed', false) // Only update if NOT already completed
      .select('id');

    if (error) {
      logger.error('weeklyQuest', `Failed to update quest progress for ${playerId}: ${error.message}`);
      return null;
    }

    // Check if THIS call did the transition (data is non-empty array)
    affectedByThisCall = Array.isArray(data) && data.length > 0;
  } else {
    // Progress-only update (not completing): simple update, no race-condition guard needed
    const { error } = await supabase
      .from('weekly_quests')
      .update({
        current_progress: JSON.stringify({ current: newCurrent }),
      })
      .eq('id', quest.id)
      .select('id');

    if (error) {
      logger.error('weeklyQuest', `Failed to update quest progress for ${playerId}: ${error.message}`);
      return null;
    }
  }

  // Grant XP + avatar part reward ONLY if THIS call completed the quest
  if (completed && affectedByThisCall) {
    // Grant XP reward
    try {
      const xpReward = quest.xpReward ?? 0;
      if (xpReward > 0) {
        await supabase.rpc('increment_player_xp', {
          p_player_id: playerId,
          p_xp_amount: xpReward,
        });
        logger.info('weeklyQuest', `Granted ${xpReward} XP to ${playerId} for weekly quest`);
      }
    } catch (err) {
      logger.error('weeklyQuest', `Failed to grant XP for ${playerId}: ${err}`);
    }

    // Grant avatar part reward
    try {
      await grantAvatarPartReward(supabase, playerId, quest.questType, quest.weekStart);
    } catch (err) {
      logger.error('weeklyQuest', `Failed to grant avatar part for ${playerId}: ${err}`);
    }
  }

  return { ...quest, current: newCurrent, completed };
}

// --- Row parser ---

interface QuestRow {
  id: string;
  quest_type: string;
  title: string;
  description: string;
  requirements: string;
  current_progress: string;
  xp_reward: number;
  completed: boolean;
  week_start: string;
}

/**
 * Grant avatar part reward to player's profile on quest completion.
 */
async function grantAvatarPartReward(supabase: any, playerId: string, questType: string, weekStart: string): Promise<void> {
  const difficulty = getDifficultyFromType(questType);
  const weekNum = getWeekNumber(weekStart);
  const reward = pickAvatarReward(difficulty, weekNum);
  const partKey = `${reward.category}:${reward.partId}`;

  const { data: profile } = await supabase
    .from('profiles')
    .select('premium_avatar_parts')
    .eq('id', playerId)
    .single();

  const existing: string[] = (profile?.premium_avatar_parts as string[]) ?? [];
  if (!existing.includes(partKey)) {
    await supabase
      .from('profiles')
      .update({ premium_avatar_parts: [...existing, partKey] })
      .eq('id', playerId);
    logger.info('weeklyQuest', `Granted avatar part ${partKey} to ${playerId}`);
  }
}

function parseQuestRow(row: QuestRow): ActiveQuest {
  const reqs = typeof row.requirements === 'string' ? JSON.parse(row.requirements) : row.requirements;
  const progress = typeof row.current_progress === 'string' ? JSON.parse(row.current_progress) : row.current_progress;
  return {
    id: row.id,
    questType: row.quest_type,
    title: row.title,
    description: row.description,
    target: reqs.target,
    current: progress.current ?? 0,
    xpReward: row.xp_reward,
    completed: row.completed,
    difficulty: getDifficultyFromType(row.quest_type),
    weekStart: row.week_start,
  };
}
