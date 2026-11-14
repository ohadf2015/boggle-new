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

  // An empty or broken body is a client mistake, not a server fault: answer
  // 400 and keep it out of error tracking (PostHog inbox 01a1c16a).
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  try {
    const { mode: rawMode, language: rawLanguage, seed: rawSeed, recentPct: rawRecentPct } = body as Record<string, unknown>;
    const mode = rawMode as QuickMode;
    const language = typeof rawLanguage === 'string' && LANGUAGES.includes(rawLanguage) ? rawLanguage : 'en';
    const seed = typeof rawSeed === 'string' && rawSeed.length <= 64 ? rawSeed : undefined;
    const recentPct = typeof rawRecentPct === 'number' ? Math.max(0, Math.min(100, rawRecentPct)) : 0;

    if (!MODES.includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const round = await buildQuickRound(mode, language, seed);
    // Ghost rivals ride along in the SAME payload rather than a second fetch:
    // they must be on hand before the timer starts, or rows pop in mid-round.
    const supabase = await createClient();
    // Resolve the caller so they are kept out of their own rival cohort. Best
    // effort: a failed auth lookup means a guest round, not a failed round.
    let selfUserId: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      selfUserId = data?.user?.id ?? null;
    } catch {
      /* guest / no session */
    }
    const ghosts = await fetchGhostRivals(
      supabase,
      mode,
      round.seed,
      (err) => captureApiError(err, 'quick-play-round-ghosts'),
      selfUserId,
      language,
      recentPct
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
