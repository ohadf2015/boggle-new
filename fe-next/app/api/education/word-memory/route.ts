import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { WORD_REVIEW_COLUMNS, type WordReviewRow } from '@/lib/education/recordWordReviews';
import { shapeWordMemory } from '@/lib/education/wordMemoryRead';
import { utcDay } from '@/lib/education/practiceStreak';
import logger from '@/utils/logger';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ROWS = 5000;

/**
 * GET /api/education/word-memory[?lessonId=] — the signed-in student's reviewed
 * words (strength, due) and per-lesson summaries. Read under the student's own
 * session: RLS lets a student read only their rows.
 */
export async function GET(request: NextRequest) {
  const limit = checkApiRateLimit(request, 'education-word-memory', { maxRequests: 60, windowMs: 60_000 });
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } });
  }
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const lessonId = new URL(request.url).searchParams.get('lessonId');
    if (lessonId && !UUID_RE.test(lessonId)) return NextResponse.json({ error: 'Invalid lessonId' }, { status: 400 });

    const supabase = await createClient();
    let query = supabase.from('word_review_state').select(WORD_REVIEW_COLUMNS).eq('student_id', user.id);
    if (lessonId) query = query.eq('lesson_id', lessonId);
    const { data, error } = await query.order('next_review_date', { ascending: true }).limit(MAX_ROWS);
    if (error) {
      logger.error('word-memory read failed:', error);
      return NextResponse.json({ error: 'Failed to read word memory' }, { status: 500 });
    }
    return NextResponse.json(shapeWordMemory((data ?? []) as unknown as WordReviewRow[], utcDay(Date.now())));
  } catch (err) {
    logger.error('GET word-memory error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
