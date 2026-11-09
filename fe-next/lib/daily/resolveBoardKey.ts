import type { SupabaseClient } from '@supabase/supabase-js';
import { loadRankedDailyBoard, opaqueRowKey } from './loadDailyBoard';

/**
 * The signed-in player behind an opaque daily-board row key, or null.
 * Guests (identity `g:<fp>`) never resolve: a fingerprint is a guest's only
 * credential. The combined board stays id-free; this resolves one row, on demand,
 * for a signed-in caller who tapped that row's friend button.
 */
export async function resolveBoardKeyToUserId(
  admin: SupabaseClient,
  date: string,
  key: string,
): Promise<string | null> {
  const ranked = await loadRankedDailyBoard(admin, date, 'all', null);
  const keyOf = opaqueRowKey(date);
  const row = ranked.find((r) => r.identity.startsWith('u:') && keyOf(r.identity) === key);
  return row ? row.identity.slice(2) : null;
}
