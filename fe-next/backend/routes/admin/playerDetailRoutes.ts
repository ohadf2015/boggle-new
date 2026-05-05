/**
 * Admin player drill-down detail.
 *
 * Composes the per-player view that powers /admin/players/[id]: rich profile
 * row + last 50 game results + per-language aggregates + the player's most
 * recent season-leaderboard entry.
 *
 * All queries are wrapped in Promise.allSettled so a missing table (e.g.
 * season_leaderboards on a fresh dev DB) doesn't take the page down.
 */

import express, { Response, Router } from 'express';
import type { AdminRequest } from './types';
import { successResponse, errorResponse } from './responseHelpers';
import logger from '../../utils/logger';

const { getSupabase } = require('../../modules/supabaseServer');

const RECENT_GAME_LIMIT = 50;

interface SupabaseRowResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface SupabaseListResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  avatar_image: string | null;
  avatar_config: unknown | null;
  total_score: number | null;
  total_games: number | null;
  total_words: number | null;
  total_time_played: number | null;
  total_xp: number | null;
  current_level: number | null;
  casual_games: number | null;
  ranked_games: number | null;
  casual_wins: number | null;
  ranked_wins: number | null;
  ranked_mmr: number | null;
  peak_mmr: number | null;
  longest_word: string | null;
  longest_word_length: number | null;
  total_coins: number | null;
  lifetime_coins_earned: number | null;
  total_hints_used: number | null;
  prestige_level: number | null;
  prestige_multiplier: number | null;
  country_code: string | null;
  referral_count: number | null;
  user_role: string | null;
  is_admin: boolean | null;
  blast_access: boolean | null;
  daily_email_subscribed: boolean | null;
  last_seen_at: string | null;
  last_game_at: string | null;
  created_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
}

interface GameRow {
  id: string;
  game_code: string | null;
  score: number | null;
  word_count: number | null;
  placement: number | null;
  is_ranked: boolean | null;
  language: string | null;
  time_played: number | null;
  created_at: string;
}

interface SeasonRow {
  season_id: number;
  season_score: number;
}

interface SessionRow {
  mode: string | null;
  score: number | null;
  duration_seconds: number | null;
  completed: boolean | null;
}

export interface ModeBreakdownRow {
  mode: string;
  count: number;
  totalScore: number;
  avgScore: number;
  completed: number;
}

const SESSION_LIMIT = 200;

const PROFILE_COLS = `
  id, username, display_name, avatar_emoji, avatar_color, avatar_image, avatar_config,
  total_score, total_games, total_words, total_time_played, total_xp, current_level,
  casual_games, ranked_games, casual_wins, ranked_wins,
  ranked_mmr, peak_mmr, longest_word, longest_word_length,
  total_coins, lifetime_coins_earned, total_hints_used,
  prestige_level, prestige_multiplier,
  country_code, referral_count, user_role, is_admin, blast_access,
  daily_email_subscribed, last_seen_at, last_game_at, created_at,
  utm_source, utm_medium, utm_campaign, referrer
`;

const GAME_COLS = `
  id, game_code, score, word_count, placement, is_ranked, language, time_played, created_at
`;

interface SupabaseLike {
  from: (table: string) => never;
}

export interface PlayerDetailResult {
  profile: ProfileRow | null;
  recentGames: GameRow[];
  aggregates: {
    games: number;
    totalScore: number;
    totalWords: number;
    avgScore: number;
    ranked: number;
    casual: number;
    byLanguage: { language: string; count: number }[];
  };
  modeBreakdown: ModeBreakdownRow[];
  season: { id: number; score: number } | null;
}

export async function fetchPlayerDetail(
  supabase: SupabaseLike,
  playerId: string,
): Promise<PlayerDetailResult> {
  const profilesTable = (supabase.from('profiles') as unknown as {
    select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<SupabaseRowResult<ProfileRow>> } };
  });
  const gamesTable = (supabase.from('game_results') as unknown as {
    select: (cols: string) => { eq: (col: string, val: string) => { order: (col: string, opts: object) => { limit: (n: number) => Promise<SupabaseListResult<GameRow>> } } };
  });
  const seasonTable = (supabase.from('season_leaderboards') as unknown as {
    select: (cols: string) => { eq: (col: string, val: string) => { order: (col: string, opts: object) => { limit: (n: number) => Promise<SupabaseListResult<SeasonRow>> } } };
  });
  const sessionsTable = (supabase.from('game_sessions') as unknown as {
    select: (cols: string) => { eq: (col: string, val: string) => { order: (col: string, opts: object) => { limit: (n: number) => Promise<SupabaseListResult<SessionRow>> } } };
  });

  const [profileRes, gamesRes, seasonRes, sessionsRes] = await Promise.allSettled([
    profilesTable.select(PROFILE_COLS).eq('id', playerId).single(),
    gamesTable.select(GAME_COLS).eq('player_id', playerId).order('created_at', { ascending: false }).limit(RECENT_GAME_LIMIT),
    seasonTable.select('season_id, season_score').eq('user_id', playerId).order('season_id', { ascending: false }).limit(1),
    sessionsTable.select('mode, score, duration_seconds, completed').eq('user_id', playerId).order('started_at', { ascending: false }).limit(SESSION_LIMIT),
  ]);

  const profile = profileRes.status === 'fulfilled' && !profileRes.value.error
    ? (profileRes.value.data as ProfileRow | null)
    : null;

  const recentGames: GameRow[] = gamesRes.status === 'fulfilled' && !gamesRes.value.error
    ? (gamesRes.value.data ?? [])
    : [];

  const seasonRow = seasonRes.status === 'fulfilled' && !seasonRes.value.error && seasonRes.value.data && seasonRes.value.data.length > 0
    ? seasonRes.value.data[0]
    : null;

  const byLanguageMap: Record<string, number> = {};
  let totalScore = 0;
  let totalWords = 0;
  let ranked = 0;
  let casual = 0;

  for (const g of recentGames) {
    if (g.language) byLanguageMap[g.language] = (byLanguageMap[g.language] || 0) + 1;
    totalScore += g.score ?? 0;
    totalWords += g.word_count ?? 0;
    if (g.is_ranked) ranked += 1; else casual += 1;
  }

  const games = recentGames.length;
  const avgScore = games > 0 ? Math.round(totalScore / games) : 0;
  const byLanguage = Object.entries(byLanguageMap)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);

  const sessions: SessionRow[] = sessionsRes.status === 'fulfilled' && !sessionsRes.value.error
    ? (sessionsRes.value.data ?? [])
    : [];

  const modeMap = new Map<string, { count: number; totalScore: number; completed: number }>();
  for (const s of sessions) {
    if (!s.mode) continue;
    const entry = modeMap.get(s.mode) ?? { count: 0, totalScore: 0, completed: 0 };
    entry.count += 1;
    entry.totalScore += s.score ?? 0;
    if (s.completed) entry.completed += 1;
    modeMap.set(s.mode, entry);
  }
  const modeBreakdown: ModeBreakdownRow[] = Array.from(modeMap.entries())
    .map(([mode, e]) => ({
      mode,
      count: e.count,
      totalScore: e.totalScore,
      avgScore: e.count > 0 ? Math.round(e.totalScore / e.count) : 0,
      completed: e.completed,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    profile,
    recentGames,
    aggregates: { games, totalScore, totalWords, avgScore, ranked, casual, byLanguage },
    modeBreakdown,
    season: seasonRow ? { id: seasonRow.season_id, score: seasonRow.season_score } : null,
  };
}

const router: Router = express.Router();

/**
 * GET /api/admin/players/:id/detail
 * Composed drill-down for the admin player page.
 */
router.get('/players/:id/detail', async (req: AdminRequest, res: Response): Promise<void> => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    res.status(400).json(errorResponse('MISSING_PLAYER_ID', 'Player id is required'));
    return;
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json(errorResponse('DB_UNAVAILABLE', 'Database not available'));
      return;
    }

    const detail = await fetchPlayerDetail(supabase, id);

    if (!detail.profile) {
      res.status(404).json(errorResponse('PLAYER_NOT_FOUND', 'Player not found'));
      return;
    }

    res.json(successResponse(detail));
  } catch (err) {
    const error = err as Error;
    logger.error('ADMIN_PLAYER_DETAIL', `Detail error: ${error.message}`);
    res.status(500).json(errorResponse('PLAYER_DETAIL_FAILED', error.message));
  }
});

export default router;
