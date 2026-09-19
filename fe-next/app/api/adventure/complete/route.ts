/**
 * POST /api/adventure/complete { token, words }
 * Scores a run from the signed board + word list + server clock (never client
 * score/stars), keeps the best result per level, grants collectibles.
 * Writes go through the service-role client: RLS on player_progression and
 * player_inventory only admits service_role (the old route wrote with the user
 * client and every progression/loot write silently failed).
 */
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { loadDictionarySet } from '@/lib/server/dictionarySet';
import { verifyAttempt } from '@/lib/adventure/play/attemptToken';
import { settleRun } from '@/lib/adventure/play/settleRun';
import { totalStarsOf, type Completion } from '@/lib/adventure/play/progress';
import { attemptSecret, loadCompletions } from '@/lib/adventure/play/server';
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
    const dict = await loadDictionarySet(payload.lang);
    if (dict.size === 0) throw new Error(`empty dictionary for ${payload.lang}`);

    const completions = await loadCompletions(db, user.id);
    const prev = completions.find((c) => c.world === payload.w && c.level === payload.l);
    const result = settleRun({
      payload,
      words,
      now: Date.now(),
      isWord: (w) => dict.has(w),
      prevStars: prev?.stars ?? 0,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

    let next: Completion[] = completions;
    const improved = result.stars > (prev?.stars ?? 0);
    if (result.stars > 0) {
      // Grants first: rewards are keyed off prevStars, so if the completion row
      // were written first and a grant then failed, the reward would be lost forever.
      await grantItems(db, user.id, payload.w, payload.l, result.rewards);
      const { data: row } = await db
        .from('level_completions')
        .select('best_score, best_words')
        .eq('user_id', user.id).eq('world', payload.w).eq('level', payload.l)
        .maybeSingle();
      const { error } = await db.from('level_completions').upsert(
        {
          user_id: user.id,
          world: payload.w,
          level: payload.l,
          stars: Math.max(result.stars, prev?.stars ?? 0),
          best_score: Math.max(result.score, row?.best_score ?? 0),
          best_words: Math.max(result.valid.length, row?.best_words ?? 0),
          completed_at: new Date().toISOString(),
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

    return NextResponse.json({
      success: true,
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
