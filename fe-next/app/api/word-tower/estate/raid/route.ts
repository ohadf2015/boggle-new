import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { notifyWordTowerWreck } from '@/backend/modules/pushNotificationTriggers';
import { perksFromEstate, raidOutcome } from '@/lib/wordTowerV2/estate';
import { type Db, RAIDS, loadEstate } from '@/lib/wordTowerV2/estateServer';
import { claimOnce } from '@/lib/server/claimOnce';

export const runtime = 'nodejs';

/**
 * POST /api/word-tower/estate/raid { defenderId, accuracy, revenge? }
 *
 * Costs one raid charge (earned per run). The outcome is recomputed here from
 * the defender's stored estate + clamped accuracy (pure raidOutcome) and
 * applied by the `word_tower_apply_raid` RPC: shield / damage / steal / pay /
 * avenge / log in ONE transaction. Client-claimed coins or damage are ignored.
 */
const Body = z.object({
  defenderId: z.string().uuid(),
  accuracy: z.number().finite(),
  // Optional: bundles cached from before the nonce shipped omit it and must still raid.
  nonce: z.string().min(8).max(128).optional(),
  revenge: z.boolean().optional(),
});

const RPC_STATUS: Record<string, number> = { no_charges: 409, no_defender: 404, no_revenge: 400 };

async function attackerName(db: Db, id: string): Promise<string> {
  const { data } = await db.from('profiles').select('display_name, username').eq('id', id).maybeSingle();
  const p = data as { display_name?: string | null; username?: string | null } | null;
  return p?.display_name || p?.username || 'Rival';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const rl = checkApiRateLimit(request, `word-tower-estate-raid:${user.id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    const { defenderId, nonce, revenge = false } = parsed.data;
    // Clamp accuracy to [0, 1], with NaN safety
    const accuracy = Number.isFinite(parsed.data.accuracy) ? Math.min(1, Math.max(0, parsed.data.accuracy)) : 0;
    if (defenderId === user.id) return NextResponse.json({ error: 'cannot raid yourself' }, { status: 400 });

    const db = getSupabaseAdmin();
    if (!db) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    const attacker = await loadEstate(db, user.id);

    /**
     * Payback is free, and it is looked up BEFORE the charge gate.
     *
     * A raid charge is banked by a run, so making revenge cost one means
     * "someone wrecked you — now go play a round before you may answer".
     * The bar (Coin Master) does the opposite: revenge is the one thing always
     * actionable with nothing banked, which is exactly why it brings players
     * back. The un-avenged raid row IS the charge here: the RPC flips its
     * `avenged_at` in the same transaction that applies the hit, so one raid
     * buys exactly one free swing and a client cannot mint them.
     */
    let revengeRaidId: string | null = null;
    if (revenge) {
      const { data, error } = await db
        .from(RAIDS)
        .select('id')
        .eq('attacker_id', defenderId)
        .eq('defender_id', user.id)
        .is('avenged_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: 'nothing to avenge', reason: 'no_revenge' }, { status: 400 });
      revengeRaidId = String((data as { id: string }).id);
    }

    if (!attacker || (attacker.estate.raidCharges < 1 && !revengeRaidId)) {
      return NextResponse.json({ error: 'no raid charges', reason: 'no_charges' }, { status: 409 });
    }

    // Guard against retried raids crediting coins twice via claimOnce idempotency.
    // Key: user + nonce (one attempt per unique nonce). 24-hour TTL. Fails closed on Redis unavailable.
    if (nonce) {
      const claimed = await claimOnce(`wt2-raid:${user.id}:${nonce}`, 60 * 60 * 24);
      if (claimed === 'taken') return NextResponse.json({ error: 'raid already claimed', reason: 'duplicate' }, { status: 409 });
      if (claimed === 'unavailable') return NextResponse.json({ error: 'system unavailable', reason: 'idempotency' }, { status: 503 });
    }

    // Two tries: a shield bought/consumed between our read and the RPC's lock flips the outcome.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const defender = await loadEstate(db, defenderId);
      if (!defender) return NextResponse.json({ error: 'unknown rival', reason: 'no_defender' }, { status: 404 });
      const out = raidOutcome({ attackerAccuracy: accuracy, defender: defender.estate, revenge });

      const { data, error } = await db.rpc('word_tower_apply_raid', {
        p_attacker: user.id,
        p_defender: defenderId,
        p_district: defender.estate.district,
        p_slot: out.kind === 'damaged' ? out.slot : null,
        p_blocked: out.kind === 'blocked',
        p_coins_stolen: out.kind === 'damaged' ? out.coinsStolen : 0,
        p_attacker_coins: out.attackerCoins,
        p_revenge_raid_id: revengeRaidId,
      });
      if (error) {
        const code = Object.keys(RPC_STATUS).find((k) => String((error as { message?: string }).message).includes(k));
        if (code) return NextResponse.json({ error: 'raid refused', reason: code }, { status: RPC_STATUS[code] });
        if (String((error as { message?: string }).message).includes('stale_shield')) continue;
        throw error;
      }

      const applied = (Array.isArray(data) ? data[0] : data) as
        | { out_raid_id: string; out_coins_stolen: number; out_attacker_coins: number }
        | null;
      const outcome =
        out.kind === 'blocked'
          ? { kind: 'blocked' as const, attackerCoins: applied?.out_attacker_coins ?? out.attackerCoins }
          : {
              kind: 'damaged' as const,
              slot: out.slot,
              coinsStolen: applied?.out_coins_stolen ?? out.coinsStolen,
              attackerCoins: applied?.out_attacker_coins ?? out.attackerCoins,
            };

      if (outcome.kind === 'damaged') {
        try {
          await notifyWordTowerWreck(defenderId, await attackerName(db, user.id), 1, user.id);
        } catch (e) {
          captureApiError(e as Error, 'word-tower-estate-raid-notify');
        }
      }

      const after = await loadEstate(db, user.id);
      const estate = after?.estate ?? attacker.estate;
      return NextResponse.json({ raidId: applied?.out_raid_id ?? null, outcome, revenge, estate, perks: perksFromEstate(estate) });
    }
    return NextResponse.json({ error: 'busy, retry', reason: 'conflict' }, { status: 409 });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-estate-raid');
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
