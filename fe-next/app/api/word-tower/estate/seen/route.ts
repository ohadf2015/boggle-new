import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { RAIDS } from '@/lib/wordTowerV2/estateServer';

export const runtime = 'nodejs';

/** POST /api/word-tower/estate/seen { ids? } — stamp raids on ME as seen (all unseen if no ids). */
const Body = z.object({ ids: z.array(z.string().uuid()).max(50).optional() });

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = Body.safeParse((await request.json().catch(() => null)) ?? {});
    if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    const db = getSupabaseAdmin();
    if (!db) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    let q = db.from(RAIDS).update({ seen_at: new Date().toISOString() }).eq('defender_id', user.id).is('seen_at', null);
    if (parsed.data.ids?.length) q = q.in('id', parsed.data.ids);
    const { data, error } = await q.select('id');
    if (error) throw error;
    return NextResponse.json({ ok: true, count: Array.isArray(data) ? data.length : 0 });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-estate-seen');
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
