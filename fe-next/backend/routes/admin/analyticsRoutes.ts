/**
 * Admin Analytics Routes
 * Retention cohorts, churn risk, engagement funnel.
 */

import express, { Response, Router } from 'express';
import type { AdminRequest } from './types';
import { successResponse, errorResponse, buildPaginationMeta } from './responseHelpers';
import { paginationSchema } from './paginationSchema';
import { withCache } from './adminCache';
import logger from '../../utils/logger';

const { getSupabase } = require('../../modules/supabaseServer');

const router: Router = express.Router();

// ==================== Types ====================

interface CohortRow {
  cohort_week: string;
  week_offset: number;
  retained: number;
  cohort_size: number;
  retention_pct: number;
}

interface FunnelData {
  registered: number;
  playedFirstGame: number;
  returnedDay7: number;
  returnedDay30: number;
}

interface SupabaseClient {
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => {
    select: (...args: unknown[]) => {
      lt: (...args: unknown[]) => {
        not: (...args: unknown[]) => {
          order: (...args: unknown[]) => {
            range: (...args: unknown[]) => Promise<{ data: unknown[] | null; count: number | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };
}

// ==================== Service Functions (exported for testing) ====================

const EMPTY_FUNNEL: FunnelData = { registered: 0, playedFirstGame: 0, returnedDay7: 0, returnedDay30: 0 };

export async function fetchCohortRetention(supabase: SupabaseClient, weeks: number): Promise<CohortRow[]> {
  const { data, error } = await supabase.rpc('admin_cohort_retention', { weeks });
  if (error || !data) return [];
  return data as CohortRow[];
}

export async function fetchChurnRisk(
  supabase: SupabaseClient,
  inactiveDays: number,
  limit: number,
  offset: number
): Promise<{ players: unknown[]; pagination: ReturnType<typeof buildPaginationMeta> }> {
  const cutoff = new Date(Date.now() - inactiveDays * 86400000).toISOString();

  const { data, count, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, country_code, total_games, total_xp, last_game_at, created_at', { count: 'exact' } as never)
    .lt('last_game_at', cutoff)
    .not('last_game_at', 'is', null as never)
    .order('last_game_at', { ascending: false } as never)
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('ADMIN_ANALYTICS', `Churn risk query failed: ${error.message}`);
    return { players: [], pagination: buildPaginationMeta(0, { limit, offset }) };
  }

  return {
    players: data ?? [],
    pagination: buildPaginationMeta(count ?? 0, { limit, offset }),
  };
}

export async function fetchEngagementFunnel(supabase: SupabaseClient): Promise<FunnelData> {
  const { data, error } = await supabase.rpc('admin_engagement_funnel');
  if (error || !data) return EMPTY_FUNNEL;
  return data as FunnelData;
}

// ==================== Routes ====================

/**
 * GET /api/admin/analytics/cohorts
 * Weekly retention cohort table
 */
router.get('/analytics/cohorts', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const weeks = Math.min(Math.max(Number(req.query.weeks) || 12, 1), 24);

    const cohorts = await withCache(`admin:cohorts:${weeks}`, 300, () =>
      fetchCohortRetention(getSupabase(), weeks)
    );

    res.json(successResponse({ cohorts }));
  } catch (err) {
    logger.error('ADMIN_ANALYTICS', `Cohort error: ${(err as Error).message}`);
    res.status(500).json(errorResponse('COHORT_QUERY_FAILED', (err as Error).message));
  }
});

/**
 * GET /api/admin/analytics/churn-risk
 * Players at risk of churning (no game in N days)
 */
router.get('/analytics/churn-risk', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const inactiveDays = Math.min(Math.max(Number(req.query.days) || 14, 1), 60);
    const { limit, offset } = paginationSchema.parse(req.query);

    const result = await fetchChurnRisk(getSupabase(), inactiveDays, limit, offset);
    res.json(successResponse(result));
  } catch (err) {
    logger.error('ADMIN_ANALYTICS', `Churn risk error: ${(err as Error).message}`);
    res.status(500).json(errorResponse('CHURN_QUERY_FAILED', (err as Error).message));
  }
});

/**
 * GET /api/admin/analytics/funnel
 * Engagement funnel: signup → first game → D7 → D30
 */
router.get('/analytics/funnel', async (_req: AdminRequest, res: Response): Promise<void> => {
  try {
    const funnel = await withCache('admin:funnel', 300, () =>
      fetchEngagementFunnel(getSupabase())
    );

    res.json(successResponse({ funnel }));
  } catch (err) {
    logger.error('ADMIN_ANALYTICS', `Funnel error: ${(err as Error).message}`);
    res.status(500).json(errorResponse('FUNNEL_QUERY_FAILED', (err as Error).message));
  }
});

export default router;
