/**
 * Daily-challenge SEASON leaderboards.
 *
 * Reads the `daily_word_hunt_season_leaderboard` / `daily_word_wheel_season_leaderboard`
 * views (one row per player × language × season, incl. the 10% prior-season
 * carry) and folds each player's languages into ONE global row, the same way the
 * all-time boards rank every player from around the world together.
 *
 * Pure aggregation lives in `aggregateSeasonRows` so the ordering contract is
 * unit-testable; the express handler only does I/O around it.
 */

import type { Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../../modules/supabaseServer';
import logger from '../../utils/logger';
import { isLeaderboardLanguageScope } from './utils';
import { ALL_LANGUAGES_SCOPE, type LeaderboardLanguageScope } from './types';

export interface SeasonViewRow {
  season_id: number;
  player_id: string;
  username: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  language: string;
  /** bigint in the view → PostgREST may hand it over as a string. */
  season_score: number | string;
  attempts: number | string;
  last_played_at: string | null;
  /** Word Hunt only. */
  solves?: number | string | null;
  /** Word Wheel only. */
  total_words?: number | string | null;
  rank_position: number;
}

export interface SeasonBoardEntry {
  player_id: string;
  player_identifier: string;
  guest_fingerprint: null;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_image: string | null;
  profile_picture_url: string | null;
  custom_avatar: unknown | null;
  country_code: string | null;
  season_score: number;
  /** Attempts summed across languages — one per puzzle-day per language. */
  days_played: number;
  /** Word Hunt solves (wheel rows contribute 0). */
  solves: number;
  languages: string[];
  last_played_at: string | null;
  rank_position: number;
}

export interface SeasonSummary {
  id: number;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  status: string;
  isCurrent: boolean;
}

const toInt = (v: number | string | null | undefined): number => {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Fold per-(player, language) view rows into one ranked row per player.
 *
 * Ordering: season_score DESC, solves DESC, last_played_at ASC (earlier first —
 * whoever reached the score first keeps the higher rank). Rows whose total is 0
 * are dropped: the view manufactures a carry row for every player of the
 * previous season, and a board of "0 pts" ghosts is not a season.
 */
export function aggregateSeasonRows(rows: SeasonViewRow[], language: LeaderboardLanguageScope): SeasonBoardEntry[] {
  const byPlayer = new Map<string, SeasonBoardEntry>();

  for (const r of rows) {
    if (!r.player_id) continue;
    if (language !== ALL_LANGUAGES_SCOPE && r.language !== language) continue;

    const existing = byPlayer.get(r.player_id);
    const score = toInt(r.season_score);
    const attempts = toInt(r.attempts);
    const solves = toInt(r.solves);

    if (!existing) {
      byPlayer.set(r.player_id, {
        player_id: r.player_id,
        player_identifier: r.player_id,
        guest_fingerprint: null,
        display_name: r.username || 'Player',
        avatar_emoji: r.avatar_emoji || '🎯',
        avatar_color: r.avatar_color || '#6366f1',
        avatar_image: null,
        profile_picture_url: null,
        custom_avatar: null,
        country_code: null,
        season_score: score,
        days_played: attempts,
        solves,
        languages: r.language ? [r.language] : [],
        last_played_at: r.last_played_at ?? null,
        rank_position: 0,
      });
      continue;
    }

    existing.season_score += score;
    existing.days_played += attempts;
    existing.solves += solves;
    if (r.language && !existing.languages.includes(r.language)) existing.languages.push(r.language);
    if (r.last_played_at && (!existing.last_played_at || r.last_played_at > existing.last_played_at)) {
      existing.last_played_at = r.last_played_at;
    }
  }

  return Array.from(byPlayer.values())
    .filter(e => e.season_score > 0)
    .sort((a, b) => {
      if (b.season_score !== a.season_score) return b.season_score - a.season_score;
      if (b.solves !== a.solves) return b.solves - a.solves;
      const al = a.last_played_at ?? '';
      const bl = b.last_played_at ?? '';
      return al.localeCompare(bl);
    })
    .map((e, i) => ({ ...e, rank_position: i + 1 }));
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  avatar_image: string | null;
  profile_picture_url: string | null;
  avatar_config: unknown | null;
  country_code: string | null;
}

/** Attach live profile identity (name, avatar, flag) to the ranked entries. */
export async function enrichWithProfiles(
  supabase: SupabaseClient,
  entries: SeasonBoardEntry[],
): Promise<SeasonBoardEntry[]> {
  const ids = entries.map(e => e.player_id);
  if (ids.length === 0) return entries;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_emoji, avatar_color, avatar_image, profile_picture_url, avatar_config, country_code')
    .in('id', ids);

  if (error) {
    logger.warn('API', `Season leaderboard profile enrichment failed: ${error.message}`);
    return entries;
  }

  const byId = new Map<string, ProfileRow>();
  for (const p of (data ?? []) as ProfileRow[]) byId.set(p.id, p);

  return entries.map(e => {
    const p = byId.get(e.player_id);
    if (!p) return e;
    return {
      ...e,
      display_name: p.display_name || p.username || e.display_name,
      avatar_emoji: p.avatar_emoji || e.avatar_emoji,
      avatar_color: p.avatar_color || e.avatar_color,
      avatar_image: p.avatar_image ?? null,
      profile_picture_url: p.profile_picture_url ?? null,
      custom_avatar: p.avatar_config ?? null,
      country_code: p.country_code ?? null,
    };
  });
}

// ── Current season resolution ──────────────────────────────────────────
// The `seasons` table is the source of truth (the cron rotates it). Cached
// briefly: every board poll would otherwise add a round trip for a value that
// changes once a month. Falls back to the monthly cadence formula that
// fe-next/lib/seasons.ts uses (Season 1 = Jan–Apr 2026, then one per month).

const SEASON_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedCurrentSeason: { id: number; at: number } | null = null;

/** Test-only: forget the cached current season. */
export function __resetSeasonCacheForTests(): void {
  cachedCurrentSeason = null;
}

export function computeMonthlySeasonId(now: Date = new Date()): number {
  const monthlyEpoch = Date.UTC(2026, 4, 1); // 2026-05-01 — grandfathered Season 1 ends
  if (now.getTime() < monthlyEpoch) return 1;
  const months = (now.getUTCFullYear() - 2026) * 12 + (now.getUTCMonth() - 4);
  return 2 + months;
}

export async function resolveCurrentSeasonId(supabase: SupabaseClient, now: Date = new Date()): Promise<number> {
  if (cachedCurrentSeason && now.getTime() - cachedCurrentSeason.at < SEASON_CACHE_TTL_MS) {
    return cachedCurrentSeason.id;
  }
  try {
    const nowIso = now.toISOString();
    const { data, error } = await supabase
      .from('seasons')
      .select('id')
      .lte('start_date', nowIso)
      .gt('end_date', nowIso)
      .order('id', { ascending: false })
      .limit(1);
    const id = !error && Array.isArray(data) && data.length > 0 && typeof (data[0] as { id?: unknown }).id === 'number'
      ? (data[0] as { id: number }).id
      : computeMonthlySeasonId(now);
    cachedCurrentSeason = { id, at: now.getTime() };
    return id;
  } catch (e) {
    logger.warn('API', `resolveCurrentSeasonId failed, using formula: ${(e as Error).message}`);
    return computeMonthlySeasonId(now);
  }
}

// ── Seasons list ───────────────────────────────────────────────────────

interface SeasonTableRow {
  id: number;
  name: string;
  theme: string;
  start_date: string;
  end_date: string;
  status: string;
}

/**
 * Seasons that have STARTED, newest first. The seed inserts future months as
 * `active`, so `status` alone cannot be the filter — `start_date <= now` is.
 */
export async function listStartedSeasons(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<{ seasons: SeasonSummary[]; currentSeasonId: number }> {
  const nowIso = now.toISOString();
  const { data, error } = await supabase
    .from('seasons')
    .select('id, name, theme, start_date, end_date, status')
    .lte('start_date', nowIso)
    .order('id', { ascending: false })
    .limit(24);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as SeasonTableRow[];
  const current = rows.find(s => s.start_date <= nowIso && s.end_date > nowIso)?.id
    ?? await resolveCurrentSeasonId(supabase, now);

  return {
    currentSeasonId: current,
    seasons: rows.map(s => ({
      id: s.id,
      name: s.name,
      theme: s.theme,
      startDate: s.start_date,
      endDate: s.end_date,
      status: s.status,
      isCurrent: s.id === current,
    })),
  };
}

// ── Express handlers ───────────────────────────────────────────────────

export type SeasonView = 'daily_word_hunt_season_leaderboard' | 'daily_word_wheel_season_leaderboard';

interface SeasonQuery {
  season?: string;
  limit?: string;
}

/**
 * GET /season-leaderboard/:language?season=<id>&limit=<n>
 * `:language` is a concrete language or `all`; `season` defaults to the current one.
 */
export function createSeasonLeaderboardHandler(view: SeasonView) {
  const label = view === 'daily_word_hunt_season_leaderboard' ? 'Word Hunt' : 'Word Wheel';

  return async (req: Request<{ language: string }, unknown, unknown, SeasonQuery>, res: Response): Promise<void> => {
    try {
      if (!isSupabaseConfigured()) {
        res.status(503).json({ error: 'Leaderboard service not available' });
        return;
      }

      const { language } = req.params;
      if (!isLeaderboardLanguageScope(language)) {
        res.status(400).json({ error: 'Invalid language code' });
        return;
      }

      const limit = Math.min(parseInt(req.query.limit || '50') || 50, 100);

      let seasonId: number | null = null;
      if (req.query.season !== undefined) {
        const parsed = Number(req.query.season);
        if (!Number.isInteger(parsed) || parsed < 1) {
          res.status(400).json({ error: 'Invalid season id' });
          return;
        }
        seasonId = parsed;
      }

      const supabase = getSupabase();
      if (!supabase) {
        res.status(503).json({ error: 'Database connection unavailable' });
        return;
      }

      if (seasonId === null) seasonId = await resolveCurrentSeasonId(supabase);

      let query = supabase
        .from(view)
        .select('*')
        .eq('season_id', seasonId);
      if (language !== ALL_LANGUAGES_SCOPE) query = query.eq('language', language);
      // A season holds at most (players × languages) rows — dozens today,
      // low thousands at scale — so folding in memory is cheap and exact.
      const { data, error } = await query.limit(5000);

      if (error) {
        logger.error('API', `${label} season leaderboard error: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
        return;
      }

      const ranked = aggregateSeasonRows((data ?? []) as SeasonViewRow[], language);
      const page = await enrichWithProfiles(supabase, ranked.slice(0, limit));

      res.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=180');
      res.json({
        data: page,
        totalParticipants: ranked.length,
        seasonId,
        language,
      });
    } catch (error) {
      logger.error('API', `${label} season leaderboard error: ${(error as Error).message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/** GET /api/daily-challenge/seasons */
export async function seasonsListHandler(_req: Request, res: Response): Promise<void> {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Seasons service not available' });
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }
    const payload = await listStartedSeasons(supabase);
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
    res.json(payload);
  } catch (error) {
    logger.error('API', `Seasons list error: ${(error as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}
