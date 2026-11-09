import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';
import { resolveBoardKeyToUserId } from '@/lib/daily/resolveBoardKey';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KEY_RE = /^[A-Za-z0-9_-]{8,32}$/;

/**
 * POST /api/friends/board-player  { date, key }  →  { userId }
 *
 * Lets a signed-in player add (or chat with) someone on the id-free combined
 * daily board. Signed-in rows only; guests 404. The friend request itself still
 * goes through the socket, which enforces blocks and the Families Policy.
 */
export async function POST(request: NextRequest) {
  const limit = checkApiRateLimit(request, 'friends-board-player', { maxRequests: 30, windowMs: 60_000 });
  if (!limit.success) return rateLimitResponse(limit);
  try {
    const user = await getAuthedUser(request).catch(() => null);
    if (!user?.id) return NextResponse.json({ error: 'auth required' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { date?: unknown; key?: unknown } | null;
    const date = typeof body?.date === 'string' ? body.date : '';
    const key = typeof body?.key === 'string' ? body.key : '';
    if (!DATE_RE.test(date) || !KEY_RE.test(key)) {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const userId = await resolveBoardKeyToUserId(admin, date, key);
    if (!userId) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ userId }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/friends/board-player');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
