/**
 * POST /api/adventure/node { world?, runToken?, nodeId?, choice?, pick? }
 *
 * The map half of a run: it mints a run (no runToken), moves it onto a non-play
 * node, and resolves that node's choice. Play nodes (fight / elite / boss) go to
 * /api/adventure/start instead — this route refuses them with `play_node` so the
 * client routes rather than guesses.
 *
 * All run state lives in the signed token, so there is nothing to write here.
 * Reachability is validated against the map derived from the run seed, exactly
 * as /start does it.
 */
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { canPlayLevel } from '@/lib/adventure/play/progress';
import { freshRun, verifyRun, applyPick, skipPick, enterNode, type RunPayload } from '@/lib/adventure/play/runToken';
import { canEnter, isPlayNode, nodeById } from '@/lib/adventure/play/runMap';
import { enterNodeState, applyNodeChoice, type NodeState } from '@/lib/adventure/play/nodeResolve';
import { runView, runMapOf } from '@/lib/adventure/play/runView';
import { attemptSecret, loadCompletions } from '@/lib/adventure/play/server';
import { WORLD_COUNT } from '@/lib/adventure/play/levels';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bad = (code: string, status = 400) => NextResponse.json({ error: 'Invalid run', code }, { status });

export async function POST(request: NextRequest) {
  const rl = checkApiRateLimit(request, 'adventure-node', { maxRequests: 60, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const user = await getAuthedUser(request).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const db = createAdminClient();
  const secret = attemptSecret();
  if (!db || !secret) {
    console.error('[ADVENTURE NODE] service-role client or attempt secret missing');
    return NextResponse.json({ error: 'Adventure unavailable' }, { status: 503 });
  }

  try {
    // ---- Fresh run: mint the map, stand off it, offer row 0.
    if (body?.runToken == null) {
      const world = Number(body?.world);
      if (!Number.isInteger(world) || world < 1 || world > WORLD_COUNT) return bad('world');
      const completions = await loadCompletions(db, user.id);
      // World unlock is the only completion gate a run ever checks; inside a run
      // the map edge is the gate, so a path that skips a row can't 403.
      if (!canPlayLevel(completions, world, 1)) return NextResponse.json({ error: 'Locked' }, { status: 403 });
      return NextResponse.json({ ...runView(freshRun(world, user.id, randomUUID()), secret), node: null });
    }

    // ---- Existing run.
    const prev = verifyRun(body.runToken, secret);
    if (!prev || prev.u !== user.id) return bad('run_version');

    // A pending draft pick rides along with whatever move the player made next:
    // `null` skips it, a number takes it, absent leaves the offer standing.
    let run: RunPayload = prev;
    if (body.pick === null) run = skipPick(prev);
    else if (body.pick !== undefined) {
      const picked = applyPick(prev, Number(body.pick));
      if (!picked) return bad('pick');
      run = picked;
    }

    const map = runMapOf(run);
    let state: NodeState | null = null;

    if (typeof body.nodeId === 'string') {
      const target = nodeById(map, body.nodeId);
      if (!target) return bad('node');
      if (!canEnter(map, run.node, body.nodeId)) return bad('unreachable');
      if (isPlayNode(target.kind)) return bad('play_node');
      const entered = enterNodeState(enterNode(run, target.id), target);
      run = entered.run;
      state = entered.state;
    } else if (body.choice != null) {
      const current = nodeById(map, run.node);
      if (!current || isPlayNode(current.kind)) return bad('node');
      const res = applyNodeChoice(run, current, Number(body.choice));
      if (!res.ok) return NextResponse.json({ error: 'Choice refused', code: res.error }, { status: 400 });
      run = res.run;
      state = res.state;
    } else {
      // Plain re-read (reload / after a draft pick): show the node as it stands.
      const current = nodeById(map, run.node);
      if (current && !isPlayNode(current.kind)) state = enterNodeState(run, current).state;
    }

    return NextResponse.json({ ...runView(run, secret), node: state });
  } catch (err) {
    console.error('[ADVENTURE NODE]', err);
    captureApiError(err instanceof Error ? err : new Error(String(err)), '/api/adventure/node');
    return NextResponse.json({ error: 'Adventure unavailable' }, { status: 503 });
  }
}
