import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { asyncWreckDamageFloors } from '@/lib/wordTower/sabotage';

export const runtime = 'nodejs';

/**
 * Word Tower async wrecking-ball raids.
 *
 * GET  — claim the caller's pending wreck inbox: atomically marks the
 *        unapplied rows applied (update … returning) so each lands exactly once,
 *        even across concurrent session starts, then returns them for the client
 *        to fold into its restored session state.
 * POST — enqueue a wreck against a leaderboard rival. Damage is RECOMPUTED on the
 *        server from the heights (client-claimed damage is never trusted) and
 *        clamped by the shared pure formula.
 */

const PostSchema = z.object({
  targetPlayerId: z.string().uuid(),
  attackerHeightM: z.number().min(0).max(1e9),
  targetHeightM: z.number().min(0).max(1e9),
  reason: z.string().max(48).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    // Atomic claim: mark this defender's open wrecks applied and return them.
    const { data, error } = await supabase
      .from('word_tower_pending_wrecks')
      .update({ applied_at: new Date().toISOString() })
      .eq('defender_id', user.id)
      .is('applied_at', null)
      .select('id, attacker_name, damage_floors');

    if (error) {
      captureApiError(error as unknown as Error, 'word-tower-wreck-get');
      return NextResponse.json({ error: 'failed to load' }, { status: 500 });
    }

    const wrecks = (data ?? []).map((r) => ({
      id: r.id as string,
      attackerName: (r.attacker_name as string | null) ?? 'Rival',
      damageFloors: Number(r.damage_floors) || 1,
    }));
    return NextResponse.json({ wrecks });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-wreck-get');
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkApiRateLimit(request, 'word-tower-wreck-post', {
      maxRequests: 20,
      windowMs: 60_000,
    });
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = PostSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    const b = parsed.data;

    if (b.targetPlayerId === user.id) {
      return NextResponse.json({ error: 'cannot wreck yourself' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    // Server is the authority on damage — recompute from heights, ignore any
    // client-claimed value.
    const damageFloors = asyncWreckDamageFloors(b.attackerHeightM, b.targetHeightM);

    // Denormalize the attacker's display name so the defender's session-start
    // read needs no profiles join.
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .maybeSingle();
    const attackerName =
      (profile?.display_name as string | null) ||
      (profile?.username as string | null) ||
      'Rival';

    const { error } = await supabase.from('word_tower_pending_wrecks').insert({
      attacker_id: user.id,
      defender_id: b.targetPlayerId,
      attacker_name: attackerName,
      damage_floors: damageFloors,
      reason: b.reason ?? null,
    });

    if (error) {
      captureApiError(error as unknown as Error, 'word-tower-wreck-post');
      return NextResponse.json({ error: 'failed to send' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, damageFloors });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-wreck-post');
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
