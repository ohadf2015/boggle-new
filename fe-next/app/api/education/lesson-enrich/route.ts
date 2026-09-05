/**
 * POST /api/education/lesson-enrich
 *
 * Teacher-only helper behind the "Fill in missing definitions, synonyms &
 * examples (AI)" button in the lesson builder. Returns, per word, a
 * middle-school-level definition, synonyms, antonyms and a context sentence
 * with a `___` blank. The client merges ONLY into empty fields and highlights
 * what it filled so the teacher reviews before saving.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { isTeacherProfile } from '@/lib/education/teacherRole';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';
import { MAX_ENRICH_WORDS, parseEnrichResponse } from '@/lib/education/vocabEnrich';
import { generateEnrichmentText } from './generate';
import logger from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A teacher enriches a lesson a handful of times; 10/min per IP is generous
// and keeps a leaked endpoint from burning Vertex quota.
const RATE_LIMIT_CONFIG = {
  maxRequests: 10,
  windowMs: 60_000,
  blockDurationMs: 300_000,
};

const bodySchema = z.object({
  words: z.array(z.string().trim().min(1).max(60)).min(1).max(MAX_ENRICH_WORDS),
  language: z.enum(EDUCATION_LANGUAGES).default('en'),
});

/** Trim + de-duplicate (case-insensitive) while keeping the first spelling the teacher used. */
function uniqueWords(words: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words) {
    const word = raw.trim();
    const key = word.toLowerCase();
    if (!word || seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

export async function POST(request: NextRequest) {
  const rateLimit = checkApiRateLimit(request, 'education-lesson-enrich', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role, is_admin')
      .eq('id', user.id)
      .single();
    if (!isTeacherProfile(profile)) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues.map((issue) => issue.message) },
        { status: 400 }
      );
    }

    const words = uniqueWords(parsed.data.words);
    if (words.length === 0) {
      return NextResponse.json({ error: 'Invalid request', details: ['No words'] }, { status: 400 });
    }

    let text: string;
    try {
      text = await generateEnrichmentText(words, parsed.data.language);
    } catch (error) {
      logger.error('lesson-enrich: AI unavailable', error);
      return NextResponse.json({ error: 'AI enrichment is not available right now' }, { status: 503 });
    }

    const enrichment = parseEnrichResponse(text, words);
    return NextResponse.json({ enrichment, language: parsed.data.language });
  } catch (error) {
    logger.error('lesson-enrich error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
