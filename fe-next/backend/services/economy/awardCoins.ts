/**
 * Server-side coin grant helper.
 *
 * Wraps the `sync_coins` Postgres RPC for backend flows that cannot reach
 * the browser-side coinManager (multiplayer game results, daily missions,
 * word-of-the-day completion). Mirrors the cap enforced by /api/coins
 * to prevent reward-constant drift from silently overspending.
 *
 * Best-effort: never throws, returns success=false on any failure so the
 * caller can continue (e.g. XP grant should not be undone if coins fail).
 */

import { getSupabase } from '../../modules/supabase/client';
import logger from '../../utils/logger';

export const MAX_SERVER_COIN_AWARD = 2000;

export type AwardCoinsReason = 'duel_win' | 'wotd_complete' | 'grand_slam' | 'blast_v2_level_clear' | 'blast_v2_chest_open' | 'daily_weekly_chest' | 'all_quests_complete' | 'bug_report' | 'curator_ratification' | 'quick_play_round' | 'admin_gift';

export interface AwardCoinsResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

type SyncCoinsRow = {
  success: boolean;
  new_balance: number;
  error_message: string | null;
};

export async function awardCoinsServer(
  playerId: string,
  amount: number,
  reason: AwardCoinsReason,
  metadata?: Record<string, string | number>
): Promise<AwardCoinsResult> {
  if (!playerId) {
    logger.warn('COINS', `Refusing award: empty playerId (reason=${reason})`);
    return { success: false, error: 'invalid_player' };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    logger.warn('COINS', `Refusing award: non-positive amount=${amount} (reason=${reason})`);
    return { success: false, error: 'invalid_amount' };
  }

  if (amount > MAX_SERVER_COIN_AWARD) {
    logger.warn(
      'COINS',
      `Refusing award: amount=${amount} exceeds MAX_SERVER_COIN_AWARD=${MAX_SERVER_COIN_AWARD} (reason=${reason})`
    );
    return { success: false, error: 'amount_too_large' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    logger.warn('COINS', `Refusing award: supabase client unavailable (reason=${reason})`);
    return { success: false, error: 'no_client' };
  }

  try {
    const { data, error } = await supabase.rpc('sync_coins', {
      p_user_id: playerId,
      p_amount: amount,
      p_reason: reason,
      p_metadata: metadata ?? {},
    });

    if (error) {
      logger.error(
        'COINS',
        `sync_coins RPC failed for ${playerId} (reason=${reason}, amount=${amount}): ${error.message}`
      );
      return { success: false, error: error.message };
    }

    const row = (data as SyncCoinsRow[] | null)?.[0];
    if (!row?.success) {
      const msg = row?.error_message || 'unknown_error';
      logger.error(
        'COINS',
        `sync_coins returned failure for ${playerId} (reason=${reason}): ${msg}`
      );
      return { success: false, error: msg };
    }

    logger.info(
      'COINS',
      `Awarded ${amount} coins to ${playerId} (reason=${reason}, balance=${row.new_balance})`
    );
    return { success: true, newBalance: row.new_balance };
  } catch (err) {
    const msg = (err as Error).message;
    logger.error(
      'COINS',
      `sync_coins threw for ${playerId} (reason=${reason}): ${msg}`
    );
    return { success: false, error: msg };
  }
}
