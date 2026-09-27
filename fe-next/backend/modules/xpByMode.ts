/**
 * Server-side XP-by-mode aggregation.
 *
 * Reads a player's `game_results` history, groups it by `game_mode`, and feeds
 * the per-mode game/score totals to the pure `splitXpByMode` estimator so the
 * slices sum to the player's `total_xp`. Used by the public-profile endpoint to
 * surface "where your XP came from" for the player and for anyone viewing them.
 */

import { splitXpByMode, type ModeAggregate, type ModeXpSlice } from '../../lib/xp/xpByMode';
import logger from '../utils/logger';

interface GameResultRow {
  game_mode: string | null;
  score: number | null;
}

// Guardrail: heaviest players still fit comfortably; avoids unbounded reads.
const MAX_RESULT_ROWS = 20000;

/** Group raw game_results rows by mode, counting games and summing score. */
export function aggregateModeRows(rows: GameResultRow[]): ModeAggregate[] {
  const byMode = new Map<string, ModeAggregate>();
  for (const row of rows) {
    const mode = row.game_mode || 'classic'; // column default is 'classic'
    const existing = byMode.get(mode);
    if (existing) {
      existing.games += 1;
      existing.score += row.score || 0;
    } else {
      byMode.set(mode, { mode, games: 1, score: row.score || 0 });
    }
  }
  return Array.from(byMode.values());
}

/**
 * Fetch + estimate a player's XP split by mode. Never throws — returns [] on any
 * error or when there's nothing to show (the breakdown is a non-critical adornment).
 */
export async function fetchXpByMode(
  supabase: any,
  playerId: string,
  totalXp: number,
): Promise<ModeXpSlice[]> {
  if (totalXp <= 0) return [];
  try {
    const { data, error } = await supabase
      .from('game_results')
      .select('game_mode, score')
      .eq('player_id', playerId)
      .limit(MAX_RESULT_ROWS);

    if (error || !data) return [];
    return splitXpByMode(aggregateModeRows(data as GameResultRow[]), totalXp);
  } catch (err) {
    logger.error('XP_BY_MODE', `Failed to aggregate xp-by-mode for ${playerId}`, err);
    return [];
  }
}
