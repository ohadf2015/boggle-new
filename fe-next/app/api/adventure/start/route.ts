/**
 * POST /api/adventure/start { world, level, language, runToken?, pick? }
 * Deals the board server-side and returns it inside a signed attempt token.
 * Roguelike: no runToken → fresh run; with one → verify, step === level,
 * apply the draft pick (omitted = skip). Hunt levels get target words seeded
 * from what the solver finds; every level gets a hint pool.
 */
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import { loadWordChecker } from '@/lib/server/dictionarySet';
import { getPlayLevel } from '@/lib/adventure/play/levels';
import { canPlayLevel } from '@/lib/adventure/play/progress';
import { signAttempt } from '@/lib/adventure/play/attemptToken';
import { freshRun, verifyRun, applyPick, skipPick, signRun, publicRun, type RunPayload } from '@/lib/adventure/play/runToken';
import { dealLevel, solveBoard } from '@/lib/adventure/play/deal';
import { attemptSeconds } from '@/lib/adventure/play/settleRun';
import { makeRng } from '@/lib/adventure/play/rng';
import { attemptSecret, adventureLang, loadCompletions, loadPrefixDict } from '@/lib/adventure/play/server';
import { loadCommonWords } from '@/lib/adventure/play/commonWords';
import type { Language } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const invalidRun = () => NextResponse.json({ error: 'Invalid run' }, { status: 400 });

export async function POST(request: NextRequest) {
  const rl = checkApiRateLimit(request, 'adventure-start', { maxRequests: 30, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const user = await getAuthedUser(request).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const world = Number(body?.world);
  const level = Number(body?.level);
  let lvl;
  try {
    lvl = getPlayLevel(world, level);
  } catch {
    return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
  }

  const db = createAdminClient();
  const secret = attemptSecret();
  if (!db || !secret) {
    console.error('[ADVENTURE START] service-role client or attempt secret missing');
    return NextResponse.json({ error: 'Adventure unavailable' }, { status: 503 });
  }

  // Run: fresh, or the chained token from the last cleared level (+ draft pick).
  let run: RunPayload;
  if (body?.runToken != null) {
    const prev = verifyRun(body.runToken, secret);
    if (!prev || prev.u !== user.id || prev.w !== world || prev.step !== level) return invalidRun();
    if (body.pick == null) {
      run = skipPick(prev);
    } else {
      const picked = applyPick(prev, Number(body.pick));
      if (!picked) return invalidRun();
      run = picked;
    }
  } else {
    run = { ...freshRun(world, user.id, randomUUID()), step: level };
  }

  try {
    const completions = await loadCompletions(db, user.id);
    if (!canPlayLevel(completions, world, level)) {
      return NextResponse.json({ error: 'Locked' }, { status: 403 });
    }
  } catch (err) {
    console.error('[ADVENTURE START]', err);
    return NextResponse.json({ error: 'Adventure unavailable' }, { status: 503 });
  }

  const language = adventureLang(body?.language);
  let deal;
  try {
    const [isWord, dict, common] = await Promise.all([loadWordChecker(language), loadPrefixDict(language), loadCommonWords(language)]);
    // No dictionary = no hints; a hunt can't be dealt fairly, so dealLevel throws.
    const solve = (g: string[][]) => (dict ? solveBoard(g, dict, { minLength: lvl.minLength }) : []);
    deal = dealLevel({
      lvl,
      language,
      isWord: isWord ?? (() => false),
      rand: makeRng(`${run.seed}:deal:${level}:${Date.now()}`),
      solve,
      common,
      generate: (targetWords) => (targetWords
        ? generateRandomTable(lvl.size, lvl.size, language as Language, targetWords)
        : pickRichestBoardClient(() => generateRandomTable(lvl.size, lvl.size, language as Language), language)) as string[][],
    });
    if (!deal.hints.length) console.warn(`[ADVENTURE START] empty hint pool (${language}, w${world}-l${level})`);
  } catch (err) {
    console.error('[ADVENTURE START] deal failed', err);
    return NextResponse.json({ error: 'Adventure unavailable' }, { status: 503 });
  }

  const attempt = {
    u: user.id, w: world, l: level, g: deal.grid, lang: language, t: Date.now(),
    k: lvl.kind, r: run.relics, tp: run.potions.time ?? 0, run,
    ...(deal.targets ? { tg: deal.targets } : {}),
  };
  const token = signAttempt(attempt, secret);
  return NextResponse.json({
    token,
    grid: deal.grid,
    language,
    level: lvl,
    /** Level clock incl. relic bonus (time potions extend it client-side). */
    seconds: attemptSeconds({ w: world, l: level, r: run.relics, tp: 0 }),
    run: publicRun(run),
    runToken: signRun(run, secret),
    hints: deal.hints,
    ...(deal.targets ? { targets: deal.targets } : {}),
  });
}
