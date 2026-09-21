/**
 * POST /api/adventure/complete { token, words, at?, hpLeft?, potionsUsed?, died?, reviveUsed? }
 * `at` = find time per word (ms) — feeds the combo + speed bonus, clamped server-side.
 * Scores a run from the signed board + word list + server clock (never client
 * score/stars), keeps the best result per level, grants collectibles.
 * Writes go through the service-role client: RLS on player_progression and
 * player_inventory only admits service_role (the old route wrote with the user
 * client and every progression/loot write silently failed).
 * Roguelike: relics come from the signed token ONLY (never the body). A won,
 * survived level returns the next signed run (step+1, gold, new offer).
 */
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { loadWordChecker } from '@/lib/server/dictionarySet';
import { verifyAttempt } from '@/lib/adventure/play/attemptToken';
import { settleRun } from '@/lib/adventure/play/settleRun';
import { totalStarsOf, type Completion } from '@/lib/adventure/play/progress';
import { attemptSecret, loadCompletions } from '@/lib/adventure/play/server';
import { advanceRun, signRun, publicRun, type RunPayload } from '@/lib/adventure/play/runToken';
import { nodeById, type NodeKind } from '@/lib/adventure/play/runMap';
import { runMapOf } from '@/lib/adventure/play/runView';
import { creditEcosystem, emptyEcosystem } from '@/lib/adventure/play/ecosystem';
import { withEliteTrophy } from '@/lib/adventure/play/trophy';
import { getCollectibleById } from '@/lib/adventure/collectibleConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// player_inventory.item_type is CHECK-constrained to the loot type names.
const ITEM_TYPE: Record<string, string> = {
  scroll: 'loreScroll',
  rune: 'runeFragment',
  trophy: 'bossTrophy',
  relic: 'ancientRelic',
};

async function grantItems(db: SupabaseClient, userId: string, world: number, level: number, ids: string[]) {
  for (const id of ids) {
    const meta = getCollectibleById(id);
    const { data: existing } = await db
      .from('player_inventory')
      .select('quantity')
      .eq('user_id', userId)
      .eq('item_id', id)
      .maybeSingle();
    const { error } = await db.from('player_inventory').upsert(
      {
        user_id: userId,
        item_id: id,
        item_type: ITEM_TYPE[meta?.category ?? 'relic'],
        category: meta?.category ?? 'relic',
        rarity: meta?.rarity ?? 'common',
        quantity: (existing?.quantity ?? 0) + 1,
        source_world: world,
        source_level: level,
      },
      { onConflict: 'user_id,item_id' },
    );
    if (error) throw new Error(`player_inventory upsert ${id}: ${error.message}`);
  }
}

/** Next link of the run chain, or null when the run ends here (loss, death, boss down). */
function nextRun(run: RunPayload | undefined, kind: NodeKind, won: boolean, score: number, body: Record<string, unknown> | null, secret: string) {
  if (!run || !won || body?.died === true || kind === 'boss') return null;
  const hpLeft = typeof body?.hpLeft === 'number' ? body.hpLeft : run.hp;
  const potionsUsed = body?.potionsUsed && typeof body.potionsUsed === 'object' ? body.potionsUsed as Record<string, number> : {};
  const advanced = advanceRun(run, { hpLeft, potionsUsed, score, reviveUsed: body?.reviveUsed === true });
  // An elite kill mints its trophy relic into the run (the kill banner names the same one).
  const next = withEliteTrophy(advanced, kind);
  const trophy = next.relics.find((r) => !advanced.relics.includes(r));
  return { nextRunToken: signRun(next, secret), nextRun: publicRun(next), offer: next.offer ?? [], ...(trophy ? { trophy } : {}) };
}

/**
 * In-process guard against the CONCURRENT replay (double tap, retry storm).
 * The durable guard is `level_completions.completed_at`, which /complete stamps
 * with the ATTEMPT's issue time — a replayed token carries the same `t`, so the
 * second call sees its own stamp already on the row and credits nothing. A
 * legitimate later replay of the node has a different `t` and still pays.
 */
const creditedAttempts = new Map<string, number>();
const CREDIT_TTL_MS = 30 * 60_000;

function claimAttempt(key: string): boolean {
  const now = Date.now();
  for (const [k, at] of creditedAttempts) if (now - at > CREDIT_TTL_MS) creditedAttempts.delete(k);
  if (creditedAttempts.has(key)) return false;
  creditedAttempts.set(key, now);
  return true;
}

export async function POST(request: NextRequest) {
  const rl = checkApiRateLimit(request, 'adventure-complete', { maxRequests: 30, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const user = await getAuthedUser(request).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const words: string[] = Array.isArray(body?.words) ? body.words.filter((w: unknown) => typeof w === 'string') : [];

  const db = createAdminClient();
  const secret = attemptSecret();
  if (!db || !secret) {
    console.error('[ADVENTURE COMPLETE] service-role client or attempt secret missing');
    return NextResponse.json({ error: 'Adventure unavailable' }, { status: 503 });
  }

  const payload = verifyAttempt(body?.token, secret);
  if (!payload || payload.u !== user.id) {
    return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 });
  }

  try {
    const isWord = await loadWordChecker(payload.lang);
    if (!isWord) throw new Error(`no dictionary for ${payload.lang}`);

    const completions = await loadCompletions(db, user.id);
    const prev = completions.find((c) => c.world === payload.w && c.level === payload.l);
    const result = settleRun({
      payload,
      words,
      now: Date.now(),
      isWord,
      prevStars: prev?.stars ?? 0,
      times: body?.at,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

    let next: Completion[] = completions;
    const improved = result.stars > (prev?.stars ?? 0);
    // The attempt's own issue time is the idempotency key: it is stamped onto
    // the completion row, so a replay of the same token recognises its stamp.
    const attemptStamp = new Date(payload.t).toISOString();
    let alreadyCredited = false;
    if (result.stars > 0) {
      // Grants first: rewards are keyed off prevStars, so if the completion row
      // were written first and a grant then failed, the reward would be lost forever.
      await grantItems(db, user.id, payload.w, payload.l, result.rewards);
      const { data: row } = await db
        .from('level_completions')
        .select('best_score, best_words, completed_at')
        .eq('user_id', user.id).eq('world', payload.w).eq('level', payload.l)
        .maybeSingle();
      alreadyCredited = !!row?.completed_at && new Date(row.completed_at).getTime() === payload.t;
      const { error } = await db.from('level_completions').upsert(
        {
          user_id: user.id,
          world: payload.w,
          level: payload.l,
          stars: Math.max(result.stars, prev?.stars ?? 0),
          best_score: Math.max(result.score, row?.best_score ?? 0),
          best_words: Math.max(result.valid.length, row?.best_words ?? 0),
          completed_at: attemptStamp,
        },
        { onConflict: 'user_id,world,level' },
      );
      if (error) throw new Error(`level_completions upsert: ${error.message}`);

      if (improved) {
        next = [
          ...completions.filter((c) => !(c.world === payload.w && c.level === payload.l)),
          { world: payload.w, level: payload.l, stars: Math.max(result.stars, prev?.stars ?? 0) },
        ];
        const { error: pErr } = await db.from('player_progression').upsert(
          {
            user_id: user.id,
            total_stars: totalStarsOf(next),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
        if (pErr) throw new Error(`player_progression upsert: ${pErr.message}`);
      }
    }

    // Which map node this attempt was: the run token knows, and the kind decides
    // the chain (boss ends the run), the coin milestone and the celebration.
    const nodeKind: NodeKind = (payload.run
      ? nodeById(runMapOf(payload.run), payload.run.node)?.kind
      : undefined) ?? (payload.k === 'boss' ? 'boss' : payload.k === 'elite' ? 'elite' : 'fight');
    const worldCleared = nodeKind === 'boss' && result.won && body?.died !== true && (prev?.stars ?? 0) === 0;

    // Ecosystem: only for a genuinely cleared node, only once per attempt.
    const ecosystem = result.won && body?.died !== true && !alreadyCredited && claimAttempt(`${user.id}:${payload.t}:${payload.w}:${payload.l}`)
      ? await creditEcosystem({
        db, userId: user.id, score: result.score, wordCount: result.valid.length,
        longestWord: result.valid.reduce<string | null>((best, w) => (!best || w.length > best.length ? w : best), null),
        nodeKind, world: payload.w, level: payload.l, worldCleared, elapsedMs: result.elapsedMs,
      })
      : emptyEcosystem();

    const chain = nextRun(payload.run, nodeKind, result.won, result.score, body, secret);
    return NextResponse.json({
      success: true,
      ...(chain ?? {}),
      ...ecosystem,
      nodeKind,
      runOver: !chain,
      runComplete: result.won && nodeKind === 'boss' && body?.died !== true,
      points: result.points,
      ...(result.targetsFound ? { targetsFound: result.targetsFound } : {}),
      world: payload.w,
      level: payload.l,
      score: result.score,
      validWords: result.valid,
      stars: result.stars,
      bestStars: Math.max(result.stars, prev?.stars ?? 0),
      won: result.won,
      rewards: result.rewards,
      totalStars: totalStarsOf(next),
    });
  } catch (err) {
    console.error('[ADVENTURE COMPLETE]', err);
    captureApiError(err instanceof Error ? err : new Error(String(err)), '/api/adventure/complete');
    return NextResponse.json({ error: 'Could not save run' }, { status: 500 });
  }
}
