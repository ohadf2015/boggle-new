import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { applyRepair, perksFromEstate } from '@/lib/wordTowerV2/estate';
import { PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';
import { mutateEstate } from '@/lib/wordTowerV2/estateServer';

export const runtime = 'nodejs';

/** POST /api/word-tower/estate/repair { plot } — golden brick first, else coins (repairCost). */
const Body = z.object({ plot: z.enum(PLOT_SLOTS) });

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const rl = checkApiRateLimit(request, `word-tower-estate-spend:${user.id}`, { maxRequests: 60, windowMs: 60_000 });
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    const db = getSupabaseAdmin();
    if (!db) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    const res = await mutateEstate(db, user.id, (e) => {
      const r = applyRepair(e, parsed.data.plot);
      return r.ok ? { ok: true, estate: r.estate, extra: { cost: r.cost, usedBrick: r.usedToken } } : r;
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'cannot repair', reason: res.reason }, { status: res.reason === 'conflict' ? 409 : 400 });
    }
    return NextResponse.json({ estate: res.estate, perks: perksFromEstate(res.estate), ...res.extra });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-estate-repair');
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
