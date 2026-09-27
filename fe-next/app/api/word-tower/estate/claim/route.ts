import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { mergeGuestEstate, perksFromEstate, sanitizeEstate } from '@/lib/wordTowerV2/estate';
import { mutateEstate } from '@/lib/wordTowerV2/estateServer';
import { claimOnce } from '@/lib/server/claimOnce';

export const runtime = 'nodejs';

/**
 * POST /api/word-tower/estate/claim { estate } — a guest just signed in. The
 * empire they built in localStorage is merged into the account
 * (mergeGuestEstate: sanitised, coins capped per run and outright, once per
 * account) instead of being
 * silently abandoned. The client clears its local copy on a 200.
 */
const Body = z.object({ estate: z.record(z.string(), z.unknown()) });

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const rl = checkApiRateLimit(request, `word-tower-estate-claim:${user.id}`, { maxRequests: 3, windowMs: 60_000 });
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    const db = getSupabaseAdmin();
    if (!db) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    const guest = sanitizeEstate(parsed.data.estate);
    // Once per account: the guest estate is forgeable client state and its
    // coins land in the app-wide wallet. Store down = 503, so the client keeps
    // the guest bank and retries next load rather than it being lost or doubled.
    // ponytail: claimed before the merge; a merge that then fails (3 lost CAS
    // races) forfeits the guest bank — rare, and never a double payout.
    if (guest.runs > 0) {
      const once = await claimOnce(`wt2-guest-claim:${user.id}`, 60 * 60 * 24 * 3650);
      if (once === 'taken') return NextResponse.json({ error: 'already claimed', reason: 'already_claimed' }, { status: 400 });
      if (once === 'unavailable') return NextResponse.json({ error: 'try again later', reason: 'unavailable' }, { status: 503 });
    }
    const res = await mutateEstate(db, user.id, (e) => ({ ok: true, estate: mergeGuestEstate(e, guest), extra: {} }));
    if (!res.ok) return NextResponse.json({ error: 'busy, retry', reason: res.reason }, { status: 409 });
    return NextResponse.json({ estate: res.estate, perks: perksFromEstate(res.estate) });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-estate-claim');
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
