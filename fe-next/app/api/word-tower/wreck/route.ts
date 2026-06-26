import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { asyncWreckDamageFloors } from '@/lib/wordTower/sabotage';
import { notifyWordTowerWreck, notifyWordTowerPass } from '@/backend/modules/pushNotificationTriggers';

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

// Only the target + an optional flavour reason are accepted. Heights (which
// drive damage) are NEVER taken from the client — they are read server-side
// from word_tower_progress so a forged body can't inflate the hit.
const PostSchema = z.object({
  targetPlayerId: z.string().uuid(),
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
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Per-USER rate limit (keyed on the authed id, not just IP) so one account
    // can't spray wrecks from rotating IPs. The DB partial-unique index is the
    // backstop that caps pending wrecks at one per (attacker, defender) pair.
    const rl = checkApiRateLimit(request, `word-tower-wreck-post:${user.id}`, {
      maxRequests: 20,
      windowMs: 60_000,
    });
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const parsed = PostSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    const b = parsed.data;

    if (b.targetPlayerId === user.id) {
      return NextResponse.json({ error: 'cannot wreck yourself' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    // Heights are read SERVER-SIDE from the authoritative progress table — never
    // from the request body. The target must have a progress row (i.e. be a real
    // leaderboard rival); wrecking a non-player is rejected.
    const { data: rows, error: readErr } = await supabase
      .from('word_tower_progress')
      .select('player_id, best_height_m')
      .in('player_id', [user.id, b.targetPlayerId]);
    if (readErr) {
      captureApiError(readErr as unknown as Error, 'word-tower-wreck-post');
      return NextResponse.json({ error: 'failed to send' }, { status: 500 });
    }
    const attackerBest = Number(rows?.find((r) => r.player_id === user.id)?.best_height_m) || 0;
    const targetRow = rows?.find((r) => r.player_id === b.targetPlayerId);
    if (!targetRow) {
      return NextResponse.json({ error: 'invalid target' }, { status: 400 });
    }
    const targetBest = Number(targetRow.best_height_m) || 0;

    // Server is the sole authority on damage — derived from authoritative heights
    // and clamped by the shared pure formula (1..WRECK_MAX_FLOORS_PER_ATTACK).
    const damageFloors = asyncWreckDamageFloors(attackerBest, targetBest);

    // Denormalize the attacker's display name (server-derived, never client) so
    // the defender's session-start read needs no profiles join.
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
      // Partial-unique index violation = an unapplied wreck for this pair already
      // exists. That's the anti-pile-on guard, not a failure — report idempotently.
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json({ ok: true, alreadyQueued: true, damageFloors });
      }
      captureApiError(error as unknown as Error, 'word-tower-wreck-post');
      return NextResponse.json({ error: 'failed to send' }, { status: 500 });
    }

    // Fire-and-forget push notifications: wreck to defender, pass if applicable.
    // Both awaited to ensure FCM attempt completes; they never throw.
    await notifyWordTowerWreck(b.targetPlayerId, attackerName, damageFloors, user.id);
    if (attackerBest > targetBest) {
      await notifyWordTowerPass(b.targetPlayerId, attackerName, user.id);
    }

    return NextResponse.json({ ok: true, damageFloors });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-wreck-post');
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
