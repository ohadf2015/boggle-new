/**
 * API Route: /api/admin/guests
 * Admin endpoint for listing guest (unauthenticated) players with aggregated
 * game history and acquisition metadata. Powers the admin "Guests" view.
 *
 * Pulls from:
 *   - guest_sessions (acquisition + device info)
 *   - game_sessions (multiplayer/singleplayer history)
 *   - daily_word_hunt_attempts, daily_puzzle_attempts (daily content)
 *
 * Aggregates per-guest counts so admins can see total games, total score,
 * conversion status, last activity, and acquisition source.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';

interface GuestSessionRow {
  session_id: string;
  device_type: string | null;
  browser: string | null;
  language: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  country: string | null;
  first_visit_at: string;
  last_visit_at: string;
  user_id: string | null;
  linked_at: string | null;
  created_at: string;
}

interface GuestGameSessionRow {
  guest_session_id: string | null;
  score: number | null;
  duration_seconds: number | null;
  words_found: { word?: string; length?: number }[] | null;
  mode: string | null;
  language: string | null;
  started_at: string;
  completed: boolean | null;
}

interface GuestDailyHuntRow {
  guest_fingerprint: string | null;
  efficiency_score: number | null;
  language: string | null;
  solved: boolean | null;
  created_at: string;
}

interface GuestDailyPuzzleRow {
  guest_fingerprint: string | null;
  score: number | null;
  word_count: number | null;
  language: string | null;
  completed_at: string;
}

export interface GuestPlayerSummary {
  session_id: string;
  device_type: string | null;
  browser: string | null;
  country: string | null;
  language: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  first_visit_at: string;
  last_visit_at: string;
  last_activity_at: string;
  converted: boolean;
  converted_user_id: string | null;
  converted_at: string | null;
  total_games: number;
  multiplayer_games: number;
  word_hunt_games: number;
  daily_challenge_games: number;
  total_score: number;
  total_words: number;
  total_time_played: number;
  longest_word: string | null;
  languages: string[];
}

const ALLOWED_SORT_COLUMNS = new Set([
  'last_activity_at',
  'first_visit_at',
  'total_games',
  'total_score',
]);

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '25')));
    const sortByRaw = searchParams.get('sortBy') || 'last_activity_at';
    const sortBy = ALLOWED_SORT_COLUMNS.has(sortByRaw) ? sortByRaw : 'last_activity_at';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const country = searchParams.get('country');
    const utmSource = searchParams.get('utmSource');
    const conversionRaw = searchParams.get('converted');
    const converted: 'all' | 'yes' | 'no' =
      conversionRaw === 'yes' ? 'yes' : conversionRaw === 'no' ? 'no' : 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search')?.trim() || '';
    const minGames = parseInt(searchParams.get('minGames') || '0') || 0;

    // Pull guest sessions (the "guest profiles") with filters
    let sessionQuery = supabase
      .from('guest_sessions')
      .select(
        'session_id, device_type, browser, language, utm_source, utm_medium, utm_campaign, referrer, country, first_visit_at, last_visit_at, user_id, linked_at, created_at',
      );

    if (country && country !== 'all') {
      sessionQuery = sessionQuery.eq('country', country.toUpperCase());
    }
    if (utmSource && utmSource !== 'all') {
      sessionQuery = sessionQuery.eq('utm_source', utmSource);
    }
    if (converted === 'yes') {
      sessionQuery = sessionQuery.not('user_id', 'is', null);
    } else if (converted === 'no') {
      sessionQuery = sessionQuery.is('user_id', null);
    }
    if (startDate) {
      sessionQuery = sessionQuery.gte('first_visit_at', startDate);
    }
    if (endDate) {
      sessionQuery = sessionQuery.lte('first_visit_at', `${endDate}T23:59:59.999Z`);
    }
    if (search) {
      // Match by session_id prefix or country code
      sessionQuery = sessionQuery.or(
        `session_id.ilike.%${search}%,country.ilike.%${search}%,utm_source.ilike.%${search}%`,
      );
    }

    sessionQuery = sessionQuery.order('last_visit_at', { ascending: false }).limit(2000);

    const { data: sessionsData, error: sessionsError } = await sessionQuery;
    if (sessionsError) {
      console.error('[admin/guests] guest_sessions query error:', sessionsError);
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }
    const sessions = (sessionsData as GuestSessionRow[]) || [];
    const sessionIds = sessions.map((s) => s.session_id);

    // Aggregate game stats per guest_session_id across the three tables
    type Aggregate = {
      total_games: number;
      multiplayer_games: number;
      word_hunt_games: number;
      daily_challenge_games: number;
      total_score: number;
      total_words: number;
      total_time_played: number;
      longest_word: string | null;
      last_activity_at: string;
      languages: Set<string>;
    };
    const aggregates: Record<string, Aggregate> = {};
    const ensure = (id: string): Aggregate => {
      if (!aggregates[id]) {
        aggregates[id] = {
          total_games: 0,
          multiplayer_games: 0,
          word_hunt_games: 0,
          daily_challenge_games: 0,
          total_score: 0,
          total_words: 0,
          total_time_played: 0,
          longest_word: null,
          last_activity_at: '1970-01-01T00:00:00Z',
          languages: new Set<string>(),
        };
      }
      return aggregates[id];
    };

    if (sessionIds.length > 0) {
      // Multiplayer / singleplayer game_sessions
      const { data: gsData } = await supabase
        .from('game_sessions')
        .select('guest_session_id, score, duration_seconds, words_found, mode, language, started_at, completed')
        .in('guest_session_id', sessionIds)
        .eq('completed', true)
        .limit(50000);
      ((gsData as GuestGameSessionRow[]) || []).forEach((row) => {
        if (!row.guest_session_id) return;
        const agg = ensure(row.guest_session_id);
        agg.total_games += 1;
        agg.multiplayer_games += 1;
        agg.total_score += row.score || 0;
        agg.total_time_played += row.duration_seconds || 0;
        if (Array.isArray(row.words_found)) {
          agg.total_words += row.words_found.length;
          for (const w of row.words_found) {
            const wl = w?.word ?? '';
            if (wl && wl.length > (agg.longest_word?.length ?? 0)) {
              agg.longest_word = wl;
            }
          }
        }
        if (row.language) agg.languages.add(row.language);
        if (row.started_at > agg.last_activity_at) agg.last_activity_at = row.started_at;
      });

      // Daily Word Hunt
      const { data: whData } = await supabase
        .from('daily_word_hunt_attempts')
        .select('guest_fingerprint, efficiency_score, language, solved, created_at')
        .in('guest_fingerprint', sessionIds)
        .limit(50000);
      ((whData as GuestDailyHuntRow[]) || []).forEach((row) => {
        if (!row.guest_fingerprint) return;
        const agg = ensure(row.guest_fingerprint);
        agg.total_games += 1;
        agg.word_hunt_games += 1;
        agg.total_score += row.efficiency_score || 0;
        if (row.language) agg.languages.add(row.language);
        if (row.created_at > agg.last_activity_at) agg.last_activity_at = row.created_at;
      });

      // Daily Puzzle
      const { data: dpData } = await supabase
        .from('daily_puzzle_attempts')
        .select('guest_fingerprint, score, word_count, language, completed_at')
        .in('guest_fingerprint', sessionIds)
        .limit(50000);
      ((dpData as GuestDailyPuzzleRow[]) || []).forEach((row) => {
        if (!row.guest_fingerprint) return;
        const agg = ensure(row.guest_fingerprint);
        agg.total_games += 1;
        agg.daily_challenge_games += 1;
        agg.total_score += row.score || 0;
        agg.total_words += row.word_count || 0;
        if (row.language) agg.languages.add(row.language);
        if (row.completed_at > agg.last_activity_at) agg.last_activity_at = row.completed_at;
      });
    }

    // Build summary list
    const summaries: GuestPlayerSummary[] = sessions.map((s) => {
      const agg = aggregates[s.session_id];
      const lastActivity = agg && agg.last_activity_at !== '1970-01-01T00:00:00Z'
        ? agg.last_activity_at
        : s.last_visit_at;
      return {
        session_id: s.session_id,
        device_type: s.device_type,
        browser: s.browser,
        country: s.country,
        language: s.language,
        utm_source: s.utm_source,
        utm_medium: s.utm_medium,
        utm_campaign: s.utm_campaign,
        referrer: s.referrer,
        first_visit_at: s.first_visit_at,
        last_visit_at: s.last_visit_at,
        last_activity_at: lastActivity,
        converted: Boolean(s.user_id),
        converted_user_id: s.user_id,
        converted_at: s.linked_at,
        total_games: agg?.total_games ?? 0,
        multiplayer_games: agg?.multiplayer_games ?? 0,
        word_hunt_games: agg?.word_hunt_games ?? 0,
        daily_challenge_games: agg?.daily_challenge_games ?? 0,
        total_score: agg?.total_score ?? 0,
        total_words: agg?.total_words ?? 0,
        total_time_played: agg?.total_time_played ?? 0,
        longest_word: agg?.longest_word ?? null,
        languages: agg ? Array.from(agg.languages) : [],
      };
    });

    // Filter by minGames
    const filtered = minGames > 0
      ? summaries.filter((s) => s.total_games >= minGames)
      : summaries;

    // Sort
    const ascending = sortOrder === 'asc';
    filtered.sort((a, b) => {
      const va = a[sortBy as keyof GuestPlayerSummary];
      const vb = b[sortBy as keyof GuestPlayerSummary];
      if (typeof va === 'number' && typeof vb === 'number') {
        return ascending ? va - vb : vb - va;
      }
      const da = new Date(String(va ?? 0)).getTime();
      const db = new Date(String(vb ?? 0)).getTime();
      return ascending ? da - db : db - da;
    });

    // Top-line stats
    const totalGuests = filtered.length;
    const convertedCount = filtered.reduce((acc, s) => acc + (s.converted ? 1 : 0), 0);
    const playedCount = filtered.reduce((acc, s) => acc + (s.total_games > 0 ? 1 : 0), 0);
    const totalGames = filtered.reduce((acc, s) => acc + s.total_games, 0);
    const totalScore = filtered.reduce((acc, s) => acc + s.total_score, 0);
    const conversionRate = totalGuests > 0 ? convertedCount / totalGuests : 0;

    // Paginate
    const start = (page - 1) * pageSize;
    const guests = filtered.slice(start, start + pageSize);
    const totalPages = Math.max(1, Math.ceil(totalGuests / pageSize));

    return NextResponse.json({
      success: true,
      guests,
      pagination: {
        page,
        pageSize,
        totalCount: totalGuests,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats: {
        totalGuests,
        convertedGuests: convertedCount,
        guestsWhoPlayed: playedCount,
        totalGames,
        totalScore,
        conversionRate,
      },
    });
  } catch (error) {
    console.error('[admin/guests] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
