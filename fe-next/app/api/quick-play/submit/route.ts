/**
 * POST /api/quick-play/submit — persist a quick round, award coins/XP,
 * update rival + challenge rows. Auth required (rewards are server-granted).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { processQuickSubmit } from '@/backend/modules/quickPlaySubmit';
import type { QuickMode } from '@/backend/modules/quickPlayRound';
import { captureApiError } from '@/utils/sentry';

const MODES: QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];
const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

export async function POST(request: NextRequest) {
  const rateLimit = checkApiRateLimit(request, 'quick-play-submit', {
    maxRequests: 20,
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
    const { mode, language, seed, score, wordsFound, durationMs, challengeId } = body ?? {};

    if (
      !MODES.includes(mode) ||
      typeof seed !== 'string' || seed.length === 0 || seed.length > 64 ||
      typeof score !== 'number' || !Number.isFinite(score) || score < 0 ||
      typeof wordsFound !== 'number' || wordsFound < 0
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const outcome = await processQuickSubmit(supabase as never, {
      userId: user.id,
      mode,
      language: typeof language === 'string' && LANGUAGES.includes(language) ? language : 'en',
      seed,
      score,
      wordsFound,
      durationMs: typeof durationMs === 'number' ? durationMs : 60_000,
      challengeId: typeof challengeId === 'string' ? challengeId : undefined,
    });

    return NextResponse.json(outcome);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/implausible score/i.test(message)) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
    }
    captureApiError(err instanceof Error ? err : new Error(message), 'quick-play-submit');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
