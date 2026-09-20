import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { perksFromEstate } from '@/lib/wordTowerV2/estate';
import { RAIDS, loadOrCreateEstate, profilesByIds } from '@/lib/wordTowerV2/estateServer';

export const runtime = 'nodejs';

/**
 * GET /api/word-tower/estate — the caller's estate (created empty on first
 * read) + perks + raids on them they haven't seen yet. Seeing is explicit
 * (POST ./seen) so a reload doesn't lose the "you were raided" moment.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getSupabaseAdmin();
    if (!db) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    const { estate } = await loadOrCreateEstate(db, user.id);
    const { data, error } = await db
      .from(RAIDS)
      .select('id, attacker_id, blocked, plot, coins_stolen, revenge, created_at, avenged_at')
      .eq('defender_id', user.id)
      .is('seen_at', null)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const names = await profilesByIds(db, [...new Set(rows.map((r) => String(r.attacker_id)))]);
    const raids = rows.map((r) => {
      const who = names.get(String(r.attacker_id));
      return {
        id: String(r.id),
        attackerId: String(r.attacker_id),
        attackerName: who?.displayName ?? 'Rival',
        attackerAvatar: who?.avatar ?? null,
        blocked: r.blocked === true,
        plot: (r.plot as string | null) ?? null,
        coinsStolen: Number(r.coins_stolen) || 0,
        revenge: r.revenge === true,
        avenged: r.avenged_at != null,
        createdAt: String(r.created_at),
      };
    });
    return NextResponse.json({ estate, perks: perksFromEstate(estate), raids });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-estate-get');
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
