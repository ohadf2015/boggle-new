/**
 * GET /api/adventure/demo?language=en
 * Demo board for guests: World 1, Level 1, row 0 node (first fight).
 * No auth required; heavily rate-limited; returns grid + level + hints only.
 * No tokens, no DB writes, no coin awards.
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { loadWordChecker } from '@/lib/server/dictionarySet';
import { getPlayLevel, tuneToBoard, parForBoard } from '@/lib/adventure/play/levels';
import { loadCommonWords } from '@/lib/adventure/play/commonWords';
import { dealLevel, solveBoard } from '@/lib/adventure/play/deal';
import { boardTotalScore } from '@/lib/adventure/play/scoreRun';
import { makeRng } from '@/lib/adventure/play/rng';
import { adventureLang, loadPrefixDict } from '@/lib/adventure/play/server';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import type { Language } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rl = checkApiRateLimit(request, 'adventure-demo', { maxRequests: 20, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const language = adventureLang(request.nextUrl.searchParams.get('language'));
  const world = 1;
  const level = 1;

  let lvl;
  try {
    lvl = getPlayLevel(world, level);
  } catch {
    return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
  }

  // Fetch the board grid and deal it.
  try {
    const [isWord, dict, common] = await Promise.all([
      loadWordChecker(language),
      loadPrefixDict(language),
      loadCommonWords(language),
    ]);

    const solve = (g: string[][]) => (dict ? solveBoard(g, dict, { minLength: lvl.minLength }) : []);
    // Use a fixed seed for demo reproducibility.
    const demoSeed = 'demo-w1-l1-guest';

    const deal = dealLevel({
      lvl,
      language,
      isWord: isWord ?? (() => false),
      rand: makeRng(`${demoSeed}:deal:${Date.now()}`),
      solve,
      common,
      generate: (targetWords) =>
        targetWords
          ? generateRandomTable(lvl.size, lvl.size, language as Language, targetWords)
          : (pickRichestBoardClient(
              () => generateRandomTable(lvl.size, lvl.size, language as Language),
              language,
            ) as string[][]),
    });

    const solved = solve(deal.grid);

    // Tune the thresholds to the board.
    const tuned = solved.length
      ? tuneToBoard(world, level, parForBoard(boardTotalScore(solved, language), lvl.size))
      : null;
    const playLevel = tuned
      ? {
          ...lvl,
          stars: tuned.stars,
          ...(tuned.enemyHp === undefined ? {} : { enemyHp: tuned.enemyHp, bossHp: tuned.enemyHp }),
        }
      : lvl;

    return NextResponse.json({
      grid: deal.grid,
      language,
      level: playLevel,
      seconds: lvl.seconds,
      hints: deal.hints,
      ...(deal.targets ? { targets: deal.targets } : {}),
    });
  } catch (err) {
    console.error('[ADVENTURE DEMO] deal failed', err);
    return NextResponse.json({ error: 'Adventure unavailable' }, { status: 503 });
  }
}
