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
  errors?: string[];
}

/**
 * Discovers all `seasons` rows with status='active' AND end_date <= now()
 * and processes a reset for each. Used by the cron route at T+0.
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
    for (const row of rows) {
      results.push(await processSeasonReset(row.id));
    }

    return { processed: rows.length, results };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { processed: 0, results: [], errors: [msg] };
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
