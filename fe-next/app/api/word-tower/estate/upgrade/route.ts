import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { applyUpgrade, perksFromEstate } from '@/lib/wordTowerV2/estate';
import { PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';
import { applyFinishDistrict, finishDistrictPlan, settleDistrict } from '@/lib/wordTowerV2/estateFinish';
import { mutateEstate } from '@/lib/wordTowerV2/estateServer';

export const runtime = 'nodejs';

/**
 * POST /api/word-tower/estate/upgrade { plot } buys one level. { all: true, cost }
 * finishes the district, refused if it now costs more than the price the player
 * saw. Completion advances the district in the same write (`districtCompleted`).
 */
const Body = z.union([z.object({ plot: z.enum(PLOT_SLOTS) }), z.object({ all: z.literal(true), cost: z.number().int().min(0) })]);

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

    const target = parsed.data;
    const res = await mutateEstate(db, user.id, (e) => {
      if ('all' in target && (finishDistrictPlan(e)?.coins ?? 0) > target.cost) return { ok: false, reason: 'price_changed' };
      const r = 'plot' in target ? applyUpgrade(e, target.plot) : applyFinishDistrict(e);
      if (!r.ok) return r;
      const { estate, completed } = settleDistrict(r.estate);
      return { ok: true, estate, extra: { cost: r.cost, usedBlueprint: r.usedToken, districtCompleted: completed } };
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'cannot upgrade', reason: res.reason }, { status: res.reason === 'conflict' ? 409 : 400 });
    }
    return NextResponse.json({ estate: res.estate, perks: perksFromEstate(res.estate), ...res.extra });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-estate-upgrade');
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
