/**
 * Admin Cheat Detection Routes
 * Queries materialized view for anomalous player scores.
 */

import express, { Response, Router } from 'express';
import type { AdminRequest } from './types';
import { successResponse, errorResponse, buildPaginationMeta } from './responseHelpers';
import { paginationSchema } from './paginationSchema';
import logger from '../../utils/logger';

const { getSupabase } = require('../../modules/supabaseServer');

const router: Router = express.Router();

// ==================== Types ====================

interface FlaggedPlayer {
  player_id: string;
  avg_score: number;
  max_score: number;
  score_zscore: number;
  avg_words: number;
  games_played: number;
}

interface SupabaseClient {
  from: (table: string) => Record<string, (...args: unknown[]) => unknown>;
}

// ==================== Service Functions ====================

export async function fetchFlaggedPlayers(
  supabase: SupabaseClient,
  threshold: number,
  limit: number,
  offset: number
) {
  const result = await (supabase.from('mv_cheat_signals') as Record<string, Function>)
    .select('player_id, avg_score, max_score, score_zscore, avg_words, games_played', { count: 'exact' })
    .gte('score_zscore', threshold)
    .order('score_zscore', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = result as { data: FlaggedPlayer[] | null; count: number | null; error: { message: string } | null };

  if (error) {
    logger.error('ADMIN_CHEAT', `Flagged players query failed: ${error.message}`);
    return { flagged: [], pagination: buildPaginationMeta(0, { limit, offset }) };
  }

  return {
    flagged: data ?? [],
    pagination: buildPaginationMeta(count ?? 0, { limit, offset }),
  };
}

// ==================== Routes ====================

/**
 * GET /api/admin/cheat/flagged
 */
router.get('/cheat/flagged', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const threshold = Math.max(Number(req.query.zscore) || 3.0, 1.0);
    const { limit, offset } = paginationSchema.parse(req.query);

    const result = await fetchFlaggedPlayers(getSupabase(), threshold, limit, offset);
    res.json(successResponse(result));
  } catch (err) {
    logger.error('ADMIN_CHEAT', `Error: ${(err as Error).message}`);
    res.status(500).json(errorResponse('CHEAT_QUERY_FAILED', (err as Error).message));
  }
});

export default router;
