import { NextResponse, type NextRequest } from 'next/server';
import { decodeJwt } from 'jose';
import { z } from 'zod';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { cookieAccessToken, getAuthedUser } from '@/lib/auth/getAuthedUser';
import { bearerToken } from '@/lib/auth/verifyJwt';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { claimOnce } from '@/lib/server/claimOnce';
import { checkPingAllowed, grantPingAchievements } from '@/lib/rivals/pingServer';
import { RIVAL_PING_IDS, RIVAL_PING_PER_TARGET_WINDOW_MS, type RivalPingErrorCode } from '@/lib/rivals/pings';
import { notifyRivalPing } from '@/backend/modules/pushNotificationTriggers';

const CONTEXTS = ['daily', 'quickPlay', 'multiplayer', 'blast', 'tower', 'single', 'edu', 'reply', 'friendFree', 'friendPlaying'] as const;

const Body = z.object({
  targetUserId: z.string().uuid(),
  pingId: z.enum(RIVAL_PING_IDS),
  context: z.enum(CONTEXTS),
});

const error = (code: RivalPingErrorCode, status: number) => NextResponse.json({ error: code }, { status });

async function isAnonymousSession(request: NextRequest): Promise<boolean> {
  const token = bearerToken(request) ?? (await cookieAccessToken(request));
  if (!token) return false;
  try {
    return decodeJwt(token).is_anonymous === true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user || (await isAnonymousSession(request))) return error('sign_in_required', 401);

    const rl = checkApiRateLimit(request, `rival-ping:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!rl.success) return error('unavailable', 429);

    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return error('invalid_request', 400);
    const { targetUserId, pingId, context } = parsed.data;
    if (context === 'edu') return error('not_allowed', 403);

    const db = getSupabaseAdmin();
    if (!db) return error('unavailable', 503);

    const verdict = await checkPingAllowed(db, user.id, targetUserId);
    if (!verdict.ok) return error(verdict.code, verdict.status);

    const claim = await claimOnce(`rival-ping:${user.id}:${targetUserId}`, RIVAL_PING_PER_TARGET_WINDOW_MS / 1000);
    if (claim === 'taken') return error('target_cooldown', 429);

    await notifyRivalPing(targetUserId, verdict.senderName, user.id, pingId);
    await grantPingAchievements(db, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    captureApiError(err as Error, '/api/rivals/ping');
    return error('unavailable', 500);
  }
}
