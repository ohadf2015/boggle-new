import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface RouteParams {
  params: Promise<{ date: string }>;
}

/**
 * GET /api/connections/daily/[date]/leaderboard?limit=50&guestFingerprint=...
 * Top-N for a daily date (no identifiers leaked) plus the caller's own rank.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { date } = await params;
    if (!DATE_RE.test(date)) return NextResponse.json({ error: 'invalid date' }, { status: 400 });

    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const { data: top, error } = await admin
      .from('connections_daily_leaderboard')
      .select(
        'rank_position, display_name, avatar_emoji, avatar_color, avatar_image, score, time_taken_seconds, streak, puzzles_solved, language',
      )
      .eq('puzzle_date', date)
      .order('rank_position', { ascending: true })
      .limit(limit);
    if (error) throw error;

    const { count: totalPlayers } = await admin
      .from('connections_daily_scores')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date);

    // Caller's own rank (authed user wins over guest fingerprint).
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const guestFingerprint = url.searchParams.get('guestFingerprint');
    let ownRank: number | null = null;
    if (user || guestFingerprint) {
      const idCol = user ? 'player_id' : 'guest_fingerprint';
      const idVal = user ? user.id : (guestFingerprint as string);
      const { data: ownRow } = await admin
        .from('connections_daily_scores')
        .select('score, time_taken_seconds')
        .eq('puzzle_date', date)
        .eq(idCol, idVal)
        .maybeSingle();
      if (ownRow) {
        const { count: better } = await admin
          .from('connections_daily_scores')
          .select('*', { count: 'exact', head: true })
          .eq('puzzle_date', date)
          .or(`score.gt.${ownRow.score},and(score.eq.${ownRow.score},time_taken_seconds.lt.${ownRow.time_taken_seconds})`);
        ownRank = (better ?? 0) + 1;
      }
    }

    const personalized = !!(user || guestFingerprint);
    return NextResponse.json(
      { success: true, puzzleDate: date, totalPlayers: totalPlayers ?? 0, leaderboard: top ?? [], ownRank },
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
