/**
 * Fetch MP mode breakdown by aggregating game_results by game_mode
 * for a specified time window (7/30/90 days).
 * Used by admin dashboard to show mode-specific multiplayer stats.
 */

import { createSupabasePublicClient } from '@/lib/supabaseServer';

export type MpGameMode = 'classic' | 'blast' | 'word-hunt' | 'wheel-rush';

export interface MpModeBreakdownStat {
  mode: MpGameMode;
  playCount: number;
}

/**
 * Valid MP modes. Maps to game_mode column in game_results table.
 */
const VALID_MP_MODES: Set<MpGameMode> = new Set<MpGameMode>(['classic', 'blast', 'word-hunt', 'wheel-rush']);

/**
 * Normalize junk/legacy values to canonical modes.
 * Specifically: 'multiplayer' (legacy value) → 'classic'
 */
function normalizeGameMode(rawMode: string | null): MpGameMode | null {
  if (!rawMode) return null;

  if (rawMode === 'multiplayer') {
    return 'classic'; // Legacy value
  }

  if (VALID_MP_MODES.has(rawMode as MpGameMode)) {
    return rawMode as MpGameMode;
  }

  return null; // Unknown/junk value
}

/**
 * Fetch MP mode breakdown for the last N days.
 * Returns play counts per mode, sorted by popularity descending.
 */
export async function fetchMpModeBreakdown(days: number = 30): Promise<MpModeBreakdownStat[]> {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return [];
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  try {
    const { data, error } = await supabase
      .from('game_results')
      .select('game_mode, count:id')
      .gte('created_at', sinceISO);

    if (error || !data) {
      return [];
    }

    // Aggregate by normalized mode
    const modeMap = new Map<MpGameMode, number>();

    for (const row of data) {
      const normalized = normalizeGameMode(row.game_mode);
      if (!normalized) continue; // Skip unknown modes

      const current = modeMap.get(normalized) ?? 0;
      modeMap.set(normalized, current + (row.count ?? 0));
    }

    // Convert to array and sort by playCount descending
    const stats: MpModeBreakdownStat[] = Array.from(modeMap).map(([mode, count]) => ({
      mode,
      playCount: count,
    }));

    stats.sort((a, b) => b.playCount - a.playCount);

    return stats;
  } catch {
    return [];
  }
}
