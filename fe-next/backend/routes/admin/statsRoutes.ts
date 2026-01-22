/**
 * Admin Stats Routes
 * Dashboard statistics and overview metrics.
 */

import express, { Response, Router } from 'express';
import type { AdminRequest, StatsResponse } from './types';
import logger from '../../utils/logger';

const { getSupabase } = require('../../modules/supabaseServer');

const router: Router = express.Router();

/**
 * GET /api/admin/stats
 * Get main dashboard statistics
 */
router.get('/stats', async (_req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get total unique players
    const { count: totalPlayers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total games played
    const { count: totalGames } = await supabase
      .from('game_results')
      .select('*', { count: 'exact', head: true });

    // Get games today
    const { count: gamesToday } = await supabase
      .from('game_results')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);

    // Get unique players today
    const { data: todayPlayersData } = await supabase
      .from('game_results')
      .select('player_id')
      .gte('created_at', todayStart);
    const uniquePlayersToday = new Set(todayPlayersData?.map((r: { player_id: string }) => r.player_id)).size;

    // Get unique players this week
    const { data: weekPlayersData } = await supabase
      .from('game_results')
      .select('player_id')
      .gte('created_at', weekAgo);
    const uniquePlayersWeek = new Set(weekPlayersData?.map((r: { player_id: string }) => r.player_id)).size;

    // Get unique players this month
    const { data: monthPlayersData } = await supabase
      .from('game_results')
      .select('player_id')
      .gte('created_at', monthAgo);
    const uniquePlayersMonth = new Set(monthPlayersData?.map((r: { player_id: string }) => r.player_id)).size;

    // Get cumulative game time (in hours)
    const { data: timeData } = await supabase
      .from('profiles')
      .select('total_time_played');
    const totalGameTimeSeconds = timeData?.reduce((sum: number, p: { total_time_played?: number }) => sum + (p.total_time_played || 0), 0) || 0;
    const totalGameTimeHours = Math.round(totalGameTimeSeconds / 3600 * 10) / 10;

    // Get new signups today
    const { count: signupsToday } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);

    // Get new signups this week
    const { count: signupsWeek } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    // Get total words found
    const { data: wordsData } = await supabase
      .from('profiles')
      .select('total_words');
    const totalWords = wordsData?.reduce((sum: number, p: { total_words?: number }) => sum + (p.total_words || 0), 0) || 0;

    // Get games by language
    const { data: langData } = await supabase
      .from('game_results')
      .select('language');
    const languageCounts: Record<string, number> = {};
    langData?.forEach((g: { language?: string }) => {
      const lang = g.language || 'en';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    // Get guest game stats from game_sessions table
    let guestStats: StatsResponse['guests'] = undefined;
    try {
      // Total guest games (sessions with guest_session_id but no user_id)
      const { count: totalGuestGames } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null)
        .not('guest_session_id', 'is', null);

      // Guest games today
      const { count: guestGamesToday } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null)
        .not('guest_session_id', 'is', null)
        .gte('started_at', todayStart);

      // Unique guest sessions
      const { data: guestSessionsData } = await supabase
        .from('game_sessions')
        .select('guest_session_id')
        .is('user_id', null)
        .not('guest_session_id', 'is', null);
      const uniqueGuestSessions = new Set(
        guestSessionsData?.map((s: { guest_session_id: string }) => s.guest_session_id)
      ).size;

      guestStats = {
        totalGuestGames: totalGuestGames || 0,
        guestGamesToday: guestGamesToday || 0,
        uniqueGuestSessions,
      };
    } catch (guestError) {
      // game_sessions table might not exist yet, just skip guest stats
      logger.debug('ADMIN_API', 'Guest stats unavailable: game_sessions table may not exist');
    }

    const response: StatsResponse = {
      overview: {
        totalPlayers: totalPlayers || 0,
        totalGames: totalGames || 0,
        totalGameTimeHours,
        totalWords,
      },
      activity: {
        gamesToday: gamesToday || 0,
        uniquePlayersToday,
        uniquePlayersWeek,
        uniquePlayersMonth,
        signupsToday: signupsToday || 0,
        signupsWeek: signupsWeek || 0,
      },
      languages: languageCounts,
      guests: guestStats,
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Stats error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
