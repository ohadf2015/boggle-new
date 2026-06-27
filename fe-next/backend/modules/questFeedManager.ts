/**
 * Quest Achievement Feed — social proof. Records brag-worthy quest completions
 * (PvP quests + Grand Slam) so other players see "X just beat a human rival"
 * and chase the same goals. Reads are polled via a cached GET (no realtime).
 *
 * Privacy: honours profiles.share_achievements (opt-out). Backend writes via
 * service-role. Only broadcastable families are ever stored.
 */

import { getSupabase } from './supabase/client';
import _loggerImport from '../utils/logger';

function _resolveLogger(obj: any, depth = 0): any {
  if (depth > 5) return obj;
  if (typeof obj?.info === 'function') return obj;
  if (obj?.default) return _resolveLogger(obj.default, depth + 1);
  return obj;
}
const logger = _resolveLogger(_loggerImport) as typeof _loggerImport;

export interface QuestAchievementEntry {
  displayName: string;
  questId: string;
  family: string;
  createdAt: string;
}

/**
 * Only brag-worthy completions broadcast — PvP quests (beat a human) and the
 * Grand Slam. Plain skill/discovery daily quests do NOT broadcast (research:
 * broadcasting every completion trains players to mute the feed).
 */
export function isBroadcastableFamily(family: string): boolean {
  return family === 'pvp' || family === 'grand_slam';
}

/**
 * Record a completion to the social feed if it's broadcast-worthy and the player
 * hasn't opted out. Best-effort: never throws (callers fire-and-forget).
 */
export async function recordQuestAchievement(
  playerId: string,
  questId: string,
  family: string,
): Promise<void> {
  if (!isBroadcastableFamily(family)) return;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username, share_achievements')
      .eq('id', playerId)
      .maybeSingle();

    // Opt-out (default ON): skip if explicitly disabled.
    if (!profile || profile.share_achievements === false) return;

    const displayName =
      (profile.display_name as string) || (profile.username as string) || 'A player';

    const { error } = await supabase.from('quest_achievement_feed').insert({
      player_id: playerId,
      display_name: displayName,
      quest_id: questId,
      family,
    });
    if (error) {
      logger.error('QUEST_FEED', `Insert failed for ${playerId}/${questId}: ${error.message}`);
    }
  } catch (err) {
    logger.error('QUEST_FEED', `recordQuestAchievement error: ${(err as Error).message}`);
  }
}

/** Latest N feed entries, newest first. */
export async function getRecentAchievements(limit = 20): Promise<QuestAchievementEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('quest_achievement_feed')
      .select('display_name, quest_id, family, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      logger.error('QUEST_FEED', `getRecentAchievements failed: ${error.message}`);
      return [];
    }
    return (data ?? []).map((r: Record<string, unknown>) => ({
      displayName: r.display_name as string,
      questId: r.quest_id as string,
      family: r.family as string,
      createdAt: r.created_at as string,
    }));
  } catch (err) {
    logger.error('QUEST_FEED', `getRecentAchievements error: ${(err as Error).message}`);
    return [];
  }
}
