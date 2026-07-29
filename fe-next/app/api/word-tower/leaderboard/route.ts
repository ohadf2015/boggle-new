import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';

export const runtime = 'nodejs';

const TOP_N = 50;

export async function GET(request: NextRequest) {
  try {
    const rl = checkApiRateLimit(request, 'word-tower-leaderboard', { maxRequests: 30, windowMs: 60_000 });
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    const { data: rows, error } = await supabase
      .from('word_tower_progress')
      .select('player_id, best_height_m, best_floors, highest_biome')
      .gt('best_height_m', 0)
      .order('best_height_m', { ascending: false })
      .limit(TOP_N);

    if (error) {
      captureApiError(error as unknown as Error, 'word-tower-leaderboard');
      return NextResponse.json({ error: 'failed to load' }, { status: 500 });
    }

    const ids = (rows ?? []).map((r) => r.player_id);
    const profileMap = new Map<string, { username?: string; display_name?: string; avatar_image?: string | null; avatar_emoji?: string | null; avatar_color?: string | null }>();
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_image, avatar_emoji, avatar_color')
        .in('id', ids);
      for (const p of profiles ?? []) profileMap.set(p.id, p);
    }

    const leaderboard = (rows ?? []).map((r, i) => {
      const p = profileMap.get(r.player_id);
      return {
        rank: i + 1,
        playerId: r.player_id,
        isYou: r.player_id === user.id,
        username: p?.display_name || p?.username || 'Player',
        avatarImage: p?.avatar_image ?? null,
        avatarEmoji: p?.avatar_emoji ?? null,
        avatarColor: p?.avatar_color ?? null,
        bestHeightM: Number(r.best_height_m) || 0,
        bestFloors: r.best_floors ?? 0,
        highestBiome: r.highest_biome ?? 'city',
      };
    });

    return NextResponse.json({ leaderboard });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-leaderboard');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
