import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { type ChestRoll, applyRun, chestSeed, clampRunSummary, perksFromEstate } from '@/lib/wordTowerV2/estate';
import { mutateEstate } from '@/lib/wordTowerV2/estateServer';

export const runtime = 'nodejs';

/**
 * POST /api/word-tower/estate/run — bank a finished run. Only the run's shape
 * is accepted; coins and the chest are computed here (runCoins/rollChest), the
 * chest seed comes from the player id + run count so it can't be re-rolled.
 * Unknown body fields (e.g. a forged `coins`) are dropped by zod.
 */
const Body = z.object({
  floors: z.number().finite(),
  perfects: z.number().finite(),
  bestCombo: z.number().finite(),
  crates: z.number().finite(),
  heightM: z.number().finite(),
  tower: z.array(z.unknown()).max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // A run takes well over 15s; this caps coin farming by replaying the POST.
    const rl = checkApiRateLimit(request, `word-tower-estate-run:${user.id}`, { maxRequests: 4, windowMs: 60_000 });
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    const db = getSupabaseAdmin();
    if (!db) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    const summary = clampRunSummary(parsed.data as Parameters<typeof clampRunSummary>[0]);
    const res = await mutateEstate<{ coins: number; chest: ChestRoll }>(db, user.id, (e) => {
      const r = applyRun(e, summary, chestSeed(user.id, e.runs));
      return { ok: true, estate: r.estate, extra: { coins: r.coins, chest: r.chest } };
    });
    if (!res.ok) return NextResponse.json({ error: 'busy, retry', reason: res.reason }, { status: 409 });
    return NextResponse.json({ estate: res.estate, perks: perksFromEstate(res.estate), ...res.extra });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-estate-run');
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
