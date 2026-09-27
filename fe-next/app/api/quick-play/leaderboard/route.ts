/**
 * GET /api/quick-play/leaderboard?range=today|all — top quick players by best
 * score_pct, plus display names resolved from profiles.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';

export async function GET(request: NextRequest) {
  const rateLimit = checkApiRateLimit(request, 'quick-play-leaderboard', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const range = request.nextUrl.searchParams.get('range') === 'all' ? 'all' : 'today';

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_quick_play_leaderboard', {
      p_range: range,
      p_limit: 50,
    });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{
      user_id: string; best_score_pct: number; best_score: number; rounds: number; rank: number;
    }>;

    let names: Record<string, string> = {};
    let avatars: Record<string, unknown> = {};
    if (rows.length > 0) {
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, username, avatar_config')
        .in('id', rows.map((r) => r.user_id));
      names = Object.fromEntries(
        (profiles ?? []).map((p: { id: string; username: string | null }) => [p.id, p.username ?? ''])
      );
      avatars = Object.fromEntries(
        (profiles ?? []).map((p: { id: string; avatar_config: unknown }) => [p.id, p.avatar_config ?? null])
      );
    }

    return NextResponse.json({
      range,
      entries: rows.map((r) => ({
        userId: r.user_id,
        name: names[r.user_id] || 'Player',
        customAvatar: avatars[r.user_id] ?? null,
        bestScorePct: Number(r.best_score_pct),
        bestScore: r.best_score,
        rounds: Number(r.rounds),
        rank: Number(r.rank),
      })),
    });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'quick-play-leaderboard');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
