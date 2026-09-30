import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { applyBuyCharge, perksFromEstate } from '@/lib/wordTowerV2/estate';
import { mutateEstate } from '@/lib/wordTowerV2/estateServer';

export const runtime = 'nodejs';

/** POST /api/word-tower/estate/charge — buy one wrecking ball (raid charge) with coins. */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const rl = checkApiRateLimit(request, `word-tower-estate-spend:${user.id}`, { maxRequests: 60, windowMs: 60_000 });
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const db = getSupabaseAdmin();
    if (!db) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    const res = await mutateEstate(db, user.id, (e) => {
      const r = applyBuyCharge(e);
      return r.ok ? { ok: true, estate: r.estate, extra: { cost: r.cost } } : r;
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'cannot buy', reason: res.reason }, { status: res.reason === 'conflict' ? 409 : 400 });
    }
    return NextResponse.json({ estate: res.estate, perks: perksFromEstate(res.estate), ...res.extra });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-estate-charge');
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
