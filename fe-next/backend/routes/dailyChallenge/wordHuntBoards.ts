/**
 * Word Hunt daily + all-time boards: /api/daily-challenge/word-hunt/{leaderboard,alltime-leaderboard}
 */

import type { Request, Response } from 'express';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../../modules/supabaseServer';
import logger from '../../utils/logger';
import type { LeaderboardParams, LeaderboardQuery } from './types';
import { isValidDateFormat, isValidLanguage, isLeaderboardLanguageScope, withLanguageScope } from './utils';
import { rerankSequential, dedupeByPlayerKeepBest, sortWordHuntRowsGlobally } from './leaderboardSort';
import { type BoardRow, capped, excludeTestAccounts, testAccountIds, resolveViewer, isViewer } from './boardViewer';

const DAILY_COLUMNS: string = 'puzzle_date, puzzle_number, language, player_id, guest_fingerprint, display_name, avatar_emoji, avatar_color, avatar_image, profile_picture_url, custom_avatar, country_code, solved, attempts_used, efficiency_score, life_remaining, words_discovered, completed_at';
const ALLTIME_COLUMNS: string = 'player_identifier, player_id, guest_fingerprint, language, display_name, avatar_emoji, avatar_color, avatar_image, profile_picture_url, custom_avatar, country_code, total_efficiency_score, total_games, games_won, avg_attempts, best_efficiency, last_played_at, rank_position';
const PUBLIC_DAILY_CACHE = 'public, max-age=20, s-maxage=20, stale-while-revalidate=60';
const PUBLIC_ALLTIME_CACHE = 'public, max-age=60, s-maxage=60, stale-while-revalidate=180';
const VIEWER_CACHE = 'private, no-store';
const COUNT_COLUMN: string = 'id';

type HuntBoardRow = BoardRow & { solved?: boolean | null; efficiency_score?: number | null; attempts_used?: number | null; completed_at?: string | null };

function sendReadError(res: Response, label: string, error: PostgrestError): void {
  logger.error('API', `${label} error: ${JSON.stringify({ message: error.message, code: error.code, details: error.details, hint: error.hint })}`);
  const isAuthError = error.message?.includes('401') || error.message?.includes('JWT') || error.message?.includes('Invalid API key')
    || ['PGRST301', 'PGRST302', 'PGRST303'].includes(error.code);
  if (isAuthError) {
    logger.error('API', 'Supabase authentication failed - check SUPABASE_SERVICE_ROLE_KEY environment variable');
    res.status(503).json({ error: 'Database authentication failed', hint: 'The service role key may be invalid or expired. Check server logs.' });
    return;
  }
  res.status(500).json({ error: 'Failed to fetch leaderboard' });
}

/**
 * GET /leaderboard/:date/:language — `:language` is a concrete language OR `all`.
 * Guests and unsolved attempts rank too (the view orders `solved DESC`); the view
 * has one row per attempt, so over-fetch, keep each player's best, and renumber.
 */
export async function wordHuntDailyBoard(req: Request<LeaderboardParams, unknown, unknown, LeaderboardQuery>, res: Response): Promise<void> {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Leaderboard service not available' });
      return;
    }
    const { date, language } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50') || 50, 100);
    if (!isValidDateFormat(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }
    if (!isLeaderboardLanguageScope(language)) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    const countAttempts = () => withLanguageScope(
      supabase.from('daily_word_hunt_attempts').select(COUNT_COLUMN, { count: 'exact', head: true }).eq('puzzle_date', date),
      language,
    );
    const [board, viewer, total, solved, guests] = await Promise.all([
      withLanguageScope(supabase.from('daily_word_hunt_leaderboard').select(DAILY_COLUMNS).eq('puzzle_date', date), language)
        .order('solved', { ascending: false, nullsFirst: false })
        .order('efficiency_score', { ascending: false, nullsFirst: false })
        .order('attempts_used', { ascending: true, nullsFirst: false })
        .order('completed_at', { ascending: true, nullsFirst: false })
        // ponytail: ×10 cap 500 covers current worst case; move to DISTINCT ON in the view if replays climb.
        .limit(Math.min(limit * 10, 500)),
      resolveViewer(req as unknown as Request, supabase),
      countAttempts(),
      countAttempts().eq('solved', true),
      countAttempts().eq('solved', true).is('player_id', null).not('guest_fingerprint', 'is', null),
    ]);

    if (board.error) {
      sendReadError(res, 'Word Hunt leaderboard', board.error);
      return;
    }
    for (const [name, r] of [['total', total], ['solved', solved], ['guest', guests]] as const) {
      if (r.error) logger.warn('API', `Word Hunt ${name} count error: ${r.error.message || r.error.code || 'Unknown'}`);
    }

    const ranked = rerankSequential(await excludeTestAccounts(
      supabase,
      dedupeByPlayerKeepBest(sortWordHuntRowsGlobally((board.data ?? []) as unknown as HuntBoardRow[])),
    ));
    const page = ranked.slice(0, limit);
    const totalSolved = solved.count ?? 0;
    const totalParticipants = Math.max(totalSolved, page.length);
    if (viewer && !page.some(r => isViewer(r, viewer))) {
      const own = ranked.find(r => isViewer(r, viewer));
      if (own) page.push(own);
    }

    res.set('Cache-Control', viewer ? VIEWER_CACHE : PUBLIC_DAILY_CACHE);
    res.json({
      data: page,
      totalParticipants,
      totalPlayers: total.count ?? 0,
      totalSolved,
      guestPlayerCount: guests.count ?? 0,
      date,
      language,
    });
  } catch (error) {
    logger.error('API', `Word Hunt leaderboard error: ${(error as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** The caller's row with QA accounts above them taken out of their rank; null for a QA caller. */
async function ownAlltimeRow(supabase: SupabaseClient, playerId: string): Promise<BoardRow | null> {
  const [own, testIds] = await Promise.all([
    capped(supabase.from('word_hunt_alltime_leaderboard').select(ALLTIME_COLUMNS).eq('player_id', playerId).maybeSingle()),
    testAccountIds(supabase),
  ]);
  if (!own || own.error || !own.data) return null;
  const row = own.data as unknown as BoardRow & { rank_position: number };
  if (!testIds?.length) return row;
  if (testIds.includes(playerId)) return null;
  const ahead = await capped(supabase.from('word_hunt_alltime_leaderboard')
    .select('player_id', { count: 'exact', head: true })
    .in('player_id', testIds)
    .lt('rank_position', row.rank_position));
  const qaAbove = ahead && !ahead.error ? ahead.count ?? 0 : 0;
  return { ...row, rank_position: row.rank_position - qaAbove };
}

/** GET /alltime-leaderboard/:language — cross-language: the view ranks each signed-in player over every language. */
export async function wordHuntAlltimeBoard(req: Request<{ language: string }, unknown, unknown, LeaderboardQuery>, res: Response): Promise<void> {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Leaderboard service not available' });
      return;
    }
    const { language } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50') || 50, 100);
    if (!isValidLanguage(language)) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    // A little headroom so dropping QA accounts still fills the page.
    const [board, count, viewer] = await Promise.all([
      supabase.from('word_hunt_alltime_leaderboard').select(ALLTIME_COLUMNS).order('rank_position', { ascending: true }).limit(limit + 20),
      supabase.from('word_hunt_alltime_leaderboard').select('player_id', { count: 'exact', head: true }),
      resolveViewer(req as unknown as Request, supabase),
    ]);
    if (board.error) {
      sendReadError(res, 'Word Hunt all-time leaderboard', board.error);
      return;
    }
    if (count.error) logger.warn('API', `Word Hunt all-time leaderboard count error: ${count.error.message}`);

    const rows = (board.data ?? []) as unknown as BoardRow[];
    const page: BoardRow[] = (await excludeTestAccounts(supabase, rows)).slice(0, limit).map((r, i) => ({ ...r, rank_position: i + 1 }));
    if (viewer?.playerId && !page.some(r => r.player_id === viewer.playerId)) {
      const own = await ownAlltimeRow(supabase, viewer.playerId);
      if (own) page.push(own);
    }

    res.set('Cache-Control', viewer ? VIEWER_CACHE : PUBLIC_ALLTIME_CACHE);
    res.json({
      data: page,
      totalParticipants: count.count || rows.length || 0,
      language,
    });
  } catch (error) {
    logger.error('API', `Word Hunt all-time leaderboard error: ${(error as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}
