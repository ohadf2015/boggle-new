import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';
import { FRIEND_ACTIONS, runFriendAction, type FriendAction } from '@/backend/modules/friendActions';

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS: Record<string, number> = { SOCIAL_RESTRICTED: 403, CANNOT_ADD_SELF: 400, BLOCKED: 403 };

/** POST /api/friends/action { action, target } — target is a user id, or the request id for 'accept'. */
export async function POST(request: NextRequest) {
  const rate = checkApiRateLimit(request, 'friends-action', { maxRequests: 30, windowMs: 60_000 });
  if (!rate.success) return NextResponse.json({ success: false, code: 'RATE_LIMITED' }, { status: 429 });

  const user = await getAuthedUser(request).catch(() => null);
  if (!user) return NextResponse.json({ success: false, code: 'AUTH_REQUIRED' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { action?: string; target?: string } | null;
  const action = body?.action as FriendAction;
  const target = body?.target ?? '';
  if (!FRIEND_ACTIONS.includes(action) || !ID_RE.test(target)) {
    return NextResponse.json({ success: false, code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  try {
    const result = await runFriendAction(user.id, action, target);
    return NextResponse.json(result, { status: result.success ? 200 : STATUS[result.code ?? ''] ?? 409 });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), `friends-action:${action}`);
    return NextResponse.json({ success: false, code: 'SERVER_ERROR' }, { status: 500 });
  }
}
