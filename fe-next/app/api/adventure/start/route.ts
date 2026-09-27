/**
 * POST /api/adventure/start { world, nodeId, language, runToken?, pick? }
 * Deals the board server-side and returns it inside a signed attempt token.
 *
 * Roguelike v2: the run carries its position on the act map, so the gate is
 * "`nodeId` is an edge out of the run's current node" (the old `step === level`
 * check could not express a branching map). The level played is derived from
 * the node — fights borrow the world's level specs by row, elites level 4,
 * the boss level 7 — so stars / unlocks / collection keep their existing rows.
 *
 * Without a runToken a fresh run is minted and `nodeId` must be on row 0.
 * A v1 token is rejected with `code: 'run_version'`; the client drops its
 * stored run and starts over.
 */
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import { loadWordChecker } from '@/lib/server/dictionarySet';
import { getPlayLevel, WORLD_COUNT, parForBoard, tuneToBoard } from '@/lib/adventure/play/levels';
import { canPlayLevel } from '@/lib/adventure/play/progress';
import { signAttempt } from '@/lib/adventure/play/attemptToken';
import { freshRun, verifyRun, applyPick, skipPick, enterNode, type RunPayload } from '@/lib/adventure/play/runToken';
import { buildRunMap, canEnter, isPlayNode, nodeById, nodeLevel } from '@/lib/adventure/play/runMap';
import { runView } from '@/lib/adventure/play/runView';
import { dealLevel, solveBoard } from '@/lib/adventure/play/deal';
import { boardTotalScore } from '@/lib/adventure/play/scoreRun';
import { attemptSeconds } from '@/lib/adventure/play/settleRun';
import { makeRng } from '@/lib/adventure/play/rng';
import { attemptSecret, adventureLang, loadCompletions, loadPrefixDict } from '@/lib/adventure/play/server';
import { loadCommonWords } from '@/lib/adventure/play/commonWords';
import type { Language } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const invalidRun = (code: string) => NextResponse.json({ error: 'Invalid run', code }, { status: 400 });

export async function POST(request: NextRequest) {
  const rl = checkApiRateLimit(request, 'adventure-start', { maxRequests: 30, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const user = await getAuthedUser(request).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const world = Number(body?.world);
  if (!Number.isInteger(world) || world < 1 || world > WORLD_COUNT) {
    return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
  }

  const db = createAdminClient();
  const secret = attemptSecret();
  if (!db || !secret) {
    console.error('[ADVENTURE START] service-role client or attempt secret missing');
    return NextResponse.json({ error: 'Adventure unavailable' }, { status: 503 });
  }

  // Run: fresh (row 0 only), or the chained token from the last node (+ draft pick).
  let run: RunPayload;
  let freshWorldGate = false;
  if (body?.runToken != null) {
    const prev = verifyRun(body.runToken, secret);
    if (!prev || prev.u !== user.id || prev.w !== world) return invalidRun('run_version');
    if (body.pick === null || body.pick === undefined) {
      run = skipPick(prev);
    } else {
      const picked = applyPick(prev, Number(body.pick));
      if (!picked) return invalidRun('pick');
      run = picked;
    }
  } else {
    run = freshRun(world, user.id, randomUUID());
    freshWorldGate = true;
  }

  // The map edge is the in-run gate; `canPlayLevel` only guards world unlock.
  // A missing nodeId means "the obvious one": the run's current node (a re-deal
  // after the player lingered on the rule cards) or, on a fresh run, row 0 lane 0.
  const map = buildRunMap(run.seed, run.w);
  const requested = typeof body?.nodeId === 'string' ? body.nodeId : (run.node ?? map.nodes.find((n) => n.row === 0)?.id);
  const target = nodeById(map, requested);
  if (!target) return invalidRun('node');
  // Re-dealing the node the run already stands on is a re-deal, not a move.
  const reDeal = target.id === run.node;
  if (!reDeal && !canEnter(map, run.node, target.id)) return invalidRun('unreachable');
  if (!isPlayNode(target.kind)) return invalidRun('not_play_node');
  const level = nodeLevel(target)!;

  let lvl;
  try {
    lvl = getPlayLevel(world, level);
  } catch {
    return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
  }
  if (!reDeal) run = enterNode(run, target.id);

  if (freshWorldGate) {
    try {
      const completions = await loadCompletions(db, user.id);
      if (!canPlayLevel(completions, world, 1)) {
        return NextResponse.json({ error: 'Locked' }, { status: 403 });
      }
    } catch (err) {
      console.error('[ADVENTURE START]', err);
      return NextResponse.json({ error: 'Adventure unavailable' }, { status: 503 });
    }
  }

  const language = adventureLang(body?.language);
  let deal;
  // Full solve of the grid that was finally chosen — the basis for this
  // attempt's thresholds. dealLevel solves candidates internally but does not
  // hand the winner back, and one more pass is cheaper than changing its contract.
  let solved: string[] = [];
  try {
    const [isWord, dict, common] = await Promise.all([loadWordChecker(language), loadPrefixDict(language), loadCommonWords(language)]);
    // No dictionary = no hints; a hunt can't be dealt fairly, so dealLevel throws.
    const solve = (g: string[][]) => (dict ? solveBoard(g, dict, { minLength: lvl.minLength }) : []);
    deal = dealLevel({
      lvl,
      language,
      isWord: isWord ?? (() => false),
      rand: makeRng(`${run.seed}:deal:${target.id}:${Date.now()}`),
      solve,
      common,
      generate: (targetWords) => (targetWords
        ? generateRandomTable(lvl.size, lvl.size, language as Language, targetWords)
        : pickRichestBoardClient(() => generateRandomTable(lvl.size, lvl.size, language as Language), language)) as string[][],
    });
    solved = solve(deal.grid);
    if (!deal.hints.length) console.warn(`[ADVENTURE START] empty hint pool (${language}, w${world}-l${level})`);
  } catch (err) {
    console.error('[ADVENTURE START] deal failed', err);
    return NextResponse.json({ error: 'Adventure unavailable' }, { status: 503 });
  }

  // Tune the thresholds to the board actually dealt. The solver already ran for
  // hints/targets, so this is one more pass over the final grid (~1-2.5ms warm):
  // cheap enough to pay per attempt, and it is what stops a vowel-poor deal from
  // walling the player while a rich one hands out free stars.
  const tuned = solved.length
    ? tuneToBoard(world, level, parForBoard(boardTotalScore(solved, language), lvl.size))
    : null;
  const playLevel = tuned ? { ...lvl, stars: tuned.stars, ...(tuned.enemyHp === undefined ? {} : { enemyHp: tuned.enemyHp, bossHp: tuned.enemyHp }) } : lvl;

  const attempt = {
    u: user.id, w: world, l: level, g: deal.grid, lang: language, t: Date.now(),
    k: lvl.kind, r: run.relics, tp: run.potions.time ?? 0, run,
    ...(deal.targets ? { tg: deal.targets } : {}),
    ...(tuned ? { st: tuned.stars, ...(tuned.enemyHp === undefined ? {} : { eh: tuned.enemyHp }) } : {}),
  };
  const token = signAttempt(attempt, secret);
  return NextResponse.json({
    token,
    grid: deal.grid,
    language,
    level: playLevel,
    /** Level clock incl. relic bonus (time potions extend it client-side). */
    seconds: attemptSeconds({ w: world, l: level, r: run.relics, tp: 0 }),
    ...runView(run, secret),
    nodeKind: target.kind,
    hints: deal.hints,
    ...(deal.targets ? { targets: deal.targets } : {}),
  });
}
