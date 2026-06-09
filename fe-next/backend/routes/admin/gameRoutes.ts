/**
 * Admin Game Routes
 * Game history, activity tracking, realtime stats, and analytics.
 */

import express, { Response, Router } from 'express';
import type { AdminRequest, SocketIO, GameInfo, DailyDataEntry, GuestSession, GuestPlayerStat, EventRow } from './types';
import logger from '../../utils/logger';
import { getActiveSinglePlayerCount, getActiveSinglePlayerSessions } from '../singlePlayer';
import { getActivePagePresence } from '../presence';
import { playersOnOtherPages } from '../../../lib/admin/liveMonitor/playersOnOtherPages';

interface DetailedGamePlayerLite {
  isBot: boolean;
  username: string;
  playerId: string | null;
}
interface DetailedGameLite {
  players: DetailedGamePlayerLite[];
}

const { getSupabase } = require('../../modules/supabaseServer');
const { getAllGames, getDetailedGames } = require('../../modules/gameStateManager');
const { isInProgress } = require('../../utils/gameStateMachine');

const router: Router = express.Router();

/**
 * GET /api/admin/games/history
 * Get recent games history
 */
router.get('/games/history', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('game_results')
      .select(`
        id,
        game_code,
        score,
        word_count,
        placement,
        is_ranked,
        language,
        time_played,
        created_at,
        player_id,
        profiles:player_id (username, display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ games: data || [] });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Games history error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch games history' });
  }
});

/**
 * GET /api/admin/activity/daily
 * Get daily activity for charts (includes both authenticated and guest games)
 */
router.get('/activity/daily', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const supabase = getSupabase();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get authenticated user games from game_results
    const { data: gamesData, error: gamesError } = await supabase
      .from('game_results')
      .select('created_at, player_id')
      .gte('created_at', startDate.toISOString());

    if (gamesError) throw gamesError;

    // Get guest games from game_sessions
    let guestGamesData: { started_at: string; guest_session_id: string }[] = [];
    try {
      const { data: guestData } = await supabase
        .from('game_sessions')
        .select('started_at, guest_session_id')
        .is('user_id', null)
        .not('guest_session_id', 'is', null)
        .eq('completed', true)
        .gte('started_at', startDate.toISOString());

      guestGamesData = guestData || [];
    } catch {
      // game_sessions table might not exist or have different structure
      logger.debug('ADMIN_API', 'Guest game sessions unavailable for daily activity');
    }

    const { data: signupsData, error: signupsError } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    if (signupsError) throw signupsError;

    // Aggregate by day
    const dailyData: Record<string, DailyDataEntry> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = { games: 0, guestGames: 0, uniquePlayers: new Set(), uniqueGuests: new Set(), signups: 0 };
    }

    // Add authenticated games
    gamesData?.forEach((game: { created_at: string; player_id: string }) => {
      const dateStr = game.created_at.split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].games++;
        dailyData[dateStr].uniquePlayers.add(game.player_id);
      }
    });

    // Add guest games
    guestGamesData.forEach((game: { started_at: string; guest_session_id: string }) => {
      const dateStr = game.started_at.split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].guestGames++;
        dailyData[dateStr].uniqueGuests.add(game.guest_session_id);
      }
    });

    signupsData?.forEach((profile: { created_at: string }) => {
      const dateStr = profile.created_at.split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].signups++;
      }
    });

    const result = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        games: data.games,
        guestGames: data.guestGames,
        totalGames: data.games + data.guestGames,
        uniquePlayers: data.uniquePlayers.size,
        uniqueGuests: data.uniqueGuests.size,
        totalUniquePlayers: data.uniquePlayers.size + data.uniqueGuests.size,
        signups: data.signups,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ daily: result });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Daily activity error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch daily activity' });
  }
});

/**
 * GET /api/admin/realtime
 * Get current realtime stats
 */
router.get('/realtime', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const games = getAllGames() as GameInfo[];
    const io = req.app.get('io') as SocketIO | undefined;

    const activeRooms = games.length;
    // Count humans only — bots must not inflate the online count.
    const detailed = getDetailedGames() as DetailedGameLite[];
    const playersOnline = detailed.reduce(
      (sum: number, g) => sum + g.players.filter((p) => !p.isBot).length,
      0
    );
    // Use state machine helper to check if game is in progress
    const gamesInProgress = games.filter((g: GameInfo) => isInProgress(g.gameState)).length;
    const socketConnections = io ? io.sockets.sockets.size : 0;
    const singlePlayerCount = getActiveSinglePlayerCount();

    res.json({
      activeRooms,
      playersOnline,
      gamesInProgress,
      socketConnections,
      singlePlayerCount,
      timestamp: Date.now(),
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Realtime error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch realtime stats' });
  }
});

/**
 * GET /api/admin/live-games
 * Get detailed live game information for admin monitoring
 */
router.get('/live-games', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const io = req.app.get('io') as SocketIO | undefined;
    const detailedGames = getDetailedGames() as DetailedGameLite[];
    const singlePlayerCount = getActiveSinglePlayerCount();
    const singlePlayers = getActiveSinglePlayerSessions();

    // Calculate stats — exclude bots from the human player count.
    const activeGames = detailedGames.length;
    const playersInGames = detailedGames.reduce(
      (sum: number, game) => sum + game.players.filter((p) => !p.isBot).length,
      0
    );
    const botsInGames = detailedGames.reduce(
      (sum: number, game) => sum + game.players.filter((p) => p.isBot).length,
      0
    );
    const socketConnections = io ? io.sockets.sockets.size : 0;

    // Players currently on the site but not in any game (landing/lobby/etc).
    const gameUsernames: string[] = [];
    const gamePlayerIds: string[] = [];
    for (const game of detailedGames) {
      for (const p of game.players) {
        if (p.isBot) continue;
        gameUsernames.push(p.username);
        if (p.playerId) gamePlayerIds.push(p.playerId);
      }
    }
    const spUsernames = singlePlayers.map((s) => s.username);
    const spPlayerIds = singlePlayers
      .map((s) => s.playerId)
      .filter((id): id is string => !!id);

    const pagePresence = playersOnOtherPages(getActivePagePresence(), {
      gameUsernames,
      gamePlayerIds,
      spUsernames,
      spPlayerIds,
    });
    const playersOnPages = pagePresence.reduce((sum, g) => sum + g.count, 0);

    res.json({
      games: detailedGames,
      singlePlayers,
      pagePresence,
      stats: {
        activeGames,
        playersInGames,
        botsInGames,
        socketConnections,
        singlePlayerCount,
        playersOnPages,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Live games error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch live games' });
  }
});

/**
 * GET /api/admin/analytics/guest-players
 * Get guest player statistics
 */
router.get('/analytics/guest-players', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('metadata, utm_source, utm_medium, utm_campaign, referrer, country_code, created_at')
      .not('metadata->guest_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Aggregate by guest name
    const guestStats: Record<string, GuestPlayerStat> = {};
    events?.forEach((event: EventRow) => {
      const guestName = event.metadata?.guest_name;
      if (!guestName) return;

      if (!guestStats[guestName]) {
        guestStats[guestName] = {
          name: guestName,
          events: 0,
          utm_source: event.utm_source,
          utm_medium: event.utm_medium,
          referrer: event.referrer,
          country_code: event.country_code,
          first_seen: event.created_at || '',
          last_seen: event.created_at || '',
        };
      }
      guestStats[guestName].events++;
      guestStats[guestName].last_seen = event.created_at || '';
    });

    const guests = Object.values(guestStats).sort((a, b) => b.events - a.events);

    // Count by UTM source
    const sourceStats: Record<string, number> = {};
    guests.forEach((guest) => {
      const source = guest.utm_source || 'direct';
      sourceStats[source] = (sourceStats[source] || 0) + 1;
    });

    res.json({
      guests,
      totalGuests: guests.length,
      bySource: Object.entries(sourceStats)
        .sort((a, b) => b[1] - a[1])
        .map(([source, count]) => ({ source, count })),
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Guest players error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch guest player data' });
  }
});

/**
 * GET /api/admin/analytics/guest-games
 * Get guest game sessions from the game_sessions table
 * This shows actual games played by guests (logged via gameSessionLogger)
 */
router.get('/analytics/guest-games', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get guest game sessions (sessions with guest_session_id but no user_id)
    const { data: guestSessions, error: sessionsError } = await supabase
      .from('game_sessions')
      .select(`
        id,
        guest_session_id,
        mode,
        language,
        score,
        words_found,
        duration_seconds,
        completed,
        room_code,
        player_count,
        final_rank,
        started_at,
        completed_at
      `)
      .is('user_id', null)
      .not('guest_session_id', 'is', null)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false })
      .limit(limit);

    if (sessionsError) {
      // Handle case where table doesn't exist yet
      if (sessionsError.message?.includes('does not exist') || sessionsError.code === '42P01') {
        res.json({
          sessions: [],
          stats: { totalGames: 0, totalScore: 0, avgScore: 0, byMode: {}, byLanguage: {} },
          message: 'Game sessions table not yet created.'
        });
        return;
      }
      throw sessionsError;
    }

    // Calculate stats
    const sessions = (guestSessions || []) as GuestSession[];
    const totalGames = sessions.length;
    const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
    const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;

    const byMode: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};
    const uniqueGuests = new Set<string>();

    sessions.forEach((s) => {
      byMode[s.mode] = (byMode[s.mode] || 0) + 1;
      byLanguage[s.language] = (byLanguage[s.language] || 0) + 1;
      if (s.guest_session_id) {
        uniqueGuests.add(s.guest_session_id);
      }
    });

    res.json({
      sessions: sessions.map(s => ({
        ...s,
        wordsCount: Array.isArray(s.words_found) ? s.words_found.length : 0,
      })),
      stats: {
        totalGames,
        totalScore,
        avgScore,
        uniqueGuests: uniqueGuests.size,
        byMode: Object.entries(byMode)
          .sort((a, b) => b[1] - a[1])
          .map(([mode, count]) => ({ mode, count })),
        byLanguage: Object.entries(byLanguage)
          .sort((a, b) => b[1] - a[1])
          .map(([language, count]) => ({ language, count })),
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Guest games error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch guest game data' });
  }
});

export default router;
