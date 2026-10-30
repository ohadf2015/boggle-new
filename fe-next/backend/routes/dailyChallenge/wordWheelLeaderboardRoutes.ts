/**
 * Word Wheel daily + all-time boards: /api/daily-challenge/word-wheel/{leaderboard,alltime-leaderboard}
 */

import express, { Request, Response, Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../../modules/supabaseServer';
import logger from '../../utils/logger';
import type { LeaderboardParams, LeaderboardQuery } from './types';
import { isValidDateFormat, isValidLanguage, isLeaderboardLanguageScope, withLanguageScope } from './utils';
import { rerankSequential, dedupeByPlayerKeepBest, sortWordWheelRowsGlobally } from './leaderboardSort';
import { cookieAccessToken } from '../../../lib/auth/getAuthedUser';
import { aggregateWordPlayerCounts, type RarityRow } from '../../../lib/wordWheel/wordRarity';

const router: Router = express.Router();

// Upper bound on attempts scanned for the rarity aggregate. A daily puzzle's
// attempts are date+language scoped (indexed), so this caps a popular day's
// read without an unbounded table scan.
const RARITY_ROW_CAP = 5000;

const LOOKUP_CAP_MS = 1_000;
const DAILY_COLUMNS: string = 'puzzle_date, puzzle_number, language, player_id, guest_fingerprint, display_name, avatar_emoji, avatar_color, avatar_image, profile_picture_url, custom_avatar, country_code, score, word_count, longest_word, time_seconds, center_letter, completed_at';
const ALLTIME_COLUMNS: string = 'player_identifier, player_id, guest_fingerprint, language, display_name, avatar_emoji, avatar_color, avatar_image, profile_picture_url, custom_avatar, country_code, total_efficiency_score, total_games, games_won, avg_attempts, best_efficiency, last_played_at, rank_position';
const PUBLIC_DAILY_CACHE = 'public, max-age=20, s-maxage=20, stale-while-revalidate=60';
const PUBLIC_ALLTIME_CACHE = 'public, max-age=60, s-maxage=60, stale-while-revalidate=180';
const VIEWER_CACHE = 'private, no-store';

type BoardRow = Record<string, unknown> & { player_id?: string | null; guest_fingerprint?: string | null };

function capped<T>(work: PromiseLike<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    Promise.resolve(work),
    new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), LOOKUP_CAP_MS); }),
  ]).catch(() => null).finally(() => clearTimeout(timer));
}

/** QA accounts never rank on a public board. Fails open: a slow or failed lookup keeps every row. */
export async function excludeTestAccounts<T extends BoardRow>(supabase: SupabaseClient, rows: T[]): Promise<T[]> {
  const ids = [...new Set(rows.map(r => r.player_id).filter((id): id is string => !!id))];
  if (ids.length === 0) return rows;
  const lookup = await capped(supabase.from('profiles').select('id, is_test_account').in('id', ids));
  if (!lookup || lookup.error) return rows;
  const test = new Set(((lookup.data ?? []) as Array<{ id: string; is_test_account?: boolean | null }>)
    .filter(p => p.is_test_account === true).map(p => p.id));
  return test.size === 0 ? rows : rows.filter(r => !r.player_id || !test.has(r.player_id));
}

interface Viewer { playerId: string | null; guestFingerprint: string | null }

/** Who is asking, so a caller below the cut still sees their own row. Null for an anonymous read. */
async function resolveViewer(req: Request, supabase: SupabaseClient): Promise<Viewer | null> {
  const fp = typeof req.query.fp === 'string' && req.query.fp ? req.query.fp : null;
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ')
    ? auth.slice(7)
    : await cookieAccessToken({ headers: { get: (name: string) => (req.headers[name.toLowerCase()] as string | undefined) ?? null } } as never).catch(() => null);
  if (token) {
    const result = await capped(supabase.auth.getUser(token));
    const id = result && !result.error ? result.data?.user?.id ?? null : null;
    if (id) return { playerId: id, guestFingerprint: null };
  }
  return fp ? { playerId: null, guestFingerprint: fp } : null;
}

const isViewer = (row: BoardRow, v: Viewer) =>
  v.playerId ? row.player_id === v.playerId : !row.player_id && row.guest_fingerprint === v.guestFingerprint;

// GET /leaderboard/:date/:language — `:language` is a concrete language OR `all`.
router.get('/leaderboard/:date/:language', async (req: Request<LeaderboardParams, unknown, unknown, LeaderboardQuery>, res: Response): Promise<void> => {
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

    const scoped = (columns: string, head = false) => withLanguageScope(
      supabase.from('daily_word_wheel_attempts').select(columns, head ? { count: 'exact', head: true } : undefined).eq('puzzle_date', date),
      language,
    );

    // Guests rank too (the combined board merges this with Word Hunt's, which lists them).
    // The view has one row per attempt, so over-fetch, keep each player's best, and renumber.
    const [board, viewer, total, guests, solved] = await Promise.all([
      withLanguageScope(supabase.from('daily_word_wheel_leaderboard').select(DAILY_COLUMNS).eq('puzzle_date', date), language)
        .order('score', { ascending: false, nullsFirst: false })
        .order('word_count', { ascending: false, nullsFirst: false })
        .order('completed_at', { ascending: true, nullsFirst: false })
        // ponytail: ×10 cap 500 covers current worst case; move to DISTINCT ON in the view if replays climb.
        .limit(Math.min(limit * 10, 500)),
      resolveViewer(req as unknown as Request, supabase),
      scoped('id', true),
      scoped('id', true).is('player_id', null).not('guest_fingerprint', 'is', null),
      // Wheel has no `solved` flag: anyone with at least one word counts.
      scoped('id', true).gt('word_count', 0),
    ]);

    if (board.error) {
      logger.error('API', `Word Wheel leaderboard error: ${board.error.message}`);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
      return;
    }

    const ranked = rerankSequential(await excludeTestAccounts(
      supabase,
      dedupeByPlayerKeepBest(sortWordWheelRowsGlobally((board.data ?? []) as unknown as Array<BoardRow & { score: number }>)),
    ));
    const page = ranked.slice(0, limit);
    const participants = page.length;
    if (viewer && !page.some(r => isViewer(r, viewer))) {
      const own = ranked.find(r => isViewer(r, viewer));
      if (own) page.push(own);
    }

    res.set('Cache-Control', viewer ? VIEWER_CACHE : PUBLIC_DAILY_CACHE);
    res.json({
      data: page,
      totalParticipants: participants,
      totalSolved: solved.count ?? 0,
      totalAttempts: total.count ?? 0,
      guestPlayerCount: guests.count ?? 0,
      date,
      language,
    });
  } catch (error) {
    logger.error('API', `Word Wheel leaderboard error: ${(error as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /alltime-leaderboard/:language — cross-language: the view ranks each player over every language.
router.get('/alltime-leaderboard/:language', async (req: Request<{ language: string }, unknown, unknown, LeaderboardQuery>, res: Response): Promise<void> => {
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
      supabase.from('word_wheel_alltime_leaderboard').select(ALLTIME_COLUMNS).order('rank_position', { ascending: true }).limit(limit + 20),
      supabase.from('word_wheel_alltime_leaderboard').select('player_id', { count: 'exact', head: true }),
      resolveViewer(req as unknown as Request, supabase),
    ]);
    if (board.error) {
      logger.error('API', `Word Wheel all-time leaderboard error: ${board.error.message}`);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
      return;
    }

    const rows = (board.data ?? []) as unknown as BoardRow[];
    const page: BoardRow[] = (await excludeTestAccounts(supabase, rows)).slice(0, limit).map((r, i) => ({ ...r, rank_position: i + 1 }));
    if (viewer?.playerId && !page.some(r => r.player_id === viewer.playerId)) {
      const own = await capped(supabase.from('word_wheel_alltime_leaderboard').select(ALLTIME_COLUMNS).eq('player_id', viewer.playerId).maybeSingle());
      if (own && !own.error && own.data) page.push(own.data as unknown as BoardRow);
    }

    res.set('Cache-Control', viewer ? VIEWER_CACHE : PUBLIC_ALLTIME_CACHE);
    res.json({
      data: page,
      totalParticipants: count.count || rows.length || 0,
      language,
    });
  } catch (error) {
    logger.error('API', `Word Wheel all-time leaderboard error: ${(error as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// GET /api/daily-challenge/word-wheel/word-rarity/:date/:language
// ==========================================
// Distinct-player count per word across the day's attempts. Powers the
// results-screen "rarest find / only you found X (so far)" celebration.
// NOTE: daily play is async — counts are a point-in-time snapshot, never final.

router.get('/word-rarity/:date/:language', async (req: Request<{ date: string; language: string }>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Service not available' });
      return;
    }

    const { date, language } = req.params;
    if (!isValidDateFormat(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }
    if (!isValidLanguage(language)) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    const { data, error } = await supabase
      .from('daily_word_wheel_attempts')
      .select('player_id, guest_fingerprint, words_found')
      .eq('puzzle_date', date)
      .eq('language', language)
      .limit(RARITY_ROW_CAP);

    if (error) {
      logger.error('API', `Word Wheel rarity fetch error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch rarity' });
      return;
    }

    const rows: RarityRow[] = (data ?? []).map((row) => ({
      id: (row.player_id as string | null) ?? (row.guest_fingerprint as string | null) ?? null,
      words: Array.isArray(row.words_found)
        ? (row.words_found as unknown[]).filter((w): w is string => typeof w === 'string')
        : [],
    }));

    res.json({ counts: aggregateWordPlayerCounts(rows) });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Wheel rarity fetch error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
