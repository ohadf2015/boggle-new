import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureApiError } from '@/utils/sentry';
import { viewDailyBoard } from '@/lib/daily/mergeDailyLeaderboard';
import { loadRankedDailyBoard, friendIdentities, opaqueRowKey } from '@/lib/daily/loadDailyBoard';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/daily/leaderboard?date=YYYY-MM-DD&lang=en|all&limit=10[&fp=<guest fp>][&friends=1]
 *
 * The one combined board for the daily challenge: every mode's result for that
 * day, merged per player server-side (ids group rows and are then dropped; each
 * row carries an opaque per-day `key` instead). The hub teaser and the full
 * board's Today tab both read it, so they always agree.
 *
 * The caller (session user, or guest `fp`) gets `isYou`; with `friends=1` a
 * signed-in caller's friends get `isFriend`. Both ride along at their true rank
 * when below the top `limit`. `total` is the whole board's player count.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || '';
    const lang = url.searchParams.get('lang') || 'en';
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10) || 10));
    if (!DATE_RE.test(date)) {
      return NextResponse.json({ error: 'invalid date' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const userId = await callerUserId(request);
    const fp = url.searchParams.get('fp');
    const you = userId ? `u:${userId}` : fp ? `g:${fp}` : null;

    const [ranked, friendIds] = await Promise.all([
      loadRankedDailyBoard(admin, date, lang, you),
      userId && url.searchParams.get('friends') === '1' ? friendIdentities(admin, userId) : undefined,
    ]);

    const view = viewDailyBoard(ranked, { limit, you, friendIds, keyOf: opaqueRowKey(date) });

    // Personalised (isYou) and read right after a player finishes — a shared
    // cache showed the board from before their result landed.
    return NextResponse.json(view, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/daily/leaderboard');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function callerUserId(request: NextRequest): Promise<string | null> {
  try {
    return (await getAuthedUser(request))?.id ?? null;
  } catch {
    return null;
  }
}
