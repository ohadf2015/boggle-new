/**
 * A student's chests, newest first. Read-only: rows are written only by the
 * claim-once chest grant. The table's own RLS limits a student to their rows;
 * this read runs server-side with the user id the socket verified.
 */

import { getSupabase } from './supabase/client.js';
import logger from '../utils/logger.js';

export interface LockerItem {
  gameCode: string;
  roundId: string;
  rarity: string;
  xp: number;
  itemId: string;
  createdAt: string;
}

export interface LockerDeps {
  fetchRows: (userId: string, limit: number) => Promise<{ data: unknown[] | null; error: unknown }>;
}

export async function readLocker(userId: string, limit = 20, deps: LockerDeps = defaultLockerDeps()): Promise<LockerItem[]> {
  const { data, error } = await deps.fetchRows(userId, limit);
  if (error) {
    logger.error('CLASSROOM_ECONOMY', `Locker read failed for ${userId}: ${String(error)}`);
    return [];
  }
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      gameCode: String(row.game_code),
      roundId: String(row.round_id),
      rarity: String(row.rarity),
      xp: Number(row.xp),
      itemId: String(row.item_id),
      createdAt: String(row.created_at),
    };
  });
}

function defaultLockerDeps(): LockerDeps {
  return {
    fetchRows: async (userId, limit) => {
      const supabase = getSupabase();
      if (!supabase) return { data: null, error: new Error('supabase not configured') };
      const { data, error } = await supabase
        .from('classroom_chest_rewards')
        .select('game_code, round_id, rarity, xp, item_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    },
  };
}
