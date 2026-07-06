/**
 * POST /api/quick-play/challenge — create a same-board challenge row.
 * GET  /api/quick-play/challenge?id=... — fetch one (accept banner + rival card).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createQuickChallenge } from '@/backend/modules/quickPlaySubmit';
import type { QuickMode } from '@/backend/modules/quickPlayRound';
import { captureApiError } from '@/utils/sentry';

const MODES: QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];

export async function POST(request: NextRequest) {
  const rateLimit = checkApiRateLimit(request, 'quick-play-challenge', {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mode, seed, score, scorePct } = body ?? {};
    if (
      !MODES.includes(mode) ||
      typeof seed !== 'string' || seed.length === 0 || seed.length > 64 ||
      typeof score !== 'number' || score < 0 ||
      typeof scorePct !== 'number' || scorePct < 0 || scorePct > 100
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { id } = await createQuickChallenge(supabase as never, {
      userId: user.id,
      mode,
      seed,
      score,
      scorePct,
    });
    return NextResponse.json({ id });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'quick-play-challenge');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const rateLimit = checkApiRateLimit(request, 'quick-play-challenge-get', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const id = request.nextUrl.searchParams.get('id');
  const mine = request.nextUrl.searchParams.get('mine') === '1';
  if (!id && !mine) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const supabase = await createClient();

    if (mine) {
      // Loop closer: the challenger's most recent answered challenge (7d window)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: row } = await supabase
        .from('quick_play_challenges')
        .select('id, mode, challenger_score_pct, accepted_by, accepted_score_pct, created_at')
        .eq('challenger_id', user.id)
        .not('accepted_by', 'is', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!row) return NextResponse.json({ answered: null });

      const { data: accepter } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', row.accepted_by)
        .single();
      return NextResponse.json({
        answered: { ...row, accepterName: accepter?.display_name || 'Player' },
      });
    }
    const { data, error } = await supabase
      .from('quick_play_challenges')
      .select('id, challenger_id, mode, seed, challenger_score, challenger_score_pct, accepted_by, accepted_score_pct')
      .eq('id', id)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', data.challenger_id)
      .single();

    return NextResponse.json({
      ...data,
      challengerName: profile?.display_name || 'Player',
    });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'quick-play-challenge-get');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
