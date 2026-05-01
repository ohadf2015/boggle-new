/**
 * Season Manager
 *
 * Wraps the atomic `process_season_reset(season_id)` Postgres RPC
 * (snapshot → archive → soft MMR + hard score reset → close season).
 *
 * Cache invalidation is left to the caller (cron route or admin trigger),
 * which has access to the redis client.
 */

import { getSupabase } from './supabaseServer';
import { notifySeasonStart, getUserLocalesBatch } from './pushNotificationTriggers';
import logger from '../utils/logger';

// Cap parallel fan-out so per-user user_notifications INSERTs don't
// saturate the Supabase semaphore (Sentry NEXTJS-136 — pool 25/25,
// queue depth 34 at season-rotation cron).
const SEASON_PUSH_CHUNK_SIZE = 10;

export interface SeasonResetResult {
  success: boolean;
  snapshotted: number;
  resetCount: number;
  errors?: string[];
}

const EMPTY_FAILURE = (msg: string): SeasonResetResult => ({
  success: false,
  snapshotted: 0,
  resetCount: 0,
  errors: [msg],
});

export interface ExpiredSeasonsResult {
  processed: number;
  results: SeasonResetResult[];
  notified?: number;
  errors?: string[];
}

/**
 * Discovers all `seasons` rows with status='active' AND end_date <= now()
 * and processes a reset for each. Used by the cron route at T+0.
 *
 * After each successful reset, fans out a `season_start` push to every
 * player archived in the just-closed season. Push fan-out is best-effort:
 * failures are logged but never abort the rotation.
 */
export async function processExpiredSeasons(): Promise<ExpiredSeasonsResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { processed: 0, results: [], errors: ['Supabase not configured'] };
  }

  try {
    const nowIso = new Date().toISOString();
    const expired = await supabase
      .from('seasons')
      .select('id')
      .eq('status', 'active')
      .lte('end_date', nowIso)
      .order('id', { ascending: true });

    if (expired.error) {
      return { processed: 0, results: [], errors: [expired.error.message] };
    }

    const rows = (expired.data ?? []) as Array<{ id: number }>;
    if (rows.length === 0) {
      return { processed: 0, results: [] };
    }

    const results: SeasonResetResult[] = [];
    let notified = 0;
    for (const row of rows) {
      const result = await processSeasonReset(row.id);
      results.push(result);
      if (result.success && result.snapshotted > 0) {
        notified += await notifyPlayersOfSeasonStart(row.id, row.id + 1);
      }
    }

    return { processed: rows.length, results, notified };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { processed: 0, results: [], errors: [msg] };
  }
}

/**
 * Fan out a `season_start` push to every player archived in `prevSeasonId`.
 * Returns the count of pushes scheduled (allSettled — never throws).
 */
export async function notifyPlayersOfSeasonStart(
  prevSeasonId: number,
  newSeasonId: number
): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  try {
    const { data, error } = await supabase
      .from('season_leaderboards')
      .select('player_id')
      .eq('season_id', prevSeasonId);

    if (error) {
      logger.warn('SEASON', 'notifyPlayersOfSeasonStart query failed', { error: error.message });
      return 0;
    }

    const ids = ((data ?? []) as Array<{ player_id: string }>)
      .map((r) => r.player_id)
      .filter(Boolean);
    if (ids.length === 0) return 0;

    const locales = await getUserLocalesBatch(ids);

    for (let i = 0; i < ids.length; i += SEASON_PUSH_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + SEASON_PUSH_CHUNK_SIZE);
      await Promise.allSettled(
        chunk.map((id) =>
          notifySeasonStart(id, newSeasonId, prevSeasonId, locales.get(id)),
        ),
      );
    }
    return ids.length;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('SEASON', 'notifyPlayersOfSeasonStart threw', { error: msg });
    return 0;
  }
}

export async function processSeasonReset(
  seasonId: number
): Promise<SeasonResetResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return EMPTY_FAILURE('Supabase not configured');
  }

  try {
    const { data, error } = await supabase.rpc('process_season_reset', {
      p_season_id: seasonId,
    });

    if (error) {
      return EMPTY_FAILURE(error.message ?? 'Unknown RPC error');
    }

    const row = Array.isArray(data) ? data[0] : data;
    const snapshotted = Number(row?.snapshotted ?? 0);
    const resetCount = Number(row?.reset_count ?? row?.resetCount ?? 0);

    return { success: true, snapshotted, resetCount };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return EMPTY_FAILURE(msg);
  }
}
