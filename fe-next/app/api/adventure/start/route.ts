/**
 * POST /api/adventure/start { world, level, language }
 * Deals the board server-side and returns it inside a signed attempt token.
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import { getPlayLevel } from '@/lib/adventure/play/levels';
import { canPlayLevel } from '@/lib/adventure/play/progress';
import { signAttempt } from '@/lib/adventure/play/attemptToken';
import { attemptSecret, adventureLang, loadCompletions } from '@/lib/adventure/play/server';
import type { Language } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const grid = pickRichestBoardClient(
    () => generateRandomTable(lvl.size, lvl.size, language as Language),
    language,
  ) as string[][];

  const token = signAttempt({ u: user.id, w: world, l: level, g: grid, lang: language, t: Date.now() }, secret);
  return NextResponse.json({ token, grid, language, level: lvl });
}
