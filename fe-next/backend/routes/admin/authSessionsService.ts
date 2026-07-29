/**
 * Aggregator + route for authenticated game sessions.
 *
 * Mirror of the guest-games admin endpoint: same response shape, but the
 * source set is `user_id IS NOT NULL` instead of `user_id IS NULL`. Lets
 * the admin analytics page surface auth-player breakdowns previously
 * invisible (the existing /analytics/guest-games filters auth users out).
 */

import express, { Response, Router } from 'express';
import type { AdminRequest } from './types';
import logger from '../../utils/logger';

const { getSupabase } = require('../../modules/supabaseServer');

interface AuthSession {
  user_id: string | null;
  mode: string | null;
  language: string | null;
  score: number | null;
  duration_seconds: number | null;
  completed: boolean | null;
}

export interface AuthSessionStats {
  totalGames: number;
  totalScore: number;
  avgScore: number;
  uniqueUsers: number;
  completedCount: number;
  completionRate: number;
  byMode: { mode: string; count: number }[];
  byLanguage: { language: string; count: number }[];
}

const EMPTY: AuthSessionStats = {
  totalGames: 0,
  totalScore: 0,
  avgScore: 0,
  uniqueUsers: 0,
  completedCount: 0,
  completionRate: 0,
  byMode: [],
  byLanguage: [],
};

export function aggregateAuthSessions(sessions: AuthSession[]): AuthSessionStats {
  if (sessions.length === 0) return { ...EMPTY };

  const users = new Set<string>();
  const byMode: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  let totalScore = 0;
  let completedCount = 0;

  for (const s of sessions) {
    if (s.user_id) users.add(s.user_id);
    totalScore += s.score ?? 0;
    if (s.completed) completedCount += 1;
    if (s.mode) byMode[s.mode] = (byMode[s.mode] || 0) + 1;
    if (s.language) byLanguage[s.language] = (byLanguage[s.language] || 0) + 1;
  }

  const totalGames = sessions.length;

  return {
    totalGames,
    totalScore,
    avgScore: Math.round(totalScore / totalGames),
    uniqueUsers: users.size,
    completedCount,
    completionRate: Math.round((completedCount / totalGames) * 100),
    byMode: Object.entries(byMode)
      .sort((a, b) => b[1] - a[1])
      .map(([mode, count]) => ({ mode, count })),
    byLanguage: Object.entries(byLanguage)
      .sort((a, b) => b[1] - a[1])
      .map(([language, count]) => ({ language, count })),
  };
}

const router: Router = express.Router();

/**
 * GET /api/admin/analytics/auth-games
 * Authenticated-player game session aggregates over the last N days.
 */
router.get('/analytics/auth-games', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);

    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database not available' });
      return;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('game_sessions')
      .select('user_id, mode, language, score, duration_seconds, completed')
      .not('user_id', 'is', null)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Be tolerant if the table is missing on a fresh dev DB.
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        res.json({ stats: EMPTY, sampledFromLast: limit, days, message: 'Game sessions table not yet created.' });
        return;
      }
      throw error;
    }

    const stats = aggregateAuthSessions((data ?? []) as AuthSession[]);

    res.json({ stats, sampledFromLast: limit, days });
  } catch (err) {
    const error = err as Error;
    logger.error('ADMIN_AUTH_SESSIONS', `auth-games error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch auth game sessions' });
  }
});

export default router;
