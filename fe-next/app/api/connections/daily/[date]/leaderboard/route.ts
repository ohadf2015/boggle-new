import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { readGuestId } from '@/lib/auth/guestCookie';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { pyramidLocalesOn } from '@/lib/connections/daily';
import { scopeDailyBoard } from '@/lib/connections/dailyBoard';
import { fetchTestAccountIds } from '@/lib/leaderboard/testAccountIds';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const QA_HEADROOM = 20;

interface RouteParams {
  params: Promise<{ date: string }>;
}

interface RankKey { score: number; time_taken_seconds: number; created_at: string }

const sameRow = (a: RankKey, b: RankKey) =>
  a.score === b.score && a.time_taken_seconds === b.time_taken_seconds && a.created_at === b.created_at;

/** The view's order: score DESC, time_taken_seconds ASC, created_at ASC. */
const isAhead = (a: RankKey, of: RankKey) =>
  a.score > of.score
  || (a.score === of.score && a.time_taken_seconds < of.time_taken_seconds)
  || (a.score === of.score && a.time_taken_seconds === of.time_taken_seconds && a.created_at < of.created_at);

/** The date's chain-board rows that belong to QA accounts. Empty when the lookup fails (fail open). */
async function qaRowsOn(admin: SupabaseClient, date: string): Promise<RankKey[]> {
  const testIds = await fetchTestAccountIds(admin);
  if (!testIds?.length) return [];
  const { data } = await scopeDailyBoard(
    admin.from('connections_daily_scores').select('score, time_taken_seconds, created_at').eq('puzzle_date', date).in('player_id', testIds),
    date,
    null,
  );
  return (data ?? []) as RankKey[];
}

/**
 * GET /api/connections/daily/[date]/leaderboard?limit=50
 * Top-N of the date's 5-riddle chain board (no identifiers leaked) plus the
 * caller's own rank. Guests are identified by the signed cookie the score
 * route issues, never by a client-supplied id. QA accounts never rank.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { date } = await params;
    if (!DATE_RE.test(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });

    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const topQuery = admin
      .from('connections_daily_leaderboard')
      .select(
        'rank_position, display_name, avatar_emoji, avatar_color, avatar_image, custom_avatar, score, time_taken_seconds, streak, puzzles_solved, language, created_at',
      )
      .eq('puzzle_date', date)
      .order('rank_position', { ascending: true })
      .limit(limit + QA_HEADROOM);
    const [{ data: top, error }, { count: totalCount }, user, qaRows] = await Promise.all([
      scopeDailyBoard(topQuery, date, null),
      scopeDailyBoard(
        admin.from('connections_daily_scores').select('id', { count: 'exact', head: true }).eq('puzzle_date', date),
        date,
        null,
      ),
      getAuthedUser(request),
      qaRowsOn(admin, date),
    ]);
    if (error) throw error;
    // The view ranks every row of the date (pyramid runs and QA included), so renumber.
    const leaderboard = ((top ?? []) as Array<Record<string, unknown> & RankKey>)
      .filter((row) => !qaRows.some((qa) => sameRow(qa, row)))
      .slice(0, limit)
      .map(({ created_at: _createdAt, ...row }, i) => ({ ...row, rank_position: i + 1 }));
    const totalPlayers = Math.max(0, (totalCount ?? 0) - qaRows.length);

    const guestId = user ? null : readGuestId(request);
    let ownRank: number | null = null;
    if (user || guestId) {
      const idCol = user ? 'player_id' : 'guest_fingerprint';
      const idVal = user ? user.id : (guestId as string);
      const { data: ownRow } = await admin
        .from('connections_daily_scores')
        .select('score, time_taken_seconds, created_at, language')
        .eq('puzzle_date', date)
        .eq(idCol, idVal)
        .maybeSingle();
      if (ownRow && !pyramidLocalesOn(date).includes(ownRow.language)) {
        const { score: s, time_taken_seconds: t, created_at: c } = ownRow;
        const { count: better } = await scopeDailyBoard(
          admin.from('connections_daily_scores').select('id', { count: 'exact', head: true }).eq('puzzle_date', date),
          date,
          null,
        ).or(`score.gt.${s},and(score.eq.${s},time_taken_seconds.lt.${t}),and(score.eq.${s},time_taken_seconds.eq.${t},created_at.lt."${c}")`);
        const qaAhead = qaRows.filter((qa) => isAhead(qa, ownRow)).length;
        ownRank = Math.max(0, (better ?? 0) - qaAhead) + 1;
      }
    }

    const personalized = !!(user || guestId);
    return NextResponse.json(
      { success: true, puzzleDate: date, totalPlayers, leaderboard, ownRank },
      {
        headers: {
          'Cache-Control': personalized
            ? 'private, max-age=5'
            : 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    );
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/connections/daily/leaderboard', {
      method: 'GET',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
