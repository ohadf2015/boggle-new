/**
 * Daily Missions Manager
 * Tracks 3 daily missions: Word Hunt, Adventure, Multiplayer
 * Grand Slam bonus (500 XP) when all 3 complete
 */

import { getSupabase } from './supabase/client';
import { awardCoinsServer } from '../services/economy/awardCoins';
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

export type MissionType = 'word_hunt' | 'adventure' | 'community';

export interface DailyMissions {
  wordHunt: boolean;
  adventure: boolean;
  community: boolean;
  grandSlamClaimed: boolean;
  completedCount: number;
  // Per-mission "celebrated" flags — true once the client has shown the
  // completion toast. Server-side source of truth so Capacitor app and
  // browser don't each fire the toast independently.
  wordHuntCelebrated: boolean;
  adventureCelebrated: boolean;
  communityCelebrated: boolean;
  grandSlamCelebrated: boolean;
}

export type CelebrationKey =
  | 'word_hunt'
  | 'adventure'
  | 'community'
  | 'grand_slam';

export interface GrandSlamResult {
  claimed: boolean;
  reward: number;
}

const GRAND_SLAM_XP = 500;
/** Coins granted alongside XP when player completes all 3 daily missions. */
export const GRAND_SLAM_COIN_REWARD = 200;

function getTodayDate(date?: string): string {
  return date || new Date().toISOString().split('T')[0];
}

type MissionRow = {
  word_hunt_completed: boolean;
  adventure_completed: boolean;
  community_completed: boolean;
  grand_slam_claimed: boolean;
  word_hunt_celebrated?: boolean | null;
  adventure_celebrated?: boolean | null;
  community_celebrated?: boolean | null;
  grand_slam_celebrated?: boolean | null;
};

function countCompleted(row: MissionRow): number {
  return [
    row.word_hunt_completed,
    row.adventure_completed,
    row.community_completed,
  ].filter(Boolean).length;
}

function toMissions(row: MissionRow): DailyMissions {
  return {
    wordHunt: row.word_hunt_completed,
    adventure: row.adventure_completed,
    community: row.community_completed,
    grandSlamClaimed: row.grand_slam_claimed,
    completedCount: countCompleted(row),
    wordHuntCelebrated: row.word_hunt_celebrated ?? false,
    adventureCelebrated: row.adventure_celebrated ?? false,
    communityCelebrated: row.community_celebrated ?? false,
    grandSlamCelebrated: row.grand_slam_celebrated ?? false,
  };
}

const SELECT_COLS = 'word_hunt_completed, adventure_completed, community_completed, grand_slam_claimed, word_hunt_celebrated, adventure_celebrated, community_celebrated, grand_slam_celebrated';

const DEFAULT_ROW = {
  word_hunt_completed: false,
  adventure_completed: false,
  community_completed: false,
  grand_slam_claimed: false,
  word_hunt_celebrated: false,
  adventure_celebrated: false,
  community_celebrated: false,
  grand_slam_celebrated: false,
};

/**
 * Get daily missions for a player, creating row if needed (UPSERT)
 */
export async function getDailyMissions(playerId: string, date?: string): Promise<DailyMissions> {
  const supabase = getSupabase()!;
  const today = getTodayDate(date);

  const { data, error } = await supabase
    .from('player_daily_missions')
    .select(SELECT_COLS)
    .eq('player_id', playerId)
    .eq('mission_date', today)
    .maybeSingle();

  if (error) {
    logger.error('DAILY_MISSIONS', `Get failed for ${playerId}: ${error.message}`);
    return toMissions(DEFAULT_ROW);
  }

  if (!data) {
    // No row for today — upsert a fresh one
    const { data: inserted, error: insertErr } = await supabase
      .from('player_daily_missions')
      .upsert({ player_id: playerId, mission_date: today, ...DEFAULT_ROW }, { onConflict: 'player_id,mission_date' })
      .select(SELECT_COLS)
      .single();

    if (insertErr) {
      logger.error('DAILY_MISSIONS', `Upsert failed for ${playerId}: ${insertErr.message}`);
      return toMissions(DEFAULT_ROW);
    }
    return toMissions(inserted!);
  }

  return toMissions(data);
}

const COLUMN_MAP: Record<MissionType, string> = {
  word_hunt: 'word_hunt_completed',
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

  if (missions.completedCount < 3) {
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

  // Coin grant is best-effort; failure logged inside helper. We do not undo
  // the XP grant or the claim flag if coins fail — manual reconcile beats
  // a 2-phase commit. `grand_slam_claimed=true` above provides idempotency.
  await awardCoinsServer(playerId, GRAND_SLAM_COIN_REWARD, 'grand_slam', {
    date: today,
  });

  logger.info('DAILY_MISSIONS', `Grand Slam claimed by ${playerId}: ${GRAND_SLAM_XP} XP + ${GRAND_SLAM_COIN_REWARD} coins`);
  return { claimed: true, reward: GRAND_SLAM_XP };
}

const CELEBRATED_COLUMN_MAP: Record<CelebrationKey, string> = {
  word_hunt: 'word_hunt_celebrated',
  adventure: 'adventure_celebrated',
  community: 'community_celebrated',
  grand_slam: 'grand_slam_celebrated',
};

/**
 * Mark a mission celebration as shown (server-side source of truth so the
 * client doesn't re-fire the toast on every page visit, and so the Capacitor
 * app and browser agree on which toasts have already been seen).
 *
 * Returns true if this call transitioned the flag from false→true (i.e. the
 * caller is responsible for showing the toast). Returns false if it was
 * already true or on error — callers should treat false as "don't show".
 */
export async function markCelebrated(
  playerId: string,
  key: CelebrationKey,
  date?: string,
): Promise<{ newlyCelebrated: boolean }> {
  const column = CELEBRATED_COLUMN_MAP[key];
  if (!column) {
    logger.error('DAILY_MISSIONS', `Invalid celebration key: ${key}`);
    return { newlyCelebrated: false };
  }

  const supabase = getSupabase()!;
  const today = getTodayDate(date);

  // Ensure row exists
  await getDailyMissions(playerId, date);

  // Conditional update: only flip false→true. If already true, affected=0
  // and we signal "not newly celebrated" to the caller.
  const { data, error } = await supabase
    .from('player_daily_missions')
    .update({ [column]: true })
    .eq('player_id', playerId)
    .eq('mission_date', today)
    .eq(column, false)
    .select(column);

  if (error) {
    logger.error('DAILY_MISSIONS', `markCelebrated failed for ${playerId}/${key}: ${error.message}`);
    return { newlyCelebrated: false };
  }

  return { newlyCelebrated: Array.isArray(data) && data.length > 0 };
}
