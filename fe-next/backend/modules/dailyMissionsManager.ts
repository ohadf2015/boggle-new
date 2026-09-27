/**
 * Daily Missions Manager
 * Tracks 3 daily missions: Word Hunt, Adventure, Multiplayer
 * Grand Slam bonus (500 XP) when all 3 complete
 */

import { getSupabase } from './supabase/client';
import { awardCoinsServer } from '../services/economy/awardCoins';
import {
  getDailyQuests,
  evaluateDailyQuests,
  type QuestGameResult,
} from '../../shared/dailyQuestPool';
import { recordQuestAchievement } from './questFeedManager';
// Static import (not dynamic await import) so vi.mock('../weeklyQuestManager')
// deterministically intercepts it in tests — a dynamic import slipped past the
// mock and ran the real getActiveQuest against an unmocked supabase, aborting
// the suite (and the nightly gate) with an undefined-destructure crash.
import { getActiveQuest } from './weeklyQuestManager';
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

/** XP grant per individual mission completion (idempotent via conditional update). */
export const PER_MISSION_XP = 100;

/** All-quests-complete reward: XP granted when daily + weekly both done. */
export const ALL_QUESTS_COMPLETE_XP = 250;
/** All-quests-complete reward: coins granted alongside XP. */
export const ALL_QUESTS_COMPLETE_COIN_REWARD = 200;

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
 * Mark a mission as complete and grant XP if this is the first completion.
 * Uses conditional update (column = false) so XP is awarded at most once.
 * Returns updated missions.
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

  // Conditional update: only flip false→true. If already true, affected=0.
  const { data, error } = await supabase
    .from('player_daily_missions')
    .update({ [column]: true })
    .eq('player_id', playerId)
    .eq('mission_date', today)
    .eq(column, false)
    .select(column);

  if (error) {
    logger.error('DAILY_MISSIONS', `Complete failed for ${playerId}/${missionType}: ${error.message}`);
    return getDailyMissions(playerId, date);
  }

  // Grant XP only if this was a genuine false→true transition (affected > 0)
  if (Array.isArray(data) && data.length > 0) {
    const { error: xpError } = await supabase.rpc('increment_player_xp', {
      p_player_id: playerId,
      p_xp_amount: PER_MISSION_XP,
    });

    if (xpError) {
      logger.error('DAILY_MISSIONS', `Per-mission XP grant failed for ${playerId}/${missionType}: ${xpError.message}`);
    }
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

/**
 * Check and claim all-quests-complete reward (daily + weekly both done).
 * Awards 250 XP + 200 coins idempotently behind all_quests_complete_celebrated flag.
 */
export async function checkAndClaimAllQuestsComplete(
  playerId: string,
  date?: string,
): Promise<{ claimed: boolean; xpReward: number; coinReward: number }> {
  const missions = await getDailyMissions(playerId, date);

  // Must have all 3 daily missions complete
  if (missions.completedCount < 3) {
    return { claimed: false, xpReward: 0, coinReward: 0 };
  }

  // Must have weekly quest complete
  const weekly = await getActiveQuest(playerId);
  if (!weekly?.completed) {
    return { claimed: false, xpReward: 0, coinReward: 0 };
  }

  const supabase = getSupabase()!;
  const today = getTodayDate(date);

  // Atomic flip: only grant reward if flag transitions false→true
  const { data, error } = await supabase
    .from('player_daily_missions')
    .update({ all_quests_complete_celebrated: true })
    .eq('player_id', playerId)
    .eq('mission_date', today)
    .eq('all_quests_complete_celebrated', false)
    .select('all_quests_complete_celebrated');

  if (error) {
    logger.error('DAILY_MISSIONS', `All-quests-complete claim failed for ${playerId}: ${error.message}`);
    return { claimed: false, xpReward: 0, coinReward: 0 };
  }

  // If no rows affected, already claimed or error
  if (!Array.isArray(data) || data.length === 0) {
    return { claimed: false, xpReward: 0, coinReward: 0 };
  }

  // Genuine claim: grant XP (best-effort)
  const { error: xpError } = await supabase.rpc('increment_player_xp', {
    p_player_id: playerId,
    p_xp_amount: ALL_QUESTS_COMPLETE_XP,
  });

  if (xpError) {
    logger.error('DAILY_MISSIONS', `All-quests-complete XP grant failed for ${playerId}: ${xpError.message}`);
  }

  // Grant coins (best-effort)
  await awardCoinsServer(playerId, ALL_QUESTS_COMPLETE_COIN_REWARD, 'all_quests_complete', {
    date: today,
  });

  logger.info(
    'DAILY_MISSIONS',
    `All quests complete claimed by ${playerId}: ${ALL_QUESTS_COMPLETE_XP} XP + ${ALL_QUESTS_COMPLETE_COIN_REWARD} coins`,
  );
  return { claimed: true, xpReward: ALL_QUESTS_COMPLETE_XP, coinReward: ALL_QUESTS_COMPLETE_COIN_REWARD };
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

const SLOT_MISSION_TYPES: MissionType[] = ['word_hunt', 'adventure', 'community'];

/**
 * Evaluate today's 3 daily quests against a finished-game result and complete
 * every slot whose condition the result satisfies. Called from every game-end
 * seam (socket / word-hunt API / drills API) with whatever data that seam has.
 *
 * `completeMission` is idempotent (conditional false→true update + XP only on
 * transition), so replaying a result never double-grants.
 */
export async function completeDailyQuestsForResult(
  playerId: string,
  result: QuestGameResult,
  date?: string,
): Promise<void> {
  const today = getTodayDate(date);
  const quests = getDailyQuests(today);
  const slots = evaluateDailyQuests(quests, result);
  if (slots.length === 0) return;

  // Snapshot BEFORE completing so we broadcast only FRESH completions — a
  // repeated PvP win must not spam the social feed every game.
  const before = await getDailyMissions(playerId, today);
  const wasComplete = [before.wordHunt, before.adventure, before.community];

  for (const slot of slots) {
    await completeMission(playerId, SLOT_MISSION_TYPES[slot], today);
    // Social proof: broadcast brag-worthy (PvP) quests on first completion.
    if (!wasComplete[slot] && quests[slot].family === 'pvp') {
      void recordQuestAchievement(playerId, quests[slot].id, 'pvp');
    }
  }

  // Claim the Grand Slam bonus once all 3 are done. This is the canonical claim
  // site — previously the only caller was a client socket handler that nothing
  // emitted, so the 500 XP bonus never actually fired on real play.
  const grandSlam = await checkAndClaimGrandSlam(playerId, today);
  if (grandSlam.claimed && grandSlam.reward > 0) {
    void recordQuestAchievement(playerId, 'grand_slam', 'grand_slam');
    try {
      const { updateQuestProgress } = await import('./weeklyQuestManager');
      await updateQuestProgress(playerId, { dailyMissionDaysCompleted: 1 });
    } catch {
      // Non-critical: weekly streak credit is best-effort.
    }
  }
}
