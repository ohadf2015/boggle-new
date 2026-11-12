import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';
import { loadFriendsHome } from '@/lib/friends/home/loadFriendsHome';
import { friendsHomeDeps } from '@/lib/friends/home/friendsHomeDeps';

const TIME_CAP_MS = 4000;

/** GET /api/friends/home[?suggestions=1] — the signed-in player's crew for the home card. */
export async function GET(request: NextRequest) {
  const rate = checkApiRateLimit(request, 'friends-home', { maxRequests: 30, windowMs: 60_000 });
  if (!rate.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const user = await getAuthedUser(request).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });
    const suggestions = request.nextUrl.searchParams.get('suggestions') === '1';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const data = await Promise.race([
      loadFriendsHome(friendsHomeDeps(admin), user.id, suggestions ? { suggestions: true } : {}),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('friends-home timed out')), TIME_CAP_MS);
      }),
    ]).finally(() => clearTimeout(timer));
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/friends/home');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
