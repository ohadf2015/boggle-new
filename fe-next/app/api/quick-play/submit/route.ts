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

// Word collection validation
const MAX_WORDS_PER_ROUND = 200;
const MAX_WORD_LENGTH = 30;
const TOTAL_PAYLOAD_BYTES = 10_000;

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
    const { mode, language, seed, score, wordsFound, durationMs, challengeId, words } = body ?? {};

    if (
      !MODES.includes(mode) ||
      typeof seed !== 'string' || seed.length === 0 || seed.length > 64 ||
      typeof score !== 'number' || !Number.isFinite(score) || score < 0 ||
      typeof wordsFound !== 'number' || wordsFound < 0
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Validate words array if present (optional for backwards compatibility)
    let validatedWords: Array<{ word: string; score: number }> | undefined;
    if (words !== undefined) {
      if (!Array.isArray(words)) {
        return NextResponse.json({ error: 'Words must be an array' }, { status: 400 });
      }
      if (words.length > MAX_WORDS_PER_ROUND) {
        return NextResponse.json({ error: 'Too many words' }, { status: 400 });
      }
      // Validate each word
      validatedWords = [];
      for (const w of words) {
        if (typeof w !== 'object' || !w.word || typeof w.score !== 'number') {
          return NextResponse.json({ error: 'Invalid word format' }, { status: 400 });
        }
        const word = String(w.word).trim();
        // Only allow alphabetic characters (ponytail: no cross-script validation)
        if (word.length === 0 || word.length > MAX_WORD_LENGTH || !/^[a-zA-Z]+$/.test(word)) {
          return NextResponse.json({ error: 'Invalid word' }, { status: 400 });
        }
        validatedWords.push({ word: word.toLowerCase(), score: w.score });
      }
      // Check total payload size
      const payloadStr = JSON.stringify({ words: validatedWords });
      if (Buffer.byteLength(payloadStr) > TOTAL_PAYLOAD_BYTES) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 400 });
      }
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
      words: validatedWords,
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
