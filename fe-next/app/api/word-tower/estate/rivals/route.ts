import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import {
  type Db,
  ESTATES,
  ESTATE_COLS,
  RAIDS,
  loadOrCreateEstate,
  profilesByIds,
  rowToEstate,
} from '@/lib/wordTowerV2/estateServer';

export const runtime = 'nodejs';

/**
 * GET /api/word-tower/estate/rivals — 3 estates nearest yours (same district,
 * closest best_m; topped up from other districts when yours is quiet) plus the
 * revenge list: players who raided you and haven't been hit back.
 * Test accounts are NOT filtered — QA accounts must be able to find each other.
 * Every rival carries `userId` (Avatar renders a skeleton forever without it).
 */
const RIVALS = 3;
const REVENGE = 5;
type Row = Record<string, unknown>;

async function rows(q: PromiseLike<{ data: unknown; error: unknown }>): Promise<Row[]> {
  const { data, error } = await q;
  if (error) throw error;
  return (data as Row[] | null) ?? [];
}

async function nearest(db: Db, me: string, district: number, bestM: number): Promise<Row[]> {
  // PostgREST can't ORDER BY abs(best_m - x): take the closest few above and below, merge.
  const [up, down] = await Promise.all([
    rows(db.from(ESTATES).select(ESTATE_COLS).eq('district', district).neq('player_id', me).gte('best_m', bestM).order('best_m', { ascending: true }).limit(RIVALS + 1)),
    rows(db.from(ESTATES).select(ESTATE_COLS).eq('district', district).neq('player_id', me).lt('best_m', bestM).order('best_m', { ascending: false }).limit(RIVALS + 1)),
  ]);
  const picked = [...up, ...down]
    .map((r, i) => ({ r, d: Math.abs(Number(r.best_m) - bestM), i }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .slice(0, RIVALS)
    .map((x) => x.r);
  if (picked.length >= RIVALS) return picked;
  const more = await rows(
    db.from(ESTATES).select(ESTATE_COLS).neq('player_id', me).neq('district', district).order('updated_at', { ascending: false }).limit(RIVALS * 2),
  );
  const seen = new Set(picked.map((r) => String(r.player_id)));
  for (const r of more) {
    if (picked.length >= RIVALS) break;
    if (!seen.has(String(r.player_id))) picked.push(r);
  }
  return picked;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getSupabaseAdmin();
    if (!db) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    const { estate: mine } = await loadOrCreateEstate(db, user.id);
    const [near, raids] = await Promise.all([
      nearest(db, user.id, mine.district, mine.bestM),
      rows(
        db.from(RAIDS)
          .select('id, attacker_id, coins_stolen, blocked, plot, created_at')
          .eq('defender_id', user.id)
          .is('avenged_at', null)
          .order('created_at', { ascending: false })
          .limit(REVENGE * 2),
      ),
    ]);

    // Latest un-avenged raid per attacker.
    const revengeRaids: Row[] = [];
    const attackers = new Set<string>();
    for (const r of raids) {
      const id = String(r.attacker_id);
      if (attackers.has(id) || revengeRaids.length >= REVENGE) continue;
      attackers.add(id);
      revengeRaids.push(r);
    }
    const nearIds = new Set(near.map((r) => String(r.player_id)));
    const missing = [...attackers].filter((id) => !nearIds.has(id));
    const extra = missing.length ? await rows(db.from(ESTATES).select(ESTATE_COLS).in('player_id', missing)) : [];
    const estates = new Map([...near, ...extra].map((r) => [String(r.player_id), r]));
    const profiles = await profilesByIds(db, [...new Set([...nearIds, ...attackers])]);

    const view = (id: string) => {
      const r = estates.get(id);
      const e = r ? rowToEstate(r) : null;
      return {
        ...profiles.get(id)!,
        district: e?.district ?? 1,
        plots: e?.plots ?? [],
        shields: e?.shields ?? 0,
        bestM: e?.bestM ?? 0,
        lastTower: e?.lastTower ?? [],
      };
    };

    return NextResponse.json({
      rivals: near.map((r) => view(String(r.player_id))),
      revenge: revengeRaids.map((r) => ({
        raidId: String(r.id),
        coinsStolen: Number(r.coins_stolen) || 0,
        blocked: r.blocked === true,
        plot: (r.plot as string | null) ?? null,
        createdAt: String(r.created_at),
        rival: view(String(r.attacker_id)),
      })),
    });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-estate-rivals');
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
