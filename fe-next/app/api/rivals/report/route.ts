import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureApiError } from '@/utils/sentry';
import { reportUser } from '@/backend/modules/reportManager';

const Body = z.object({ targetUserId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

    const rl = checkApiRateLimit(request, `rival-report:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!rl.success) return NextResponse.json({ error: 'unavailable' }, { status: 429 });

    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });

    const result = await reportUser(user.id, parsed.data.targetUserId, 'harassment', 'rival_ping');
    if (!result.success) {
      const status = result.errorCode === 'CANNOT_REPORT_SELF' ? 400 : 503;
      return NextResponse.json({ error: status === 400 ? 'self' : 'unavailable' }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    captureApiError(err as Error, '/api/rivals/report');
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
}
