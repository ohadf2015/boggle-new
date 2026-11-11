/**
 * GET /api/quick-play/leaderboard?range=today|all — top quick players by best
 * score_pct, plus display names resolved from profiles.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';
import { publicNameOrNull } from '@/lib/names/publicName';

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

    const names: Record<string, string> = {};
    const avatars: Record<string, unknown> = {};
    if (rows.length > 0) {
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, username, display_name, avatar_config')
        .in('id', rows.map((r) => r.user_id));
      for (const p of (profiles ?? []) as Array<{ id: string; username: string | null; display_name?: string | null; avatar_config: unknown }>) {
        const name = publicNameOrNull(p.display_name) ?? publicNameOrNull(p.username);
        if (!name) continue;
        names[p.id] = name;
        avatars[p.id] = p.avatar_config ?? null;
      }
    }

    // Only players with a public name are listed, so ranks count only them.
    return NextResponse.json({
      range,
      entries: rows.filter((r) => names[r.user_id]).map((r, i) => ({
        userId: r.user_id,
        name: names[r.user_id],
        customAvatar: avatars[r.user_id] ?? null,
        bestScorePct: Number(r.best_score_pct),
        bestScore: r.best_score,
        rounds: Number(r.rounds),
        rank: i + 1,
      })),
    });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'quick-play-leaderboard');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
