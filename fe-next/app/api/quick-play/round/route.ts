/**
 * POST /api/quick-play/round — build a (seeded) quick round.
 * Word list is stripped for grid modes (client validates via the mode's own
 * dictionary path); wheel-rush keeps it (validation needs the exact set).
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { buildQuickRound, type QuickMode } from '@/backend/modules/quickPlayRound';
import { fetchGhostRivals } from '@/lib/quickPlay/fetchGhostRivals';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

const MODES: QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];
const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

export async function POST(request: NextRequest) {
  const rateLimit = checkApiRateLimit(request, 'quick-play-round', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const mode = body?.mode as QuickMode;
    const language = typeof body?.language === 'string' && LANGUAGES.includes(body.language) ? body.language : 'en';
    const seed = typeof body?.seed === 'string' && body.seed.length <= 64 ? body.seed : undefined;

    if (!MODES.includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const round = await buildQuickRound(mode, language, seed);
    // Ghost rivals ride along in the SAME payload rather than a second fetch:
    // they must be on hand before the timer starts, or rows pop in mid-round.
    const ghosts = await fetchGhostRivals(
      await createClient(),
      mode,
      round.seed,
      (err) => captureApiError(err, 'quick-play-round-ghosts')
    );
    const totalWords = round.words.length;
    return NextResponse.json({
      ...round,
      totalWords,
      ghosts,
      words: mode === 'wheel-rush' ? round.words : undefined,
    });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'quick-play-round');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
