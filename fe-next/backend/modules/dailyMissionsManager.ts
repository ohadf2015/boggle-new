/**
 * Daily Missions Manager
 * Tracks 4 daily missions: Word Hunt, Brain Drill, Adventure, Community
 * Grand Slam bonus (500 XP) when all 4 complete
 */

import { getSupabase } from './supabase/client';
// Dynamic import may produce nested { default: { default: ... } } due to CJS/ESM interop.
// Unwrap until we find the actual Logger instance with .info().
import _loggerImport from '../utils/logger';
function _resolveLogger(obj: any, depth = 0): any {
  if (depth > 5) return obj;
  if (typeof obj?.info === 'function') return obj;
  if (obj?.default) return _resolveLogger(obj.default, depth + 1);
  return obj;
}
const logger = _resolveLogger(_loggerImport) as typeof _loggerImport;

export type MissionType = 'word_hunt' | 'brain_drill' | 'adventure' | 'community';

export interface DailyMissions {
  wordHunt: boolean;
  brainDrill: boolean;
  adventure: boolean;
  community: boolean;
  grandSlamClaimed: boolean;
  completedCount: number;
}

export interface GrandSlamResult {
  claimed: boolean;
  reward: number;
}

const GRAND_SLAM_XP = 500;

function getTodayDate(date?: string): string {
  return date || new Date().toISOString().split('T')[0];
}

function countCompleted(row: {
  word_hunt_completed: boolean;
  brain_drill_completed: boolean;
  adventure_completed: boolean;
  community_completed: boolean;
}): number {
  return [
    row.word_hunt_completed,
    row.brain_drill_completed,
    row.adventure_completed,
    row.community_completed,
  ].filter(Boolean).length;
}

function toMissions(row: {
  word_hunt_completed: boolean;
  brain_drill_completed: boolean;
  adventure_completed: boolean;
  community_completed: boolean;
  grand_slam_claimed: boolean;
}): DailyMissions {
  return {
    wordHunt: row.word_hunt_completed,
    brainDrill: row.brain_drill_completed,
    adventure: row.adventure_completed,
    community: row.community_completed,
    grandSlamClaimed: row.grand_slam_claimed,
    completedCount: countCompleted(row),
  };
}

const DEFAULT_ROW = {
  word_hunt_completed: false,
  brain_drill_completed: false,
  adventure_completed: false,
  community_completed: false,
  grand_slam_claimed: false,
};

/**
 * Get daily missions for a player, creating row if needed (UPSERT)
 */
export async function getDailyMissions(playerId: string, date?: string): Promise<DailyMissions> {
  const supabase = getSupabase()!;
  const today = getTodayDate(date);

  const { data, error } = await supabase
    .from('player_daily_missions')
    .select('word_hunt_completed, brain_drill_completed, adventure_completed, community_completed, grand_slam_claimed')
    .eq('player_id', playerId)
    .eq('mission_date', today)
    .single();

  if (error && error.code === 'PGRST116') {
    // No row for today — upsert a fresh one
    const { data: inserted, error: insertErr } = await supabase
      .from('player_daily_missions')
      .upsert({ player_id: playerId, mission_date: today, ...DEFAULT_ROW }, { onConflict: 'player_id,mission_date' })
      .select('word_hunt_completed, brain_drill_completed, adventure_completed, community_completed, grand_slam_claimed')
      .single();

    if (insertErr) {
      logger.error('DAILY_MISSIONS', `Upsert failed for ${playerId}: ${insertErr.message}`);
      return toMissions(DEFAULT_ROW);
    }
    return toMissions(inserted!);
  }

  if (error) {
    logger.error('DAILY_MISSIONS', `Get failed for ${playerId}: ${error.message}`);
    return toMissions(DEFAULT_ROW);
  }

  return toMissions(data!);
}

const COLUMN_MAP: Record<MissionType, string> = {
  word_hunt: 'word_hunt_completed',
  brain_drill: 'brain_drill_completed',
  adventure: 'adventure_completed',
  community: 'community_completed',
};

/**
 * Mark a mission as complete. Returns updated missions.
 */
export async function completeMission(
  playerId: string,
  missionType: MissionType,
  date?: string,
): Promise<DailyMissions> {
  const supabase = getSupabase()!;
  const today = getTodayDate(date);
  const column = COLUMN_MAP[missionType];

  if (!column) {
    logger.error('DAILY_MISSIONS', `Invalid mission type: ${missionType}`);
    return getDailyMissions(playerId, date);
  }

  // Ensure row exists first
  await getDailyMissions(playerId, date);

  const { error } = await supabase
    .from('player_daily_missions')
    .update({ [column]: true })
    .eq('player_id', playerId)
    .eq('mission_date', today);

  if (error) {
    logger.error('DAILY_MISSIONS', `Complete failed for ${playerId}/${missionType}: ${error.message}`);
  }

  return getDailyMissions(playerId, date);
}

/**
 * Check and claim Grand Slam bonus (all 4 missions complete).
 * Awards 500 XP if not yet claimed.
 */
export async function checkAndClaimGrandSlam(
  playerId: string,
  date?: string,
): Promise<GrandSlamResult> {
  const missions = await getDailyMissions(playerId, date);

  if (missions.completedCount < 4) {
    return { claimed: false, reward: 0 };
  }

  if (missions.grandSlamClaimed) {
    return { claimed: true, reward: 0 };
  }

  const supabase = getSupabase()!;
  const today = getTodayDate(date);

  const { error } = await supabase
    .from('player_daily_missions')
    .update({ grand_slam_claimed: true })
    .eq('player_id', playerId)
    .eq('mission_date', today);

  if (error) {
    logger.error('DAILY_MISSIONS', `Grand slam claim failed for ${playerId}: ${error.message}`);
    return { claimed: false, reward: 0 };
  }

  // Actually grant the XP reward
  const { error: xpError } = await supabase.rpc('increment_player_xp', {
    p_player_id: playerId,
    p_xp_amount: GRAND_SLAM_XP,
  });

  if (xpError) {
    logger.error('DAILY_MISSIONS', `Grand slam XP grant failed for ${playerId}: ${xpError.message}`);
  }

  logger.info('DAILY_MISSIONS', `Grand Slam claimed by ${playerId}: ${GRAND_SLAM_XP} XP`);
  return { claimed: true, reward: GRAND_SLAM_XP };
}
